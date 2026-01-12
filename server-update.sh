#!/bin/bash

# 服务器代码更新脚本
# 使用方法: bash server-update.sh

echo "=========================================="
echo "Polymarket 代码更新脚本"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/3] 检查 src 目录..."
mkdir -p src
echo "✅ src 目录已准备"

echo ""
echo "[2/3] 请手动创建 src/batch-sell.ts 文件"
echo "    可以使用以下命令："
echo "    nano src/batch-sell.ts"
echo "    然后粘贴文件内容"
echo ""

echo "[3/3] 更新 package.json..."
# 这里可以添加自动更新 package.json 的逻辑
echo "✅ 请手动更新 package.json 中的 scripts 部分"
echo ""

echo "=========================================="
echo "更新完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 创建 src/batch-sell.ts 文件（复制 UPDATE_FILES.md 中的内容）"
echo "2. 更新 package.json（添加 batch-sell 脚本）"
echo "3. 运行: pnpm install"
echo "4. 测试: pnpm batch-sell"
echo ""
