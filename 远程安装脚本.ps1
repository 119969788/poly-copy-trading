# 远程安装脚本 - 109.176.207.148
# 使用方法：在本地 PowerShell 中运行此脚本

$SERVER_IP = "109.176.207.148"
$SERVER_USER = "root"
$SERVER_PASSWORD = '$Sun3034197*'
$PROJECT_DIR = "/root/poly-copy-trading"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Polymarket 自动跟单系统 - 远程安装" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务器: $SERVER_USER@$SERVER_IP" -ForegroundColor Yellow
Write-Host ""

# 检查是否安装了 sshpass（用于自动输入密码）
$sshpassInstalled = $false
if (Get-Command sshpass -ErrorAction SilentlyContinue) {
    $sshpassInstalled = $true
}

if (-not $sshpassInstalled) {
    Write-Host "⚠️  未检测到 sshpass，将需要手动输入密码" -ForegroundColor Yellow
    Write-Host "   或者安装 sshpass 以实现自动化" -ForegroundColor Gray
    Write-Host ""
}

# 安装命令（将在服务器上执行）
$installCommands = @"
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 pnpm 和 PM2
npm install -g pnpm pm2

# 安装 Git
apt install -y git

# 克隆仓库
cd /root
if [ -d "poly-copy-trading" ]; then
    echo "项目目录已存在，更新代码..."
    cd poly-copy-trading
    git pull origin main
else
    git clone https://github.com/119969788/poly-copy-trading.git
    cd poly-copy-trading
fi

# 安装依赖
pnpm install

# 创建 .env 文件（如果不存在）
if [ ! -f ".env" ]; then
    cp env.example.txt .env
    echo ".env 文件已创建，请手动编辑添加私钥"
fi

echo ""
echo "=========================================="
echo "✅ 安装完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 编辑 .env 文件: nano .env"
echo "2. 测试运行: npx tsx src/index.ts"
echo "3. 启动 PM2: pm2 start ecosystem.config.cjs"
"@

Write-Host "准备执行远程安装..." -ForegroundColor Cyan
Write-Host ""

# 创建临时脚本文件
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$installCommands | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "📤 上传安装脚本到服务器..." -ForegroundColor Cyan

try {
    # 上传脚本
    if ($sshpassInstalled) {
        $env:SSHPASS = $SERVER_PASSWORD
        sshpass -e scp $tempScript "${SERVER_USER}@${SERVER_IP}:/tmp/install.sh"
    } else {
        scp $tempScript "${SERVER_USER}@${SERVER_IP}:/tmp/install.sh"
    }
    
    Write-Host "✅ 脚本上传成功" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 在服务器上执行安装..." -ForegroundColor Cyan
    Write-Host ""
    
    # 执行安装
    if ($sshpassInstalled) {
        sshpass -e ssh "${SERVER_USER}@${SERVER_IP}" "bash /tmp/install.sh"
    } else {
        ssh "${SERVER_USER}@${SERVER_IP}" "bash /tmp/install.sh"
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ 远程安装完成！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "下一步操作：" -ForegroundColor Yellow
    Write-Host "1. 连接到服务器: ssh $SERVER_USER@$SERVER_IP" -ForegroundColor White
    Write-Host "2. 编辑 .env 文件: cd $PROJECT_DIR && nano .env" -ForegroundColor White
    Write-Host "3. 添加私钥: POLYMARKET_PRIVATE_KEY=your_private_key" -ForegroundColor White
    Write-Host "4. 测试运行: npx tsx src/index.ts" -ForegroundColor White
    Write-Host "5. 启动 PM2: pm2 start ecosystem.config.cjs" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "❌ 安装过程中出现错误: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动执行以下步骤：" -ForegroundColor Yellow
    Write-Host "1. 连接到服务器: ssh $SERVER_USER@$SERVER_IP" -ForegroundColor White
    Write-Host "2. 按照 服务器安装-109.176.207.148.md 中的步骤操作" -ForegroundColor White
} finally {
    # 清理临时文件
    if (Test-Path $tempScript) {
        Remove-Item $tempScript -Force
    }
}
