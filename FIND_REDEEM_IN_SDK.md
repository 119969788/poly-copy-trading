# 在 poly-sdk 代码库中查找赎回功能

## GitHub 代码库地址
https://github.com/cyl19970726/poly-sdk

## 查找赎回功能的方法

### 1. 直接搜索代码库

在 GitHub 代码库页面，使用搜索功能：

1. 访问：https://github.com/cyl19970726/poly-sdk
2. 点击搜索框或按 `s` 键
3. 输入搜索关键词：
   - `redeem` - 查找所有赎回相关代码
   - `OnchainService` - 查找链上服务（赎回功能通常在这里）
   - `CTF` - 查找条件代币框架相关代码（赎回是 CTF 的一部分）

### 2. 主要文件位置

根据 SDK 的架构，赎回功能可能在以下位置：

#### OnchainService（链上服务）
- **路径**：`src/services/OnchainService.ts` 或类似路径
- **方法名**：`redeem()`, `redeemTokens()`, `claimSettledTokens()`

#### CTF Client（条件代币框架客户端）
- **路径**：`src/clients/CTFClient.ts` 或类似路径
- **说明**：CTF 是 Polymarket 使用的条件代币框架，赎回操作通过 CTF 合约执行

### 3. 查看示例代码

代码库的 `examples` 目录可能包含赎回功能的示例：

- `examples/10-ctf-operations.ts` - CTF 操作示例（包括赎回）
- `scripts/dip-arb/redeem-positions.ts` - DipArb 策略的赎回脚本

### 4. 查看文档

- **README.zh-CN.md**：中文文档，包含详细的使用说明
- **docs/** 目录：详细的 API 文档

### 5. 直接访问可能的相关文件

在 GitHub 上直接访问以下路径：

```
https://github.com/cyl19970726/poly-sdk/tree/main/src/services
https://github.com/cyl19970726/poly-sdk/tree/main/src/clients
https://github.com/cyl19970726/poly-sdk/tree/main/examples
https://github.com/cyl19970726/poly-sdk/tree/main/scripts/dip-arb
```

### 6. 使用 GitHub 的代码搜索功能

在代码库页面，使用高级搜索：

1. 访问：https://github.com/cyl19970726/poly-sdk/search
2. 搜索类型选择：`Code`
3. 搜索关键词：`function redeem` 或 `redeem(`

### 7. 查看类型定义

查看 TypeScript 类型定义文件，了解赎回方法的签名：

- 搜索：`RedeemResult` 类型
- 搜索：`redeem` 方法签名

## 当前项目中的使用方式

在 `src/redeem-settled.ts` 中，我们尝试了以下方法：

```typescript
// 方法1: OnchainService.redeem()
if ((onchainService as any).redeem) {
  redeemResult = await (onchainService as any).redeem(tokenIdParam);
}

// 方法2: OnchainService.redeemTokens()
else if ((onchainService as any).redeemTokens) {
  redeemResult = await (onchainService as any).redeemTokens(tokenIdParam);
}

// 方法3: OnchainService.claimSettledTokens()
else if ((onchainService as any).claimSettledTokens) {
  redeemResult = await (onchainService as any).claimSettledTokens(tokenIdParam);
}

// 方法4: TradingService.redeem()
else if ((sdk.tradingService as any).redeem) {
  redeemResult = await (sdk.tradingService as any).redeem(tokenIdParam);
}

// 方法5: TradingService.redeemTokens()
else if ((sdk.tradingService as any).redeemTokens) {
  redeemResult = await (sdk.tradingService as any).redeemTokens(tokenIdParam);
}
```

## 推荐的查找步骤

1. **首先查看 README.zh-CN.md**：
   - 访问：https://github.com/cyl19970726/poly-sdk/blob/main/README.zh-CN.md
   - 搜索 "redeem" 或 "赎回"

2. **查看示例代码**：
   - 访问：https://github.com/cyl19970726/poly-sdk/tree/main/examples
   - 查看 `10-ctf-operations.ts` 文件

3. **查看源代码**：
   - 在代码库中搜索 `redeem` 方法
   - 查看 `OnchainService` 或 `CTFClient` 的实现

4. **查看类型定义**：
   - 搜索 `RedeemResult` 类型定义
   - 了解返回值的结构

## 注意事项

- 赎回功能通常需要：
  - `tokenId`：代币 ID（0x 开头的十六进制字符串）
  - 市场必须已结算（resolved/settled）
  - 只有获胜方向的代币才能赎回

- 如果遇到 "Transaction reverted" 错误，可能的原因：
  - 持有的是失败方向的代币（无法赎回）
  - 市场尚未完全结算
  - 代币已被赎回

## 快速链接

- **代码库主页**：https://github.com/cyl19970726/poly-sdk
- **中文文档**：https://github.com/cyl19970726/poly-sdk/blob/main/README.zh-CN.md
- **英文文档**：https://github.com/cyl19970726/poly-sdk/blob/main/README.md
- **代码搜索**：https://github.com/cyl19970726/poly-sdk/search?q=redeem
- **文件树**：https://github.com/cyl19970726/poly-sdk/tree/main/src
