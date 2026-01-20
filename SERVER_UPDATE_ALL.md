# 服务器更新完整指南

## 快速更新命令

在服务器上执行：

```bash
cd ~/projects/poly-copy-trading && \
git pull origin main && \
pnpm install && \
echo "✅ 更新完成！"
```

## 详细更新步骤

### 1. 进入项目目录

```bash
cd ~/projects/poly-copy-trading
```

### 2. 处理本地更改（如果有冲突）

如果 `git pull` 失败，执行：

```bash
# 方法1：保存本地更改
git stash

# 方法2：放弃本地更改（如果不重要）
git restore package.json
git restore ecosystem.config.cjs
```

### 3. 拉取最新代码

```bash
git pull origin main
```

### 4. 安装依赖

```bash
pnpm install
```

### 5. 验证更新

```bash
# 检查新文件是否存在
ls -la src/redeem-settled.ts
ls -la src/batch-sell.ts
ls -la src/dip-arb-15m.ts

# 检查 package.json 中的脚本
grep -E "(redeem|batch-sell|dip-arb)" package.json
```

### 6. 运行脚本（根据需要）

```bash
# 回收已结算的代币
pnpm redeem

# 批量卖出持仓
pnpm batch-sell

# 15分钟市场暴跌套利
pnpm dip-arb

# 自动跟单
pnpm start
```

## 如果使用 PM2 运行

```bash
# 更新代码后重启应用
cd ~/projects/poly-copy-trading
git pull origin main
pnpm install

# 重启应用
pm2 restart poly-copy-trading

# 查看日志
pm2 logs poly-copy-trading --lines 50
```

## 常见问题

### Q: Git pull 失败，提示有本地更改

A: 执行以下命令：

```bash
git stash
git pull origin main
```

### Q: 文件不存在错误

A: 确保代码已更新：

```bash
git pull origin main
pnpm install
```

### Q: 命令找不到（如 pnpm redeem）

A: 检查 package.json 是否已更新：

```bash
grep "redeem" package.json
```

如果没有，执行 `git pull origin main` 更新。

---

**提示**：更新后建议先测试运行，确认功能正常后再用于实盘交易。
