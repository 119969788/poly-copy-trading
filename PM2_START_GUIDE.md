# PM2 启动指南

## 问题

更新后遇到：
```
[PM2][ERROR] Process or Namespace poly-copy-trading not found
```

这说明 PM2 应用还没有启动或已停止。

## 解决方案

### 方法 1：使用 ecosystem.config.js 启动（推荐）

```bash
cd ~/projects/poly-copy-trading

# 使用配置文件启动
pm2 start ecosystem.config.js

# 保存 PM2 配置（让 PM2 记住应用）
pm2 save

# 设置开机自启（可选）
pm2 startup
```

### 方法 2：直接启动

```bash
cd ~/projects/poly-copy-trading

# 直接启动
pm2 start "pnpm start" --name poly-copy-trading

# 保存配置
pm2 save
```

### 方法 3：使用编译后的文件（如果已编译）

```bash
cd ~/projects/poly-copy-trading

# 先编译
pnpm build

# 启动编译后的文件
pm2 start dist/index.js --name poly-copy-trading

# 保存配置
pm2 save
```

## 完整启动流程

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 确保依赖已安装
pnpm install

# 3. 检查 .env 文件
ls -la .env

# 4. 启动应用
pm2 start ecosystem.config.js

# 5. 查看状态
pm2 status

# 6. 查看日志
pm2 logs poly-copy-trading --lines 30

# 7. 保存配置
pm2 save
```

## 常用 PM2 命令

```bash
# 查看所有应用状态
pm2 status

# 查看应用列表
pm2 list

# 查看日志
pm2 logs poly-copy-trading

# 查看最近 50 行日志
pm2 logs poly-copy-trading --lines 50

# 重启应用
pm2 restart poly-copy-trading

# 停止应用
pm2 stop poly-copy-trading

# 删除应用
pm2 delete poly-copy-trading

# 查看详细信息
pm2 describe poly-copy-trading

# 监控
pm2 monit
```

## 检查启动是否成功

启动后检查：

```bash
# 1. 查看状态
pm2 status

# 应该看到：
# ┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name                 │ status  │ restart │ uptime   │
# ├─────┼──────────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ poly-copy-trading    │ online  │ 0       │ 1m       │
# └─────┴──────────────────────┴─────────┴─────────┴──────────┘

# 2. 查看日志
pm2 logs poly-copy-trading --lines 30

# 应该看到启动信息和配置信息
```

## 如果启动失败

### 检查错误

```bash
# 查看错误日志
pm2 logs poly-copy-trading --err --lines 50

# 查看所有日志
pm2 logs poly-copy-trading --lines 100
```

### 常见问题

1. **找不到 .env 文件**
   ```bash
   # 检查文件是否存在
   ls -la .env
   
   # 如果不存在，从示例创建
   cp env.example.txt .env
   nano .env  # 编辑配置
   ```

2. **私钥未设置**
   ```bash
   # 检查 .env 文件
   grep POLYMARKET_PRIVATE_KEY .env
   
   # 应该看到私钥（不是 your_private_key_here）
   ```

3. **端口被占用**
   ```bash
   # 检查是否有其他进程
   ps aux | grep "tsx src/index.ts"
   
   # 如果有，先停止
   pm2 stop all
   pm2 delete all
   ```

4. **依赖问题**
   ```bash
   # 重新安装依赖
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

## 设置开机自启

```bash
# 1. 生成启动脚本
pm2 startup

# 2. 按照提示执行命令（通常是 sudo 命令）

# 3. 保存当前 PM2 应用列表
pm2 save
```

## 一键启动脚本

创建 `start-pm2.sh`：

```bash
#!/bin/bash
cd ~/projects/poly-copy-trading
pnpm install
pm2 start ecosystem.config.js
pm2 save
pm2 logs poly-copy-trading --lines 30
```

然后运行：
```bash
chmod +x start-pm2.sh
./start-pm2.sh
```

---

**提示**：首次启动建议先在前台运行 `pnpm start` 测试，确认无误后再用 PM2 启动。
