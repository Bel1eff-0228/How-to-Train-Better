param([string]$PythonExe = 'python')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "步骤失败：$Program $Arguments" }
}
Invoke-Checked 'node' @('tools/build.mjs')
$testFiles = Get-ChildItem -LiteralPath 'tests' -Filter '*.test.mjs' | ForEach-Object { $_.FullName }
Invoke-Checked 'node' (@('--test') + $testFiles)
Invoke-Checked $PythonExe @('tools/build_pdf.py')
Invoke-Checked $PythonExe @('tools/package_release.py')
Invoke-Checked $PythonExe @('tools/package_source.py')
Invoke-Checked $PythonExe @('tools/qa_clean.py')
Write-Host '本地候选已生成并验证重建。发布前仍需实际问答、浏览器及PDF人工验收；本工具不上传。'
