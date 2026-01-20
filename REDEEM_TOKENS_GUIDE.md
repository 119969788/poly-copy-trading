# 代币回收功能使用指南

基于 [Polymarket 官方 CTF 文档](https://docs.polymarket.com/developers/CTF/redeem) 实现的代币回收功能。

## 功能说明

当 Polymarket 市场结算后，持有**获胜方向**代币的用户可以将其 1:1 兑换成 USDC.e。此功能使用官方 CTF（Conditional Token Framework）的 `redeemPositions()` 方法来回收代币。

## 官方文档参考

根据 [Polymarket CTF 文档](https://docs.polymarket.com/developers/CTF/redeem)：

- **函数**: `redeemPositions(collateralToken, parentCollectionId, conditionId, indexSets)`
- **参数**:
  - `collateralToken`: USDC.e 地址 (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`)
  - `parentCollectionId`: `bytes32(0)` (null，二进制市场)
  - `conditionId`: 市场条件ID
  - `indexSets`: 结果索引集合，例如 `[1]` 或 `[2]`，或 `[1,2]`

## 使用方法

### 1. 本地运行

```bash
# 模拟模式（推荐首次使用）
DRY_RUN=true pnpm redeem-tokens

# 实盘模式
DRY_RUN=false pnpm redeem-tokens
```

### 2. 服务器运行

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 更新代码
git pull origin main
pnpm install

# 运行回收脚本
DRY_RUN=false pnpm redeem-tokens
```

## 工作原理

1. **获取所有持仓**: 从钱包中获取所有持仓
2. **检查市场状态**: 检查每个市场是否已结算（`redeemable: true`）
3. **调用 CTF redeemPositions**: 使用官方 CTF 合约方法回收代币
4. **等待交易确认**: 等待区块链确认交易
5. **显示结果**: 显示回收结果统计

## 重要提示

⚠️ **关键信息**：

1. **只有获胜方向的代币才能回收**
   - 市场结算后，只有获胜方向的代币可以 1:1 兑换成 USDC.e
   - 失败方向的代币无法回收，价值归零

2. **市场必须已结算**
   - 只有 `redeemable: true` 的市场才能回收
   - 未结算的市场无法回收

3. **需要 Gas 费**
   - 每次回收需要消耗少量 MATIC 作为 Gas 费
   - 确保钱包有足够的 MATIC（建议至少 0.1 MATIC）

## 输出示例

```
═══════════════════════════════════════════════════
   Polymarket 代币回收工具（基于官方 CTF 文档）
═══════════════════════════════════════════════════

🚀 正在初始化 SDK...
✅ SDK 初始化成功

钱包地址: 0x...

📊 正在获取持仓信息...

找到 10 个持仓，其中 5 个有余额：

🔍 正在检查已结算的市场...

找到 3 个已结算市场的持仓：

持仓 #1:
   市场: 0x...
   条件ID: 0x...
   数量: 10.0000
   方向: YES
   方向索引: 1
   状态: ✅ 已结算 (redeemable: true)

🔄 开始批量回收（使用官方 CTF redeemPositions 方法）...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
回收持仓 #1/3
   市场: 0x...
   条件ID: 0x...
   数量: 10.0000
   方向: YES
   使用 CTF redeemPositions 方法:
      conditionId: 0x...
      indexSets: [1]
   ✅ 使用 CTF redeemPositions 方法提交交易
   ⏳ 等待交易确认...
   ✅ 回收成功
   交易哈希: 0x...
   查看交易: https://polygonscan.com/tx/0x...
   回收金额: $10.00 USDC.e

═══════════════════════════════════════════════════
📊 回收结果统计
═══════════════════════════════════════════════════

总持仓数: 3
成功回收: 2
失败: 1
总回收金额: $25.00 USDC.e
```

## 技术实现

### 基于官方文档的实现

根据 [Polymarket CTF 文档](https://docs.polymarket.com/developers/CTF/redeem)，脚本会：

1. **优先使用 SDK 的 CTF 客户端**（如果可用）:
   ```typescript
   ctfClient.redeemPositions(
     USDCe_ADDRESS,
     '0x0000...0000', // null bytes32
     conditionId,
     indexSets
   )
   ```

2. **备用方法**: 如果 SDK 没有 CTF 客户端，尝试其他 SDK 方法

3. **参数说明**:
   - `collateralToken`: USDC.e 地址
   - `parentCollectionId`: `bytes32(0)` (null，二进制市场没有父集合)
   - `conditionId`: 市场条件ID（32 字节）
   - `indexSets`: 结果索引数组，例如 `[1]` 表示 YES，`[2]` 表示 NO

## 常见问题

### Q: 为什么有些代币无法回收？

A: 可能的原因：
1. **持有的是失败方向的代币**：只有获胜方向的代币才能回收
2. **市场未结算**：只有已结算（`redeemable: true`）的市场才能回收
3. **余额为 0**：没有代币可回收

### Q: 如何知道哪些代币可以回收？

A: 脚本会自动检查：
- `redeemable: true` 的持仓
- 已结算的市场
- 有余额的持仓

### Q: 回收需要多长时间？

A: 通常需要：
- 交易提交：几秒
- 交易确认：10-30 秒（取决于网络拥堵）
- 总时间：每个持仓约 30-60 秒

### Q: 回收失败怎么办？

A: 检查：
1. **MATIC 余额**：确保有足够的 Gas 费
2. **网络连接**：确保可以连接到 Polygon 网络
3. **市场状态**：确认市场已结算
4. **代币方向**：确认持有的是获胜方向的代币

### Q: 可以批量回收吗？

A: 是的，脚本会自动批量处理所有可回收的持仓。

## 与旧版本的区别

### 新版本 (`redeem-tokens.ts`)
- ✅ 基于官方 CTF 文档实现
- ✅ 使用 `redeemPositions()` 方法
- ✅ 更准确的参数处理
- ✅ 更好的错误处理

### 旧版本 (`redeem-settled.ts`)
- 使用多种尝试方法
- 可能不够准确

## 相关文档

- [Polymarket CTF 官方文档](https://docs.polymarket.com/developers/CTF/redeem)
- [Polymarket 开发者快速开始](https://docs.polymarket.com/quickstart/overview)
- [旧版回收指南](./REDEEM_GUIDE.md)

## 安全提示

⚠️ **重要**：
- 回收操作会消耗 Gas 费（MATIC）
- 确保私钥安全，不要泄露
- 首次运行建议使用模拟模式（`DRY_RUN=true`）
- 确认市场已结算后再执行真实回收
