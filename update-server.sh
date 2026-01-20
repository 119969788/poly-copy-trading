#!/bin/bash

# 服务器代码更新脚本（Git 方式）
# 使用方法: bash update-server.sh

echo "=========================================="
echo "🚀 更新服务器代码"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    echo "   当前目录: $(pwd)"
    exit 1
fi

echo "[1/4] 拉取最新代码..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Git pull 失败，请检查网络连接或 Git 配置"
    exit 1
fi
echo "✅ 代码已更新"
echo ""

echo "[2/4] 检查依赖更新..."
if [ -f "package-lock.json" ] || [ -f "pnpm-lock.yaml" ]; then
    echo "   检测到依赖锁定文件，检查是否需要更新依赖..."
    read -p "   是否需要重新安装依赖？(y/n，默认n): " install_deps
    if [ "$install_deps" = "y" ] || [ "$install_deps" = "Y" ]; then
        if command -v pnpm &> /dev/null; then
            echo "   使用 pnpm 安装依赖..."
            pnpm install
        else
            echo "   使用 npm 安装依赖..."
            npm install
        fi
        echo "✅ 依赖已更新"
    else
        echo "⏭️  跳过依赖更新"
    fi
else
    echo "   未检测到依赖锁定文件，建议运行 npm install 或 pnpm install"
fi
echo ""

echo "[3/4] 检查 PM2 进程..."
if command -v pm2 &> /dev/null; then
    PM2_PROCESS=$(pm2 list | grep -i "poly-copy-trading\|arbitrage" | head -1)
    if [ -n "$PM2_PROCESS" ]; then
        echo "   检测到 PM2 进程，是否需要重启？"
        read -p "   重启 PM2 进程？(y/n，默认y): " restart_pm2
        if [ "$restart_pm2" != "n" ] && [ "$restart_pm2" != "N" ]; then
            echo "   正在重启 PM2 进程..."
            pm2 restart all
            echo "✅ PM2 进程已重启"
        else
            echo "⏭️  跳过 PM2 重启"
        fi
    else
        echo "   未检测到运行中的 PM2 进程"
    fi
else
    echo "   PM2 未安装，跳过进程管理"
fi
echo ""

echo "[4/4] 验证更新..."
echo "   检查新文件..."
if [ -f "src/arbitrage-15m.ts" ]; then
    echo "   ✅ src/arbitrage-15m.ts 存在"
else
    echo "   ⚠️  src/arbitrage-15m.ts 不存在"
fi

if [ -f "package.json" ]; then
    if grep -q "arbitrage-15m" package.json; then
        echo "   ✅ package.json 包含 arbitrage-15m 脚本"
    else
        echo "   ⚠️  package.json 不包含 arbitrage-15m 脚本"
    fi
fi
echo ""

echo "=========================================="
echo "✅ 更新完成！"
echo "=========================================="
echo ""
echo "📝 下一步："
echo "   1. 检查 .env 文件配置是否正确"
echo "   2. 测试运行新策略："
echo "      npm run arbitrage-15m"
echo "   3. 或使用 PM2 运行："
echo "      pm2 start npm --name arbitrage-15m -- run arbitrage-15m"
echo ""
