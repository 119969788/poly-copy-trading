# 上传 batch-sell.ts 到服务器
# 服务器IP: 43.155.236.204

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "上传 batch-sell.ts 到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务器IP: 43.155.236.204" -ForegroundColor Yellow
Write-Host "目标路径: /root/projects/poly-copy-trading/src/" -ForegroundColor Yellow
Write-Host ""

# 切换到项目目录
$PROJECT_DIR = "D:\000\poly-copy-trading-main"
Set-Location $PROJECT_DIR

# 检查文件是否存在
$FILE = "src\batch-sell.ts"
if (-not (Test-Path $FILE)) {
    Write-Host "❌ 错误：文件不存在 - $FILE" -ForegroundColor Red
    exit 1
}

Write-Host "📤 正在上传文件..." -ForegroundColor Cyan
Write-Host "   本地文件: $FILE" -ForegroundColor Gray
Write-Host "   远程路径: root@43.155.236.204:/root/projects/poly-copy-trading/src/batch-sell.ts" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  提示：如果提示输入密码，请输入服务器密码" -ForegroundColor Yellow
Write-Host ""

# 执行上传
scp $FILE root@43.155.236.204:/root/projects/poly-copy-trading/src/

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 上传成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：在服务器上执行：" -ForegroundColor Yellow
    Write-Host "  ssh root@43.155.236.204" -ForegroundColor White
    Write-Host "  cd /root/projects/poly-copy-trading" -ForegroundColor White
    Write-Host "  head -20 src/batch-sell.ts  # 验证文件" -ForegroundColor White
    Write-Host "  npx tsx src/batch-sell.ts   # 测试运行" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ 上传失败 (退出码: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "  1. 需要输入密码（请在命令行中手动输入）" -ForegroundColor Gray
    Write-Host "  2. 网络连接问题" -ForegroundColor Gray
    Write-Host "  3. 服务器路径不正确" -ForegroundColor Gray
    Write-Host ""
    Write-Host "手动执行命令：" -ForegroundColor Yellow
    Write-Host "  scp src\batch-sell.ts root@43.155.236.204:/root/projects/poly-copy-trading/src/" -ForegroundColor White
}
