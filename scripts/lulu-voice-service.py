"""Loopback-only reference voice service. All voice assets stay in runtime/."""
from __future__ import annotations
import argparse
import io
import json
import os
import re
import threading
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from lulu_voice_cache import PersistentWavCache, pipeline_identity

LANGUAGES = {"zh": "Chinese", "en": "English", "es": "Spanish", "fr": "French", "de": "German", "ja": "Japanese", "ko": "Korean"}

def adjust_voice_pitch(samples, rate, semitones=-1):
    """Lower the reference timbre while keeping speech duration unchanged."""
    import librosa
    import numpy as np
    shifted = librosa.effects.pitch_shift(np.asarray(samples, dtype=np.float32), sr=rate, n_steps=semitones) if semitones else np.asarray(samples, dtype=np.float32)
    shifted = librosa.util.fix_length(shifted, size=len(samples))
    peak = float(np.max(np.abs(shifted))) if len(shifted) else 0
    if peak > .98:
        shifted = shifted * (.98 / peak)
    return shifted

class VoiceEngine:
    def __init__(self, runtime, pitch_semitones=-1):
        self.runtime, self.status, self.error = runtime, "loading", None
        self.pitch_semitones = pitch_semitones
        self.lock = threading.Lock()
        self.cache_lock = threading.RLock()
        self.model = self.prompt = None
        self.cache = OrderedDict()
        self.cache_bytes = 0
        self.cache_max_items = 12
        self.cache_max_bytes = 20 * 1024 * 1024
        self.disk_cache = None
        self.acceleration = "loading"
        self.cache_hits = {"memory": 0, "disk": 0, "generated": 0}

    def load(self):
        try:
            import soundfile as sf
            import torch
            from qwen_tts import Qwen3TTSModel
            from lulu_voice_acceleration import install_predictor
            # Small autoregressive GPU steps lose time to excessive CPU workers.
            torch.set_num_threads(4)
            torch.set_num_interop_threads(1)
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA GPU is unavailable")
            model_path, reference = self.runtime / "model", self.runtime / "reference.wav"
            if not (model_path / "model.safetensors").is_file() or not reference.is_file():
                raise RuntimeError("Run the voice setup script before starting")
            self.model = Qwen3TTSModel.from_pretrained(str(model_path), device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
            samples, rate = sf.read(str(reference), dtype="float32")
            transcript_path = self.runtime / "reference.txt"
            transcript = transcript_path.read_text(encoding="utf-8").strip() if transcript_path.exists() else ""
            self.prompt = self.model.create_voice_clone_prompt(ref_audio=(samples, rate), ref_text=transcript or None, x_vector_only_mode=not bool(transcript))
            with torch.inference_mode():
                accelerator = install_predictor(self.model)
            self.acceleration = accelerator.backend
            identity = pipeline_identity(self.runtime, self.pitch_semitones)
            self.disk_cache = PersistentWavCache(self.runtime / "cache", identity)
            # Compile the audio transform and initialize GPU kernels before ready.
            import numpy as np
            adjust_voice_pitch(np.zeros(24000, dtype=np.float32), 24000, self.pitch_semitones)
            with torch.inference_mode():
                self.model.generate_voice_clone(text="你好。", language="Chinese", voice_clone_prompt=self.prompt, max_new_tokens=256)
            self.status = "ready"
            print(f"Shi Xiaolu reference voice ready ({self.acceleration})", flush=True)
        except Exception as exc:
            self.status, self.error = "error", f"{type(exc).__name__}: {exc}"
            print(f"Shi Xiaolu voice loading failed: {self.error}", flush=True)

    def synthesize(self, text, language, persistent=False):
        key = (language, text, self.pitch_semitones)
        # Cached introductions stay responsive while another learner uses the GPU.
        with self.cache_lock:
            body = self._cached(key, text, language, persistent)
            if body is not None:
                return body
        # Serial GPU access coalesces simultaneous misses after a second lookup.
        with self.lock:
            with self.cache_lock:
                body = self._cached(key, text, language, persistent)
                if body is not None:
                    return body
            body = self._generate(text, language)
            with self.cache_lock:
                self.cache_hits["generated"] += 1
                if persistent and self.disk_cache is not None:
                    try:
                        self.disk_cache.put(language, text, body)
                    except OSError:
                        # A full/unavailable disk must not discard generated speech.
                        pass
                self._remember(key, body)
            return body

    def _cached(self, key, text, language, persistent):
        if key in self.cache:
            self.cache.move_to_end(key)
            self.cache_hits["memory"] += 1
            body = self.cache[key]
            if persistent and self.disk_cache is not None:
                try:
                    self.disk_cache.put(language, text, body)
                except OSError:
                    pass
            return body
        if persistent and self.disk_cache is not None:
            body = self.disk_cache.get(language, text)
            if body is not None:
                self.cache_hits["disk"] += 1
                self._remember(key, body)
                return body
        return None

    def cache_stats(self):
        with self.cache_lock:
            return {"memoryEntries": len(self.cache), "hits": dict(self.cache_hits), "disk": self.disk_cache.stats() if self.disk_cache is not None else None}

    def _remember(self, key, body):
        if len(body) <= self.cache_max_bytes:
            self.cache[key] = body
            self.cache_bytes += len(body)
            while len(self.cache) > self.cache_max_items or self.cache_bytes > self.cache_max_bytes:
                _, expired = self.cache.popitem(last=False)
                self.cache_bytes -= len(expired)

    def _generate(self, text, language):
        import numpy as np
        import soundfile as sf
        import torch
        # Keep long replies complete while limiting each autoregressive segment.
        parts = re.split(r"(?<=[。！？.!?;；\n])", text)
        chunks, current = [], ""
        for part in parts:
            while len(part) > 240:
                if current:
                    chunks.append(current)
                    current = ""
                chunks.append(part[:240])
                part = part[240:]
            if len(current) + len(part) > 240:
                chunks.append(current)
                current = ""
            current += part
        if current.strip():
            chunks.append(current)
        with torch.inference_mode():
            audio = []
            for chunk in chunks:
                waves, rate = self.model.generate_voice_clone(text=chunk, language=LANGUAGES[language], voice_clone_prompt=self.prompt, max_new_tokens=2048)
                audio.append(waves[0])
            output = io.BytesIO()
            adjusted = adjust_voice_pitch(np.concatenate(audio), rate, self.pitch_semitones)
            sf.write(output, adjusted, rate, format="WAV", subtype="PCM_16")
            return output.getvalue()

def create_handler(engine):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass
        def send_json(self, status, payload):
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        def private_request(self):
            host = self.headers.get("Host", "").lower()
            allowed = {"localhost", "127.0.0.1", "[::1]"}
            if host not in allowed and host not in {f"{h}:{self.server.server_port}" for h in allowed}:
                self.send_json(403, {"error": "Loopback access only"})
                return False
            if self.headers.get("Origin") or self.headers.get("Sec-Fetch-Site", "none") not in {"none", "same-origin"}:
                self.send_json(403, {"error": "Browser access is not supported"})
                return False
            return True
        def do_GET(self):
            if not self.private_request():
                return
            if self.path != "/health":
                return self.send_json(404, {"error": "Not found"})
            self.send_json(200, {"status": engine.status, "voice": "reference", "languages": list(LANGUAGES), "referenceConfigured": (engine.runtime / "reference.wav").is_file(), "detail": engine.error, "pitchSemitones": engine.pitch_semitones, "acceleration": engine.acceleration, "cache": engine.cache_stats(), "pid": os.getpid(), "parentPid": os.getppid()})
        def do_POST(self):
            if not self.private_request():
                return
            if self.path != "/synthesize":
                return self.send_json(404, {"error": "Not found"})
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                return self.send_json(415, {"error": "Use application/json"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 65536:
                    return self.send_json(400, {"error": "Invalid request body"})
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    return self.send_json(400, {"error": "Invalid request"})
                text, language = str(data.get("text", "")).strip(), data.get("language", "zh")
                if not text or len(text) > 6000 or language not in LANGUAGES:
                    return self.send_json(400, {"error": "Invalid text or language"})
                if engine.status != "ready":
                    return self.send_json(503, {"error": "Voice service is not ready", "status": engine.status})
                body = engine.synthesize(text, language, persistent=data.get("cache") == "standard-intro")
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
            except (ValueError, TypeError):
                self.send_json(400, {"error": "Invalid request"})
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception as exc:
                print(f"Shi Xiaolu synthesis failed: {type(exc).__name__}", flush=True)
                self.send_json(503, {"error": "Voice synthesis failed"})
    return Handler

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4187)
    parser.add_argument("--runtime", type=Path, default=Path(__file__).resolve().parents[1] / "runtime" / "lulu-voice")
    parser.add_argument("--pitch-semitones", type=float, default=-1)
    args = parser.parse_args()
    if not -12 <= args.pitch_semitones <= 12:
        parser.error("--pitch-semitones must be between -12 and 12")
    engine = VoiceEngine(args.runtime.resolve(), args.pitch_semitones)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), create_handler(engine))
    threading.Thread(target=engine.load, daemon=True).start()
    print(f"Shi Xiaolu voice listening on 127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
