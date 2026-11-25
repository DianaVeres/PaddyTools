param(
  [string]$Output = 'data\stm-technical-sections.json',
  [string]$Season = '3'
)

$ErrorActionPreference = 'Stop'
$connectionString = $env:STM_TECHNICAL_READ_CONNECTION
if ([string]::IsNullOrWhiteSpace($connectionString)) {
  throw 'Configura STM_TECHNICAL_READ_CONNECTION con una conexión de solo lectura a la base de artículos.'
}

$queries = @(
  @{ Section='medidas'; Table='ESC_ARTICULOS_MEDIDAS'; Article='COD_ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_MEDIDAS WHERE TEMPORADA=@season' },
  @{ Section='medidas'; Table='ESC_ARTICULOS_MEDIDAS_OBSERVACIONES'; Article='COD_ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_MEDIDAS_OBSERVACIONES WHERE TEMPORADA=@season' },
  @{ Section='medidas'; Table='ESC_ARTICULOS_MEDIDAS_TALLAS'; Article='COD_ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_MEDIDAS_TALLAS WHERE TEMPORADA=@season' },
  @{ Section='medidas'; Table='ESC_ARTICULOS_MEDIDAS_DESGLOSE'; Article='ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_MEDIDAS_DESGLOSE WHERE TEMPORADA=@season' },
  @{ Section='medidas'; Table='ESC_ARTICULOS_MEDIDAS_IMAGENES'; Article='COD_ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_MEDIDAS_IMAGENES WHERE TEMPORADA=@season' },
  @{ Section='articulos_base'; Table='ESC_ARTICULO_ARTICULOS'; Article='ARTICULO'; Sql='SELECT e.*, a.DESCRIPCION AS ARTICULO_BASE_DESCRIPCION FROM ESC_ARTICULO_ARTICULOS e LEFT JOIN MAN_ARTICULOS a ON a.TEMPORADA=e.TEMPORADA_ESC AND a.CODIGO=e.ARTICULO_ESC WHERE e.TEMPORADA=@season' },
  @{ Section='tejidos'; Table='ESC_ARTICULOS_TEJIDOS'; Article='COD_ARTICULO'; Sql='SELECT e.*, t.DESCRIPCION AS TEJIDO_DESCRIPCION, c.DESCRIPCION AS COLOR_ARTICULO_DESCRIPCION FROM ESC_ARTICULOS_TEJIDOS e LEFT JOIN MAN_TEJIDOS t ON t.TEMPORADA=e.TEMPORADA AND t.CODIGO=e.COD_TEJIDO LEFT JOIN MAN_COLORES c ON c.CODIGO=e.COD_COLOR_ARTICULO WHERE e.TEMPORADA=@season' },
  @{ Section='tejidos'; Table='ESC_ARTICULOS_TEJIDOS_COLORES'; Article='COD_ARTICULO'; Sql='SELECT e.*, t.DESCRIPCION AS TEJIDO_DESCRIPCION, c.DESCRIPCION AS COLOR_TEJIDO_DESCRIPCION FROM ESC_ARTICULOS_TEJIDOS_COLORES e LEFT JOIN MAN_TEJIDOS t ON t.TEMPORADA=e.TEMPORADA AND t.CODIGO=e.COD_TEJIDO LEFT JOIN MAN_COLORES c ON c.CODIGO=e.COD_COLOR_TEJIDO WHERE e.TEMPORADA=@season' },
  @{ Section='fornituras'; Table='ESC_ARTICULOS_FORNITURAS'; Article='COD_ARTICULO'; Sql='SELECT e.*, f.DESCRIPCION AS FORNITURA_DESCRIPCION, c.DESCRIPCION AS COLOR_FORNITURA_DESCRIPCION FROM ESC_ARTICULOS_FORNITURAS e LEFT JOIN MAN_FORNITURAS f ON f.TEMPORADA=e.TEMPORADA AND f.CODIGO=e.COD_FORNITURA LEFT JOIN MAN_COLORES c ON c.CODIGO=e.COD_COLOR_FORNITURA WHERE e.TEMPORADA=@season' },
  @{ Section='fornituras'; Table='ESC_ARTICULOS_FORNITURAS_TALLAS'; Article='COD_ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_FORNITURAS_TALLAS WHERE TEMPORADA=@season' },
  @{ Section='bordados'; Table='ESC_ARTICULOS_BORDADOS_ESTAMPADOS'; Article='COD_ARTICULO'; Sql='SELECT e.*, b.DESCRIPCION AS BORDADO_DESCRIPCION FROM ESC_ARTICULOS_BORDADOS_ESTAMPADOS e LEFT JOIN MAN_BORDADOS_ESTAMPADOS b ON b.TEMPORADA=e.TEMPORADA AND b.CODIGO=e.COD_BORDADO_ESTAMPADO WHERE e.TEMPORADA=@season' },
  @{ Section='desarrollo'; Table='ESC_ARTICULOS_DESARROLLO'; Article='COD_ARTICULO'; Sql='SELECT e.*, c.DESCRIPCION AS TIPO_DESARROLLO_DESCRIPCION FROM ESC_ARTICULOS_DESARROLLO e LEFT JOIN ESC_ARTICULOS_DESARROLLO_CONFIGURACION c ON c.POSICION=e.TIPO_DESARROLLO WHERE e.TEMPORADA=@season' },
  @{ Section='desarrollo'; Table='ESC_ARTICULOS_DESARROLLO_IMAGENES'; Article='COD_ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_DESARROLLO_IMAGENES WHERE TEMPORADA=@season' },
  @{ Section='series'; Table='MAN_ARTICULOS_COMBINABLES'; Article='ARTICULO'; Sql='SELECT e.*, a.DESCRIPCION AS ARTICULO_COMBINADO_DESCRIPCION FROM MAN_ARTICULOS_COMBINABLES e LEFT JOIN MAN_ARTICULOS a ON a.TEMPORADA=e.TEMPORADA AND a.CODIGO=e.ARTICULO_COMBINADO WHERE e.TEMPORADA=@season' },
  @{ Section='vivos'; Table='ESC_ARTICULOS_TEJIDOS'; Article='COD_ARTICULO'; Sql="SELECT e.*, v.DESCRIPCION AS VIVO_DESCRIPCION, v.ANCHO AS VIVO_ANCHO, v.PROPORCION AS VIVO_PROPORCION FROM ESC_ARTICULOS_TEJIDOS e LEFT JOIN MAN_VIVOS_MEDIDAS v ON v.CODIGO=e.VIVO WHERE e.TEMPORADA=@season AND COALESCE(e.VIVO,'')<>''" },
  @{ Section='idiomas'; Table='MAN_ARTICULOS_IDIOMAS'; Article='ARTICULO'; Sql='SELECT e.*, i.DESCRIPCION AS IDIOMA_DESCRIPCION FROM MAN_ARTICULOS_IDIOMAS e LEFT JOIN MAN_IDIOMAS i ON i.CODIGO=e.IDIOMA WHERE e.TEMPORADA=@season' },
  @{ Section='imagenes'; Table='MAN_ARTICULOS_IMAGENES'; Article='ARTICULO'; Sql='SELECT * FROM MAN_ARTICULOS_IMAGENES WHERE TEMPORADA=@season' },
  @{ Section='extras'; Table='ESC_ARTICULOS_EXTRAS'; Article='COD_ARTICULO'; Sql='SELECT * FROM ESC_ARTICULOS_EXTRAS WHERE TEMPORADA=@season' }
)

function Convert-DbValue($value) {
  if ($value -is [DBNull]) { return $null }
  if ($value -is [DateTime]) { return $value.ToString('o') }
  if ($value -is [byte[]]) { return [Convert]::ToBase64String($value) }
  return $value
}

$connection = New-Object System.Data.SqlClient.SqlConnection $connectionString
$connection.Open()
$result = [System.Collections.Generic.List[object]]::new()
try {
  foreach ($definition in $queries) {
    $command = $connection.CreateCommand()
    $command.CommandText = $definition.Sql
    $null = $command.Parameters.AddWithValue('@season', $Season)
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter $command
    $table = New-Object System.Data.DataTable
    $null = $adapter.Fill($table)
    foreach ($row in $table.Rows) {
      $data = [ordered]@{}
      foreach ($column in $table.Columns) {
        $data[$column.ColumnName] = Convert-DbValue $row[$column.ColumnName]
      }
      $article = [string]$row[$definition.Article]
      if ([string]::IsNullOrWhiteSpace($article)) { continue }
      $result.Add([ordered]@{
        season = $Season
        article = $article.Trim()
        section = $definition.Section
        sourceTable = $definition.Table
        data = $data
      })
    }
    Write-Host "$($definition.Section) / $($definition.Table): $($table.Rows.Count) filas"
  }
}
finally {
  $connection.Close()
}

$target = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
$directory = [System.IO.Path]::GetDirectoryName($target)
if (-not (Test-Path -LiteralPath $directory)) { $null = New-Item -ItemType Directory -Path $directory }
$json = $result | ConvertTo-Json -Depth 8 -Compress
[System.IO.File]::WriteAllText($target, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "Exportación técnica STM preparada: $($result.Count) filas en $target"
