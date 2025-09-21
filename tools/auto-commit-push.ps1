param(
  [string]$RepoPath = (Resolve-Path ".").Path,
  [int]$DebounceMs = 3000
)

Write-Host "Auto commit/push watcher starting for $RepoPath (debounce ${DebounceMs}ms)"

# Ensure we're in the repo root
Set-Location $RepoPath

# Debounced action
$timer = New-Object System.Timers.Timer
$timer.Interval = $DebounceMs
$timer.AutoReset = $false
$actionPending = $false

$onElapsed = {
  try {
    $actionPending = $false
    git add . | Out-Null
    $status = git status --porcelain
    if (-not [string]::IsNullOrWhiteSpace($status)) {
      $now = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
      git commit -m "chore(auto): auto-commit $now" | Out-Null
      git push | Out-Null
      Write-Host "[auto] Pushed at $now"
    }
  } catch {
    Write-Warning "[auto] Error: $($_.Exception.Message)"
  }
}
$timer.Add_Elapsed($onElapsed)

# File system watcher
$fsw = New-Object System.IO.FileSystemWatcher
$fsw.Path = $RepoPath
$fsw.IncludeSubdirectories = $true
$fsw.EnableRaisingEvents = $true
$fsw.Filter = "*.*"

$handler = {
  # Debounce multiple rapid events
  $script:actionPending = $true
  $timer.Stop()
  $timer.Start()
}

$createdReg = Register-ObjectEvent $fsw Created -Action $handler
$changedReg = Register-ObjectEvent $fsw Changed -Action $handler
$deletedReg = Register-ObjectEvent $fsw Deleted -Action $handler
$renamedReg = Register-ObjectEvent $fsw Renamed -Action $handler

Write-Host "[auto] Watching for changes. Press Ctrl+C to stop."

try {
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  $timer.Dispose()
  Unregister-Event -SourceIdentifier $createdReg.Name -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier $changedReg.Name -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier $deletedReg.Name -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier $renamedReg.Name -ErrorAction SilentlyContinue
  $fsw.Dispose()
}
