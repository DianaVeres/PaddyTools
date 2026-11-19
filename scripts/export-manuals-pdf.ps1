$ErrorActionPreference = 'Stop'
$docs = Join-Path $PSScriptRoot '..\docs\manuales'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    foreach ($name in @('Manual_completo_PaddyTools','Guia_rapida_visual_PaddyTools')) {
        $input = (Resolve-Path (Join-Path $docs "$name.docx")).Path
        $output = Join-Path $docs "$name.pdf"
        $doc = $word.Documents.Open($input, $false, $true)
        try { $doc.ExportAsFixedFormat($output, 17) }
        finally { $doc.Close($false) }
    }
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
