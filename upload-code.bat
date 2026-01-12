@echo off
chcp 65001 >nul
echo ========================================
echo 代码提交和上传脚本
echo ========================================
echo.

REM 检查 Git 是否安装
where git >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Git，请先安装 Git
    echo 下载地址: https://git-scm.com/download/win
    echo.
    echo 如果已安装，请重新打开终端后再运行此脚本
    pause
    exit /b 1
)

echo [1/6] Git 已安装
git --version
echo.

REM 检查 Git 仓库
echo [2/6] 检查 Git 仓库状态...
if not exist .git (
    echo [2/6] 初始化 Git 仓库...
    git init
    if errorlevel 1 (
        echo [错误] Git 初始化失败
        pause
        exit /b 1
    )
) else (
    echo [2/6] Git 仓库已存在
)
echo.

REM 添加文件
echo [3/6] 添加所有文件到暂存区...
git add .
if errorlevel 1 (
    echo [错误] 添加文件失败
    pause
    exit /b 1
)
echo.

REM 查看状态
echo [4/6] 查看待提交的文件...
git status --short
echo.

REM 提交
echo [5/6] 提交更改...
git commit -m "feat: 添加批量出售代币功能，增强错误处理和统计功能" -m "- 新增批量出售代币脚本 (src/batch-sell.ts)" -m "- 增强错误处理和钱包状态检查" -m "- 改进统计功能（按地址、市场、方向统计）" -m "- 优化配置参数显示" -m "- 最小交易金额调整为 5 USDC"
if errorlevel 1 (
    echo [警告] 提交失败，可能是没有更改或已经提交过
    echo 继续检查远程仓库...
) else (
    echo [5/6] 提交成功！
)
echo.

REM 检查远程仓库
echo [6/6] 检查远程仓库...
git remote -v >nul 2>&1
if errorlevel 1 (
    echo [6/6] 未配置远程仓库
    echo.
    echo 如果需要推送到远程仓库，请执行：
    echo   git remote add origin ^<你的仓库地址^>
    echo   git branch -M main
    echo   git push -u origin main
) else (
    echo [6/6] 远程仓库配置：
    git remote -v
    echo.
    set /p PUSH="是否推送到远程仓库？(y/n): "
    if /i "%PUSH%"=="y" (
        echo 正在推送...
        git branch -M main 2>nul
        git push -u origin main
        if errorlevel 1 (
            echo [错误] 推送失败，请检查网络连接和权限
        ) else (
            echo [成功] 代码已推送到远程仓库！
        )
    ) else (
        echo 跳过推送
    )
)

echo.
echo ========================================
echo ✅ 代码提交完成！
echo ========================================
echo.
echo 提交信息:
git log --oneline -1
echo.
pause
