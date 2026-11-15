"""Private, bounded WAV cache. Filenames contain only opaque content identities."""
from __future__ import annotations
import hashlib
import io
import json
import os
from pathlib import Path
import re
import uuid
import wave

PIPELINE_VERSION = "shixiaolu-reference-pcm16-v3-fixed-predictor"
MAX_WAV_BYTES = 20 * 1024 * 1024


def valid_wav(data):
    if not isinstance(data, bytes) or not 44 <= len(data) <= MAX_WAV_BYTES:
        return False
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE" or int.from_bytes(data[4:8], "little") + 8 != len(data):
        return False
    try:
        with wave.open(io.BytesIO(data), "rb") as recording:
            if recording.getcomptype() != "NONE" or recording.getsampwidth() != 2 or recording.getnchannels() != 1 or recording.getframerate() != 24000 or recording.getnframes() <= 0:
                return False
            expected = recording.getnframes() * recording.getsampwidth() * recording.getnchannels()
            return len(recording.readframes(recording.getnframes())) == expected
    except (EOFError, wave.Error, ValueError):
        return False


def _atomic_json(path, value):
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def pipeline_identity(runtime, pitch_semitones):
    """Hash model assets once; reuse digests only while file identities match."""
    runtime = Path(runtime)
    manifest_file = runtime / "voice-cache-identities.json"
    try:
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        manifest = {}
    if not isinstance(manifest, dict):
        manifest = {}
    files = ["reference.wav", "reference.txt", "model/config.json", "model/generation_config.json",
             "model/model.safetensors", "model/speech_tokenizer/config.json", "model/speech_tokenizer/model.safetensors"]
    identities = {}
    saved = {}
    for name in files:
        path = runtime / name
        if not path.exists():
            if name == "reference.txt":
                identities[name] = None
                continue
            raise FileNotFoundError("A voice pipeline asset is unavailable")
        stat = path.stat()
        stamp = [stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns]
        previous = manifest.get(name)
        if isinstance(previous, dict) and previous.get("stamp") == stamp and isinstance(previous.get("sha256"), str) and re.fullmatch(r"[a-f0-9]{64}", previous["sha256"]):
            digest = previous["sha256"]
        else:
            hasher = hashlib.sha256()
            with path.open("rb") as source:
                for block in iter(lambda: source.read(4 * 1024 * 1024), b""):
                    hasher.update(block)
            digest = hasher.hexdigest()
        identities[name] = digest
        saved[name] = {"stamp": stamp, "sha256": digest}
    _atomic_json(manifest_file, saved)
    pitch = float(pitch_semitones)
    # Preserve the active default's identity while normalizing -1 and -1.0.
    pitch = int(pitch) if pitch.is_integer() else pitch
    encoded = json.dumps({"version": PIPELINE_VERSION, "pitch": pitch, "assets": identities}, sort_keys=True).encode()
    return hashlib.sha256(encoded).hexdigest()


class PersistentWavCache:
    def __init__(self, directory, identity, max_bytes=256 * 1024 * 1024):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.identity = identity
        self.max_bytes = max_bytes
        self.entries = {}
        self.size_bytes = 0
        for path in self.directory.glob("*.wav"):
            if re.fullmatch(r"[a-f0-9]{64}\.wav", path.name) and path.is_file():
                stat = path.stat()
                self.entries[path.stem] = (stat.st_size, stat.st_mtime_ns)
                self.size_bytes += stat.st_size
        self._prune()

    def key(self, language, text):
        encoded = json.dumps([self.identity, language, text], ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def _remove(self, key):
        old = self.entries.pop(key, None)
        if old:
            self.size_bytes -= old[0]
        (self.directory / (key + ".wav")).unlink(missing_ok=True)

    def _prune(self):
        for key, _ in sorted(self.entries.items(), key=lambda item: item[1][1]):
            if self.size_bytes <= self.max_bytes:
                break
            self._remove(key)

    def get(self, language, text):
        key = self.key(language, text)
        if key not in self.entries:
            return None
        path = self.directory / (key + ".wav")
        try:
            if path.stat().st_size > MAX_WAV_BYTES:
                self._remove(key)
                return None
            data = path.read_bytes()
            if not valid_wav(data):
                self._remove(key)
                return None
            os.utime(path, None)
            self.entries[key] = (len(data), path.stat().st_mtime_ns)
            return data
        except OSError:
            self._remove(key)
            return None

    def put(self, language, text, data):
        if len(data) > self.max_bytes or not valid_wav(data):
            return False
        key = self.key(language, text)
        path = self.directory / (key + ".wav")
        temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
        try:
            temporary.write_bytes(data)
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)
        previous = self.entries.get(key)
        self.size_bytes += len(data) - (previous[0] if previous else 0)
        self.entries[key] = (len(data), path.stat().st_mtime_ns)
        self._prune()
        return True

    def stats(self):
        return {"entries": len(self.entries), "bytes": self.size_bytes, "maxBytes": self.max_bytes}
