# PowerShell 脚本：上传文件到服务器
# 使用方法：修改下面的服务器IP，然后运行此脚本

# ============================================
# 配置：请修改这里的服务器IP
# ============================================
$SERVER_IP = "你的服务器IP"  # 请替换为实际服务器IP
$SERVER_PATH = "/root/projects/poly-copy-trading"  # 服务器项目路径

# ============================================
# 检查配置
# ============================================
if ($SERVER_IP -eq "你的服务器IP") {
    Write-Host "❌ 错误：请先修改脚本中的服务器IP地址" -ForegroundColor Red
    Write-Host "   编辑此文件，将 `$SERVER_IP 替换为实际IP" -ForegroundColor Yellow
    exit 1
}

# ============================================
# 获取当前目录
# ============================================
$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $PROJECT_DIR

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "上传文件到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务器IP: $SERVER_IP" -ForegroundColor Yellow
Write-Host "服务器路径: $SERVER_PATH" -ForegroundColor Yellow
Write-Host ""

# ============================================
# 上传文件列表
# ============================================
$FILES_TO_UPLOAD = @(
    @{
        LocalPath = "src\batch-sell.ts"
        RemotePath = "$SERVER_PATH/src/batch-sell.ts"
        Description = "批量出售脚本（已修复SDK导入）"
    },
    @{
        LocalPath = "create-batch-sell.sh"
        RemotePath = "$SERVER_PATH/create-batch-sell.sh"
        Description = "自动创建脚本"
    },
    @{
        LocalPath = "ecosystem.config.js"
        RemotePath = "$SERVER_PATH/ecosystem.config.js"
        Description = "PM2 配置文件"
    }
)

# ============================================
# 上传文件
# ============================================
$SUCCESS_COUNT = 0
$FAIL_COUNT = 0

foreach ($file in $FILES_TO_UPLOAD) {
    $localFile = Join-Path $PROJECT_DIR $file.LocalPath
    
    if (-not (Test-Path $localFile)) {
        Write-Host "⚠️  跳过: $($file.Description)" -ForegroundColor Yellow
        Write-Host "   原因: 本地文件不存在 - $($file.LocalPath)" -ForegroundColor Gray
        $FAIL_COUNT++
        continue
    }
    
    Write-Host "📤 上传: $($file.Description)" -ForegroundColor Cyan
    Write-Host "   本地: $($file.LocalPath)" -ForegroundColor Gray
    Write-Host "   远程: $($file.RemotePath)" -ForegroundColor Gray
    
    try {
        scp $localFile "root@${SERVER_IP}:$($file.RemotePath)"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ 上传成功" -ForegroundColor Green
            $SUCCESS_COUNT++
        } else {
            Write-Host "   ❌ 上传失败 (退出码: $LASTEXITCODE)" -ForegroundColor Red
            $FAIL_COUNT++
        }
    } catch {
        Write-Host "   ❌ 上传失败: $_" -ForegroundColor Red
        $FAIL_COUNT++
    }
    Write-Host ""
}

# ============================================
# 总结
# ============================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "上传完成" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "成功: $SUCCESS_COUNT" -ForegroundColor Green
Write-Host "失败: $FAIL_COUNT" -ForegroundColor $(if ($FAIL_COUNT -gt 0) { "Red" } else { "Gray" })
Write-Host ""

if ($SUCCESS_COUNT -gt 0) {
    Write-Host "✅ 文件已上传到服务器" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：在服务器上执行：" -ForegroundColor Yellow
    Write-Host "  cd $SERVER_PATH" -ForegroundColor White
    Write-Host "  bash create-batch-sell.sh" -ForegroundColor White
    Write-Host "  或" -ForegroundColor White
    Write-Host "  npx tsx src/batch-sell.ts" -ForegroundColor White
}
