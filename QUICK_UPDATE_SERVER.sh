#!/bin/bash

# 快速更新服务器代码脚本
# 使用方法: bash QUICK_UPDATE_SERVER.sh

echo "=========================================="
echo "Polymarket 代码快速更新"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    echo "   当前目录: $(pwd)"
    exit 1
fi

echo "[1/4] 检查并创建 src 目录..."
mkdir -p src
echo "✅ src 目录已准备"
echo ""

echo "[2/4] 请手动创建 src/batch-sell.ts 文件"
echo "    执行命令: nano src/batch-sell.ts"
echo "    然后复制 batch-sell-complete.txt 中的完整内容"
echo "    保存: Ctrl+O, Enter, Ctrl+X"
echo ""

read -p "按 Enter 键继续，确认已创建 batch-sell.ts 文件..."

if [ ! -f "src/batch-sell.ts" ]; then
    echo "❌ 错误：src/batch-sell.ts 文件不存在"
    echo "   请先创建文件后再运行此脚本"
    exit 1
fi

echo "✅ src/batch-sell.ts 文件已存在"
echo ""

echo "[3/4] 更新 package.json..."
# 检查是否已包含 batch-sell 脚本
if grep -q "batch-sell" package.json; then
    echo "✅ package.json 已包含 batch-sell 脚本"
else
    echo "⚠️  需要手动更新 package.json"
    echo "   在 scripts 部分添加："
    echo '    "batch-sell": "tsx src/batch-sell.ts",'
    echo '    "batch-sell-real": "tsx src/batch-sell.ts --real",'
    echo ""
    read -p "按 Enter 键继续，确认已更新 package.json..."
fi
echo ""

echo "[4/4] 重新安装依赖（如果需要）..."
read -p "是否需要重新安装依赖？(y/n): " install_deps
if [ "$install_deps" = "y" ] || [ "$install_deps" = "Y" ]; then
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
fi
echo ""

echo "=========================================="
echo "✅ 更新完成！"
echo "=========================================="
echo ""
echo "验证更新："
echo "  ls -la src/batch-sell.ts"
echo ""
echo "测试运行（模拟模式）："
echo "  pnpm batch-sell"
echo "  或"
echo "  npx tsx src/batch-sell.ts"
echo ""
