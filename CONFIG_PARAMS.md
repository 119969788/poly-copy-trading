# 配置参数说明

## 风险控制参数

所有风险控制参数都在 `src/index.ts` 文件的 `copyTradingOptions` 对象中配置。

### 当前配置

```typescript
const copyTradingOptions = {
  sizeScale: 0.2,          // 跟随 20% 规模
  maxSizePerTrade: 100,    // 最大单笔 $100
  maxSlippage: 0.05,       // 最大滑点 5%
  orderType: 'FOK',        // Fill or Kill
  minTradeSize: 1,         // 最小交易 $1
  dryRun: true/false,      // 模拟模式（从 .env 读取）
  topN: 50,                // 跟随排行榜前 50 名（或指定 targetAddresses）
};
```

## 参数详解

### 1. sizeScale（跟随规模比例）

**类型**: `number`  
**默认值**: `0.2` (20%)  
**范围**: `0.01 - 1.0` (1% - 100%)

**说明**: 
- 跟随目标交易者交易金额的比例
- `0.2` 表示跟随 20%，如果目标交易 $100，您会跟单 $20
- 越小越保守，越大越激进

**示例**:
```typescript
sizeScale: 0.1,   // 跟随 10%（保守）
sizeScale: 0.2,   // 跟随 20%（中等）
sizeScale: 0.5,   // 跟随 50%（激进）
```

### 2. maxSizePerTrade（最大单笔交易金额）

**类型**: `number`  
**默认值**: `100` (USDC)  
**单位**: USDC

**说明**:
- 每笔跟单交易的最大金额限制
- 即使按比例计算超过此值，也不会超过这个限制
- 这是重要的风险控制参数

**示例**:
```typescript
maxSizePerTrade: 10,   // 最大 $10（保守）
maxSizePerTrade: 100,  // 最大 $100（中等）
maxSizePerTrade: 500,  // 最大 $500（激进）
```

### 3. maxSlippage（最大滑点容忍度）

**类型**: `number`  
**默认值**: `0.05` (5%)  
**范围**: `0.01 - 0.1` (1% - 10%)

**说明**:
- 允许的价格滑点百分比
- 如果实际成交价格与预期价格差异超过此值，订单会被拒绝
- 越小越严格，可能增加失败率；越大越宽松，可能增加成本

**示例**:
```typescript
maxSlippage: 0.01,  // 1% 滑点（严格）
maxSlippage: 0.03,  // 3% 滑点（中等）
maxSlippage: 0.05,  // 5% 滑点（宽松）
```

### 4. orderType（订单类型）

**类型**: `'FOK' | 'FAK'`  
**默认值**: `'FOK'`

**说明**:
- **FOK (Fill or Kill)**: 完全成交或取消
  - 订单必须完全成交，否则取消
  - 更严格，适合确保完全跟单
- **FAK (Fill and Kill)**: 部分成交
  - 能成交多少就成交多少，剩余部分取消
  - 更灵活，可能只成交部分

**示例**:
```typescript
orderType: 'FOK',  // 完全成交或取消（推荐）
orderType: 'FAK',  // 部分成交
```

### 5. minTradeSize（最小交易金额）

**类型**: `number`  
**默认值**: `1` (USDC)  
**单位**: USDC

**说明**:
- 低于此金额的交易会被忽略
- Polymarket 最小订单为 $1
- 设置太小会产生很多小额交易，增加手续费成本
- 设置太大会错过一些小额但重要的交易

**示例**:
```typescript
minTradeSize: 1,   // 最小 $1（跟随更多交易）
minTradeSize: 5,   // 最小 $5（过滤小额交易）
minTradeSize: 10,  // 最小 $10（只跟大额交易）
```

### 6. dryRun（模拟模式）

**类型**: `boolean`  
**默认值**: `true`（从 .env 读取）

**说明**:
- `true`: 模拟模式，不执行真实交易
- `false`: 真实交易模式

**配置方式**:
在 `.env` 文件中设置：
```env
DRY_RUN=true   # 模拟模式
DRY_RUN=false  # 真实交易
```

### 7. topN / targetAddresses（跟随目标）

**类型**: `number` 或 `string[]`  
**默认值**: `topN: 50`

**说明**:
- **topN**: 跟随聪明钱排行榜前 N 名
  ```typescript
  topN: 50,  // 跟随前 50 名
  ```
- **targetAddresses**: 指定要跟随的钱包地址
  ```typescript
  targetAddresses: [
    '0x1234...',
    '0x5678...'
  ]
  ```

**配置方式**:
在 `.env` 文件中设置：
```env
# 方式1：使用排行榜（默认）
# 不设置 TARGET_ADDRESSES，代码会自动使用 topN: 50

# 方式2：指定地址
TARGET_ADDRESSES=0x1234...,0x5678...
```

## 如何修改参数

### 方法 1：直接编辑代码

编辑 `src/index.ts` 文件，找到 `copyTradingOptions` 对象：

```typescript
const copyTradingOptions = {
  sizeScale: 0.2,          // 修改这里
  maxSizePerTrade: 100,    // 修改这里
  maxSlippage: 0.05,       // 修改这里
  orderType: 'FOK' as const,
  minTradeSize: 1,         // 修改这里
  // ...
};
```

### 方法 2：通过环境变量（部分参数）

某些参数可以通过环境变量配置（需要修改代码支持）。

## 参数配置建议

### 保守配置（低风险）

适合：
- 初学者
- 风险承受能力较低
- 资金有限

```typescript
{
  sizeScale: 0.1,          // 跟随 10%
  maxSizePerTrade: 10,     // 最大 $10
  maxSlippage: 0.03,       // 3% 滑点
  minTradeSize: 5,         // 最小 $5
  orderType: 'FOK',
}
```

### 中等配置（平衡）

适合：
- 有一定经验的交易者
- 中等风险承受能力

```typescript
{
  sizeScale: 0.2,          // 跟随 20%
  maxSizePerTrade: 100,    // 最大 $100
  maxSlippage: 0.05,       // 5% 滑点
  minTradeSize: 1,         // 最小 $1
  orderType: 'FOK',
}
```

### 激进配置（高风险）

适合：
- 经验丰富的交易者
- 高风险承受能力
- 资金充足

```typescript
{
  sizeScale: 0.5,          // 跟随 50%
  maxSizePerTrade: 500,    // 最大 $500
  maxSlippage: 0.08,       // 8% 滑点
  minTradeSize: 1,         // 最小 $1
  orderType: 'FAK',        // 使用 FAK 更灵活
}
```

## 参数关系

### sizeScale 和 maxSizePerTrade

这两个参数共同决定实际交易金额：

```
实际交易金额 = min(
  目标交易金额 × sizeScale,
  maxSizePerTrade
)
```

**示例**:
- 目标交易 $1000
- sizeScale: 0.2 (20%)
- maxSizePerTrade: 100

计算结果：
- 按比例：$1000 × 0.2 = $200
- 受限制：min($200, $100) = **$100**

### minTradeSize 和 maxSizePerTrade

- `minTradeSize`: 过滤太小的交易
- `maxSizePerTrade`: 限制太大的交易

两者共同控制交易金额范围。

## 修改后需要

1. **保存文件**
2. **如果使用 TypeScript，检查编译错误**:
   ```bash
   pnpm typecheck
   ```
3. **重启应用**:
   ```bash
   # 如果使用 PM2
   pm2 restart poly-copy-trading
   
   # 如果本地运行
   # 停止后重新运行
   pnpm start
   ```

## 参数验证

修改参数后，启动时会显示当前配置：

```
📋 配置信息：
   模式: 🔍 模拟模式 (Dry Run)
   跟随规模: 20% (sizeScale: 0.2)
   最大单笔金额: $100 USDC
   最大滑点: 5%
   订单类型: FOK (Fill or Kill)
   最小交易金额: $1 USDC
```

检查这些值是否正确。

## 注意事项

⚠️ **重要提示**：

1. **修改参数前先测试**
   - 建议先在 `dryRun: true` 模式下测试新参数
   - 观察交易行为和结果
   - 确认无误后再切换到真实模式

2. **参数组合**
   - 参数之间相互影响
   - 考虑参数组合的整体效果
   - 不要只看单个参数

3. **资金管理**
   - 根据 `maxSizePerTrade` 和交易频率估算所需资金
   - 确保钱包有足够余额
   - 不要使用超过承受能力的资金

4. **监控和调整**
   - 定期检查交易表现
   - 根据实际情况调整参数
   - 记录参数变更和效果

---

**记住：参数配置直接影响交易行为和风险，请谨慎调整！**
