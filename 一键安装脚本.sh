#!/bin/bash

# UltaHost VPS 一键安装脚本
# 使用方法: bash 一键安装脚本.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "Polymarket 自动跟单系统 - 一键安装"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ 请使用 root 用户运行此脚本${NC}"
    echo "   使用: sudo bash 一键安装脚本.sh"
    exit 1
fi

echo -e "${YELLOW}[1/8] 更新系统...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✅ 系统更新完成${NC}"
echo ""

echo -e "${YELLOW}[2/8] 安装 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "${GREEN}✅ Node.js 已安装: $(node --version)${NC}"
fi
echo ""

echo -e "${YELLOW}[3/8] 安装 pnpm 和 PM2...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
    echo -e "${GREEN}✅ pnpm 安装完成${NC}"
else
    echo -e "${GREEN}✅ pnpm 已安装: $(pnpm --version)${NC}"
fi

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 安装完成${NC}"
else
    echo -e "${GREEN}✅ PM2 已安装: $(pm2 --version)${NC}"
fi
echo ""

echo -e "${YELLOW}[4/8] 安装 Git...${NC}"
if ! command -v git &> /dev/null; then
    apt install -y git
    echo -e "${GREEN}✅ Git 安装完成${NC}"
else
    echo -e "${GREEN}✅ Git 已安装: $(git --version)${NC}"
fi
echo ""

echo -e "${YELLOW}[5/8] 克隆仓库...${NC}"
PROJECT_DIR="/root/poly-copy-trading"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  项目目录已存在，跳过克隆${NC}"
    echo -e "${YELLOW}   如需更新，请运行: cd $PROJECT_DIR && git pull origin main${NC}"
else
    cd /root
    git clone https://github.com/119969788/poly-copy-trading.git
    echo -e "${GREEN}✅ 仓库克隆完成${NC}"
fi
echo ""

echo -e "${YELLOW}[6/8] 安装项目依赖...${NC}"
cd "$PROJECT_DIR"
pnpm install
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

echo -e "${YELLOW}[7/8] 配置环境变量...${NC}"
if [ ! -f ".env" ]; then
    if [ -f "env.example.txt" ]; then
        cp env.example.txt .env
        echo -e "${GREEN}✅ .env 文件已创建${NC}"
        echo -e "${YELLOW}⚠️  请编辑 .env 文件并添加你的私钥:${NC}"
        echo -e "   nano .env"
    else
        echo -e "${YELLOW}⚠️  未找到 env.example.txt，请手动创建 .env 文件${NC}"
    fi
else
    echo -e "${GREEN}✅ .env 文件已存在${NC}"
fi
echo ""

echo -e "${YELLOW}[8/8] 检查 PM2 配置...${NC}"
if [ -f "ecosystem.config.cjs" ]; then
    echo -e "${GREEN}✅ PM2 配置文件已存在${NC}"
elif [ -f "ecosystem.config.js" ]; then
    echo -e "${GREEN}✅ PM2 配置文件已存在${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 配置文件不存在，请手动创建${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✅ 安装完成！${NC}"
echo "=========================================="
echo ""
echo "下一步："
echo ""
echo "1. 配置环境变量："
echo "   cd $PROJECT_DIR"
echo "   nano .env"
echo "   # 添加: POLYMARKET_PRIVATE_KEY=your_private_key"
echo ""
echo "2. 测试运行（模拟模式）："
echo "   npx tsx src/index.ts"
echo "   # 按 Ctrl+C 停止"
echo ""
echo "3. 启动 PM2："
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup  # 按照提示执行命令"
echo ""
echo "4. 查看状态："
echo "   pm2 status"
echo "   pm2 logs poly-copy-trading"
echo ""
