# 快速安装教程

## 🚀 一键安装（推荐）

最简单的方式，自动完成所有步骤：

```bash
# 连接到服务器
ssh root@你的服务器IP

# 下载并运行一键安装脚本
curl -fsSL https://raw.githubusercontent.com/119969788/poly-copy-trading/main/install.sh -o install.sh
chmod +x install.sh
bash install.sh
```

或者如果项目已克隆：

```bash
cd ~/projects/poly-copy-trading
chmod +x install.sh
bash install.sh
```

脚本会自动：
- ✅ 检测操作系统
- ✅ 安装 Node.js、pnpm、PM2、Git
- ✅ 克隆项目（如果不存在）
- ✅ 安装项目依赖
- ✅ 交互式配置私钥
- ✅ 使用 PM2 启动应用
- ✅ 设置开机自启

---

## 🚀 手动安装（5 分钟）

### 步骤 1：连接到服务器

```bash
ssh root@你的服务器IP
```

### 步骤 2：一键安装环境（Ubuntu/Debian）

```bash
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 pnpm 和 PM2
npm install -g pnpm pm2

# 安装 Git
apt install -y git
```

### 步骤 3：克隆项目

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/119969788/poly-copy-trading.git
cd poly-copy-trading
```

### 步骤 4：安装依赖

```bash
pnpm install
```

### 步骤 5：配置私钥

```bash
nano .env
```

添加以下内容（**替换为你的真实私钥**）：

```env
POLYMARKET_PRIVATE_KEY=你的真实私钥
DRY_RUN=true
```

保存文件：`Ctrl + O` → `Enter` → `Ctrl + X`

```bash
chmod 600 .env
```

### 步骤 6：测试运行

```bash
pnpm start
```

看到 "SDK 初始化成功" 后，按 `Ctrl + C` 停止。

### 步骤 7：后台运行

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # 按提示执行命令
```

### 步骤 8：查看状态

```bash
pm2 status
pm2 logs poly-copy-trading
```

---

## ✅ 安装完成！

### 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading

# 重启应用
pm2 restart poly-copy-trading

# 停止应用
pm2 stop poly-copy-trading
```

### 切换到实盘模式

编辑 `.env` 文件，将 `DRY_RUN=true` 改为 `DRY_RUN=false`，然后重启：

```bash
nano .env
pm2 restart poly-copy-trading
```

---

## 📖 详细安装指南

如需更详细的说明和故障排除，请查看：[服务器安装详细流程](./SERVER_INSTALL_GUIDE.md)

---

## ⚠️ 重要提示

1. **首次运行必须设置 `DRY_RUN=true` 进行测试！**
2. 确认一切正常后，再切换到实盘模式。
3. 定期检查日志：`pm2 logs poly-copy-trading`
