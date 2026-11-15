"""HTTP boundary checks; uses no downloaded model or reference recording."""
import importlib.util
import json
import threading
import unittest
import sys
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

spec = importlib.util.spec_from_file_location("lulu_voice", Path(__file__).resolve().parents[1] / "scripts" / "lulu-voice-service.py")
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)

@unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('librosa'), 'Requires optional local voice audio dependencies')
class VoicePitchTests(unittest.TestCase):
    def test_lower_pitch_preserves_duration_and_avoids_clipping(self):
        import numpy as np
        rate = 24000
        samples = (.8 * np.sin(2 * np.pi * 440 * np.arange(rate) / rate)).astype(np.float32)
        shifted = voice.adjust_voice_pitch(samples, rate)
        self.assertEqual(len(shifted), len(samples))
        self.assertGreater(float(np.sqrt(np.mean(shifted**2))), .1)
        self.assertLessEqual(float(np.max(np.abs(shifted))), .98001)
        frequency = np.fft.rfftfreq(len(shifted), 1 / rate)[np.argmax(np.abs(np.fft.rfft(shifted)))]
        self.assertAlmostEqual(frequency, 440 * 2**(-1/12), delta=2)

class VoiceCacheTests(unittest.TestCase):
    def test_cached_intro_returns_while_another_request_generates(self):
        engine = voice.VoiceEngine(Path("unused"))
        entered, release, cached_done = threading.Event(), threading.Event(), threading.Event()
        generated = []
        def generate(text, _):
            entered.set()
            if not release.wait(3):
                raise RuntimeError("Test generation was not released")
            return text.encode()
        engine._generate = generate
        with engine.cache_lock:
            engine._remember(("en", "standard intro", -1), b"cached")
        worker = threading.Thread(target=lambda: generated.append(engine.synthesize("new chat", "en")))
        cached_result = []
        def read_cached():
            cached_result.append(engine.synthesize("standard intro", "en", persistent=True))
            cached_done.set()
        worker.start()
        try:
            self.assertTrue(entered.wait(2))
            reader = threading.Thread(target=read_cached)
            reader.start()
            self.assertTrue(cached_done.wait(2), "A cache hit waited for unrelated GPU inference")
            self.assertFalse(release.is_set())
            self.assertEqual(cached_result, [b"cached"])
        finally:
            release.set()
            worker.join(3)
            if 'reader' in locals():
                reader.join(3)
        self.assertEqual(generated, [b"new chat"])

    def test_duplicate_requests_share_generation_and_memory_is_bounded(self):
        import time
        engine = voice.VoiceEngine(Path("unused"))
        engine.cache_max_items = 2
        engine.cache_max_bytes = 6
        calls = []
        def generate(text, language):
            calls.append((text, language))
            time.sleep(.02)
            return text.encode()
        engine._generate = generate
        outputs = []
        threads = [threading.Thread(target=lambda: outputs.append(engine.synthesize("one", "en"))) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertEqual(outputs, [b"one", b"one"])
        self.assertEqual(calls, [("one", "en")])
        engine.synthesize("two", "en")
        engine.synthesize("tri", "en")
        self.assertLessEqual(len(engine.cache), 2)
        self.assertLessEqual(engine.cache_bytes, 6)
        engine.synthesize("one", "en")
        self.assertEqual(calls.count(("one", "en")), 2)

    def test_disk_hit_survives_new_engine_and_memory_eviction(self):
        import io
        import wave
        from lulu_voice_cache import PersistentWavCache
        output = io.BytesIO()
        with wave.open(output, "wb") as wav:
            wav.setparams((1, 2, 24000, 0, "NONE", "not compressed"))
            wav.writeframes(b"\x01\x00" * 100)
        body = output.getvalue()
        with TemporaryDirectory() as directory:
            cache = PersistentWavCache(directory, "test-pipeline")
            cache.put("en", "hello", body)
            engine = voice.VoiceEngine(Path(directory))
            engine.disk_cache = PersistentWavCache(directory, "test-pipeline")
            engine._generate = lambda *_: self.fail("Persistent cache should avoid inference")
            self.assertEqual(engine.synthesize("hello", "en", persistent=True), body)
            self.assertEqual(engine.cache_hits["disk"], 1)

    def test_chat_audio_stays_in_memory_and_only_explicit_intro_is_persisted(self):
        class Cache:
            def __init__(self):
                self.reads = self.writes = 0
            def get(self, *_):
                self.reads += 1
                return None
            def put(self, *_):
                self.writes += 1
        engine = voice.VoiceEngine(Path("unused"))
        engine.disk_cache = Cache()
        engine._generate = lambda *_: b"audio"
        engine.synthesize("personal chat", "en")
        self.assertEqual((engine.disk_cache.reads, engine.disk_cache.writes), (0, 0))
        engine.synthesize("standard intro", "en", persistent=True)
        self.assertGreaterEqual(engine.disk_cache.reads, 1)
        self.assertEqual(engine.disk_cache.writes, 1)

class VoiceHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = TemporaryDirectory()
        cls.engine = voice.VoiceEngine(Path(cls.temporary.name))
        cls.engine.status = "ready"
        cls.calls = []
        def synthesize(text, language, persistent=False):
            cls.calls.append((text, language, persistent))
            return b"RIFFtestWAVE"
        cls.engine.synthesize = synthesize
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), voice.create_handler(cls.engine))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.temporary.cleanup()

    def request(self, method="POST", body=None, headers=None, path="/synthesize"):
        connection = HTTPConnection("127.0.0.1", self.server.server_port)
        connection.request(method, path, json.dumps(body).encode() if body is not None else None, headers or {"Content-Type": "application/json"})
        response = connection.getresponse()
        result = response.status, response.getheader("Content-Type"), response.read()
        connection.close()
        return result

    def test_health_reports_process_and_voice_status(self):
        status, _, body = self.request("GET", path="/health")
        data = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(data["voice"], "reference")
        self.assertGreater(data["pid"], 0)

    def test_browser_and_foreign_host_are_rejected(self):
        for headers in ({"Host": "evil.example"}, {"Origin": "https://evil.example"}, {"Sec-Fetch-Site": "cross-site"}):
            headers["Content-Type"] = "application/json"
            self.assertEqual(self.request(body={"text": "hello"}, headers=headers)[0], 403)
        self.assertEqual(self.request(body={"text": "hello"}, headers={"Content-Type": "text/plain"})[0], 415)

    def test_valid_complete_text_and_invalid_payloads(self):
        text = "中" * 6000
        status, content_type, body = self.request(body={"text": text, "language": "zh"})
        self.assertEqual((status, content_type, body), (200, "audio/wav", b"RIFFtestWAVE"))
        self.assertEqual(self.calls[-1], (text, "zh", False))
        self.request(body={"text": "intro", "language": "zh", "cache": "standard-intro"})
        self.assertEqual(self.calls[-1], ("intro", "zh", True))
        for payload in ([], {"text": ""}, {"text": "a" * 6001}, {"text": "hello", "language": "xx"}):
            self.assertEqual(self.request(body=payload)[0], 400)

    def test_loading_does_not_invoke_generation(self):
        self.engine.status = "loading"
        before = len(self.calls)
        self.assertEqual(self.request(body={"text": "hello"})[0], 503)
        self.assertEqual(len(self.calls), before)
        self.engine.status = "ready"

if __name__ == "__main__":
    unittest.main()
