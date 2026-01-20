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

# 处理本地修改和未跟踪文件
echo ""
echo "🔧 处理本地修改..."
if [ -n "$(git status --porcelain)" ]; then
    echo "发现本地修改，保存中..."
    git stash save "自动保存本地修改 - $(date +%Y%m%d_%H%M%S)"
    
    # 删除可能冲突的未跟踪文件
    if [ -f "src/batch-sell.ts" ]; then
        echo "删除未跟踪的文件: src/batch-sell.ts"
        rm -f src/batch-sell.ts
    fi
fi

# 拉取最新代码
echo ""
echo "⬇️  拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ 拉取代码失败"
    echo "尝试恢复本地修改..."
    git stash pop 2>/dev/null || true
    echo ""
    echo "请手动解决冲突后重试，或使用:"
    echo "  git reset --hard HEAD  # 放弃本地修改"
    echo "  git pull origin main"
    exit 1
fi

# 尝试恢复本地修改（如果有）
if [ -n "$(git stash list)" ]; then
    echo ""
    echo "🔄 尝试恢复本地修改..."
    if git stash pop 2>/dev/null; then
        echo "✅ 本地修改已恢复"
        # 检查是否有冲突
        if [ -n "$(git diff --check)" ]; then
            echo "⚠️  检测到冲突，请手动解决:"
            git status
        fi
    else
        echo "⚠️  恢复本地修改时可能有冲突，请检查:"
        git status
    fi
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
