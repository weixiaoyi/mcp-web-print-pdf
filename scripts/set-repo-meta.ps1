# Sets the GitHub repo "About" metadata (description, website, topics).
#
# Usage:
#   $env:GITHUB_TOKEN = "ghp_..."      # needs repo admin (fine-grained: Administration: write)
#   ./scripts/set-repo-meta.ps1
#
# Without a token the script prints the values to paste into the web UI instead.

param(
  [string]$Owner = "weixiaoyi",
  [string]$Repo = "mcp-web-print-pdf",
  [string]$Description = "让 AI agent（Claude Desktop / Cursor / Cline / VS Code / Codex / dsh）调用本机打印机的 MCP server：HTML、网页、PDF、图片、批量打印，支持热敏小票与面单标签。覆盖 web-print-pdf 2.x 全部公开 API。",
  [string]$Homepage = "https://webprintpdf.com/docs/mcp-print/",
  [string[]]$Topics = @(
    "mcp", "mcp-server", "model-context-protocol", "printing", "printer", "print",
    "silent-print", "html-to-pdf", "web-print-pdf", "thermal-printer", "receipt",
    "label-printer", "claude", "cursor", "cline", "vscode", "ai-agent", "llm",
    "nodejs", "automation"
  )
)

$ErrorActionPreference = "Stop"
$token = $env:GITHUB_TOKEN
if (-not $token) { $token = $env:GH_TOKEN }

if (-not $token) {
  Write-Host "No GITHUB_TOKEN / GH_TOKEN set - paste these into the web UI instead:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Description: $Description"
  Write-Host "Website:     $Homepage"
  Write-Host "Topics:      $($Topics -join ', ')"
  exit 0
}

$headers = @{
  Authorization          = "Bearer $token"
  Accept                 = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent"           = "set-repo-meta"
}
$base = "https://api.github.com/repos/$Owner/$Repo"

Write-Host "PATCH $base (description, homepage)"
$body = @{ description = $Description; homepage = $Homepage } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Patch -Uri $base -Headers $headers -Body $body -ContentType "application/json" | Out-Null

Write-Host "PUT $base/topics"
$topicBody = @{ names = $Topics } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Put -Uri "$base/topics" -Headers $headers -Body $topicBody -ContentType "application/json" | Out-Null

$repoInfo = Invoke-RestMethod -Uri $base -Headers $headers
Write-Host ""
Write-Host "Done:" -ForegroundColor Green
Write-Host "  description: $($repoInfo.description)"
Write-Host "  homepage:    $($repoInfo.homepage)"
Write-Host "  topics:      $($repoInfo.topics -join ', ')"
Write-Host ""
Write-Host "Social preview still needs one upload: Settings -> Social preview -> assets/social-preview.png"
