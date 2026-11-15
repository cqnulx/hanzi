"""HTTP boundary checks; uses no downloaded model or reference recording."""
import importlib.util
import json
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory

spec = importlib.util.spec_from_file_location("lulu_voice", Path(__file__).resolve().parents[1] / "scripts" / "lulu-voice-service.py")
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)

@unittest.skipUnless(importlib.util.find_spec('numpy') and importlib.util.find_spec('librosa'), 'Requires optional local voice audio dependencies')
class VoicePitchTests(unittest.TestCase):
    def test_lower_pitch_preserves_duration_and_avoids_clipping(self):
        import numpy as np
        rate = 24000
        samples = (.8 * np.sin(2 * np.pi * 440 * np.arange(rate) / rate)).astype(np.float32)
        shifted = voice.adjust_voice_pitch(samples, rate, -2)
        self.assertEqual(len(shifted), len(samples))
        self.assertGreater(float(np.sqrt(np.mean(shifted**2))), .1)
        self.assertLessEqual(float(np.max(np.abs(shifted))), .98001)
        frequency = np.fft.rfftfreq(len(shifted), 1 / rate)[np.argmax(np.abs(np.fft.rfft(shifted)))]
        self.assertAlmostEqual(frequency, 440 * 2**(-2/12), delta=2)

class VoiceHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = TemporaryDirectory()
        cls.engine = voice.VoiceEngine(Path(cls.temporary.name))
        cls.engine.status = "ready"
        cls.calls = []
        def synthesize(text, language):
            cls.calls.append((text, language))
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
        self.assertEqual(self.calls[-1], (text, "zh"))
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
