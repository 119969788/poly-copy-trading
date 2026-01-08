@echo off
REM Git 仓库初始化脚本（Windows 批处理版本）
REM 在安装了 Git 的环境中运行此脚本

echo 正在初始化 Git 仓库...
git init

echo 正在添加文件到暂存区...
git add .

echo 正在创建初始提交...
git commit -m "Initial commit: Polymarket copy trading bot"

echo.
echo 正在添加远程仓库...
git remote add origin https://github.com/119969788/poly-copy-trading.git

echo 正在设置主分支为 main...
git branch -M main

echo.
echo ✅ Git 仓库初始化完成！
echo.
echo 下一步：推送到 GitHub（需要先创建仓库）
echo 执行命令: git push -u origin main
echo.
echo 注意：请确保已在 GitHub 创建了仓库 https://github.com/119969788/poly-copy-trading
pause
