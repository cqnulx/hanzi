import io
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from lulu_voice_cache import PersistentWavCache, pipeline_identity, valid_wav

def wav_bytes(value=1):
    output = io.BytesIO()
    with wave.open(output, "wb") as recording:
        recording.setparams((1, 2, 24000, 0, "NONE", "not compressed"))
        recording.writeframes(bytes([value, 0]) * 100)
    return output.getvalue()

class PersistentCacheTests(unittest.TestCase):
    def test_persists_valid_audio_and_keys_include_language_text_and_pipeline(self):
        with TemporaryDirectory() as directory:
            cache = PersistentWavCache(directory, "pipeline-one")
            audio = wav_bytes()
            self.assertTrue(cache.put("zh", "hello", audio))
            self.assertEqual(PersistentWavCache(directory, "pipeline-one").get("zh", "hello"), audio)
            self.assertIsNone(cache.get("en", "hello"))
            self.assertIsNone(cache.get("zh", "different"))
            self.assertIsNone(PersistentWavCache(directory, "pipeline-two").get("zh", "hello"))
            self.assertFalse(list(Path(directory).glob("*.tmp")))

    def test_rejects_truncated_or_corrupted_recordings(self):
        audio = wav_bytes()
        self.assertTrue(valid_wav(audio))
        for invalid in (audio[:-2], b"RIFF" + b"\0" * 100, b"not audio"):
            self.assertFalse(valid_wav(invalid))
        with TemporaryDirectory() as directory:
            cache = PersistentWavCache(directory, "pipeline")
            cache.put("zh", "hello", audio)
            path = Path(directory) / (cache.key("zh", "hello") + ".wav")
            path.write_bytes(audio[:-2])
            self.assertIsNone(cache.get("zh", "hello"))
            self.assertFalse(path.exists())
            self.assertEqual(cache.stats()["entries"], 0)

    def test_evicts_oldest_audio_to_bound_storage(self):
        audio = wav_bytes()
        with TemporaryDirectory() as directory:
            cache = PersistentWavCache(directory, "pipeline", max_bytes=len(audio) * 2)
            for text in ("one", "two", "three"):
                cache.put("en", text, audio)
            self.assertIsNone(cache.get("en", "one"))
            self.assertEqual(cache.stats()["entries"], 2)
            self.assertLessEqual(cache.stats()["bytes"], len(audio) * 2)

    def test_identity_changes_with_reference_model_and_pitch(self):
        with TemporaryDirectory() as directory:
            runtime = Path(directory)
            for name in ("reference.wav", "reference.txt", "model/config.json", "model/generation_config.json", "model/model.safetensors", "model/speech_tokenizer/config.json", "model/speech_tokenizer/model.safetensors"):
                path = runtime / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"asset")
            first = pipeline_identity(runtime, -1)
            self.assertEqual(first, pipeline_identity(runtime, -1.0))
            self.assertEqual(first, pipeline_identity(runtime, -1))
            self.assertNotEqual(first, pipeline_identity(runtime, -2))
            (runtime / "reference.wav").write_bytes(b"new reference")
            second = pipeline_identity(runtime, -1)
            self.assertNotEqual(first, second)
            (runtime / "model/model.safetensors").write_bytes(b"new model")
            self.assertNotEqual(second, pipeline_identity(runtime, -1))

    def test_invalid_identity_manifest_is_rebuilt(self):
        with TemporaryDirectory() as directory:
            runtime = Path(directory)
            for name in ("reference.wav", "model/config.json", "model/generation_config.json", "model/model.safetensors", "model/speech_tokenizer/config.json", "model/speech_tokenizer/model.safetensors"):
                path = runtime / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"asset")
            expected = pipeline_identity(runtime, -1)
            manifest = runtime / "voice-cache-identities.json"
            for malformed in ("[]", "null", '{"reference.wav":{"stamp":[],"sha256":23}}'):
                manifest.write_text(malformed, encoding="utf-8")
                self.assertEqual(expected, pipeline_identity(runtime, -1))

if __name__ == "__main__":
    unittest.main()
