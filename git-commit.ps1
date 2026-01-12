# Git 代码提交脚本 (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git 代码提交脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git 是否安装
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git not found"
    }
    Write-Host "[1/5] Git 已安装: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到 Git，请先安装 Git" -ForegroundColor Red
    Write-Host "下载地址: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

# 检查 Git 仓库
Write-Host "[2/5] 检查 Git 仓库状态..." -ForegroundColor Yellow
if (-not (Test-Path .git)) {
    Write-Host "[2/5] 初始化 Git 仓库..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] Git 初始化失败" -ForegroundColor Red
        Read-Host "按 Enter 键退出"
        exit 1
    }
} else {
    Write-Host "[2/5] Git 仓库已存在" -ForegroundColor Green
}

# 添加文件
Write-Host "[3/5] 添加所有文件到暂存区..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 添加文件失败" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

# 查看状态
Write-Host "[4/5] 查看待提交的文件..." -ForegroundColor Yellow
git status --short
Write-Host ""

# 提交
Write-Host "[5/5] 提交更改..." -ForegroundColor Yellow
git commit -m "feat: 添加批量出售代币功能，增强错误处理和统计功能"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[错误] 提交失败" -ForegroundColor Red
    Read-Host "按 Enter 键退出"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ 代码提交成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "提交信息:" -ForegroundColor Cyan
git log --oneline -1
Write-Host ""
Write-Host "如果需要推送到远程仓库，请执行:" -ForegroundColor Yellow
Write-Host "  git remote add origin <你的仓库地址>" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host ""
Read-Host "按 Enter 键退出"
