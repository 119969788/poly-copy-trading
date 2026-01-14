# 🚀 UltaHost VPS 安装指南

## 📋 前置要求

- UltaHost VPS 服务器（IP: 43.155.236.204）
- SSH 访问权限
- Root 或具有 sudo 权限的用户

---

## 🔧 步骤 1：连接到 VPS

在本地 PowerShell 或终端执行：

```bash
ssh root@43.155.236.204
```

输入服务器密码后连接。

---

## 📦 步骤 2：安装必要的软件

### 2.1 更新系统

```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS/RHEL
yum update -y
```

### 2.2 安装 Node.js 和 pnpm

```bash
# 安装 Node.js (使用 NodeSource 仓库，推荐 v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证安装
node --version
npm --version

# 安装 pnpm
npm install -g pnpm

# 验证 pnpm
pnpm --version
```

### 2.3 安装 Git（如果还没有）

```bash
apt install -y git
```

### 2.4 安装 PM2（进程管理器）

```bash
npm install -g pm2
```

---

## 📥 步骤 3：克隆仓库

```bash
# 进入常用目录
cd /root

# 克隆仓库
git clone https://github.com/119969788/poly-copy-trading.git

# 进入项目目录
cd poly-copy-trading
```

---

## 🔨 步骤 4：安装项目依赖

```bash
# 安装依赖
pnpm install

# 如果 pnpm 不可用，使用 npm
# npm install
```

---

## ⚙️ 步骤 5：配置环境变量

### 5.1 创建 .env 文件

```bash
# 复制示例文件
cp env.example.txt .env

# 编辑 .env 文件
nano .env
```

### 5.2 配置内容

在 `.env` 文件中添加：

```env
# 必需：Polymarket 私钥
POLYMARKET_PRIVATE_KEY=your_private_key_here

# 可选：指定要跟随的钱包地址（用逗号分隔）
# 如果不设置，则跟随排行榜前 50 名
# TARGET_ADDRESSES=0x1234...,0x5678...

# 可选：是否启用模拟模式（默认 true）
# DRY_RUN=true
```

**重要**：
- 将 `your_private_key_here` 替换为你的实际私钥
- 首次使用建议设置 `DRY_RUN=true`（模拟模式）

保存：`Ctrl+O` → `Enter` → `Ctrl+X`

---

## 🚀 步骤 6：配置 PM2

### 6.1 检查 PM2 配置文件

```bash
# 查看是否有 ecosystem.config.js 或 ecosystem.config.cjs
ls -la ecosystem.config.*

# 如果有 ecosystem.config.cjs，使用它
# 如果有 ecosystem.config.js，使用它
```

### 6.2 如果配置文件不存在，创建一个

```bash
nano ecosystem.config.cjs
```

粘贴以下内容：

```javascript
module.exports = {
  apps: [
    {
      name: 'poly-copy-trading',
      script: 'tsx',
      args: 'src/index.ts',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
```

保存：`Ctrl+O` → `Enter` → `Ctrl+X`

---

## ✅ 步骤 7：测试运行

### 7.1 先测试（模拟模式）

```bash
# 测试运行（不会真实交易）
npx tsx src/index.ts
```

按 `Ctrl+C` 停止测试。

### 7.2 如果测试成功，启动 PM2

```bash
# 启动应用
pm2 start ecosystem.config.cjs
# 或
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading
```

---

## 🔄 步骤 8：设置开机自启

```bash
# 保存当前 PM2 进程列表
pm2 save

# 设置开机自启
pm2 startup

# 按照提示执行生成的命令（通常是 sudo 命令）
```

---

## 📊 步骤 9：常用管理命令

### 查看状态

```bash
pm2 status
pm2 show poly-copy-trading
```

### 查看日志

```bash
# 实时日志
pm2 logs poly-copy-trading

# 最近 100 行
pm2 logs poly-copy-trading --lines 100

# 只查看错误
pm2 logs poly-copy-trading --err
```

### 重启/停止

```bash
# 重启
pm2 restart poly-copy-trading

# 停止
pm2 stop poly-copy-trading

# 删除进程
pm2 delete poly-copy-trading
```

### 监控

```bash
# 实时监控（CPU、内存）
pm2 monit
```

---

## 🔧 步骤 10：安装批量出售功能（可选）

如果需要使用批量出售功能：

```bash
# 确保 batch-sell.ts 文件存在
ls -la src/batch-sell.ts

# 如果不存在，从 GitHub 拉取最新代码
git pull origin main

# 测试批量出售（模拟模式）
npx tsx src/batch-sell.ts

# 真实出售（谨慎使用）
npx tsx src/batch-sell.ts --real
```

---

## 🛠️ 故障排查

### 问题 1：Node.js 版本不对

```bash
# 检查版本
node --version

# 应该 >= 18，推荐 20
# 如果版本不对，重新安装
```

### 问题 2：依赖安装失败

```bash
# 清除缓存
pnpm store prune
# 或
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules
pnpm install
```

### 问题 3：PM2 启动失败

```bash
# 查看详细错误
pm2 logs poly-copy-trading --err

# 检查环境变量
pm2 show poly-copy-trading

# 手动测试运行
npx tsx src/index.ts
```

### 问题 4：端口或权限问题

```bash
# 检查防火墙
ufw status

# 如果需要开放端口（通常不需要，因为这是内部脚本）
# ufw allow 端口号
```

---

## 📝 完整安装命令（一键执行）

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. 安装 pnpm 和 PM2
npm install -g pnpm pm2

# 4. 安装 Git
apt install -y git

# 5. 克隆仓库
cd /root
git clone https://github.com/119969788/poly-copy-trading.git
cd poly-copy-trading

# 6. 安装依赖
pnpm install

# 7. 创建 .env 文件
cp env.example.txt .env
nano .env  # 编辑并添加私钥

# 8. 测试运行
npx tsx src/index.ts  # 按 Ctrl+C 停止

# 9. 启动 PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # 按照提示执行命令
```

---

## ✅ 验证安装

执行以下命令验证安装是否成功：

```bash
# 1. 检查 Node.js
node --version  # 应该显示 v20.x.x

# 2. 检查 pnpm
pnpm --version  # 应该显示版本号

# 3. 检查 PM2
pm2 --version  # 应该显示版本号

# 4. 检查项目文件
ls -la src/
ls -la package.json

# 5. 检查 PM2 进程
pm2 status  # 应该看到 poly-copy-trading 进程

# 6. 检查日志
pm2 logs poly-copy-trading --lines 20
```

---

## 🔐 安全建议

1. **私钥安全**：
   - 不要将 `.env` 文件分享给任何人
   - 确保 `.env` 文件权限：`chmod 600 .env`

2. **防火墙**：
   - 只开放必要的端口
   - 使用 SSH 密钥认证而不是密码

3. **定期更新**：
   ```bash
   # 更新代码
   cd /root/poly-copy-trading
   git pull origin main
   pnpm install
   pm2 restart poly-copy-trading
   ```

---

## 📚 相关文档

- 项目 README: `README.md`
- 部署指南: `DEPLOY.md`
- PM2 配置: `ecosystem.config.cjs`
- 批量出售: `BATCH_SELL_GUIDE.md`

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看 PM2 日志：`pm2 logs poly-copy-trading`
2. 查看项目文档
3. 检查 GitHub Issues

---

## 🎯 快速参考

```bash
# 启动
pm2 start ecosystem.config.cjs

# 停止
pm2 stop poly-copy-trading

# 重启
pm2 restart poly-copy-trading

# 查看日志
pm2 logs poly-copy-trading

# 查看状态
pm2 status
```
