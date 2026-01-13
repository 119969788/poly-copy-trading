# 回收结算代币指南

## 功能介绍

当 Polymarket 市场结算后，获胜的代币可以 1:1 兑换成 USDC.e。这个脚本可以帮你自动回收所有已结算市场的代币。

## 使用方法

### 1. 本地运行

```bash
# 模拟模式（推荐首次使用）
DRY_RUN=true pnpm redeem

# 实盘模式
DRY_RUN=false pnpm redeem
```

### 2. 服务器运行

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 更新代码
git pull origin main
pnpm install

# 运行回收脚本
DRY_RUN=false pnpm redeem
```

## 工作原理

1. **获取所有持仓**：从钱包中获取所有持仓
2. **检查市场状态**：检查每个市场是否已结算（resolved/settled）
3. **回收代币**：对于已结算的市场，回收获胜的代币并兑换成 USDC.e

## 重要提示

⚠️ **注意**：
- 只有**已结算**的市场才能回收代币
- 结算后的市场，获胜的代币可以 1:1 兑换成 USDC.e
- 如果市场未结算，代币无法回收
- 首次运行建议使用模拟模式（`DRY_RUN=true`）测试

## SDK API 说明

脚本尝试了多种可能的 SDK API 方法名：
- `onchainService.redeem()`
- `onchainService.redeemTokens()`
- `onchainService.claimSettledTokens()`
- `tradingService.redeem()`

如果运行时提示"SDK 不支持赎回方法"，说明 SDK 的 API 方法名可能不同。请查看 SDK 文档，或者提供错误信息，我会相应调整代码。

## 常见问题

### Q: 为什么没有找到已结算的市场？

A: 可能的原因：
1. 当前没有已结算的市场持仓
2. 市场还未结算（需要等待结算）
3. SDK API 方法无法正确获取市场状态

### Q: 回收失败怎么办？

A: 请检查：
1. 网络连接是否正常
2. 钱包是否有足够的 Gas 费（MATIC）
3. 市场是否真的已结算
4. SDK 版本是否正确

### Q: 可以手动回收吗？

A: 可以，你也可以在 Polymarket 网站上手动回收已结算的代币。

---

**提示**：如果脚本无法正常工作，请提供完整的错误信息，我会根据实际情况调整代码。
