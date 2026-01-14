# 📦 PM2 进程管理指南

## ⚠️ 错误解决

如果看到错误：
```
[PM2][ERROR] Process or Namespace poly-copy-trading not found
```

说明 PM2 进程还没有启动，需要先启动进程。

---

## 🚀 快速开始

### 1. 安装 PM2（如果还没有安装）

```bash
# 全局安装 PM2
npm install -g pm2
# 或
pnpm add -g pm2
```

### 2. 启动应用

```bash
# 方法 1：使用 PM2 配置文件（推荐）
pm2 start ecosystem.config.js

# 方法 2：直接启动
pm2 start tsx --name poly-copy-trading -- src/index.ts

# 方法 3：使用 npm 脚本
pnpm pm2:start
```

### 3. 查看状态

```bash
# 查看所有进程状态
pm2 status

# 或使用 npm 脚本
pnpm pm2:status
```

---

## 📋 常用 PM2 命令

### 启动和停止

```bash
# 启动应用
pm2 start ecosystem.config.js
# 或
pm2 start poly-copy-trading

# 停止应用
pm2 stop poly-copy-trading
# 或
pnpm pm2:stop

# 重启应用
pm2 restart poly-copy-trading
# 或
pnpm pm2:restart

# 删除进程（停止并移除）
pm2 delete poly-copy-trading
# 或
pnpm pm2:delete
```

### 查看日志

```bash
# 查看实时日志
pm2 logs poly-copy-trading
# 或
pnpm pm2:logs

# 查看最近 100 行日志
pm2 logs poly-copy-trading --lines 100

# 清空日志
pm2 flush poly-copy-trading
```

### 监控和管理

```bash
# 查看详细信息
pm2 show poly-copy-trading

# 实时监控（CPU、内存等）
pm2 monit

# 保存当前进程列表（开机自启需要）
pm2 save

# 设置开机自启
pm2 startup
```

---

## 🔧 配置文件说明

项目已包含 `ecosystem.config.js` 配置文件，包含以下设置：

- **name**: `poly-copy-trading` - 进程名称
- **script**: `tsx` - 使用 tsx 运行 TypeScript
- **args**: `src/index.ts` - 主文件路径
- **instances**: `1` - 单实例运行
- **autorestart**: `true` - 自动重启
- **watch**: `false` - 不监听文件变化（生产环境）
- **max_memory_restart**: `1G` - 内存超过 1GB 自动重启

---

## 📊 查看运行状态

### 基本状态

```bash
pm2 status
```

输出示例：
```
┌─────┬─────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                │ status  │ restart │ uptime   │
├─────┼─────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ poly-copy-trading   │ online  │ 0       │ 5m       │
└─────┴─────────────────────┴─────────┴─────────┴──────────┘
```

### 详细信息

```bash
pm2 show poly-copy-trading
```

---

## 🔄 更新代码后重启

```bash
# 方法 1：重启进程
pm2 restart poly-copy-trading

# 方法 2：重新加载（零停机时间）
pm2 reload poly-copy-trading
```

---

## 📝 日志文件位置

日志文件保存在 `./logs/` 目录：

- `pm2-out.log` - 标准输出日志
- `pm2-error.log` - 错误日志

如果目录不存在，PM2 会自动创建。

---

## ⚙️ 环境变量

PM2 会自动读取 `.env` 文件中的环境变量。

如果需要为 PM2 单独设置环境变量，可以在 `ecosystem.config.js` 中修改：

```javascript
env: {
  NODE_ENV: 'production',
  DRY_RUN: 'true',  // 添加自定义环境变量
},
```

---

## 🛠️ 故障排查

### 问题 1：进程启动后立即退出

```bash
# 查看错误日志
pm2 logs poly-copy-trading --err

# 检查环境变量
pm2 show poly-copy-trading
```

### 问题 2：找不到 tsx 命令

```bash
# 确保 tsx 已安装
pnpm install

# 或使用完整路径
pm2 start ./node_modules/.bin/tsx --name poly-copy-trading -- src/index.ts
```

### 问题 3：权限错误

```bash
# 确保有写入日志目录的权限
mkdir -p logs
chmod 755 logs
```

---

## 🎯 完整工作流程示例

```bash
# 1. 进入项目目录
cd /root/projects/poly-copy-trading

# 2. 启动应用
pm2 start ecosystem.config.js

# 3. 查看状态
pm2 status

# 4. 查看日志
pm2 logs poly-copy-trading

# 5. 保存配置（用于开机自启）
pm2 save

# 6. 设置开机自启（可选）
pm2 startup
```

---

## 📚 更多信息

- PM2 官方文档：https://pm2.keymetrics.io/
- 查看所有命令：`pm2 --help`

---

## ⚡ 快速命令参考

```bash
# 启动
pm2 start ecosystem.config.js

# 停止
pm2 stop poly-copy-trading

# 重启
pm2 restart poly-copy-trading

# 查看日志
pm2 logs poly-copy-trading

# 查看状态
pm2 status

# 删除进程
pm2 delete poly-copy-trading
```
