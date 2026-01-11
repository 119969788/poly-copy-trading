#!/bin/bash

# 服务器一键更新脚本

echo "═══════════════════════════════════════════════════"
echo "   Polymarket 跟单脚本 - 服务器更新"
echo "═══════════════════════════════════════════════════"
echo ""

# 检测项目目录
if [ -d ~/projects/poly-copy-trading ]; then
    PROJECT_DIR=~/projects/poly-copy-trading
elif [ -d ~/poly-copy-trading ]; then
    PROJECT_DIR=~/poly-copy-trading
else
    echo "❌ 错误: 未找到项目目录"
    echo "请先部署项目或手动指定目录"
    exit 1
fi

echo "项目目录: $PROJECT_DIR"
cd "$PROJECT_DIR" || exit 1

# 检查 Git 状态
echo ""
echo "📋 检查当前状态..."
git status

# 拉取最新代码
echo ""
echo "⬇️  拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ 拉取代码失败"
    echo "如果有本地修改冲突，请先解决冲突或使用:"
    echo "  git stash"
    echo "  git pull origin main"
    echo "  git stash pop"
    exit 1
fi

# 更新依赖
echo ""
echo "📦 更新依赖..."
pnpm install

if [ $? -ne 0 ]; then
    echo "⚠️  依赖安装有警告，但继续执行..."
fi

# 检查是否使用 PM2
if command -v pm2 &> /dev/null; then
    echo ""
    echo "🔄 重启 PM2 应用..."
    pm2 restart poly-copy-trading
    
    if [ $? -eq 0 ]; then
        echo "✅ 应用已重启"
        echo ""
        echo "📊 查看运行状态..."
        pm2 status
        
        echo ""
        echo "📋 查看最新日志（最后 30 行）..."
        pm2 logs poly-copy-trading --lines 30 --nostream
    else
        echo "❌ PM2 重启失败，请检查应用名称是否正确"
        echo "可用命令查看应用列表: pm2 list"
    fi
else
    echo ""
    echo "⚠️  未检测到 PM2"
    echo "如果使用其他方式运行，请手动重启应用"
    echo ""
    echo "使用 nohup 运行:"
    echo "  ps aux | grep 'tsx src/index.ts'"
    echo "  kill <进程ID>"
    echo "  nohup pnpm start > output.log 2>&1 &"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ 更新完成！"
echo "═══════════════════════════════════════════════════"
