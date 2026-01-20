# 更改跟单配置指南

## 配置参数位置

所有跟单配置参数都在 `src/index.ts` 文件的 `copyTradingOptions` 对象中（约第 112-121 行）。

## 当前默认配置

```typescript
const copyTradingOptions = {
  sizeScale: 0.2,          // 跟随 20% 规模
  maxSizePerTrade: 100,    // 最大单笔 $100
  maxSlippage: 0.05,       // 最大滑点 5%
  orderType: 'FOK' as const, // Fill or Kill
  minTradeSize: 1,         // 最小交易 $1
  dryRun,                  // 模拟模式（从 .env 读取）
  topN: 50,                // 跟随排行榜前 50 名
};
```

## 如何修改配置

### 在本地（Windows）

1. **打开 `src/index.ts` 文件**
   - 在 Cursor 中打开项目根目录的 `src/index.ts` 文件

2. **找到配置参数**（约第 112 行）
   ```typescript
   const copyTradingOptions = {
     sizeScale: 0.2,          // ← 修改这里
     maxSizePerTrade: 100,    // ← 修改这里
     maxSlippage: 0.05,       // ← 修改这里
     orderType: 'FOK' as const,
     minTradeSize: 1,         // ← 修改这里
     // ...
   };
   ```

3. **修改参数值**
   - 直接修改数值
   - 保存文件（Ctrl+S）

4. **同时更新显示信息**（可选但推荐）
   - 找到 `printConfig()` 函数（约第 51-55 行）
   - 更新显示信息以匹配新配置

5. **重启应用**
   - 如果正在运行，停止后重新启动

### 在服务器（Linux）

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 备份文件（推荐）
cp src/index.ts src/index.ts.backup

# 3. 编辑配置文件
nano src/index.ts

# 4. 找到 copyTradingOptions（约第 112 行）
# 5. 修改参数值
# 6. 保存文件（nano: Ctrl+O, Enter, Ctrl+X）

# 7. 验证语法（可选）
pnpm typecheck

# 8. 重启应用
pm2 restart poly-copy-trading

# 9. 查看日志确认
pm2 logs poly-copy-trading --lines 30
```

## 配置参数说明

### 1. sizeScale（跟随规模比例）

**当前值**: `0.2` (20%)  
**范围**: `0.01 - 1.0` (1% - 100%)

**说明**: 跟随目标交易金额的比例

**示例**:
```typescript
sizeScale: 0.1,   // 跟随 10%（保守）
sizeScale: 0.2,   // 跟随 20%（中等）- 当前
sizeScale: 0.5,   // 跟随 50%（激进）
```

### 2. maxSizePerTrade（最大单笔金额）

**当前值**: `100` (USDC)  
**单位**: USDC

**说明**: 每笔交易的最大金额限制

**示例**:
```typescript
maxSizePerTrade: 10,   // 最大 $10（保守）
maxSizePerTrade: 100,  // 最大 $100（中等）- 当前
maxSizePerTrade: 500,  // 最大 $500（激进）
```

### 3. maxSlippage（最大滑点）

**当前值**: `0.05` (5%)  
**范围**: `0.01 - 0.1` (1% - 10%)

**说明**: 允许的价格滑点百分比

**示例**:
```typescript
maxSlippage: 0.01,  // 1% 滑点（严格）
maxSlippage: 0.03,  // 3% 滑点（中等）
maxSlippage: 0.05,  // 5% 滑点（宽松）- 当前
```

### 4. minTradeSize（最小交易金额）

**当前值**: `1` (USDC)  
**单位**: USDC

**说明**: 低于此金额的交易会被忽略

**示例**:
```typescript
minTradeSize: 1,   // 最小 $1（跟随更多交易）- 当前
minTradeSize: 5,   // 最小 $5（过滤小额交易）
minTradeSize: 10,  // 最小 $10（只跟大额交易）
```

### 5. orderType（订单类型）

**当前值**: `'FOK'`  
**可选值**: `'FOK'` 或 `'FAK'`

**说明**:
- `'FOK'`: 完全成交或取消（推荐）
- `'FAK'`: 部分成交

**示例**:
```typescript
orderType: 'FOK' as const,  // 完全成交或取消 - 当前
orderType: 'FAK' as const,  // 部分成交
```

### 6. topN（跟随排行榜前 N 名）

**当前值**: `50`  
**说明**: 跟随聪明钱排行榜前 N 名

**示例**:
```typescript
topN: 20,   // 跟随前 20 名
topN: 50,   // 跟随前 50 名 - 当前
topN: 100,  // 跟随前 100 名
```

## 预设配置方案

### 保守配置（低风险）

适合：初学者、风险承受能力较低、资金有限

```typescript
const copyTradingOptions = {
  sizeScale: 0.1,          // 跟随 10%
  maxSizePerTrade: 10,     // 最大 $10
  maxSlippage: 0.03,       // 3% 滑点
  orderType: 'FOK' as const,
  minTradeSize: 5,         // 最小 $5
  dryRun,
  topN: 50,
};
```

### 中等配置（平衡）- 当前配置

适合：有一定经验的交易者、中等风险承受能力

```typescript
const copyTradingOptions = {
  sizeScale: 0.2,          // 跟随 20%
  maxSizePerTrade: 100,    // 最大 $100
  maxSlippage: 0.05,       // 5% 滑点
  orderType: 'FOK' as const,
  minTradeSize: 1,         // 最小 $1
  dryRun,
  topN: 50,
};
```

### 激进配置（高风险）

适合：经验丰富的交易者、高风险承受能力、资金充足

```typescript
const copyTradingOptions = {
  sizeScale: 0.5,          // 跟随 50%
  maxSizePerTrade: 500,    // 最大 $500
  maxSlippage: 0.08,       // 8% 滑点
  orderType: 'FAK' as const,
  minTradeSize: 1,         // 最小 $1
  dryRun,
  topN: 50,
};
```

## 快速修改示例

### 示例 1：降低风险（改为保守配置）

```typescript
// 修改前
sizeScale: 0.2,
maxSizePerTrade: 100,
maxSlippage: 0.05,
minTradeSize: 1,

// 修改后
sizeScale: 0.1,          // 从 20% 改为 10%
maxSizePerTrade: 10,     // 从 $100 改为 $10
maxSlippage: 0.03,       // 从 5% 改为 3%
minTradeSize: 5,         // 从 $1 改为 $5
```

### 示例 2：增加交易频率（降低最小金额）

```typescript
// 修改前
minTradeSize: 5,

// 修改后
minTradeSize: 1,         // 从 $5 改为 $1，跟随更多小额交易
```

### 示例 3：只跟随大额交易（提高最小金额）

```typescript
// 修改前
minTradeSize: 1,

// 修改后
minTradeSize: 50,        // 从 $1 改为 $50，只跟大额交易
```

## 同时更新显示信息

修改参数后，建议同时更新 `printConfig()` 函数中的显示信息（约第 51-55 行），确保启动时显示正确的配置：

```typescript
function printConfig() {
  console.log('📋 配置信息：');
  console.log(`   模式: ${dryRun ? '🔍 模拟模式 (Dry Run)' : '💰 实盘模式'}`);
  console.log(`   跟随规模: 20% (sizeScale: 0.2)`);      // ← 更新这里
  console.log(`   最大单笔金额: $100 USDC`);             // ← 更新这里
  console.log(`   最大滑点: 5%`);                        // ← 更新这里
  console.log(`   订单类型: FOK (Fill or Kill)`);
  console.log(`   最小交易金额: $1 USDC`);               // ← 更新这里
  // ...
}
```

## 完整修改流程

### 在服务器上

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 备份文件
cp src/index.ts src/index.ts.backup.$(date +%Y%m%d_%H%M%S)

# 3. 编辑文件
nano src/index.ts

# 4. 找到 copyTradingOptions（约第 112 行）
# 5. 修改参数值
# 6. 同时更新 printConfig() 函数中的显示信息（约第 51-55 行）
# 7. 保存文件（Ctrl+O, Enter, Ctrl+X）

# 8. 验证语法（可选但推荐）
pnpm typecheck

# 9. 重启应用
pm2 restart poly-copy-trading

# 10. 查看日志确认配置
pm2 logs poly-copy-trading --lines 30
```

### 在本地

1. 打开 `src/index.ts` 文件
2. 找到 `copyTradingOptions`（约第 112 行）
3. 修改参数值
4. 可选：更新 `printConfig()` 函数中的显示信息
5. 保存文件（Ctrl+S）
6. 如果应用正在运行，重启应用

## 验证配置

修改后，启动应用时应该看到更新后的配置信息：

```
📋 配置信息：
   模式: 🔍 模拟模式 (Dry Run)
   跟随规模: XX% (sizeScale: X.X)  ← 检查这里
   最大单笔金额: $XX USDC          ← 检查这里
   最大滑点: X%                    ← 检查这里
   订单类型: FOK (Fill or Kill)
   最小交易金额: $X USDC           ← 检查这里
   跟随排行榜: 前 50 名
```

## 使用快速脚本修改（服务器）

如果安装了 `server-config-quick.sh` 脚本：

```bash
cd ~/projects/poly-copy-trading
chmod +x server-config-quick.sh
./server-config-quick.sh
```

脚本会：
- 显示当前配置
- 创建备份
- 提供编辑选项
- 询问是否重启应用

## 注意事项

### ⚠️ 修改前

1. **备份文件**
   ```bash
   cp src/index.ts src/index.ts.backup
   ```

2. **理解参数影响**
   - 每个参数都会影响交易行为
   - 参数之间相互影响
   - 参考 `CONFIG_PARAMS.md` 了解详细说明

3. **先测试**
   - 建议先在模拟模式（`DRY_RUN=true`）下测试新配置
   - 观察交易行为和效果
   - 确认无误后再切换真实模式

### ⚠️ 修改后

1. **验证语法**
   ```bash
   pnpm typecheck
   ```

2. **重启应用**
   - 必须重启应用才能应用新配置

3. **监控效果**
   - 观察新配置下的交易表现
   - 根据实际情况调整

4. **记录更改**
   - 记录参数修改历史
   - 记录修改原因和效果

## 参数关系说明

### sizeScale 和 maxSizePerTrade

这两个参数共同决定实际交易金额：

```
实际交易金额 = min(目标交易金额 × sizeScale, maxSizePerTrade)
```

**示例**:
- 目标交易 $1000
- sizeScale: 0.2 (20%)
- maxSizePerTrade: 100

结果：
- 按比例：$1000 × 0.2 = $200
- 受限制：min($200, $100) = **$100**（实际交易金额）

### minTradeSize 的作用

- 低于 `minTradeSize` 的交易会被忽略
- 设置太小会产生很多小额交易，增加手续费成本
- 设置太大会错过一些小额但重要的交易

## 常见问题

### Q: 修改后需要重启应用吗？

A: 是的，必须重启应用才能应用新配置。

### Q: 如何快速测试新配置？

A: 
1. 确保 `DRY_RUN=true`（模拟模式）
2. 修改配置
3. 重启应用
4. 观察交易行为
5. 确认效果后再切换到真实模式

### Q: 参数可以设置任何值吗？

A: 理论上可以，但要考虑：
- SDK 的限制（如最小订单金额）
- 实际意义（如 sizeScale 不应超过 1.0）
- 风险控制（合理设置上限）

### Q: 如何知道配置是否生效？

A: 查看启动日志中的配置信息，应该显示更新后的值。

### Q: 修改配置会影响已运行的交易吗？

A: 不会影响已提交的交易，只影响新的跟单交易。

## 详细文档

更多详细信息请参考：
- `CONFIG_PARAMS.md` - 参数详细说明
- `SERVER_CONFIG_EDIT.md` - 服务器修改指南
- `REAL_TRADING_GUIDE.md` - 真实交易指南

---

**提示**：修改配置前请先备份文件，并在模拟模式下充分测试！
