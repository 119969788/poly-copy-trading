# 服务器更新批量卖出功能指南

## 快速更新步骤

在服务器上执行以下命令：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 拉取最新代码
git pull origin main

# 3. 安装新依赖（如果有）
pnpm install

# 4. 完成！
```

## 使用批量卖出功能

更新后，可以直接使用：

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 模拟模式查看持仓（不会真实卖出）
pnpm batch-sell

# 实盘模式卖出（需要先在 .env 中设置 DRY_RUN=false）
pnpm batch-sell
```

## 完整更新脚本

如果使用 PM2 管理进程，更新后可以重启：

```bash
cd ~/projects/poly-copy-trading
git pull origin main
pnpm install

# 如果主程序正在运行，重启它
pm2 restart poly-copy-trading

# 查看日志确认
pm2 logs poly-copy-trading --lines 30
```

## 注意事项

1. **批量卖出是独立脚本**，不需要重启主跟单程序
2. **默认是模拟模式**，可以安全测试
3. **实盘卖出前**，务必在 `.env` 中设置 `DRY_RUN=false`
4. **批量卖出不会影响**正在运行的跟单程序

## 验证更新

更新后可以检查新文件是否存在：

```bash
# 检查文件
ls -la src/batch-sell.ts
ls -la BATCH_SELL_GUIDE.md

# 检查 package.json 中的新脚本
grep "batch-sell" package.json
```

应该看到：
```json
"batch-sell": "tsx src/batch-sell.ts"
```

---

**提示**：批量卖出功能是完全独立的，可以在任何时候运行，不会影响正在运行的自动跟单程序。
