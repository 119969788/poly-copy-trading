# 价格阈值策略（赔率80买90卖）服务器更新指南

## 更新内容

本次更新添加了价格阈值策略功能：
- ✅ 赔率80（0.80）时自动买入
- ✅ 赔率90（0.90）时自动卖出
- ✅ 实时价格监控
- ✅ 自动持仓管理

## 快速更新命令

在服务器上执行以下命令：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# 2. 拉取最新代码
git pull origin main

# 3. 如果有冲突，先暂存本地修改
git stash
git pull origin main
git stash pop

# 4. 更新依赖
pnpm install

# 5. 重启应用（如果使用 PM2）
pm2 restart poly-copy-trading

# 6. 查看日志确认运行正常
pm2 logs poly-copy-trading --lines 50
```

## 详细更新步骤

### 1. 连接到服务器

```bash
ssh root@你的服务器IP
```

### 2. 进入项目目录

```bash
cd ~/projects/poly-copy-trading
# 或根据实际部署位置
cd ~/poly-copy-trading
```

### 3. 检查当前状态

```bash
# 查看当前分支
git status

# 查看当前运行的进程（如果使用 PM2）
pm2 list
```

### 4. 拉取最新代码

```bash
# 方式1：如果有本地修改，先暂存
git stash
git pull origin main
git stash pop

# 方式2：如果没有本地修改，直接拉取
git pull origin main

# 方式3：如果遇到冲突，强制使用远程版本（会丢失本地修改）
git fetch origin
git reset --hard origin/main
```

### 5. 更新依赖

```bash
pnpm install
```

### 6. 配置环境变量（如果需要启用价格阈值策略）

编辑 `.env` 文件：

```bash
nano .env
```

添加以下配置：

```env
# 启用价格阈值策略（赔率80买 90卖）
ENABLE_PRICE_THRESHOLD=true

# 买入阈值（赔率80）
BUY_PRICE_THRESHOLD=0.80

# 卖出阈值（赔率90）
SELL_PRICE_THRESHOLD=0.90

# 价格检查间隔（毫秒，默认1秒）
PRICE_CHECK_INTERVAL=1000

# 每次买入金额（USDC，默认10）
PRICE_THRESHOLD_BUY_AMOUNT=10
```

保存并退出（`Ctrl+X`，然后 `Y`，然后 `Enter`）

### 7. 重启应用

#### 如果使用 PM2：

```bash
# 重启应用
pm2 restart poly-copy-trading

# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading --lines 100
```

#### 如果使用 nohup：

```bash
# 找到进程ID
ps aux | grep "tsx src/dip-arb-15m.ts"

# 停止进程（替换 PID 为实际进程ID）
kill PID

# 重新启动
nohup pnpm dip-arb > dip-arb.log 2>&1 &

# 查看日志
tail -f dip-arb.log
```

### 8. 验证更新

```bash
# 查看日志，确认价格阈值策略已启用
pm2 logs poly-copy-trading | grep "价格阈值策略"

# 应该看到类似输出：
# 价格阈值策略: ✅ 已启用
# 买入阈值: 0.80 (赔率80)
# 卖出阈值: 0.90 (赔率90)
```

## 一键更新脚本

可以在服务器上使用项目自带的更新脚本：

```bash
cd ~/projects/poly-copy-trading
bash update-server.sh
```

或者创建自定义更新脚本：

```bash
#!/bin/bash

echo "开始更新价格阈值策略..."

cd ~/projects/poly-copy-trading || cd ~/poly-copy-trading

# 拉取代码
git pull origin main

# 更新依赖
pnpm install

# 重启应用
if command -v pm2 &> /dev/null; then
    pm2 restart poly-copy-trading
    pm2 logs poly-copy-trading --lines 20
else
    echo "请手动重启应用"
fi

echo "更新完成！"
```

## 功能说明

### 价格阈值策略工作原理

1. **价格监控**：每秒检查一次市场价格（UP和DOWN）
2. **自动买入**：当UP或DOWN价格 ≤ 0.80时，自动买入
3. **自动卖出**：当持仓价格 ≥ 0.90时，自动卖出
4. **持仓管理**：自动跟踪当前持仓，避免重复买入

### 配置参数说明

- **ENABLE_PRICE_THRESHOLD**: 是否启用价格阈值策略（默认 false）
- **BUY_PRICE_THRESHOLD**: 买入价格阈值（默认 0.80）
- **SELL_PRICE_THRESHOLD**: 卖出价格阈值（默认 0.90）
- **PRICE_CHECK_INTERVAL**: 价格检查间隔，单位毫秒（默认 1000）
- **PRICE_THRESHOLD_BUY_AMOUNT**: 每次买入金额，单位USDC（默认 10）

### 使用建议

1. **首次使用**：建议先使用模拟模式（`DRY_RUN=true`）测试
2. **参数调整**：可以根据市场情况调整买入/卖出阈值
3. **资金管理**：设置合适的买入金额，避免过度交易
4. **监控日志**：定期查看日志，确认策略正常运行

## 常见问题

### Q: 更新后价格阈值策略没有启用？

A: 检查 `.env` 文件中是否设置了 `ENABLE_PRICE_THRESHOLD=true`

### Q: 如何禁用价格阈值策略？

A: 在 `.env` 文件中设置 `ENABLE_PRICE_THRESHOLD=false` 或删除该配置项，然后重启应用

### Q: 价格阈值策略和暴跌套利策略冲突吗？

A: 不冲突，两个策略可以同时运行，互不影响

### Q: 如何查看价格阈值策略的运行状态？

A: 查看日志中的"价格阈值策略"相关信息，或查看统计信息中的持仓状态

### Q: 更新后出现错误？

A: 
1. 查看日志：`pm2 logs poly-copy-trading`
2. 检查依赖：`pnpm install`
3. 检查 `.env` 文件配置
4. 确认SDK版本是最新的

## 更新检查清单

- [ ] 代码已推送到 GitHub
- [ ] 连接到服务器
- [ ] 进入项目目录
- [ ] 拉取最新代码
- [ ] 更新依赖
- [ ] 配置环境变量（如需要）
- [ ] 重启应用
- [ ] 检查日志确认运行正常
- [ ] 验证价格阈值策略已启用

---

**提示**：首次使用建议在模拟模式下测试，确认策略正常工作后再切换到实盘模式。
