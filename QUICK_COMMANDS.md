# 快速命令参考

## 🚀 批量出售代币命令

### 最常用的命令

```bash
# 1. 测试（模拟模式）- 推荐先运行
npx tsx src/batch-sell.ts

# 2. 真实出售（实盘模式）
npx tsx src/batch-sell.ts --real

# 3. 只出售高价代币（>= $0.1）
npx tsx src/batch-sell.ts --real --min-price 0.1

# 4. 保守出售（5% 滑点，2 秒延迟）
npx tsx src/batch-sell.ts --real --max-slippage 0.05 --delay 2000
```

---

## 📦 使用 pnpm/npm 脚本

```bash
# 模拟模式
pnpm batch-sell
npm run batch-sell

# 实盘模式
pnpm batch-sell-real
```

---

## 🎛️ 参数说明

- `--real` : 实盘模式（真实出售）
- `--min-price <价格>` : 最小价格（例如：0.1）
- `--max-slippage <滑点>` : 最大滑点（例如：0.05 = 5%）
- `--delay <毫秒>` : 交易延迟（例如：2000 = 2秒）

---

## ⚡ 一键命令（复制即用）

```bash
# 测试运行
npx tsx src/batch-sell.ts

# 真实出售所有
npx tsx src/batch-sell.ts --real

# 真实出售高价代币（>= $0.1）
npx tsx src/batch-sell.ts --real --min-price 0.1
```
