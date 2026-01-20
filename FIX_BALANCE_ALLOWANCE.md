# 解决余额/授权不足错误

## 错误信息

```
[CLOB Client] request error {"status":400,"statusText":"Bad Request","data":{"error":"not enough balance / allowance"}
```

## 错误原因

这个错误表示：
1. **余额不足** - 钱包中的 USDC.e 余额不足以执行交易
2. **授权不足** - USDC.e 未授权或授权金额不足，无法用于交易

## 解决方案

### 方案 1：检查并授权 USDC.e（推荐）

#### 在代码中添加授权逻辑

编辑 `src/index.ts` 文件，在启动跟单前添加授权：

```typescript
// 在 main() 函数中，启动跟单前添加：

// 导入 OnchainService（如果还没有）
import { OnchainService } from '@catalyst-team/poly-sdk';

// 在初始化 SDK 后，添加授权逻辑
const sdk = await PolymarketSDK.create({ privateKey });

// 创建 OnchainService 实例用于授权
const onchainService = new OnchainService({
  privateKey,
  rpcUrl: 'https://polygon-rpc.com', // 可选，使用默认也可以
});

// 检查并授权
console.log('🔐 正在检查并授权 USDC.e...');
try {
  const status = await onchainService.checkReadyForCTF('100');
  if (!status.ready) {
    console.log('⚠️  授权状态:', status.issues);
    console.log('正在授权 USDC.e...');
    const result = await onchainService.approveAll();
    console.log('✅ 授权结果:', result);
  } else {
    console.log('✅ USDC.e 已授权\n');
  }
} catch (error: any) {
  console.error('⚠️  授权失败:', error?.message || error);
  console.log('   如果已经授权过，可以忽略此错误\n');
}
```

### 方案 2：手动授权（使用 MetaMask 或其他钱包）

1. **连接钱包到 Polymarket**
   - 访问 https://polymarket.com
   - 连接您的钱包

2. **授权 USDC.e**
   - 在 Polymarket 上尝试进行一次交易
   - 钱包会弹出授权请求
   - 确认授权

3. **检查授权状态**
   - 在钱包中查看授权记录
   - 确认 USDC.e 已授权给 Polymarket 合约

### 方案 3：检查钱包余额

```bash
# 在代码中添加余额检查
# 或在浏览器中查看钱包余额

# 确保钱包中有足够的 USDC.e 余额
# Polymarket 使用 USDC.e (0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
```

## 完整修复代码

更新 `src/index.ts` 文件：

```typescript
import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// ... 其他代码 ...

async function main() {
  // ... 前面的代码 ...

  try {
    // 初始化 SDK
    console.log('🚀 正在初始化 SDK...');
    const sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 创建 OnchainService 用于授权和余额检查
    const onchainService = new OnchainService({
      privateKey,
    });

    // 检查余额
    console.log('💰 检查钱包余额...');
    try {
      const balances = await onchainService.getBalances();
      console.log(`   USDC.e 余额: ${balances.usdcE} USDC`);
      console.log(`   MATIC 余额: ${balances.matic} MATIC`);
      
      if (parseFloat(balances.usdcE) < 1) {
        console.warn('⚠️  警告: USDC.e 余额不足，建议至少 $10 USDC');
      }
    } catch (error: any) {
      console.error('⚠️  余额检查失败:', error?.message || error);
    }
    console.log('');

    // 检查并授权 USDC.e
    console.log('🔐 正在检查并授权 USDC.e...');
    try {
      const status = await onchainService.checkReadyForCTF('100');
      if (!status.ready) {
        console.log('⚠️  需要授权，问题:', status.issues);
        console.log('正在授权 USDC.e...');
        const result = await onchainService.approveAll();
        console.log('✅ 授权完成:', result);
        console.log('   请等待交易确认...\n');
        
        // 等待几秒让交易确认
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log('✅ USDC.e 已授权\n');
      }
    } catch (error: any) {
      console.error('⚠️  授权失败:', error?.message || error);
      if (error?.message?.includes('user rejected') || error?.message?.includes('denied')) {
        console.error('❌ 授权被拒绝，请手动授权或重试');
      } else {
        console.log('   如果已经授权过，可以忽略此错误\n');
      }
    }

    // 继续启动跟单...
    // ... 后面的代码 ...
  }
}
```

## 快速修复步骤

### 在服务器上

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 编辑文件
nano src/index.ts

# 3. 添加授权代码（参考上面的完整修复代码）

# 4. 保存文件（Ctrl+O, Enter, Ctrl+X）

# 5. 重启应用
pm2 restart poly-copy-trading

# 6. 查看日志
pm2 logs poly-copy-trading --lines 50
```

### 在本地

1. 打开 `src/index.ts` 文件
2. 添加授权代码（参考上面的完整修复代码）
3. 保存文件
4. 重启应用

## 检查清单

- [ ] 钱包中有足够的 USDC.e 余额（建议至少 $10）
- [ ] USDC.e 已授权给 Polymarket 合约
- [ ] 代码中包含授权逻辑
- [ ] 授权逻辑在启动跟单前执行
- [ ] 查看日志确认授权成功

## 常见问题

### Q: 需要授权多少金额？

A: 通常授权一个较大的金额（如 1000000 USDC）或使用 `approveAll()` 授权最大金额，这样就不需要频繁授权。

### Q: 授权需要 Gas 费吗？

A: 是的，授权需要支付 MATIC 作为 Gas 费。确保钱包中有足够的 MATIC。

### Q: 如何检查授权状态？

A: 使用 `checkReadyForCTF()` 方法检查，或使用代码中的余额和授权检查逻辑。

### Q: 授权后仍然报错？

A: 检查：
1. 钱包余额是否足够
2. 授权交易是否已确认（等待几秒）
3. 网络连接是否正常
4. 私钥是否正确

### Q: 如何查看钱包余额？

A: 
- 在 MetaMask 或其他钱包中查看
- 使用代码中的 `getBalances()` 方法
- 在区块链浏览器查看钱包地址

## 预防措施

1. **定期检查余额**
   - 确保钱包中有足够的 USDC.e
   - 建议保持至少 $50-100 USDC.e 余额

2. **监控授权状态**
   - 如果授权过期，需要重新授权
   - 某些情况下授权可能会被重置

3. **设置余额告警**
   - 如果可能，设置余额低于阈值时的告警

---

**提示**：如果问题持续，请检查钱包余额和网络连接，确保有足够的资金和 Gas 费。
