param(
  [Parameter(Mandatory=$true)][string]$Reference,
  [string]$Python = "python",
  [double]$Start = 0,
  [double]$Seconds = 12
)
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
$voiceRuntime = Join-Path $project "runtime\lulu-voice"
$voicePython = Join-Path $voiceRuntime "venv\Scripts\python.exe"
if (!(Test-Path -LiteralPath $voicePython)) {
  & $Python -m venv (Join-Path $voiceRuntime "venv")
  if ($LASTEXITCODE -ne 0) { throw "Could not create the private voice environment" }
}
& $voicePython -m pip install --disable-pip-version-check --no-cache-dir torch==2.7.0 torchaudio==2.7.0 --index-url https://download.pytorch.org/whl/cu128
if ($LASTEXITCODE -ne 0) { throw "CUDA PyTorch installation failed" }
& $voicePython -m pip install --disable-pip-version-check --no-cache-dir --index-url https://pypi.org/simple -r (Join-Path $PSScriptRoot "lulu-voice-requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Qwen voice dependencies installation failed" }
$env:HF_HUB_DISABLE_XET = "1"
$env:PYTHONIOENCODING = "utf-8"
& $voicePython (Join-Path $PSScriptRoot "prepare-lulu-voice.py") --reference $Reference --start $Start --seconds $Seconds --runtime $voiceRuntime --transcribe
if ($LASTEXITCODE -ne 0) { throw "Reference preparation or official model download failed" }
Write-Host "Ready. Start with: $voicePython scripts/lulu-voice-service.py"
