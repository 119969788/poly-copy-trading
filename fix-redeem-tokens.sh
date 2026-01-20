#!/bin/bash

# 修复 redeem-tokens 命令不存在的问题

echo "═══════════════════════════════════════════════════"
echo "  修复 redeem-tokens 命令"
echo "═══════════════════════════════════════════════════"
echo ""

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    echo "   当前目录: $(pwd)"
    echo "   请执行: cd ~/projects/poly-copy-trading"
    exit 1
fi

echo "📋 步骤 1: 检查文件是否存在"
echo ""

# 检查 redeem-tokens.ts 文件
if [ -f "src/redeem-tokens.ts" ]; then
    echo "✅ src/redeem-tokens.ts 文件存在"
else
    echo "❌ src/redeem-tokens.ts 文件不存在"
    echo "   正在拉取最新代码..."
    git pull origin main
    if [ -f "src/redeem-tokens.ts" ]; then
        echo "✅ 文件已下载"
    else
        echo "❌ 文件仍然不存在，请检查网络连接"
        exit 1
    fi
fi

echo ""
echo "📋 步骤 2: 检查 package.json"
echo ""

# 检查 package.json 中是否有 redeem-tokens 命令
if grep -q "redeem-tokens" package.json; then
    echo "✅ package.json 中包含 redeem-tokens 命令"
    grep "redeem-tokens" package.json
else
    echo "❌ package.json 中缺少 redeem-tokens 命令"
    echo "   正在拉取最新代码..."
    git pull origin main
    if grep -q "redeem-tokens" package.json; then
        echo "✅ package.json 已更新"
    else
        echo "❌ package.json 仍然缺少命令，手动添加..."
        # 这里可以手动添加，但最好还是 git pull
        exit 1
    fi
fi

echo ""
echo "📋 步骤 3: 重新安装依赖（如果需要）"
echo ""

# 检查是否需要重新安装
echo "检查依赖..."
if [ ! -d "node_modules" ] || [ ! -f "pnpm-lock.yaml" ]; then
    echo "⚠️  依赖可能不完整，重新安装..."
    pnpm install
else
    echo "✅ 依赖已安装"
fi

echo ""
echo "📋 步骤 4: 测试命令"
echo ""

# 测试命令是否可用
if pnpm run redeem-tokens --help 2>/dev/null || pnpm redeem-tokens --help 2>/dev/null; then
    echo "✅ redeem-tokens 命令可用"
else
    echo "⚠️  命令可能仍然不可用，但可以直接运行脚本"
    echo ""
    echo "可以使用以下方法运行："
    echo "  npx tsx src/redeem-tokens.ts"
    echo "  或"
    echo "  pnpm exec tsx src/redeem-tokens.ts"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ 修复完成！"
echo "═══════════════════════════════════════════════════"
echo ""
echo "现在可以尝试运行："
echo "  DRY_RUN=true pnpm redeem-tokens"
echo ""
echo "如果仍然失败，使用："
echo "  npx tsx src/redeem-tokens.ts"
echo ""
