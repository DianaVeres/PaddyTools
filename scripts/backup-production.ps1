param(
  [int]$Keep = 14
)

$ErrorActionPreference = 'Stop'

if ($Keep -lt 2) {
  throw 'La conservación mínima es de 2 copias por base de datos.'
}

$officialRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$marker = Join-Path $officialRoot 'PADDTOOLS_OFICIAL'
$config = Join-Path $officialRoot 'wrangler.independent.jsonc'
$wrangler = Join-Path $officialRoot 'node_modules\.bin\wrangler.cmd'
$backupRoot = [System.IO.Path]::GetFullPath((Join-Path $officialRoot 'backups'))

if (-not (Test-Path -LiteralPath $marker -PathType Leaf)) {
  throw 'COPIA BLOQUEADA: esta carpeta no es la fuente oficial de PaddyTools.'
}
if ((Get-Content -LiteralPath $marker -Raw).Trim() -ne 'PADDYTOOLS_OFFICIAL_SOURCE_V1') {
  throw 'COPIA BLOQUEADA: el identificador de la fuente oficial no es válido.'
}
if (-not (Test-Path -LiteralPath $wrangler -PathType Leaf)) {
  throw 'COPIA BLOQUEADA: no se encuentra Wrangler.'
}

$expectedBackupRoot = [System.IO.Path]::GetFullPath("$officialRoot\backups")
if ($backupRoot -ne $expectedBackupRoot -or -not $backupRoot.StartsWith($officialRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'COPIA BLOQUEADA: la carpeta de destino no pertenece a la fuente oficial.'
}

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$databases = @(
  @{ Name = 'gestion-unificada-db'; Prefix = 'gestion-unificada' },
  @{ Name = 'paddy-packing-list-db'; Prefix = 'packing-list' }
)
$created = @()

foreach ($database in $databases) {
  $fileName = "$($database.Prefix)_$timestamp.sql"
  $output = Join-Path $backupRoot $fileName
  Write-Host "Creando copia de $($database.Name)..." -ForegroundColor Cyan
  & $wrangler d1 export $database.Name --remote --config $config --output $output --skip-confirmation
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo exportar $($database.Name)."
  }

  $file = Get-Item -LiteralPath $output
  if ($file.Length -lt 100) {
    throw "La copia $fileName está vacía o incompleta."
  }
  $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
  $created += [pscustomobject]@{
    database = $database.Name
    file = $file.Name
    bytes = $file.Length
    sha256 = $hash
    createdAt = (Get-Date).ToString('o')
  }

  $oldCopies = Get-ChildItem -LiteralPath $backupRoot -File -Filter "$($database.Prefix)_*.sql" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep
  foreach ($oldCopy in $oldCopies) {
    $resolvedOldCopy = [System.IO.Path]::GetFullPath($oldCopy.FullName)
    if (-not $resolvedOldCopy.StartsWith("$backupRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Limpieza bloqueada: $resolvedOldCopy está fuera de la carpeta de copias."
    }
    Remove-Item -LiteralPath $resolvedOldCopy -Force
  }
}

$manifest = Join-Path $backupRoot "backup_$timestamp.json"
$created | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding UTF8
Write-Host "Copias verificadas en $backupRoot" -ForegroundColor Green
$created | Format-Table database, file, bytes, sha256
