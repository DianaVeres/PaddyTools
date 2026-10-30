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
$criticalFlowsCheck = Join-Path $officialRoot 'scripts\verify-critical-flows.mjs'
$schoolMatchingCheck = Join-Path $officialRoot 'scripts\test-school-matching.mjs'
$productionCheck = Join-Path $officialRoot 'scripts\verify-production.mjs'
$backupScript = Join-Path $officialRoot 'scripts\backup-production.ps1'
$node = (Get-Command node -ErrorAction Stop).Source

foreach ($required in @($config, $compiler, $wrangler, $typeScript, $integrationCheck, $criticalFlowsCheck, $schoolMatchingCheck, $productionCheck, $backupScript, $node)) {
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
  & $node $criticalFlowsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La comprobación de los flujos críticos ha fallado. No se desplegará nada."
  }
  & $node $schoolMatchingCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La comparación de colegios ha fallado. No se desplegará nada."
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

  Write-Host 'Creando copias de seguridad de las bases de datos...' -ForegroundColor Cyan
  & powershell -NoProfile -ExecutionPolicy Bypass -File $backupScript
  if ($LASTEXITCODE -ne 0) {
    throw "La copia de seguridad ha fallado. No se aplicarán migraciones ni se desplegará nada."
  }

  Write-Host 'Aplicando migraciones aditivas de la base de datos...' -ForegroundColor Cyan
  & $wrangler d1 migrations apply gestion-unificada-db --remote --config $config
  if ($LASTEXITCODE -ne 0) {
    throw "La migración de D1 ha fallado. No se desplegará la aplicación."
  }

  Write-Host 'Compilación correcta. Desplegando el resultado recién generado...' -ForegroundColor Cyan
  & $wrangler deploy --config $config
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare ha rechazado el despliegue con el código $LASTEXITCODE."
  }

  Write-Host 'Comprobando la aplicación ya desplegada...' -ForegroundColor Cyan
  $productionVerified = $false
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    & $node $productionCheck
    if ($LASTEXITCODE -eq 0) {
      $productionVerified = $true
      break
    }
    if ($attempt -lt 3) {
      Write-Warning "La comprobación de producción ha fallado (intento $attempt de 3). Se repetirá en 5 segundos."
      Start-Sleep -Seconds 5
    }
  }

  if (-not $productionVerified) {
    Write-Warning 'La nueva versión no ha superado las comprobaciones. Restaurando la versión anterior...'
    & $wrangler rollback --config $config --message "Rollback automático: falló la verificación funcional posterior al despliegue" --yes
    if ($LASTEXITCODE -ne 0) {
      throw "ALERTA: la versión nueva falló y Cloudflare no pudo restaurar automáticamente la anterior."
    }

    Write-Host 'Versión anterior restaurada. Comprobando la recuperación...' -ForegroundColor Yellow
    & $node $productionCheck
    if ($LASTEXITCODE -ne 0) {
      throw "ALERTA: se restauró la versión anterior, pero la comprobación funcional continúa fallando."
    }
    throw "El despliegue nuevo no era válido. PaddyTools ha vuelto automáticamente a la versión anterior verificada."
  }

  Write-Host 'PaddyTools se ha desplegado y verificado desde la fuente oficial.' -ForegroundColor Green
}
finally {
  Pop-Location
}

