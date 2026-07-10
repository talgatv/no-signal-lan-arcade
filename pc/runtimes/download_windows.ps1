# Download official CPython Windows embeddable x64 into .\win64
# Requires: PowerShell, network. No admin needed for embeddable.
$ErrorActionPreference = "Stop"
$PY_VERSION = if ($env:PY_VERSION) { $env:PY_VERSION } else { "3.12.8" }
$Root = $PSScriptRoot
$Target = Join-Path $Root "win64"
$ZipName = "python-$PY_VERSION-embed-amd64.zip"
$Url = "https://www.python.org/ftp/python/$PY_VERSION/$ZipName"
$ZipPath = Join-Path $Root $ZipName

Write-Host "OGH · download Python $PY_VERSION embeddable (Windows x64)"
Write-Host "URL: $Url"

if (Test-Path (Join-Path $Target "python.exe")) {
  Write-Host "Already present (offline OK): $Target\python.exe"
  Write-Host "No download needed."
  exit 0
}

if ($env:OGH_OFFLINE -eq "1") {
  Write-Error "OGH_OFFLINE=1 and runtime missing — cannot download."
  exit 1
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null

Write-Host "Downloading…"
Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing

Write-Host "Extracting to $Target …"
Expand-Archive -Path $ZipPath -DestinationPath $Target -Force
Remove-Item $ZipPath -Force

# Embeddable: enable site / import by uncommenting import site in ._pth (helps some scripts)
Get-ChildItem $Target -Filter "python*._pth" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $c = $c -replace "#import site", "import site"
  Set-Content -Path $_.FullName -Value $c -NoNewline
}

if (-not (Test-Path (Join-Path $Target "python.exe"))) {
  Write-Error "python.exe not found after extract"
  exit 1
}

Write-Host "OK: $Target\python.exe"
Write-Host "Run:  cd ..  &&  start.bat"
