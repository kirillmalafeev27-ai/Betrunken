[CmdletBinding()]
param(
  [string]$CommitMessage = 'Fix wave effects during quiz tasks',
  [string]$Repository = 'https://github.com/kirillmalafeev27-ai/Betrunken.git',
  [string]$Branch = 'claude/move-question-banner-HZEjB'
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)

  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Test-GitSuccess {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)

  # Windows PowerShell 5.1 can turn expected native stderr into a terminating
  # error when the script uses ErrorActionPreference=Stop. These probes use
  # Git's exit code instead and intentionally silence their output.
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & git @GitArgs *> $null
    return $LASTEXITCODE -eq 0
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git is not installed or is not available in PATH.'
}

$newRepository = -not (Test-GitSuccess rev-parse --is-inside-work-tree)
if ($newRepository) {
  Invoke-Git init
}

# Git for Windows can use the system certificate store. This keeps TLS
# verification enabled and avoids local OpenSSL CA-chain issues.
if ($env:OS -eq 'Windows_NT') {
  Invoke-Git config --local http.sslBackend schannel
}

# A previous interrupted first run may already have created .git without a
# commit. Treat that state like a fresh repository so rerunning is safe.
$hasLocalHistory = Test-GitSuccess rev-parse --verify HEAD

$remotes = @(& git remote)
if ($LASTEXITCODE -ne 0) {
  throw 'Could not list Git remotes.'
}
if ($remotes -contains 'origin') {
  $origin = (& git remote get-url origin).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not read the origin URL.'
  }
  if ($origin -ne $Repository) {
    Invoke-Git remote set-url origin $Repository
  }
} else {
  Invoke-Git remote add origin $Repository
}

Invoke-Git fetch origin $Branch

if (-not $hasLocalHistory) {
  # Attach the new local repository to the existing remote history without
  # replacing any files in this folder. The following add/commit records only
  # the actual difference between the downloaded project and the branch.
  Invoke-Git reset --mixed "origin/$Branch"
  Invoke-Git branch -M $Branch
} else {
  $currentBranch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not determine the current Git branch.'
  }
  if ($currentBranch -ne $Branch) {
    throw "Current branch is '$currentBranch'. Switch to '$Branch' before running this script."
  }
}

Invoke-Git add -A
$hasChanges = -not (Test-GitSuccess diff --cached --quiet)

if ($hasChanges) {
  Invoke-Git commit -m $CommitMessage
} else {
  Write-Host 'No local changes to commit.'
}

Invoke-Git push -u origin $Branch
Write-Host "Pushed to $Repository ($Branch)."
