# PM2 应用启动和配置指南

## 错误：Process or Namespace poly-copy-trading not found

这个错误表示 PM2 中没有名为 `poly-copy-trading` 的应用。

## 解决方案

### 1. 检查 PM2 中是否有其他应用

```bash
# 查看所有 PM2 应用
pm2 list

# 或
pm2 status
```

### 2. 如果应用不存在，启动应用

#### 方法 A：使用 ecosystem.config.js（推荐）

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 使用配置文件启动
pm2 start ecosystem.config.js

# 保存配置（让 PM2 记住，重启后自动启动）
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading
```

#### 方法 B：直接启动命令

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 启动应用
pm2 start pnpm --name "poly-copy-trading" -- start

# 保存配置
pm2 save

# 查看状态
pm2 status
```

#### 方法 C：使用 npm script

如果 package.json 中有 start 脚本：

```bash
cd ~/projects/poly-copy-trading
pm2 start npm --name "poly-copy-trading" -- start

# 或使用 pnpm
pm2 start pnpm --name "poly-copy-trading" -- start
```

### 3. 如果应用名称不同

如果 `pm2 list` 显示应用存在但名称不同，可以使用实际名称：

```bash
# 查看所有应用
pm2 list

# 使用实际的应用名称
pm2 restart <实际应用名称>
pm2 logs <实际应用名称>
pm2 stop <实际应用名称>
```

## 完整的 PM2 设置流程

### 首次设置

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 确保依赖已安装
pnpm install

# 3. 确保 .env 文件已配置
ls -la .env
# 如果不存在，创建并配置私钥

# 4. 启动应用（选择一种方式）

# 方式1：使用 ecosystem.config.js（推荐）
pm2 start ecosystem.config.js

# 方式2：直接命令
pm2 start pnpm --name "poly-copy-trading" -- start

# 5. 保存配置（重要！）
pm2 save

# 6. 设置开机自启（可选但推荐）
pm2 startup
# 按照提示执行命令（通常是复制粘贴一个命令）

# 7. 查看状态和日志
pm2 status
pm2 logs poly-copy-trading --lines 50
```

### 验证应用运行

```bash
# 查看应用列表
pm2 list

# 应该看到类似输出：
# ┌─────┬──────────────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name                 │ mode        │ ↺       │ status  │ cpu      │
# ├─────┼──────────────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ poly-copy-trading    │ fork        │ 0       │ online  │ 0%       │
# └─────┴──────────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

## 常用 PM2 命令

```bash
# 启动应用
pm2 start ecosystem.config.js
# 或
pm2 start pnpm --name "poly-copy-trading" -- start

# 停止应用
pm2 stop poly-copy-trading

# 重启应用
pm2 restart poly-copy-trading

# 删除应用
pm2 delete poly-copy-trading

# 查看状态
pm2 status
pm2 list

# 查看日志
pm2 logs poly-copy-trading
pm2 logs poly-copy-trading --lines 50
pm2 logs poly-copy-trading --follow  # 实时查看

# 监控
pm2 monit

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
pm2 save
```

## 检查 ecosystem.config.js

确保项目根目录有 `ecosystem.config.js` 文件，内容应该类似：

```javascript
module.exports = {
  apps: [{
    name: 'poly-copy-trading',
    script: 'pnpm',
    args: 'start',
    cwd: process.cwd(),
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
    merge_logs: true,
  }]
};
```

如果没有，可以从 GitHub 拉取或创建。

## 故障排除

### 问题 1：应用启动后立即退出

```bash
# 查看错误日志
pm2 logs poly-copy-trading --err

# 检查 .env 文件
cat .env

# 检查依赖
pnpm install

# 手动运行测试
pnpm start
```

### 问题 2：应用名称冲突

```bash
# 查看所有应用
pm2 list

# 删除旧应用
pm2 delete <应用名称或ID>

# 重新启动
pm2 start ecosystem.config.js
```

### 问题 3：端口被占用

```bash
# 检查端口占用（如果应用使用端口）
netstat -tulpn | grep :端口号

# 或
lsof -i :端口号
```

### 问题 4：权限问题

```bash
# 检查文件权限
ls -la src/index.ts
ls -la .env

# 确保 .env 权限正确
chmod 600 .env

# 如果使用非 root 用户，可能需要调整权限
```

## 快速检查清单

- [ ] 项目目录存在
- [ ] 依赖已安装（`pnpm install`）
- [ ] `.env` 文件存在并配置正确
- [ ] `ecosystem.config.js` 文件存在（或使用直接命令）
- [ ] PM2 已安装（`pm2 --version`）
- [ ] 应用已启动（`pm2 list`）
- [ ] 应用状态为 `online`（`pm2 status`）
- [ ] 日志正常（`pm2 logs`）

## 完整的启动脚本示例

创建 `start.sh`：

```bash
#!/bin/bash

cd ~/projects/poly-copy-trading

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在，请先配置"
    exit 1
fi

# 安装依赖（如果需要）
pnpm install

# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js

# 保存配置
pm2 save

echo "✅ 应用已启动"
pm2 status
```

使用方法：
```bash
chmod +x start.sh
./start.sh
```

---

**提示**：如果应用名称确实不存在，请先使用上面的方法启动应用，然后再使用 `pm2 restart` 等命令。
