$source = Join-Path $PSScriptRoot "..\\dashboard-negocios.html"
$targetDir = Join-Path $PSScriptRoot "www"
$target = Join-Path $targetDir "index.html"

if (!(Test-Path $source)) {
  throw "Nao encontrei o arquivo dashboard-negocios.html na pasta acima."
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Force

Write-Output "Dashboard sincronizado em $target"
