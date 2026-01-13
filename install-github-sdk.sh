#!/bin/bash

# 安装 GitHub 版 poly-sdk 脚本

set -e  # 遇到错误立即退出

echo "═══════════════════════════════════════════════════"
echo "   安装 GitHub 版 poly-sdk"
echo "═══════════════════════════════════════════════════"
echo ""

# 检测项目目录
if [ -d ~/projects/poly-copy-trading ]; then
    PROJECT_DIR=~/projects/poly-copy-trading
elif [ -d ~/poly-copy-trading ]; then
    PROJECT_DIR=~/poly-copy-trading
else
    echo "❌ 错误：找不到项目目录"
    echo "   请确保项目在 ~/projects/poly-copy-trading 或 ~/poly-copy-trading"
    exit 1
fi

echo "📁 项目目录: $PROJECT_DIR"
cd "$PROJECT_DIR"

# 检查 package.json 是否存在
if [ ! -f package.json ]; then
    echo "❌ 错误：找不到 package.json 文件"
    exit 1
fi

# 备份 package.json
echo "💾 备份 package.json..."
cp package.json package.json.bak

# 检查当前使用的版本
CURRENT_VERSION=$(grep -o '"@catalyst-team/poly-sdk": "[^"]*"' package.json | cut -d'"' -f4)
echo "📦 当前版本: $CURRENT_VERSION"

# 修改 package.json
echo "🔧 修改 package.json..."
if grep -q '"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"' package.json; then
    echo "✅ 已经是 GitHub 版本，跳过修改"
else
    sed -i 's|"@catalyst-team/poly-sdk": "[^"]*"|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|' package.json
    echo "✅ 已修改为 GitHub 版本"
fi

# 删除旧的依赖
echo "🧹 清理旧的依赖..."
rm -rf node_modules/@catalyst-team/poly-sdk 2>/dev/null || true

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo "❌ 错误：未安装 pnpm"
    echo "   请先安装 pnpm: npm install -g pnpm"
    exit 1
fi

# 安装依赖
echo "📥 安装依赖..."
echo "   这可能需要几分钟，请耐心等待..."
pnpm install

# 验证安装
echo "🔍 验证安装..."
if pnpm list @catalyst-team/poly-sdk > /dev/null 2>&1; then
    echo "✅ 安装成功！"
    echo ""
    echo "📦 版本信息："
    pnpm list @catalyst-team/poly-sdk | head -5
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "✅ 完成！"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "💡 提示："
    echo "   1. 建议先在模拟模式下测试: DRY_RUN=true pnpm start"
    echo "   2. 如需恢复 npm 版本，运行: ./restore-npm-sdk.sh"
    echo ""
else
    echo "❌ 安装失败，请检查错误信息"
    echo "   正在恢复备份..."
    mv package.json.bak package.json
    exit 1
fi
