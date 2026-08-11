@echo off
setlocal DisableDelayedExpansion
title ARVIO - Enable "Open in VLC"
echo.
echo   ================================================
echo    ARVIO  -  Enable "Open in VLC" for your browser
echo   ================================================
echo.
echo   This registers the vlc:// link handler so the "Open in VLC"
echo   button on web.arvio.tv opens streams directly in VLC, with no
echo   file download. It only touches YOUR user account (no admin
echo   needed) and changes nothing else.
echo.

REM --- Locate vlc.exe -----------------------------------------------------
REM Keep the first provider-priority match instead of silently replacing it.
set "VLC="
for %%P in (
  "%ProgramFiles%\VideoLAN\VLC\vlc.exe"
  "%ProgramFiles(x86)%\VideoLAN\VLC\vlc.exe"
  "%LOCALAPPDATA%\Programs\VideoLAN\VLC\vlc.exe"
) do if not defined VLC if exist "%%~P" set "VLC=%%~P"

if not defined VLC (
  for /f "usebackq tokens=2,*" %%A in (`reg query "HKLM\SOFTWARE\VideoLAN\VLC" /v InstallDir 2^>nul ^| find "InstallDir"`) do if not defined VLCDIR set "VLCDIR=%%B"
)
if not defined VLC if defined VLCDIR if exist "%VLCDIR%\vlc.exe" set "VLC=%VLCDIR%\vlc.exe"

if not defined VLC (
  echo   [!] Could not find VLC on this PC.
  echo       Install VLC from https://www.videolan.org/vlc/ and run this again.
  echo.
  pause
  exit /b 1
)
echo   Found VLC: %VLC%
echo.

REM --- Extract the embedded PowerShell protocol handler ------------------
REM The handler source is kept after the batch script's final exit. Extracting
REM it avoids interpolating the VLC path into PowerShell source, so paths that
REM contain apostrophes, exclamation marks, or other punctuation stay valid.
set "HANDLERDIR=%LOCALAPPDATA%\ARVIO"
if not exist "%HANDLERDIR%" mkdir "%HANDLERDIR%" >nul 2>&1
if not exist "%HANDLERDIR%" goto :handler_failed

set "HANDLER=%HANDLERDIR%\arvio-vlc.ps1"
set "ARVIO_INSTALLER_PATH=%~f0"
set "ARVIO_HANDLER_PATH=%HANDLER%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$lines = Get-Content -LiteralPath $env:ARVIO_INSTALLER_PATH; $marker = [Array]::IndexOf($lines, ':ARVIO_POWERSHELL_HANDLER'); if ($marker -lt 0 -or $marker -ge ($lines.Count - 1)) { exit 1 }; $utf8 = New-Object Text.UTF8Encoding($false); [IO.File]::WriteAllLines($env:ARVIO_HANDLER_PATH, $lines[($marker + 1)..($lines.Count - 1)], $utf8)"
if errorlevel 1 goto :handler_failed
if not exist "%HANDLER%" goto :handler_failed

REM --- Replace the legacy handler with a delegating shim -----------------
REM Browsers can cache the old .bat handler for their current session.
> "%HANDLERDIR%\arvio-vlc.bat" echo @echo off
if errorlevel 1 goto :handler_failed
>>"%HANDLERDIR%\arvio-vlc.bat" echo powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%%~dp0arvio-vlc.ps1" "%%~1"
if errorlevel 1 goto :handler_failed

REM --- Register vlc:// under the current user (no admin required) ---------
REM Check every registry write; checking only the final command can hide a
REM partially installed protocol handler.
reg add "HKCU\Software\Classes\vlc" /ve /t REG_SZ /d "URL:vlc Protocol" /f >nul 2>&1
if errorlevel 1 goto :registration_failed
reg add "HKCU\Software\Classes\vlc" /v "URL Protocol" /t REG_SZ /d "" /f >nul 2>&1
if errorlevel 1 goto :registration_failed
reg add "HKCU\Software\Classes\vlc\DefaultIcon" /ve /t REG_SZ /d "\"%VLC%\",0" /f >nul 2>&1
if errorlevel 1 goto :registration_failed
reg add "HKCU\Software\Classes\vlc\shell\open\command" /ve /t REG_SZ /d "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%HANDLER%\" \"%%1\"" /f >nul 2>&1
if errorlevel 1 goto :registration_failed

echo   ================================================
echo    Done!  "Open in VLC" now works on web.arvio.tv.
echo   ================================================
echo.
echo   Go back to ARVIO and click "Open in VLC" on any source.
echo   (You can close this window.)
echo.
pause
exit /b 0

:handler_failed
echo   [!] Could not create the secure VLC protocol handler.
echo.
pause
exit /b 1

:registration_failed
echo   [!] Registration failed. No partial installation was accepted.
echo.
pause
exit /b 1

:ARVIO_POWERSHELL_HANDLER
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Url,
    [switch]$ValidateOnly
)

# Browsers may normalize vlc://https:// into https:/ or https//. Repair only
# that separator, then validate the complete result before starting VLC.
$candidate = $Url -replace '^vlc:/*', ''
$candidate = $candidate -replace '^(https?)[:/]+', '$1://'

# Start-Process serializes ArgumentList back to a Windows command line. Raw
# whitespace, controls, or quotes could create additional VLC arguments.
if ([string]::IsNullOrWhiteSpace($candidate) -or $candidate -match '[\x00-\x20\x7F"]') {
    exit 2
}

$mediaUri = $null
if (-not [Uri]::TryCreate($candidate, [UriKind]::Absolute, [ref]$mediaUri)) {
    exit 2
}
if ($mediaUri.Scheme -notin @('http', 'https') -or [string]::IsNullOrWhiteSpace($mediaUri.DnsSafeHost)) {
    exit 2
}

$validatedUrl = $mediaUri.AbsoluteUri
if ($ValidateOnly) {
    [Console]::Out.WriteLine($validatedUrl)
    exit 0
}

$vlcCandidates = @()
if ($env:ProgramFiles) {
    $vlcCandidates += Join-Path $env:ProgramFiles 'VideoLAN\VLC\vlc.exe'
}
if (${env:ProgramFiles(x86)}) {
    $vlcCandidates += Join-Path ${env:ProgramFiles(x86)} 'VideoLAN\VLC\vlc.exe'
}
if ($env:LOCALAPPDATA) {
    $vlcCandidates += Join-Path $env:LOCALAPPDATA 'Programs\VideoLAN\VLC\vlc.exe'
}

foreach ($key in @('HKLM:\SOFTWARE\VideoLAN\VLC', 'HKLM:\SOFTWARE\WOW6432Node\VideoLAN\VLC')) {
    try {
        $installDir = (Get-ItemProperty -LiteralPath $key -Name InstallDir -ErrorAction Stop).InstallDir
        if ($installDir) {
            $vlcCandidates += Join-Path $installDir 'vlc.exe'
        }
    } catch {
        # Try the next supported location.
    }
}

$vlc = $vlcCandidates |
    Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } |
    Select-Object -First 1
if (-not $vlc) {
    exit 3
}

# The validated URL contains no token separators and is passed as one media
# argument. It can no longer append VLC command-line options.
Start-Process -FilePath $vlc -ArgumentList $validatedUrl -ErrorAction Stop
