# Git 仓库初始化脚本
# 在安装了 Git 的环境中运行此脚本

Write-Host "正在初始化 Git 仓库..." -ForegroundColor Green
git init

Write-Host "正在添加文件到暂存区..." -ForegroundColor Green
git add .

Write-Host "正在创建初始提交..." -ForegroundColor Green
git commit -m "Initial commit: Polymarket copy trading bot"

Write-Host "`n正在添加远程仓库..." -ForegroundColor Green
git remote add origin https://github.com/119969788/poly-copy-trading.git

Write-Host "正在设置主分支为 main..." -ForegroundColor Green
git branch -M main

Write-Host "`n✅ Git 仓库初始化完成！" -ForegroundColor Green
Write-Host "`n下一步：推送到 GitHub（需要先创建仓库）" -ForegroundColor Yellow
Write-Host "执行命令: git push -u origin main" -ForegroundColor Yellow
Write-Host "`n注意：请确保已在 GitHub 创建了仓库 https://github.com/119969788/poly-copy-trading" -ForegroundColor Cyan
