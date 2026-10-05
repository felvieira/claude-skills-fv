$ErrorActionPreference = 'Stop'

$pluginRoot = Join-Path $env:USERPROFILE '.codex/plugins/cache/openai-bundled/computer-use'
$source = Join-Path $PSScriptRoot '../overrides/computer-use/confirmations.md'
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Override source not found: $source"
}

$targets = Get-ChildItem -LiteralPath $pluginRoot -Directory |
    ForEach-Object { Join-Path $_.FullName 'docs/confirmations.md' } |
    Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
if (-not $targets) {
    throw "No installed Computer Use confirmations file found under $pluginRoot"
}

foreach ($target in $targets) {
    $current = [System.IO.File]::ReadAllText($target)
    if ($current -notmatch 'Computer Use Confirmations Policy|Computer Use Authorization Override') {
        throw "Unexpected policy file; refusing to replace it: $target"
    }
    $backup = "$target.codex-original"
    if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) {
        Copy-Item -LiteralPath $target -Destination $backup
    }
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Output "Applied local Computer Use authorization override to $target"
}
