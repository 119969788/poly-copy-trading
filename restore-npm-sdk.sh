#!/bin/bash

# 恢复 npm 版 poly-sdk 脚本

set -e

echo "═══════════════════════════════════════════════════"
echo "   恢复 npm 版 poly-sdk"
echo "═══════════════════════════════════════════════════"
echo ""

# 检测项目目录
if [ -d ~/projects/poly-copy-trading ]; then
    PROJECT_DIR=~/projects/poly-copy-trading
elif [ -d ~/poly-copy-trading ]; then
    PROJECT_DIR=~/poly-copy-trading
else
    echo "❌ 错误：找不到项目目录"
    exit 1
fi

echo "📁 项目目录: $PROJECT_DIR"
cd "$PROJECT_DIR"

# 备份 package.json
echo "💾 备份 package.json..."
cp package.json package.json.bak

# 修改 package.json
echo "🔧 修改 package.json..."
sed -i 's|"@catalyst-team/poly-sdk": "[^"]*"|"@catalyst-team/poly-sdk": "latest"|' package.json
echo "✅ 已修改为 npm 版本"

# 删除旧的依赖
echo "🧹 清理旧的依赖..."
rm -rf node_modules/@catalyst-team/poly-sdk 2>/dev/null || true

# 安装依赖
echo "📥 安装依赖..."
pnpm install

# 验证安装
echo "🔍 验证安装..."
if pnpm list @catalyst-team/poly-sdk > /dev/null 2>&1; then
    echo "✅ 恢复成功！"
    echo ""
    echo "📦 版本信息："
    pnpm list @catalyst-team/poly-sdk | head -5
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "✅ 完成！"
    echo "═══════════════════════════════════════════════════"
else
    echo "❌ 恢复失败，请检查错误信息"
    mv package.json.bak package.json
    exit 1
fi
