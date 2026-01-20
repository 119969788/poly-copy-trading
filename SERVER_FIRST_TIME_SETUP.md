# 服务器首次设置指南

## 当前问题

1. 项目目录不存在：`/root/projects/poly-copy-trading`
2. PM2 应用不存在：`poly-copy-trading`

## 完整设置步骤

### 1. 查找或创建项目目录

#### 检查常见位置

```bash
# 检查项目是否在其他位置
find ~ -name "poly-copy-trading" -type d 2>/dev/null
ls -la ~/
ls -la ~/projects 2>/dev/null
```

#### 如果项目不存在，从 GitHub 克隆

```bash
# 创建 projects 目录（如果不存在）
mkdir -p ~/projects
cd ~/projects

# 从 GitHub 克隆项目
git clone https://github.com/119969788/poly-copy-trading.git

# 进入项目目录
cd poly-copy-trading
```

### 2. 安装 Node.js 和 pnpm（如果未安装）

```bash
# 检查 Node.js
node --version

# 如果未安装，安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs  # Ubuntu/Debian
# 或
yum install -y nodejs  # CentOS/RHEL

# 检查 pnpm
pnpm --version

# 如果未安装，安装 pnpm
npm install -g pnpm

# 检查 PM2
pm2 --version

# 如果未安装，安装 PM2
npm install -g pm2
```

### 3. 安装项目依赖

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 安装依赖
pnpm install
```

### 4. 配置环境变量

```bash
# 创建 .env 文件
nano .env
```

在文件中添加：

```env
POLYMARKET_PRIVATE_KEY=你的真实私钥
DRY_RUN=false

# 可选：指定要跟随的钱包地址
# TARGET_ADDRESSES=0x1234...,0x5678...
```

保存文件（nano: Ctrl+O, Enter, Ctrl+X）

```bash
# 设置文件权限
chmod 600 .env
```

### 5. 创建日志目录

```bash
mkdir -p logs
```

### 6. 启动应用（使用 PM2）

#### 方式 1：使用 ecosystem.config.js（推荐）

```bash
# 检查配置文件是否存在
ls -la ecosystem.config.js

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading --lines 50
```

#### 方式 2：直接命令启动

```bash
# 启动应用
pm2 start pnpm --name "poly-copy-trading" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading
```

### 7. 保存 PM2 配置

```bash
# 保存配置（重要！）
pm2 save

# 设置开机自启（可选但推荐）
pm2 startup
# 按照提示执行命令（通常会显示一个命令，复制执行）
```

### 8. 验证应用运行

```bash
# 查看应用状态
pm2 status

# 应该看到类似输出：
# ┌─────┬──────────────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name                 │ mode        │ ↺       │ status  │ cpu      │
# ├─────┼──────────────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ poly-copy-trading    │ fork        │ 0       │ online  │ 0%       │
# └─────┴──────────────────────┴─────────────┴─────────┴─────────┴──────────┘

# 查看日志（应该看到启动信息）
pm2 logs poly-copy-trading --lines 50

# 实时查看日志
pm2 logs poly-copy-trading --follow
```

## 一键设置脚本

创建 `first-setup.sh`：

```bash
#!/bin/bash

set -e

echo "═══════════════════════════════════════════════════"
echo "  Polymarket 跟单脚本 - 首次设置"
echo "═══════════════════════════════════════════════════"
echo ""

# 1. 创建项目目录并克隆
echo "📦 克隆项目..."
mkdir -p ~/projects
cd ~/projects

if [ -d "poly-copy-trading" ]; then
    echo "⚠️  项目目录已存在，跳过克隆"
    cd poly-copy-trading
    git pull origin main
else
    git clone https://github.com/119969788/poly-copy-trading.git
    cd poly-copy-trading
fi

# 2. 检查 Node.js
echo ""
echo "🔍 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node --version

# 3. 检查 pnpm
echo ""
echo "🔍 检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "安装 pnpm..."
    npm install -g pnpm
fi
pnpm --version

# 4. 检查 PM2
echo ""
echo "🔍 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi
pm2 --version

# 5. 安装依赖
echo ""
echo "📦 安装项目依赖..."
pnpm install

# 6. 检查 .env 文件
echo ""
echo "🔍 检查 .env 文件..."
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在"
    echo "请创建 .env 文件并配置私钥："
    echo "  nano .env"
    echo ""
    echo "添加以下内容："
    echo "  POLYMARKET_PRIVATE_KEY=你的真实私钥"
    echo "  DRY_RUN=false"
    echo ""
    read -p "是否现在创建 .env 文件? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        nano .env
    else
        echo "请手动创建 .env 文件后再继续"
        exit 1
    fi
else
    echo "✅ .env 文件已存在"
fi

chmod 600 .env

# 7. 创建日志目录
echo ""
echo "📁 创建日志目录..."
mkdir -p logs

# 8. 启动应用
echo ""
echo "🚀 启动应用..."

# 停止旧应用（如果存在）
pm2 delete poly-copy-trading 2>/dev/null || true

# 启动新应用
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start pnpm --name "poly-copy-trading" -- start
fi

# 9. 保存配置
echo ""
echo "💾 保存 PM2 配置..."
pm2 save

# 10. 显示状态
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ 设置完成！"
echo "═══════════════════════════════════════════════════"
echo ""
pm2 status
echo ""
echo "📋 查看日志："
echo "  pm2 logs poly-copy-trading"
echo ""
echo "📊 实时监控："
echo "  pm2 logs poly-copy-trading --follow"
echo ""
```

使用方法：

```bash
# 下载脚本
curl -O https://raw.githubusercontent.com/119969788/poly-copy-trading/main/first-setup.sh
# 或创建文件并复制内容

# 给执行权限
chmod +x first-setup.sh

# 运行脚本
./first-setup.sh
```

## 快速检查清单

- [ ] 项目目录存在（`~/projects/poly-copy-trading`）
- [ ] Node.js 已安装（`node --version`）
- [ ] pnpm 已安装（`pnpm --version`）
- [ ] PM2 已安装（`pm2 --version`）
- [ ] 项目依赖已安装（`pnpm install`）
- [ ] `.env` 文件存在并配置正确
- [ ] 日志目录存在（`logs/`）
- [ ] 应用已启动（`pm2 status`）
- [ ] 应用状态为 `online`（`pm2 status`）
- [ ] 日志正常（`pm2 logs poly-copy-trading`）

## 常见问题

### Q: 项目目录在哪里？

A: 检查常见位置：
```bash
find ~ -name "poly-copy-trading" -type d 2>/dev/null
ls -la ~/
ls -la ~/projects 2>/dev/null
```

如果不存在，从 GitHub 克隆：
```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/119969788/poly-copy-trading.git
```

### Q: 如何确认应用是否在运行？

A:
```bash
pm2 list
pm2 status
```

如果没有应用，使用上面的步骤启动。

### Q: 应用启动失败怎么办？

A:
```bash
# 查看错误日志
pm2 logs poly-copy-trading --err

# 检查 .env 文件
cat .env

# 手动运行测试
cd ~/projects/poly-copy-trading
pnpm start
```

### Q: 如何查看完整日志？

A:
```bash
# 查看所有日志
pm2 logs poly-copy-trading

# 查看最后 100 行
pm2 logs poly-copy-trading --lines 100

# 实时查看
pm2 logs poly-copy-trading --follow
```

---

**提示**：如果是首次设置，建议使用上面的完整步骤。如果项目已存在但位置不同，先找到项目位置再继续。
