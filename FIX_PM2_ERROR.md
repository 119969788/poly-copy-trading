# 🔧 修复 PM2 错误：Process not found

## ⚠️ 错误信息
```
[PM2][ERROR] Process or Namespace poly-copy-trading not found
```

## ✅ 解决方法

这个错误表示 PM2 进程还没有启动。需要先启动进程。

---

## 🚀 快速修复（3 步）

### 1. 进入项目目录

```bash
cd /root/projects/poly-copy-trading
```

### 2. 启动 PM2 进程

```bash
# 方法 1：使用配置文件（推荐）
pm2 start ecosystem.config.js

# 方法 2：直接启动
pm2 start tsx --name poly-copy-trading -- src/index.ts
```

### 3. 验证启动成功

```bash
pm2 status
```

应该看到 `poly-copy-trading` 进程状态为 `online`。

---

## 📋 完整命令列表

### 启动应用

```bash
# 使用配置文件
pm2 start ecosystem.config.js

# 或直接启动
pm2 start tsx --name poly-copy-trading -- src/index.ts
```

### 查看状态

```bash
pm2 status
pm2 show poly-copy-trading
```

### 查看日志

```bash
pm2 logs poly-copy-trading
```

### 停止/重启

```bash
# 停止
pm2 stop poly-copy-trading

# 重启
pm2 restart poly-copy-trading

# 删除进程
pm2 delete poly-copy-trading
```

---

## 🔍 如果仍然出错

### 检查 PM2 是否已安装

```bash
pm2 --version
```

如果没有安装：

```bash
npm install -g pm2
# 或
pnpm add -g pm2
```

### 检查配置文件是否存在

```bash
ls -la ecosystem.config.js
```

如果不存在，需要上传配置文件到服务器。

### 检查项目目录

```bash
pwd
ls -la src/index.ts
```

确保在正确的项目目录中。

---

## 📝 上传配置文件到服务器

如果服务器上没有 `ecosystem.config.js`，需要上传：

### 方法 1：使用 SCP（本地 PowerShell）

```powershell
cd D:\000\poly-copy-trading-main
scp ecosystem.config.js root@服务器IP:/root/projects/poly-copy-trading/
```

### 方法 2：在服务器上创建

```bash
cd /root/projects/poly-copy-trading
nano ecosystem.config.js
```

然后复制以下内容：

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

## ✅ 验证修复

启动后，运行以下命令验证：

```bash
# 1. 查看状态
pm2 status

# 2. 查看日志（应该看到应用启动信息）
pm2 logs poly-copy-trading --lines 50

# 3. 查看详细信息
pm2 show poly-copy-trading
```

---

## 🎯 一键启动命令

```bash
cd /root/projects/poly-copy-trading && pm2 start ecosystem.config.js && pm2 status
```

---

## 📚 更多帮助

详细使用指南：查看 `PM2_GUIDE.md`
