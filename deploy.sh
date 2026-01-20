#!/bin/bash

# Polymarket 自动跟单脚本 - 一键部署脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "═══════════════════════════════════════════════════"
echo "  Polymarket 自动跟单脚本 - 服务器部署"
echo "═══════════════════════════════════════════════════"
echo ""

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ 无法检测操作系统"
    exit 1
fi

echo "检测到操作系统: $OS"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  请使用 root 用户运行此脚本"
    echo "使用: sudo bash deploy.sh"
    exit 1
fi

# 函数：安装 Node.js
install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo "✅ Node.js 已安装: $NODE_VERSION"
        return
    fi
    
    echo "📦 正在安装 Node.js 20.x LTS..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        yum install -y nodejs
    else
        echo "❌ 不支持的操作系统: $OS"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 安装完成: $NODE_VERSION"
}

# 函数：安装 pnpm
install_pnpm() {
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        echo "✅ pnpm 已安装: $PNPM_VERSION"
        return
    fi
    
    echo "📦 正在安装 pnpm..."
    npm install -g pnpm
    PNPM_VERSION=$(pnpm --version)
    echo "✅ pnpm 安装完成: $PNPM_VERSION"
}

# 函数：安装 PM2
install_pm2() {
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        echo "✅ PM2 已安装: $PM2_VERSION"
        return
    fi
    
    echo "📦 正在安装 PM2..."
    npm install -g pm2
    PM2_VERSION=$(pm2 --version)
    echo "✅ PM2 安装完成: $PM2_VERSION"
}

# 函数：安装 Git
install_git() {
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        echo "✅ Git 已安装: $GIT_VERSION"
        return
    fi
    
    echo "📦 正在安装 Git..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt update
        apt install -y git
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y git
    fi
    echo "✅ Git 安装完成"
}

# 函数：安装项目依赖
install_dependencies() {
    echo ""
    echo "📦 正在安装项目依赖..."
    
    if [ ! -f "package.json" ]; then
        echo "❌ 错误: 未找到 package.json，请在项目根目录运行此脚本"
        exit 1
    fi
    
    pnpm install
    echo "✅ 依赖安装完成"
}

# 函数：检查 .env 文件
check_env_file() {
    if [ ! -f ".env" ]; then
        echo ""
        echo "⚠️  警告: .env 文件不存在"
        echo ""
        echo "请创建 .env 文件并配置以下内容:"
        echo ""
        echo "POLYMARKET_PRIVATE_KEY=your_private_key_here"
        echo "DRY_RUN=true"
        echo ""
        echo "创建命令: nano .env"
        echo ""
        read -p "是否现在创建 .env 文件? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano .env
        else
            echo "请手动创建 .env 文件后再运行脚本"
            exit 1
        fi
    fi
    
    # 设置 .env 文件权限
    chmod 600 .env
    echo "✅ .env 文件已配置（权限: 600）"
}

# 函数：创建日志目录
create_log_dir() {
    if [ ! -d "logs" ]; then
        mkdir -p logs
        echo "✅ 创建日志目录: logs/"
    fi
}

# 主函数
main() {
    # 安装必要的工具
    install_nodejs
    install_pnpm
    install_pm2
    install_git
    
    # 安装项目依赖
    install_dependencies
    
    # 检查环境配置
    check_env_file
    
    # 创建日志目录
    create_log_dir
    
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "✅ 部署完成！"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "下一步操作:"
    echo ""
    echo "1. 测试运行（前台）:"
    echo "   pnpm start"
    echo ""
    echo "2. 使用 PM2 后台运行:"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 logs poly-copy-trading"
    echo "   pm2 save"
    echo "   pm2 startup  # 设置开机自启"
    echo ""
    echo "3. 查看状态:"
    echo "   pm2 status"
    echo ""
    echo "⚠️  首次运行建议设置 DRY_RUN=true 进行测试！"
    echo ""
}

# 运行主函数
main
