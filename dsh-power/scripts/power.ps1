param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('minimize', 'quit', 'restart', 'relaunch', 'probe')]
  [string]$Action,
  [int]$WaitPid = 0,
  [string]$ExePath = '',
  [string]$LogPath = '',
  [int]$TimeoutSeconds = 120
)

# dsh-power: Win32 window actions for the Electron desktop shell.
# ASCII only on purpose: Windows PowerShell 5.1 reads a BOM-less file as ANSI.

$ErrorActionPreference = 'Stop'

function Write-Log([string]$text) {
  if ([string]::IsNullOrWhiteSpace($LogPath)) { return }
  try {
    $dir = Split-Path -Parent $LogPath
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $line = '{0} {1} {2}' -f (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'), $Action, $text
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
  } catch { }
}

function Start-RelaunchHelper([string]$exe) {
  $shell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if (-not (Test-Path -LiteralPath $shell)) { $shell = 'powershell.exe' }
  $line = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -Action relaunch -ExePath "{1}"' -f $PSCommandPath, $exe
  if (-not [string]::IsNullOrWhiteSpace($LogPath)) { $line += ' -LogPath "{0}"' -f $LogPath }
  Start-Process -FilePath $shell -ArgumentList $line -WindowStyle Hidden | Out-Null
}

function Stop-AppWindow([IntPtr]$target, [uint32]$ownerPid, [string]$label) {
  # WM_ENDSESSION first: it marks the session as ending, so the shell's close
  # handler stops preventing default; WM_CLOSE then closes for real instead of
  # only hiding the window to the tray.
  [void][DshPower.Win]::PostMessage($target, 0x0016, [IntPtr]1, [IntPtr]::Zero)   # WM_ENDSESSION
  Start-Sleep -Milliseconds 250
  [void][DshPower.Win]::PostMessage($target, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)  # WM_CLOSE

  $deadline = (Get-Date).AddSeconds(12)
  while ((Get-Date) -lt $deadline) {
    if (-not (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue)) {
      Write-Log ($label + ': graceful quit observed')
      return
    }
    Start-Sleep -Milliseconds 250
  }

  Write-Log ($label + ': graceful quit timed out, force killing')
  $taskkill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
  if (Test-Path -LiteralPath $taskkill) { & $taskkill /PID $ownerPid /T /F | Out-Null }
}

# Relaunch helper: runs on its own, waits until every app process is gone, then
# starts the app again and verifies it actually came up (retrying otherwise).
if ($Action -eq 'relaunch') {
  $appName = [IO.Path]::GetFileNameWithoutExtension($ExePath)
  Write-Log ('relaunch helper started for "' + $appName + '", waiting up to {0}s for it to exit' -f $TimeoutSeconds)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (@(Get-Process -Name $appName -ErrorAction SilentlyContinue).Count -eq 0) { break }
    Start-Sleep -Milliseconds 500
  }
  $leftover = @(Get-Process -Name $appName -ErrorAction SilentlyContinue).Count
  Start-Sleep -Milliseconds 1500
  if ($leftover -gt 0) { Write-Log ('relaunch: ' + $leftover + ' process(es) still alive after the wait, starting anyway') }

  if (-not (Test-Path -LiteralPath $ExePath)) {
    Write-Log ('relaunch: exe missing: ' + $ExePath)
    exit 5
  }

  # Prefer the Start Menu shortcut: the exe alone carries no AppUserModelID, so a
  # direct launch lands in the taskbar as a fresh button with a blank icon.
  # Fall back to the exe when the shortcut is missing or points somewhere else.
  $lnk = Join-Path $env:APPDATA ('Microsoft\Windows\Start Menu\Programs\' + $appName + '.lnk')
  $launchTarget = $ExePath
  $launchLabel = 'exe'
  if (Test-Path -LiteralPath $lnk) {
    $shortcutTarget = ''
    try {
      $shortcutTarget = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk).TargetPath
    } catch {
      Write-Log ('relaunch: cannot read shortcut target: ' + $_.Exception.Message)
    }
    if ([string]::IsNullOrWhiteSpace($shortcutTarget) -or ($shortcutTarget -ieq $ExePath)) {
      $launchTarget = $lnk
      $launchLabel = 'shortcut'
    } else {
      Write-Log ('relaunch: shortcut points elsewhere (' + $shortcutTarget + '), using the exe')
    }
  } else {
    Write-Log ('relaunch: no shortcut at ' + $lnk + ', using the exe')
  }

  $lockfile = Join-Path $env:APPDATA '@deepseek-ai\dsh-desktop\lockfile'
  if ((Test-Path -LiteralPath $lockfile) -and (@(Get-Process -Name $appName -ErrorAction SilentlyContinue).Count -eq 0) -and ($ExePath -match 'DeepSeek Harness\.exe$')) {
    try {
      Remove-Item -LiteralPath $lockfile -Force
      Write-Log 'relaunch: removed a stale single-instance lockfile'
    } catch {
      Write-Log ('relaunch: could not remove lockfile: ' + $_.Exception.Message)
    }
  }

  for ($attempt = 1; $attempt -le 3; $attempt++) {
    $tryShortcut = ($launchLabel -eq 'shortcut' -and $attempt -lt 3)
    $target = if ($tryShortcut) { $launchTarget } else { $ExePath }
    $label = if ($tryShortcut) { 'shortcut' } else { 'exe' }
    try {
      # Ask explorer to start it: the new process belongs to explorer's tree, not
      # ours, so it survives whatever happens to this helper, and a shortcut keeps
      # its AppUserModelID (taskbar identity).
      $explorer = Join-Path $env:SystemRoot 'explorer.exe'
      Start-Process -FilePath $explorer -ArgumentList ('"' + $target + '"') | Out-Null
      Write-Log ('relaunch: launch attempt ' + $attempt + ' via explorer -> ' + $label)
    } catch {
      Write-Log ('relaunch: launch attempt ' + $attempt + ' via ' + $label + ' failed: ' + $_.Exception.Message)
    }

    Start-Sleep -Seconds 8
    $count = @(Get-Process -Name $appName -ErrorAction SilentlyContinue).Count
    if ($count -gt 0) {
      Write-Log ('relaunched via ' + $label + ' (attempt ' + $attempt + ', ' + $count + ' process(es))')
      exit 0
    }
    Write-Log ('relaunch: attempt ' + $attempt + ' via ' + $label + ' produced no process')
    Start-Sleep -Seconds 2
  }

  Write-Log 'relaunch gave up after 3 attempts'
  exit 7
}

$code = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace DshPower {
  public static class Win {
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    public static IntPtr[] Of(uint[] pids) {
      var ids = new HashSet<uint>(pids);
      var found = new List<IntPtr>();
      EnumWindows(delegate (IntPtr handle, IntPtr unused) {
        uint pid;
        GetWindowThreadProcessId(handle, out pid);
        if (ids.Contains(pid)) { found.Add(handle); }
        return true;
      }, IntPtr.Zero);
      return found.ToArray();
    }

    // Prefer the largest visible window; fall back to the largest hidden one.
    public static IntPtr Pick(IntPtr[] windows) {
      IntPtr best = IntPtr.Zero;
      IntPtr fallback = IntPtr.Zero;
      long bestArea = -1;
      long fallbackArea = -1;
      foreach (var handle in windows) {
        RECT rect;
        bool visible = IsWindowVisible(handle);
        long area = -1;
        if (GetWindowRect(handle, out rect)) {
          area = (long)(rect.Right - rect.Left) * (long)(rect.Bottom - rect.Top);
        }
        if (visible && area > bestArea) { bestArea = area; best = handle; }
        if (area > fallbackArea) { fallbackArea = area; fallback = handle; }
      }
      return best != IntPtr.Zero ? best : fallback;
    }
  }
}
'@

Add-Type -TypeDefinition $code -Language CSharp

$procs = @(Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq 'DeepSeek Harness' })
if ($procs.Count -eq 0) {
  Write-Log 'no DeepSeek Harness process'
  exit 3
}

$ids = [uint32[]]@($procs | ForEach-Object { [uint32]$_.Id })
$windows = [DshPower.Win]::Of($ids)
if ($windows.Length -eq 0) {
  Write-Log ('no top-level window for pids ' + ($ids -join ','))
  exit 4
}

$target = [DshPower.Win]::Pick($windows)
if ($target -eq [IntPtr]::Zero) {
  Write-Log 'no usable window'
  exit 4
}

$ownerPid = [uint32]0
[void][DshPower.Win]::GetWindowThreadProcessId($target, [ref]$ownerPid)

if ($Action -eq 'probe') {
  Write-Log ('probe hwnd=' + $target + ' pid=' + $ownerPid)
  Write-Output ('hwnd=' + $target + ' pid=' + $ownerPid)
  exit 0
}

if ($Action -eq 'minimize') {
  [void][DshPower.Win]::ShowWindow($target, 6)  # SW_MINIMIZE
  Write-Log ('minimized hwnd=' + $target)
  exit 0
}

if ($Action -eq 'quit') {
  Write-Log ('quit requested hwnd=' + $target + ' pid=' + $ownerPid)
  Stop-AppWindow $target $ownerPid 'quit'
  exit 0
}

# restart: start the relaunch helper first, then the same quit path.
$exe = $ExePath
if ([string]::IsNullOrWhiteSpace($exe)) {
  try { $exe = (Get-Process -Id $ownerPid -ErrorAction Stop).Path } catch { $exe = '' }
}
if ([string]::IsNullOrWhiteSpace($exe)) {
  Write-Log 'restart: cannot resolve exe path'
  exit 6
}

Start-RelaunchHelper $exe
Write-Log ('restart requested hwnd=' + $target + ' pid=' + $ownerPid + ' exe=' + $exe)
Stop-AppWindow $target $ownerPid 'restart'
exit 0
