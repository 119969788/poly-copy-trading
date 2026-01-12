@echo off
chcp 65001 >nul
echo ========================================
echo Git 代码提交脚本
echo ========================================
echo.

REM 检查 Git 是否安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Git，请先安装 Git
    echo 下载地址: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo [1/5] 检查 Git 仓库状态...
if not exist .git (
    echo [2/5] 初始化 Git 仓库...
    git init
    if errorlevel 1 (
        echo [错误] Git 初始化失败
        pause
        exit /b 1
    )
) else (
    echo [2/5] Git 仓库已存在
)

echo [3/5] 添加所有文件到暂存区...
git add .
if errorlevel 1 (
    echo [错误] 添加文件失败
    pause
    exit /b 1
)

echo [4/5] 查看待提交的文件...
git status --short
echo.

echo [5/5] 提交更改...
git commit -m "feat: 添加批量出售代币功能，增强错误处理和统计功能"
if errorlevel 1 (
    echo [错误] 提交失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 代码提交成功！
echo ========================================
echo.
echo 提交信息:
git log --oneline -1
echo.
echo 如果需要推送到远程仓库，请执行:
echo   git remote add origin <你的仓库地址>
echo   git push -u origin main
echo.
pause
