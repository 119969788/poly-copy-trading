# PM2 更新环境变量指南

## 使用 --update-env 更新环境变量

当修改了 `.env` 文件后，需要使用 `--update-env` 参数来让 PM2 重新加载环境变量。

## 快速更新步骤

### 1. 修改 .env 文件

编辑 `.env` 文件，添加或修改配置：

```bash
nano .env
```

例如，添加价格阈值策略配置：

```env
# 启用价格阈值策略（赔率80买 90卖）
ENABLE_PRICE_THRESHOLD=true
BUY_PRICE_THRESHOLD=0.80
SELL_PRICE_THRESHOLD=0.90
PRICE_CHECK_INTERVAL=1000
PRICE_THRESHOLD_BUY_AMOUNT=10
```

### 2. 使用 --update-env 重启应用

```bash
# 重启应用并更新环境变量
pm2 restart poly-copy-trading --update-env

# 或者对于 arbitrage-15m
pm2 restart arbitrage-15m --update-env
```

### 3. 验证环境变量已更新

```bash
# 查看应用状态
pm2 status

# 查看日志确认配置已加载
pm2 logs poly-copy-trading --lines 50
# 或
pm2 logs arbitrage-15m --lines 50
```

## 完整更新流程（包含代码更新）

如果同时更新了代码和环境变量：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# 2. 拉取最新代码
git pull origin main

# 3. 更新依赖（如果有新依赖）
pnpm install

# 4. 编辑 .env 文件（如果需要）
nano .env

# 5. 重启应用并更新环境变量
pm2 restart poly-copy-trading --update-env
# 或
pm2 restart arbitrage-15m --update-env

# 6. 查看日志确认
pm2 logs --lines 50
```

## 针对不同应用的更新

### 更新 poly-copy-trading（跟单策略）

```bash
pm2 restart poly-copy-trading --update-env
```

### 更新 arbitrage-15m（15分钟套利策略）

```bash
pm2 restart arbitrage-15m --update-env
```

### 更新 dip-arb-15m（暴跌套利策略）

```bash
pm2 restart dip-arb-15m --update-env
```

## 在 ecosystem.config.cjs 中配置环境变量

也可以直接在 `ecosystem.config.cjs` 中配置环境变量：

```javascript
module.exports = {
  apps: [{
    name: 'poly-copy-trading',
    script: 'npx',
    args: 'tsx src/index.ts',
    cwd: __dirname,
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      // 可以直接在这里设置环境变量
      ENABLE_PRICE_THRESHOLD: 'true',
      BUY_PRICE_THRESHOLD: '0.80',
      SELL_PRICE_THRESHOLD: '0.90',
    },
    // 或者使用 env_file 从 .env 文件加载
    env_file: '.env',
    error_file: path.join(__dirname, 'logs', 'err.log'),
    out_file: path.join(__dirname, 'logs', 'out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    log_file: path.join(__dirname, 'logs', 'combined.log'),
    time: true
  }]
};
```

然后重启：

```bash
pm2 restart ecosystem.config.cjs --update-env
```

## 常用 PM2 命令

```bash
# 查看所有应用状态
pm2 list
# 或
pm2 status

# 重启应用（不更新环境变量）
pm2 restart <app_name>

# 重启应用（更新环境变量）⭐
pm2 restart <app_name> --update-env

# 停止应用
pm2 stop <app_name>

# 删除应用
pm2 delete <app_name>

# 查看日志
pm2 logs <app_name>
pm2 logs <app_name> --lines 100  # 查看最后100行

# 查看详细信息
pm2 show <app_name>

# 保存当前配置
pm2 save

# 设置开机自启
pm2 startup
pm2 save
```

## 更新价格阈值策略配置示例

### 步骤 1：编辑 .env 文件

```bash
nano .env
```

添加或修改：

```env
# 价格阈值策略配置
ENABLE_PRICE_THRESHOLD=true
BUY_PRICE_THRESHOLD=0.80
SELL_PRICE_THRESHOLD=0.90
PRICE_CHECK_INTERVAL=1000
PRICE_THRESHOLD_BUY_AMOUNT=10
```

### 步骤 2：重启应用

```bash
# 如果运行的是 dip-arb-15m
pm2 restart dip-arb-15m --update-env

# 如果运行的是 arbitrage-15m
pm2 restart arbitrage-15m --update-env

# 如果运行的是 poly-copy-trading
pm2 restart poly-copy-trading --update-env
```

### 步骤 3：验证配置

查看日志，应该看到：

```
📋 配置信息：
   价格阈值策略: ✅ 已启用
   买入阈值: 0.80 (赔率80)
   卖出阈值: 0.90 (赔率90)
```

## 常见问题

### Q: 为什么修改了 .env 文件但配置没有生效？

A: PM2 在启动时会读取环境变量，之后修改 `.env` 文件不会自动生效。需要使用 `--update-env` 参数重启：

```bash
pm2 restart <app_name> --update-env
```

### Q: --update-env 和普通 restart 有什么区别？

A:
- `pm2 restart <app_name>`: 只重启应用，不重新加载环境变量
- `pm2 restart <app_name> --update-env`: 重启应用并重新加载环境变量（从 `.env` 文件或 `ecosystem.config.cjs` 中的 `env` 配置）

### Q: 如何确认环境变量已更新？

A: 查看日志，应用启动时会打印配置信息。或者使用：

```bash
pm2 show <app_name>
```

查看应用的环境变量。

### Q: 可以同时更新多个应用吗？

A: 可以：

```bash
pm2 restart all --update-env
```

### Q: 更新环境变量后需要保存配置吗？

A: 如果修改了 `ecosystem.config.cjs`，需要：

```bash
pm2 save
```

如果只是修改了 `.env` 文件，使用 `--update-env` 重启即可。

## 一键更新脚本

创建 `update-env.sh`：

```bash
#!/bin/bash

echo "正在更新环境变量..."

# 进入项目目录
cd ~/projects/poly-copy-trading || cd ~/poly-copy-trading

# 拉取最新代码（可选）
# git pull origin main

# 重启应用并更新环境变量
if pm2 list | grep -q "arbitrage-15m"; then
    echo "重启 arbitrage-15m..."
    pm2 restart arbitrage-15m --update-env
fi

if pm2 list | grep -q "dip-arb-15m"; then
    echo "重启 dip-arb-15m..."
    pm2 restart dip-arb-15m --update-env
fi

if pm2 list | grep -q "poly-copy-trading"; then
    echo "重启 poly-copy-trading..."
    pm2 restart poly-copy-trading --update-env
fi

echo "✅ 环境变量更新完成！"
echo ""
echo "查看日志："
pm2 logs --lines 20
```

使用：

```bash
chmod +x update-env.sh
./update-env.sh
```

---

**提示**：每次修改 `.env` 文件后，记得使用 `--update-env` 参数重启应用，否则新配置不会生效！
