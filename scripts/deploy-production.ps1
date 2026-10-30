param(
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'

$officialRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$marker = Join-Path $officialRoot 'PADDTOOLS_OFICIAL'
$expectedMarker = 'PADDYTOOLS_OFFICIAL_SOURCE_V1'

if (-not (Test-Path -LiteralPath $marker -PathType Leaf)) {
  throw 'DESPLIEGUE BLOQUEADO: esta carpeta no contiene el marcador oficial de PaddyTools.'
}

$markerValue = (Get-Content -LiteralPath $marker -Raw).Trim()
if ($markerValue -ne $expectedMarker) {
  throw 'DESPLIEGUE BLOQUEADO: el identificador de la fuente oficial no es válido.'
}

$config = Join-Path $officialRoot 'wrangler.independent.jsonc'
$compiler = Join-Path $officialRoot 'node_modules\.bin\vinext.cmd'
$wrangler = Join-Path $officialRoot 'node_modules\.bin\wrangler.cmd'
$typeScript = Join-Path $officialRoot 'node_modules\.bin\tsc.cmd'
$integrationCheck = Join-Path $officialRoot 'scripts\verify-packing-integration.mjs'
$node = (Get-Command node -ErrorAction Stop).Source

foreach ($required in @($config, $compiler, $wrangler, $typeScript, $integrationCheck, $node)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "DESPLIEGUE BLOQUEADO: falta el archivo requerido $required"
  }
}

if ($ValidateOnly) {
  Write-Host "Fuente oficial validada: $officialRoot" -ForegroundColor Green
  exit 0
}

Push-Location $officialRoot
try {
  Write-Host 'Comprobando la integración y los tipos...' -ForegroundColor Cyan
  & $node $integrationCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La comprobación de PackingList ha fallado. No se desplegará nada."
  }
  & $typeScript --noEmit
  if ($LASTEXITCODE -ne 0) {
    throw "La comprobación de TypeScript ha fallado. No se desplegará nada."
  }

  Write-Host 'Fuente oficial verificada. Compilando PaddyTools...' -ForegroundColor Cyan
  & $compiler build
  if ($LASTEXITCODE -ne 0) {
    throw "La compilación ha fallado con el código $LASTEXITCODE. No se desplegará nada."
  }

  Write-Host 'Compilación correcta. Desplegando el resultado recién generado...' -ForegroundColor Cyan
  & $wrangler deploy --config $config
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare ha rechazado el despliegue con el código $LASTEXITCODE."
  }

  Write-Host 'PaddyTools se ha desplegado desde la fuente oficial.' -ForegroundColor Green
}
finally {
  Pop-Location
}

