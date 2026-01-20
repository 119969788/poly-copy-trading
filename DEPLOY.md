# 腾讯云服务器部署指南

本指南将帮助您在腾讯云服务器上部署和运行 Polymarket 自动跟单脚本。

## 系统要求

- **操作系统**：Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **内存**：至少 1GB RAM
- **磁盘空间**：至少 2GB 可用空间
- **网络**：能够访问 GitHub 和 Polymarket API

## 一、服务器环境准备

### 1.1 连接到服务器

使用 SSH 连接到您的腾讯云服务器：

```bash
ssh root@你的服务器IP
# 或使用密钥文件
ssh -i 你的密钥文件.pem root@你的服务器IP
```

### 1.2 更新系统（推荐）

**Ubuntu/Debian:**
```bash
apt update && apt upgrade -y
```

**CentOS/RHEL:**
```bash
yum update -y
```

### 1.3 安装 Node.js（使用 NodeSource）

**Ubuntu/Debian:**
```bash
# 安装 curl
apt install -y curl

# 安装 Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证安装
node --version
npm --version
```

**CentOS/RHEL:**
```bash
# 安装 curl
yum install -y curl

# 安装 Node.js 20.x LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 验证安装
node --version
npm --version
```

### 1.4 安装 pnpm

```bash
npm install -g pnpm

# 验证安装
pnpm --version
```

### 1.5 安装 Git（如果未安装）

**Ubuntu/Debian:**
```bash
apt install -y git
```

**CentOS/RHEL:**
```bash
yum install -y git
```

## 二、部署项目代码

### 方法 1：从 GitHub 克隆（推荐）

```bash
# 创建项目目录
mkdir -p ~/projects
cd ~/projects

# 克隆仓库
git clone https://github.com/119969788/poly-copy-trading.git

# 进入项目目录
cd poly-copy-trading
```

### 方法 2：使用 SCP 上传本地代码

在本地机器执行：

```bash
# 压缩项目（排除 node_modules）
tar -czf poly-copy-trading.tar.gz --exclude='node_modules' --exclude='.git' poly-copy-trading/

# 上传到服务器
scp poly-copy-trading.tar.gz root@你的服务器IP:~/

# 在服务器上解压
ssh root@你的服务器IP
cd ~
tar -xzf poly-copy-trading.tar.gz
cd poly-copy-trading
```

## 三、安装项目依赖

```bash
# 确保在项目根目录
cd ~/projects/poly-copy-trading

# 安装依赖
pnpm install
```

如果遇到网络问题，可以使用国内镜像：

```bash
# 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

## 四、配置环境变量

```bash
# 创建 .env 文件
nano .env
```

在文件中添加以下内容（**请替换为您的真实私钥**）：

```env
# Polymarket 私钥（不要包含 0x 前缀，或包含都可以）
POLYMARKET_PRIVATE_KEY=your_private_key_here

# 可选：指定要跟随的钱包地址（用逗号分隔）
# TARGET_ADDRESSES=0x1234...,0x5678...

# 可选：是否启用模拟模式（true/false，默认 true）
# 首次运行建议设置为 true 进行测试
DRY_RUN=true
```

保存并退出：
- `Ctrl + X`
- `Y` 确认
- `Enter` 保存

**重要安全提示：**
```bash
# 确保 .env 文件权限安全（只有所有者可读）
chmod 600 .env
```

## 五、运行脚本

### 5.1 测试运行（前台运行）

```bash
pnpm start
```

这将在前台运行脚本，您可以看到实时日志。按 `Ctrl+C` 可以停止。

### 5.2 后台运行（使用 nohup）

```bash
# 后台运行并保存日志
nohup pnpm start > output.log 2>&1 &

# 查看进程
ps aux | grep "tsx src/index.ts"

# 查看日志
tail -f output.log

# 停止进程
# 首先找到进程ID
ps aux | grep "tsx src/index.ts"
# 然后杀掉进程（替换 PID 为实际进程ID）
kill PID
```

### 5.3 使用 PM2 管理（推荐生产环境）

PM2 是一个进程管理器，可以保持应用运行，并在崩溃时自动重启。

#### 安装 PM2

```bash
npm install -g pm2
```

#### 使用 PM2 运行

```bash
# 启动应用
pm2 start pnpm --name "poly-copy-trading" -- start

# 或者使用 ecosystem 配置文件（推荐）
# 见下面的 PM2 配置部分

# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading

# 实时监控
pm2 monit

# 停止应用
pm2 stop poly-copy-trading

# 重启应用
pm2 restart poly-copy-trading

# 删除应用
pm2 delete poly-copy-trading

# 设置开机自启
pm2 startup
pm2 save
```

#### PM2 配置文件（推荐）

创建 `ecosystem.config.js`：

```bash
nano ecosystem.config.js
```

内容：

```javascript
module.exports = {
  apps: [{
    name: 'poly-copy-trading',
    script: 'pnpm',
    args: 'start',
    cwd: '/root/projects/poly-copy-trading',
    interpreter: '/bin/bash',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

使用配置文件启动：

```bash
# 创建日志目录
mkdir -p logs

# 使用配置文件启动
pm2 start ecosystem.config.js

# 保存配置
pm2 save
```

## 六、防火墙和安全配置

### 6.1 腾讯云安全组

确保服务器安全组允许必要的端口：
- **SSH (22)**：用于远程连接
- 不需要开放其他端口（脚本只对外发送请求）

### 6.2 系统防火墙（可选）

如果启用了防火墙，确保 SSH 端口开放：

**Ubuntu/Debian (ufw):**
```bash
ufw allow 22/tcp
ufw enable
```

**CentOS/RHEL (firewalld):**
```bash
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload
```

## 七、监控和维护

### 7.1 查看日志

**使用 PM2:**
```bash
pm2 logs poly-copy-trading --lines 100
```

**使用 nohup:**
```bash
tail -f output.log
```

### 7.2 检查运行状态

```bash
# 使用 PM2
pm2 status

# 使用系统命令
ps aux | grep "poly-copy-trading"
```

### 7.3 更新代码

```bash
cd ~/projects/poly-copy-trading

# 如果使用 Git
git pull origin main
pnpm install

# 重启应用
pm2 restart poly-copy-trading
# 或
pnpm start
```

## 八、故障排除

### 8.1 权限问题

```bash
# 确保文件权限正确
chmod +x setup-git.ps1
chmod +x setup-git.bat
```

### 8.2 端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep :端口号
# 或
lsof -i :端口号
```

### 8.3 内存不足

```bash
# 查看内存使用
free -h

# 如果使用 PM2，设置内存限制自动重启
pm2 start ecosystem.config.js --max-memory-restart 500M
```

### 8.4 网络连接问题

```bash
# 测试网络连接
ping github.com
curl -I https://github.com

# 检查 DNS
nslookup github.com
```

## 九、安全建议

1. **私钥安全**
   - ✅ 使用 `.env` 文件存储私钥
   - ✅ 设置 `.env` 文件权限为 600
   - ✅ 不要将 `.env` 提交到 Git
   - ✅ 定期备份私钥到安全位置

2. **服务器安全**
   - ✅ 使用 SSH 密钥认证而非密码
   - ✅ 定期更新系统和软件
   - ✅ 配置防火墙规则
   - ✅ 使用非 root 用户运行应用（可选但推荐）

3. **监控和日志**
   - ✅ 定期检查日志
   - ✅ 设置磁盘空间监控
   - ✅ 配置告警通知

## 十、快速部署脚本

创建一键部署脚本 `deploy.sh`：

```bash
#!/bin/bash

echo "开始部署 Polymarket 自动跟单脚本..."

# 安装 Node.js 和 pnpm（如果未安装）
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

if ! command -v pnpm &> /dev/null; then
    echo "安装 pnpm..."
    npm install -g pnpm
fi

# 安装 PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 进入项目目录
cd ~/projects/poly-copy-trading

# 安装依赖
echo "安装项目依赖..."
pnpm install

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  警告：.env 文件不存在，请创建并配置私钥"
    echo "运行: nano .env"
    exit 1
fi

# 设置文件权限
chmod 600 .env

echo "✅ 部署完成！"
echo "运行 'pnpm start' 启动脚本"
echo "或使用 PM2: pm2 start ecosystem.config.js"
```

使用：

```bash
chmod +x deploy.sh
./deploy.sh
```

## 常见问题

**Q: 如何查看实时日志？**
A: `pm2 logs poly-copy-trading` 或 `tail -f output.log`

**Q: 脚本意外停止怎么办？**
A: 使用 PM2 可以自动重启，或使用 systemd 服务

**Q: 如何更新代码？**
A: `git pull` 然后 `pnpm install` 和 `pm2 restart`

**Q: 服务器重启后脚本会自动运行吗？**
A: 如果使用 PM2 并执行了 `pm2 startup` 和 `pm2 save`，会自启

---

**部署完成后，建议先在 DRY_RUN=true 模式下测试，确认无误后再切换到实盘模式！**
