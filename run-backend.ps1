$pythonPath = "C:\Program Files\Python311\python.exe"

Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    & $pythonPath -m venv .venv
}

& .\.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) {
    Write-Error "pip upgrade failed. Fix the error above and rerun the script."
    exit $LASTEXITCODE
}

& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Error "pip install failed. Fix the error above (likely compiling pydantic-core) and rerun."
    exit $LASTEXITCODE
}

 & .\.venv\Scripts\uvicorn.exe backend.app:app --reload --app-dir ..
