"""Download the official model and privately normalize a supplied recording."""
from __future__ import annotations
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--start", type=float, default=0)
    parser.add_argument("--seconds", type=float, default=12)
    parser.add_argument("--skip-download", action="store_true")
    parser.add_argument("--transcribe", action="store_true")
    parser.add_argument("--runtime", type=Path, default=Path(__file__).resolve().parents[1] / "runtime" / "lulu-voice")
    args = parser.parse_args()
    import numpy as np
    import soundfile as sf
    from huggingface_hub import snapshot_download
    runtime = args.runtime.resolve()
    runtime.mkdir(parents=True, exist_ok=True)
    samples, rate = sf.read(str(args.reference), dtype="float32", always_2d=True)
    mono = samples.mean(axis=1)
    start = max(0, int(args.start * rate))
    end = min(len(mono), start + int(max(3, min(30, args.seconds)) * rate))
    clip = mono[start:end]
    if len(clip) < rate * 3 or float(np.max(np.abs(clip))) < .002:
        raise ValueError("Reference needs at least three seconds of audible speech")
    sf.write(str(runtime / "reference.wav"), clip, rate, subtype="PCM_16")
    print(f"Private reference prepared: {len(clip)/rate:.1f}s; source {len(mono)/rate:.1f}s", flush=True)
    if args.transcribe:
        import librosa
        from faster_whisper import WhisperModel
        asr = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(runtime / "asr"))
        audio_16k = librosa.resample(clip, orig_sr=rate, target_sr=16000)
        segments, info = asr.transcribe(audio_16k, beam_size=5, vad_filter=True)
        transcript = "".join(segment.text for segment in segments).strip()
        if not transcript:
            raise ValueError("No speech recognized in the reference recording")
        (runtime / "reference.txt").write_text(transcript, encoding="utf-8")
        print(f"Private reference transcript prepared: {len(transcript)} characters; language {info.language}", flush=True)
    else:
        (runtime / "reference.txt").unlink(missing_ok=True)
    if not args.skip_download:
        snapshot_download("Qwen/Qwen3-TTS-12Hz-0.6B-Base", revision="5d83992436eae1d760afd27aff78a71d676296fc", local_dir=str(runtime / "model"))
        print("Official Qwen reference voice model downloaded", flush=True)

if __name__ == "__main__":
    main()
