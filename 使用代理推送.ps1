# PowerShell 脚本：使用代理推送 GitHub
# 自动检测并配置代理

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "使用代理推送 GitHub" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 常见代理端口列表
$PROXY_PORTS = @(
    @{ Type = "HTTP"; Port = 7890; Desc = "Clash 默认端口" },
    @{ Type = "HTTP"; Port = 10809; Desc = "Clash 备用端口" },
    @{ Type = "SOCKS5"; Port = 1080; Desc = "Shadowsocks/V2Ray 默认端口" },
    @{ Type = "SOCKS5"; Port = 10808; Desc = "V2Ray 常用端口" },
    @{ Type = "HTTP"; Port = 8080; Desc = "通用 HTTP 代理" }
)

Write-Host "请选择你的代理类型和端口：" -ForegroundColor Yellow
Write-Host ""

# 显示选项
for ($i = 0; $i -lt $PROXY_PORTS.Count; $i++) {
    $proxy = $PROXY_PORTS[$i]
    Write-Host "  $($i + 1). $($proxy.Type) - 端口 $($proxy.Port) ($($proxy.Desc))" -ForegroundColor White
}
Write-Host "  $($PROXY_PORTS.Count + 1). 手动输入代理地址" -ForegroundColor White
Write-Host "  $($PROXY_PORTS.Count + 2). 使用系统代理设置" -ForegroundColor White
Write-Host ""

$choice = Read-Host "请选择 (1-$($PROXY_PORTS.Count + 2))"

if ($choice -ge 1 -and $choice -le $PROXY_PORTS.Count) {
    $selected = $PROXY_PORTS[$choice - 1]
    $proxyUrl = if ($selected.Type -eq "HTTP") {
        "http://127.0.0.1:$($selected.Port)"
    } else {
        "socks5://127.0.0.1:$($selected.Port)"
    }
    Write-Host ""
    Write-Host "使用代理: $proxyUrl" -ForegroundColor Cyan
    
    # 配置代理
    git config --global http.proxy $proxyUrl
    git config --global https.proxy $proxyUrl
    
} elseif ($choice -eq ($PROXY_PORTS.Count + 1)) {
    Write-Host ""
    $proxyUrl = Read-Host "请输入代理地址 (例如: http://127.0.0.1:7890 或 socks5://127.0.0.1:1080)"
    
    if ($proxyUrl) {
        git config --global http.proxy $proxyUrl
        git config --global https.proxy $proxyUrl
        Write-Host "已配置代理: $proxyUrl" -ForegroundColor Green
    } else {
        Write-Host "❌ 未输入代理地址" -ForegroundColor Red
        exit 1
    }
    
} elseif ($choice -eq ($PROXY_PORTS.Count + 2)) {
    Write-Host ""
    Write-Host "使用系统代理设置..." -ForegroundColor Cyan
    # Git 会自动使用系统代理，不需要额外配置
    git config --global --unset http.proxy
    git config --global --unset https.proxy
    Write-Host "已清除 Git 代理配置，将使用系统代理" -ForegroundColor Green
} else {
    Write-Host "❌ 无效选择" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "正在推送代码到 GitHub..." -ForegroundColor Yellow
Write-Host ""

# 推送代码
git push -u origin main

$pushResult = $LASTEXITCODE

if ($pushResult -eq 0) {
    Write-Host ""
    Write-Host "✅ 推送成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "是否清除代理配置？" -ForegroundColor Yellow
    $clearProxy = Read-Host "清除代理配置？(Y/N)"
    
    if ($clearProxy -eq "Y" -or $clearProxy -eq "y") {
        git config --global --unset http.proxy
        git config --global --unset https.proxy
        Write-Host "✅ 已清除代理配置" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "❌ 推送失败 (退出码: $pushResult)" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "  1. 代理未运行或端口不正确" -ForegroundColor White
    Write-Host "  2. 代理地址配置错误" -ForegroundColor White
    Write-Host "  3. 网络连接问题" -ForegroundColor White
    Write-Host ""
    Write-Host "建议：" -ForegroundColor Yellow
    Write-Host "  1. 检查代理软件是否运行" -ForegroundColor White
    Write-Host "  2. 确认代理端口是否正确" -ForegroundColor White
    Write-Host "  3. 尝试使用系统代理设置" -ForegroundColor White
    Write-Host "  4. 或使用 GitHub Desktop 推送" -ForegroundColor White
}

Write-Host ""
