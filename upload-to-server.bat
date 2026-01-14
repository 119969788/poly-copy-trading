@echo off
REM 批处理脚本：上传文件到服务器
REM 使用方法：修改下面的服务器IP，然后双击运行此文件

echo ==========================================
echo 上传文件到服务器
echo ==========================================
echo.

REM ============================================
REM 配置：请修改这里的服务器IP
REM ============================================
set SERVER_IP=你的服务器IP
set SERVER_PATH=/root/projects/poly-copy-trading

REM 检查配置
if "%SERVER_IP%"=="你的服务器IP" (
    echo ❌ 错误：请先修改脚本中的服务器IP地址
    echo    编辑此文件，将 SERVER_IP 替换为实际IP
    pause
    exit /b 1
)

echo 服务器IP: %SERVER_IP%
echo 服务器路径: %SERVER_PATH%
echo.

REM 切换到脚本所在目录
cd /d "%~dp0"

REM ============================================
REM 上传文件
REM ============================================

echo 📤 上传: batch-sell.ts
if exist "src\batch-sell.ts" (
    scp src\batch-sell.ts root@%SERVER_IP%:%SERVER_PATH%/src/batch-sell.ts
    if errorlevel 1 (
        echo    ❌ 上传失败
    ) else (
        echo    ✅ 上传成功
    )
) else (
    echo    ⚠️  文件不存在
)
echo.

echo 📤 上传: create-batch-sell.sh
if exist "create-batch-sell.sh" (
    scp create-batch-sell.sh root@%SERVER_IP%:%SERVER_PATH%/create-batch-sell.sh
    if errorlevel 1 (
        echo    ❌ 上传失败
    ) else (
        echo    ✅ 上传成功
    )
) else (
    echo    ⚠️  文件不存在
)
echo.

echo 📤 上传: ecosystem.config.js
if exist "ecosystem.config.js" (
    scp ecosystem.config.js root@%SERVER_IP%:%SERVER_PATH%/ecosystem.config.js
    if errorlevel 1 (
        echo    ❌ 上传失败
    ) else (
        echo    ✅ 上传成功
    )
) else (
    echo    ⚠️  文件不存在
)
echo.

echo ==========================================
echo ✅ 上传完成
echo ==========================================
echo.
echo 下一步：在服务器上执行：
echo   cd %SERVER_PATH%
echo   bash create-batch-sell.sh
echo.
pause
