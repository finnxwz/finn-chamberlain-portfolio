param([switch]$Check)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runtimeFolder = Join-Path $env:TEMP 'opencode\gallery-python'
$python = Join-Path $runtimeFolder 'python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    Write-Host 'Lokale Vorschau wird vorbereitet. Python wird einmalig portabel von python.org geladen.'
    $parent = Split-Path -Parent $runtimeFolder
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    $archive = Join-Path $parent 'gallery-python.zip'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.13.2/python-3.13.2-embed-amd64.zip' -OutFile $archive -UseBasicParsing
    Expand-Archive -LiteralPath $archive -DestinationPath $runtimeFolder -Force
}

& $python (Join-Path $PSScriptRoot 'build_gallery.py') --root $root
if ($LASTEXITCODE -ne 0) { throw 'Die Vorschau konnte nicht gebaut werden. Bitte die Fehlermeldung oben pruefen.' }

# Freien lokalen Port verwenden; kein Zugriff von anderen Computern im Netzwerk.
$probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$probe.Start()
$port = $probe.LocalEndpoint.Port
$probe.Stop()
$url = "http://127.0.0.1:$port/galerie/"
$server = Start-Process -FilePath $python -ArgumentList @('-m', 'http.server', "$port", '--bind', '127.0.0.1') -WorkingDirectory (Join-Path $root '_site') -NoNewWindow -PassThru

try {
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        if ($server.HasExited) { throw 'Der lokale Webserver konnte nicht gestartet werden.' }
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
    }
    if (-not $ready) { throw 'Der lokale Webserver antwortet nicht.' }
    Write-Host "Vorschau: $url"
    Write-Host 'Verwende das vereinbarte Galeriepasswort.'
    Write-Host 'Dieses Fenster offen lassen. Nach Dateiaenderungen die Vorschau neu starten.'
    if (-not $Check) {
        Start-Process $url
        Wait-Process -Id $server.Id
    }
} finally {
    if (-not $server.HasExited) { Stop-Process -Id $server.Id }
}
