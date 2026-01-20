#!/bin/bash

# Polymarket 自动跟单脚本 - 一键安装脚本
# 适用于 Ubuntu/Debian/CentOS 系统
# 使用方法: bash install.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "  $1"
    echo "═══════════════════════════════════════════════════"
    echo ""
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        print_error "无法检测操作系统"
        exit 1
    fi
    
    print_info "检测到操作系统: $OS $OS_VERSION"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_warning "请使用 root 用户运行此脚本"
        echo "使用: sudo bash install.sh"
        exit 1
    fi
}

# 安装 Node.js
install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js 已安装: $NODE_VERSION"
        return
    fi
    
    print_info "正在安装 Node.js 20.x LTS..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt update
        apt install -y curl
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y curl
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        yum install -y nodejs
    else
        print_error "不支持的操作系统: $OS"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js 安装完成: $NODE_VERSION"
}

# 安装 pnpm
install_pnpm() {
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm 已安装: $PNPM_VERSION"
        return
    fi
    
    print_info "正在安装 pnpm..."
    npm install -g pnpm
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm 安装完成: $PNPM_VERSION"
}

# 安装 PM2
install_pm2() {
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        print_success "PM2 已安装: $PM2_VERSION"
        return
    fi
    
    print_info "正在安装 PM2..."
    npm install -g pm2
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 安装完成: $PM2_VERSION"
}

# 安装 Git
install_git() {
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "Git 已安装: $GIT_VERSION"
        return
    fi
    
    print_info "正在安装 Git..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt install -y git
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y git
    fi
    print_success "Git 安装完成"
}

# 克隆项目
clone_project() {
    PROJECT_DIR="$HOME/projects/poly-copy-trading"
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "项目目录已存在: $PROJECT_DIR"
        read -p "是否更新项目? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "更新项目..."
            cd "$PROJECT_DIR"
            git pull origin main || print_warning "Git pull 失败，继续使用现有代码"
        else
            print_info "使用现有项目目录"
        fi
    else
        print_info "正在克隆项目..."
        mkdir -p "$HOME/projects"
        cd "$HOME/projects"
        git clone https://github.com/119969788/poly-copy-trading.git || {
            print_error "克隆项目失败，请检查网络连接"
            exit 1
        }
        print_success "项目克隆完成"
    fi
    
    cd "$PROJECT_DIR"
}

# 安装项目依赖
install_dependencies() {
    print_info "正在安装项目依赖（可能需要几分钟）..."
    
    # 如果网络慢，可以使用国内镜像
    read -p "是否使用国内镜像加速? (y/n，默认 n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "设置淘宝镜像..."
        pnpm config set registry https://registry.npmmirror.com
    fi
    
    pnpm install || {
        print_error "依赖安装失败"
        exit 1
    }
    print_success "依赖安装完成"
}

# 创建 .env 文件
create_env_file() {
    if [ -f ".env" ]; then
        print_warning ".env 文件已存在"
        read -p "是否重新配置? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "使用现有 .env 文件"
            chmod 600 .env
            return
        fi
    fi
    
    print_info "配置环境变量..."
    echo ""
    echo "请输入 Polymarket 私钥（不要包含 0x 前缀，或包含都可以）:"
    read -s PRIVATE_KEY
    
    if [ -z "$PRIVATE_KEY" ]; then
        print_error "私钥不能为空"
        exit 1
    fi
    
    # 创建 .env 文件
    cat > .env << EOF
# Polymarket 私钥
POLYMARKET_PRIVATE_KEY=$PRIVATE_KEY

# 可选：指定要跟随的钱包地址（用逗号分隔，如果不设置则跟随排行榜前 50 名）
# TARGET_ADDRESSES=0x1234...,0x5678...

# 可选：设置是否启用模拟模式（true/false，默认 true）
# 首次运行强烈建议设置为 true 进行测试
DRY_RUN=true
EOF
    
    chmod 600 .env
    print_success ".env 文件已创建（权限: 600）"
}

# 创建日志目录
create_log_dir() {
    if [ ! -d "logs" ]; then
        mkdir -p logs
        print_success "创建日志目录: logs/"
    fi
}

# 测试运行
test_run() {
    print_info "是否现在测试运行? (y/n，默认 n): "
    read -p "" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "开始测试运行（5秒后自动停止）..."
        print_warning "如果看到错误，请按 Ctrl+C 提前停止"
        timeout 5 pnpm start || true
        echo ""
        read -p "测试是否成功? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "测试未通过，请检查配置"
        else
            print_success "测试通过"
        fi
    fi
}

# 使用 PM2 启动
start_with_pm2() {
    # 停止旧进程（如果存在）
    pm2 delete poly-copy-trading 2>/dev/null || true
    
    print_info "使用 PM2 启动应用..."
    pm2 start ecosystem.config.cjs || {
        print_error "PM2 启动失败"
        exit 1
    }
    
    print_success "应用已启动"
    
    # 保存 PM2 配置
    pm2 save
    
    # 设置开机自启
    print_info "设置开机自启..."
    STARTUP_CMD=$(pm2 startup | grep -v "PM2" | grep -v "To setup" | grep -v "copy/paste")
    if [ ! -z "$STARTUP_CMD" ]; then
        print_warning "请执行以下命令设置开机自启:"
        echo "$STARTUP_CMD"
        echo ""
        read -p "是否现在执行? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            eval "$STARTUP_CMD"
            print_success "开机自启已设置"
        fi
    else
        print_warning "无法自动设置开机自启，请手动执行: pm2 startup"
    fi
}

# 显示完成信息
show_completion() {
    print_header "安装完成！"
    
    echo ""
    print_success "所有步骤已完成！"
    echo ""
    echo "📋 项目信息:"
    echo "   项目目录: $HOME/projects/poly-copy-trading"
    echo "   配置文件: $HOME/projects/poly-copy-trading/.env"
    echo ""
    echo "📊 查看状态:"
    echo "   pm2 status"
    echo ""
    echo "📝 查看日志:"
    echo "   pm2 logs poly-copy-trading"
    echo "   pm2 logs poly-copy-trading --follow  # 实时日志"
    echo ""
    echo "🔄 管理命令:"
    echo "   pm2 restart poly-copy-trading  # 重启"
    echo "   pm2 stop poly-copy-trading      # 停止"
    echo "   pm2 delete poly-copy-trading    # 删除"
    echo ""
    echo "⚙️  修改配置:"
    echo "   nano $HOME/projects/poly-copy-trading/.env"
    echo "   pm2 restart poly-copy-trading  # 重启使配置生效"
    echo ""
    print_warning "重要提示:"
    echo "   1. 首次运行已设置 DRY_RUN=true（模拟模式）"
    echo "   2. 确认一切正常后，修改 .env 设置 DRY_RUN=false 切换到实盘模式"
    echo "   3. 定期检查日志确保应用正常运行"
    echo ""
    
    # 显示当前状态
    echo "当前应用状态:"
    pm2 status
    echo ""
}

# 主函数
main() {
    print_header "Polymarket 自动跟单脚本 - 一键安装"
    
    # 检测系统
    detect_os
    check_root
    
    # 安装环境
    print_header "步骤 1/7: 安装系统环境"
    install_nodejs
    install_pnpm
    install_pm2
    install_git
    
    # 克隆项目
    print_header "步骤 2/7: 克隆项目"
    clone_project
    
    # 安装依赖
    print_header "步骤 3/7: 安装项目依赖"
    install_dependencies
    
    # 配置环境变量
    print_header "步骤 4/7: 配置环境变量"
    create_env_file
    
    # 创建日志目录
    print_header "步骤 5/7: 创建日志目录"
    create_log_dir
    
    # 测试运行
    print_header "步骤 6/7: 测试运行"
    test_run
    
    # 启动应用
    print_header "步骤 7/7: 启动应用"
    start_with_pm2
    
    # 完成
    show_completion
}

# 运行主函数
main
