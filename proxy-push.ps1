# PowerShell script: Push to GitHub using proxy

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Push to GitHub using Proxy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Common proxy ports
$PROXY_PORTS = @(
    @{ Type = "HTTP"; Port = 7890; Desc = "Clash default" },
    @{ Type = "HTTP"; Port = 10809; Desc = "Clash alternative" },
    @{ Type = "SOCKS5"; Port = 1080; Desc = "Shadowsocks/V2Ray default" },
    @{ Type = "SOCKS5"; Port = 10808; Desc = "V2Ray common" },
    @{ Type = "HTTP"; Port = 8080; Desc = "Generic HTTP proxy" }
)

Write-Host "Select your proxy type and port:" -ForegroundColor Yellow
Write-Host ""

for ($i = 0; $i -lt $PROXY_PORTS.Count; $i++) {
    $proxy = $PROXY_PORTS[$i]
    Write-Host "  $($i + 1). $($proxy.Type) - Port $($proxy.Port) ($($proxy.Desc))" -ForegroundColor White
}
Write-Host "  $($PROXY_PORTS.Count + 1). Enter proxy address manually" -ForegroundColor White
Write-Host "  $($PROXY_PORTS.Count + 2). Use system proxy" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select (1-$($PROXY_PORTS.Count + 2))"

if ($choice -ge 1 -and $choice -le $PROXY_PORTS.Count) {
    $selected = $PROXY_PORTS[$choice - 1]
    $proxyUrl = if ($selected.Type -eq "HTTP") {
        "http://127.0.0.1:$($selected.Port)"
    } else {
        "socks5://127.0.0.1:$($selected.Port)"
    }
    Write-Host ""
    Write-Host "Using proxy: $proxyUrl" -ForegroundColor Cyan
    
    git config --global http.proxy $proxyUrl
    git config --global https.proxy $proxyUrl
    
} elseif ($choice -eq ($PROXY_PORTS.Count + 1)) {
    Write-Host ""
    $proxyUrl = Read-Host "Enter proxy address (e.g., http://127.0.0.1:7890 or socks5://127.0.0.1:1080)"
    
    if ($proxyUrl) {
        git config --global http.proxy $proxyUrl
        git config --global https.proxy $proxyUrl
        Write-Host "Proxy configured: $proxyUrl" -ForegroundColor Green
    } else {
        Write-Host "Error: No proxy address entered" -ForegroundColor Red
        exit 1
    }
    
} elseif ($choice -eq ($PROXY_PORTS.Count + 2)) {
    Write-Host ""
    Write-Host "Using system proxy..." -ForegroundColor Cyan
    git config --global --unset http.proxy
    git config --global --unset https.proxy
    Write-Host "Cleared Git proxy config, will use system proxy" -ForegroundColor Green
} else {
    Write-Host "Invalid selection" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host ""

git push -u origin main

$pushResult = $LASTEXITCODE

if ($pushResult -eq 0) {
    Write-Host ""
    Write-Host "Success! Code pushed to GitHub" -ForegroundColor Green
    Write-Host ""
    $clearProxy = Read-Host "Clear proxy config? (Y/N)"
    
    if ($clearProxy -eq "Y" -or $clearProxy -eq "y") {
        git config --global --unset http.proxy
        git config --global --unset https.proxy
        Write-Host "Proxy config cleared" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "Push failed (exit code: $pushResult)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. Proxy not running or wrong port" -ForegroundColor White
    Write-Host "  2. Wrong proxy address" -ForegroundColor White
    Write-Host "  3. Network connection issue" -ForegroundColor White
}

Write-Host ""
