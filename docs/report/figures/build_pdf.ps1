# Builds docs/report/DISCRETA_Project_Report.pdf from PROJECT_REPORT.md.
#
#   powershell -ExecutionPolicy Bypass -File docs/report/figures/build_pdf.ps1
#
# Needs pandoc and Google Chrome (or Microsoft Edge). If `npm install` has been run in frontend/, the same
# self-hosted fonts as the application (Inter, Space Grotesk, IBM Plex Mono) are used; otherwise the CSS falls
# back to system fonts. The figures are regenerated first with `python build_figures.py`.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$report = Resolve-Path (Join-Path $here '..')
$repo = Resolve-Path (Join-Path $report '..\..')
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) 'discreta-report'
New-Item -ItemType Directory -Force $tmp | Out-Null

python (Join-Path $here 'build_figures.py')

# Optional: reuse the application's fonts.
$fonts = Join-Path $repo 'frontend\node_modules'
$faces = ''
function Add-Face($family, $file, $weight) {
  if (Test-Path $file) {
    $url = 'file:///' + ($file -replace '\\', '/')
    $script:faces += "@font-face{font-family:'$family';src:url('$url') format('woff2');font-weight:$weight;font-style:normal;}`n"
  }
}
Add-Face 'Inter' (Join-Path $fonts '@fontsource-variable\inter\files\inter-latin-wght-normal.woff2') '100 900'
Add-Face 'Space Grotesk' (Join-Path $fonts '@fontsource-variable\space-grotesk\files\space-grotesk-latin-wght-normal.woff2') '300 700'
Add-Face 'IBM Plex Mono' (Join-Path $fonts '@fontsource\ibm-plex-mono\files\ibm-plex-mono-latin-400-normal.woff2') '400'
Add-Face 'IBM Plex Mono' (Join-Path $fonts '@fontsource\ibm-plex-mono\files\ibm-plex-mono-latin-500-normal.woff2') '500'
$css = Join-Path $tmp 'report.css'
Set-Content -Encoding utf8 $css ($faces + (Get-Content -Raw (Join-Path $here 'report.css')))

$html = Join-Path $tmp 'report.html'
Push-Location $report
pandoc PROJECT_REPORT.md --from gfm --to html5 --standalone --embed-resources --css $css `
  --metadata pagetitle='DISCRETA: Classical Cryptography and Frequency Analysis Laboratory' --metadata lang=en `
  --resource-path=$report -o $html
Pop-Location

$chrome = @('C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Chrome or Edge is required to print the PDF.' }

$pdf = Join-Path $report 'DISCRETA_Project_Report.pdf'
& $chrome --headless=new --disable-gpu --no-pdf-header-footer "--print-to-pdf=$pdf" ('file:///' + ($html -replace '\\', '/'))
Start-Sleep -Seconds 2
if (-not (Test-Path $pdf)) { throw 'The PDF was not created.' }
Write-Output ("PDF written: $pdf (" + [math]::Round((Get-Item $pdf).Length / 1KB) + ' KB)')
