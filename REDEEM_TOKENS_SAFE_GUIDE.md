# Safe 代理钱包代币回收指南

## 简介

这个工具用于通过 Safe 代理钱包批量回收已结算的 Polymarket 代币。它使用 Safe Protocol Kit 来安全地执行批量交易。

## 功能特性

- ✅ 支持 Safe 代理钱包（从 Polymarket portfolio 获取）
- ✅ 批量回收多个持仓
- ✅ 自动检查 payout，只赎回获胜方向的代币
- ✅ 使用官方 CTF `redeemPositions` 方法
- ✅ 支持模拟模式（dryRun）进行安全测试
- ✅ 详细的交易日志和统计信息

## 安装依赖

首先需要安装必要的依赖：

```bash
pnpm install
```

如果依赖安装失败，可以手动安装：

```bash
pnpm add ethers@^6.9.0 @safe-global/protocol-kit@^3.0.0 @safe-global/safe-ethers-lib@^3.0.0 axios@^1.6.0
```

## 配置

在 `.env` 文件中添加以下配置：

```bash
# 必需：EOA owner 的私钥（用于签名 Safe 交易）
POLYMARKET_PRIVATE_KEY=your_private_key_here

# 必需：Safe 代理钱包地址（从 Polymarket portfolio 页面获取）
SAFE_PROXY_ADDRESS=0x316Df7B970dDC7CCF4f3DfBD2587E422b98E38bF

# 或者使用这个变量名（两者都可以）
# PROXY_WALLET_ADDRESS=0x316Df7B970dDC7CCF4f3DfBD2587E422b98E38bF

# 可选：Polygon RPC URL（默认使用公共 RPC）
# POLYGON_RPC_URL=https://polygon-rpc.com

# 可选：是否启用模拟模式（默认 true）
# DRY_RUN=true
```

### 如何获取 Safe 代理地址

1. 登录 Polymarket
2. 进入 Portfolio 页面
3. 查看你的代理钱包地址（Proxy Wallet Address）
4. 将这个地址设置为 `SAFE_PROXY_ADDRESS`

## 使用方法

### 1. 模拟模式（推荐先测试）

```bash
# 确保 DRY_RUN=true（默认值）
pnpm redeem-tokens-safe
```

这会显示所有可赎回的持仓，但不会执行真实交易。

### 2. 实盘模式

```bash
# 在 .env 中设置 DRY_RUN=false
# 然后运行
pnpm redeem-tokens-safe
```

## 工作原理

1. **获取持仓**：从 Polymarket Data API 获取可赎回的持仓
   - API: `https://data-api.polymarket.com/positions?proxyWallet={address}&redeemable=true&limit=100`

2. **检查 payout**：对每个持仓检查 CTF 合约的 `payoutNumerator`
   - 如果 payout = 0，说明是失败方向，跳过
   - 如果 payout > 0，说明是获胜方向，可以赎回

3. **准备批量交易**：将所有获胜持仓编码为 Safe 批量交易

4. **执行交易**：
   - 使用 Safe SDK 创建交易
   - 使用 EOA 私钥签名
   - 通过 Safe 代理钱包执行批量赎回

## 技术细节

### CTF redeemPositions 参数

根据官方文档，`redeemPositions` 需要以下参数：

- `collateralToken`: USDC.e 地址 (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`)
- `parentCollectionId`: `bytes32(0)` - null（二进制市场）
- `conditionId`: `bytes32` 格式的条件ID
- `indexSets`: `[1, 2]` - 批量处理 YES 和 NO 方向

### 为什么使用 [1, 2]？

使用 `[1, 2]` 批量处理所有方向是安全的：
- 只有获胜方向的代币会被赎回并返回 USDC.e
- 失败方向的代币会被忽略（payout=0）
- 这样可以避免需要单独判断每个方向

## 常见问题

### Q: 如何知道我的代理钱包地址？

A: 登录 Polymarket，进入 Portfolio 页面，查看 "Proxy Wallet Address"。

### Q: 为什么有些持仓被跳过？

A: 可能的原因：
- payout = 0（失败方向的代币）
- 缺少 conditionId
- 检查 payout 时出错

### Q: 交易失败怎么办？

A: 
1. 检查私钥是否正确
2. 检查代理地址是否正确
3. 检查是否有足够的 MATIC 支付 gas
4. 查看 Polygonscan 上的交易详情

### Q: 可以单独赎回某个持仓吗？

A: 当前版本只支持批量赎回。如果需要单独赎回，可以使用 `pnpm redeem-tokens`（普通钱包版本）。

## 安全提示

1. ⚠️ **私钥安全**：永远不要分享你的私钥
2. ⚠️ **测试优先**：首次使用前，务必在模拟模式下测试
3. ⚠️ **检查地址**：确认代理地址正确，避免资金损失
4. ⚠️ **Gas 费用**：批量交易需要支付 gas，确保有足够的 MATIC

## 与普通版本的区别

| 特性 | 普通版本 (`redeem-tokens`) | Safe 版本 (`redeem-tokens-safe`) |
|------|---------------------------|--------------------------------|
| 钱包类型 | EOA 钱包 | Safe 代理钱包 |
| 批量交易 | 逐个执行 | 批量执行（更省 gas） |
| 获取持仓 | SDK API | Data API |
| 适用场景 | 个人钱包 | Polymarket 代理钱包 |

## 故障排除

### 错误：SDK 初始化失败

- 检查私钥格式是否正确
- 检查 RPC URL 是否可访问

### 错误：找不到代理地址

- 确认 `.env` 中设置了 `SAFE_PROXY_ADDRESS` 或 `PROXY_WALLET_ADDRESS`
- 确认地址格式正确（0x 开头，42 个字符）

### 错误：交易执行失败

- 检查是否有足够的 MATIC 支付 gas
- 检查代理钱包是否有权限执行交易
- 查看 Polygonscan 上的错误详情

## 相关文档

- [Polymarket CTF 文档](https://docs.polymarket.com/developers/CTF/redeem)
- [Safe Protocol Kit 文档](https://docs.safe.global/safe-core-aa-sdk/protocol-kit)
- [普通钱包回收指南](./REDEEM_TOKENS_GUIDE.md)
