# 服务器更新 15分钟市场暴跌套利策略

## 快速更新步骤

在服务器上执行：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 拉取最新代码
git pull origin main

# 3. 重新安装依赖（如果有新依赖）
pnpm install

# 4. 完成！
```

## 如果使用 PM2 运行跟单策略

```bash
cd ~/projects/poly-copy-trading
git pull origin main
pnpm install

# 重启跟单策略（如果正在运行）
pm2 restart poly-copy-trading

# 查看日志
pm2 logs poly-copy-trading --lines 30
```

## 运行15分钟市场暴跌套利策略

更新后可以使用新的策略：

```bash
# 1. 测试运行（模拟模式）
DRY_RUN=true pnpm dip-arb

# 2. 实盘运行
pnpm dip-arb
```

### 使用 PM2 运行暴跌套利策略

```bash
# 方式1：修改 ecosystem.config.cjs
# 将 script 改为: 'src/dip-arb-15m.ts'
nano ecosystem.config.cjs

# 然后启动
pm2 start ecosystem.config.cjs --name dip-arb-15m

# 方式2：直接启动
pm2 start "pnpm dip-arb" --name dip-arb-15m

# 保存配置
pm2 save
```

## 配置参数（可选）

如果需要配置参数，编辑 `.env` 文件：

```bash
nano .env
```

添加或修改：

```env
# 币种
COIN=ETH

# Leg1 参数
SLIDING_WINDOW_MS=3000
DIP_THRESHOLD=0.3

# Leg2 参数
SUM_TARGET=0.95

# 止损参数
LEG2_TIMEOUT_SECONDS=100
```

## 一键更新命令

```bash
cd ~/projects/poly-copy-trading && \
git pull origin main && \
pnpm install && \
echo "✅ 更新完成！"
```

## 验证更新

更新后验证：

```bash
# 1. 检查文件是否存在
ls -la src/dip-arb-15m.ts
ls -la DIP_ARB_GUIDE.md

# 2. 检查 package.json 中的新脚本
grep "dip-arb" package.json

# 应该看到：
# "dip-arb": "tsx src/dip-arb-15m.ts"

# 3. 测试运行（模拟模式）
DRY_RUN=true pnpm dip-arb 2>&1 | head -30
```

## 同时运行多个策略

可以同时运行跟单策略和暴跌套利策略：

```bash
# 启动跟单策略
pm2 start ecosystem.config.cjs --name poly-copy-trading

# 修改 ecosystem.config.cjs 中的 script 为 src/dip-arb-15m.ts
# 然后启动暴跌套利策略
pm2 start ecosystem.config.cjs --name dip-arb-15m --update-env

# 查看所有进程
pm2 list

# 查看日志
pm2 logs
```

或者创建两个不同的配置文件：

```bash
# 复制配置文件
cp ecosystem.config.cjs ecosystem.copy-trading.cjs
cp ecosystem.config.cjs ecosystem.dip-arb.cjs

# 编辑配置文件，修改 script 和 name
# 然后分别启动
pm2 start ecosystem.copy-trading.cjs
pm2 start ecosystem.dip-arb.cjs
```

---

**提示**：首次运行暴跌套利策略建议使用模拟模式（`DRY_RUN=true`）测试参数效果！
