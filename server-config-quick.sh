#!/bin/bash

# 服务器参数配置快速修改脚本
# 使用方法: ./server-config-quick.sh

echo "═══════════════════════════════════════════════════"
echo "  Polymarket 参数配置快速修改"
echo "═══════════════════════════════════════════════════"
echo ""

# 检测项目目录
if [ -d ~/projects/poly-copy-trading ]; then
    PROJECT_DIR=~/projects/poly-copy-trading
elif [ -d ~/poly-copy-trading ]; then
    PROJECT_DIR=~/poly-copy-trading
else
    echo "❌ 错误: 未找到项目目录"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

CONFIG_FILE="src/index.ts"
BACKUP_FILE="src/index.ts.backup.$(date +%Y%m%d_%H%M%S)"

echo "项目目录: $PROJECT_DIR"
echo "配置文件: $CONFIG_FILE"
echo ""

# 显示当前配置
echo "📋 当前配置："
grep -A 5 "sizeScale:" "$CONFIG_FILE" | head -5
echo ""

# 备份文件
echo "💾 创建备份..."
cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "✅ 备份已创建: $BACKUP_FILE"
echo ""

# 选择编辑方式
echo "请选择操作："
echo "1) 使用 nano 编辑器修改（推荐）"
echo "2) 使用 vi 编辑器修改"
echo "3) 使用 sed 快速修改（高级）"
echo "4) 仅查看当前配置"
echo "5) 退出"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        echo "正在打开 nano 编辑器..."
        nano "$CONFIG_FILE"
        ;;
    2)
        echo "正在打开 vi 编辑器..."
        vi "$CONFIG_FILE"
        ;;
    3)
        echo ""
        echo "⚠️  sed 快速修改（请谨慎使用）"
        echo ""
        read -p "修改 sizeScale (当前0.2，输入新值，如0.1): " sizeScale
        if [ ! -z "$sizeScale" ]; then
            sed -i "s/sizeScale: 0\.[0-9]*,/sizeScale: $sizeScale,/g" "$CONFIG_FILE"
            echo "✅ sizeScale 已更新为 $sizeScale"
        fi
        
        read -p "修改 maxSizePerTrade (当前100，输入新值，如50): " maxSize
        if [ ! -z "$maxSize" ]; then
            sed -i "s/maxSizePerTrade: [0-9]*,/maxSizePerTrade: $maxSize,/g" "$CONFIG_FILE"
            echo "✅ maxSizePerTrade 已更新为 $maxSize"
        fi
        
        read -p "修改 maxSlippage (当前0.05，输入新值，如0.03): " slippage
        if [ ! -z "$slippage" ]; then
            sed -i "s/maxSlippage: 0\.[0-9]*,/maxSlippage: $slippage,/g" "$CONFIG_FILE"
            echo "✅ maxSlippage 已更新为 $slippage"
        fi
        
        read -p "修改 minTradeSize (当前1，输入新值，如5): " minSize
        if [ ! -z "$minSize" ]; then
            sed -i "s/minTradeSize: [0-9]*,/minTradeSize: $minSize,/g" "$CONFIG_FILE"
            echo "✅ minTradeSize 已更新为 $minSize"
        fi
        
        echo ""
        echo "📋 更新后的配置："
        grep -A 5 "sizeScale:" "$CONFIG_FILE" | head -5
        ;;
    4)
        echo "📋 当前配置："
        grep -A 10 "copyTradingOptions" "$CONFIG_FILE"
        exit 0
        ;;
    5)
        echo "已取消"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
read -p "是否重启应用? (y/n): " restart

if [ "$restart" = "y" ] || [ "$restart" = "Y" ]; then
    if command -v pm2 &> /dev/null; then
        echo "🔄 重启 PM2 应用..."
        pm2 restart poly-copy-trading
        echo "✅ 应用已重启"
        echo ""
        echo "📋 查看日志（最后 30 行）："
        pm2 logs poly-copy-trading --lines 30 --nostream
    else
        echo "⚠️  未检测到 PM2，请手动重启应用"
        echo "如果使用 nohup："
        echo "  ps aux | grep 'tsx src/index.ts'"
        echo "  kill <PID>"
        echo "  nohup pnpm start > output.log 2>&1 &"
    fi
else
    echo "⚠️  请手动重启应用以应用更改"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ 完成！"
echo "═══════════════════════════════════════════════════"
