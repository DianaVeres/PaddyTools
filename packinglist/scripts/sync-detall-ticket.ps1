param(
    [string]$ConfigPath = "$PSScriptRoot\detall-sync.local.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "No encuentro la configuracion: $ConfigPath"
}
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($config.siteUrl) -or [string]::IsNullOrWhiteSpace($config.token)) {
    throw "La configuracion necesita siteUrl y token."
}

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Clean([string]$value) {
    if ($null -eq $value) { return "" }
    return ($value -replace "`r", " " -replace "`n", " " -replace "`t", " ").Trim()
}

function ChildText($element) {
    $condition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Text
    )
    $text = $element.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    if ($null -eq $text) { return (Clean $element.Current.Name) }
    return (Clean $text.Current.Name)
}

function ReadGrid($grid) {
    $headers = @()
    $condition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::HeaderItem
    )
    $items = $grid.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
    for ($i = 0; $i -lt $items.Count; $i++) { $headers += (Clean $items.Item($i).Current.Name) }

    $rows = @{}
    $selectedRows = @{}
    $all = $grid.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    for ($i = 0; $i -lt $all.Count; $i++) {
        $element = $all.Item($i)
        $gridPattern = $null
        if (-not $element.TryGetCurrentPattern([System.Windows.Automation.GridItemPattern]::Pattern, [ref]$gridPattern)) { continue }
        $row = [int]$gridPattern.Current.Row
        $col = [int]$gridPattern.Current.Column
        $value = ChildText $element
        if ([string]::IsNullOrWhiteSpace($value)) { continue }
        if (-not $rows.ContainsKey($row)) { $rows[$row] = @{} }
        $rows[$row][$col] = $value

        $parent = [System.Windows.Automation.TreeWalker]::ControlViewWalker.GetParent($element)
        $selection = $null
        if ($null -ne $parent -and $parent.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection) -and $selection.Current.IsSelected) {
            $selectedRows[$row] = $true
        }
    }
    return @{ Headers = $headers; Rows = $rows; SelectedRows = $selectedRows }
}

function Column($gridData, [int]$row, [string[]]$names, [int]$fallback = -1) {
    for ($i = 0; $i -lt $gridData.Headers.Count; $i++) {
        $header = (Clean $gridData.Headers[$i]).ToUpperInvariant()
        foreach ($name in $names) {
            if ($header -like "*$($name.ToUpperInvariant())*") {
                if ($gridData.Rows[$row].ContainsKey($i)) { return $gridData.Rows[$row][$i] }
            }
        }
    }
    if ($fallback -ge 0 -and $gridData.Rows[$row].ContainsKey($fallback)) { return $gridData.Rows[$row][$fallback] }
    return ""
}

$process = Get-Process DETALLWPF -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -eq $process) { throw "Abre DetallWPF y deja seleccionado el ticket en Reimpresion de Ticket." }
$root = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
if ($null -eq $root) { throw "No puedo leer la ventana de DetallWPF." }

$gridCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::DataGrid
)
$grids = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $gridCondition)
$ticketGrid = $null
$detailGrid = $null
for ($i = 0; $i -lt $grids.Count; $i++) {
    $data = ReadGrid $grids.Item($i)
    $headerText = ($data.Headers -join " ").ToUpperInvariant()
    if ($headerText -match "CODIGO" -and $headerText -match "FECHA" -and $headerText -match "IMPORTE") {
        $ticketGrid = $data
    }
    if ($headerText -match "ARTICULO" -and $headerText -match "TALLA" -and $headerText -match "UNID") {
        $detailGrid = $data
    }
}
if ($null -eq $ticketGrid -or $ticketGrid.Rows.Count -eq 0) {
    throw "No encuentro el listado. Abre Reimpresion de Ticket, busca el ticket y seleccionalo."
}

$rowNumber = @($ticketGrid.SelectedRows.Keys | Sort-Object)[0]
if ($null -eq $rowNumber) { $rowNumber = @($ticketGrid.Rows.Keys | Sort-Object)[0] }
$number = Column $ticketGrid $rowNumber @("CODIGO", "TICKET") 0
if ([string]::IsNullOrWhiteSpace($number)) { throw "No he podido leer el numero de ticket." }

$items = @()
if ($null -ne $detailGrid) {
    foreach ($row in ($detailGrid.Rows.Keys | Sort-Object)) {
        $items += [ordered]@{
            code = Column $detailGrid $row @("ARTICULO", "CODIGO") 1
            description = Column $detailGrid $row @("DESCRIPCION", "PRENDA") 2
            size = Column $detailGrid $row @("TALLA") 3
            color = Column $detailGrid $row @("COLOR") 5
            units = Column $detailGrid $row @("UNID", "CANTIDAD") 6
            price = Column $detailGrid $row @("IMPORTE") 7
            total = Column $detailGrid $row @("IMPORTE_TOTAL", "TOTAL") 8
        }
    }
}

$payload = [ordered]@{
    ticket_number = $number
    date = Column $ticketGrid $rowNumber @("FECHA") 1
    customer = Column $ticketGrid $rowNumber @("CLIENTE") 2
    operator = Column $ticketGrid $rowNumber @("OPERARIO") 5
    total = Column $ticketGrid $rowNumber @("IMPORTE", "TOTAL") 4
    store = ""
    payment = ""
    items = $items
}

$endpoint = $config.siteUrl.TrimEnd('/') + '/api/tickets'
$headers = @{ Authorization = "Bearer $($config.token)" }
$response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType "application/json; charset=utf-8" -Body ($payload | ConvertTo-Json -Depth 8)
Write-Host "Ticket $number sincronizado correctamente con Gestion Unificada." -ForegroundColor Green
