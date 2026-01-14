# 简单修复指南

## 🎯 问题
服务器上的 `src/batch-sell.ts` 文件第 1 行是：
```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';  // ❌ 这行导致错误
```

## ✅ 解决方案
在服务器上编辑文件，替换第 1-18 行为修复后的代码。

## 📝 操作步骤

在服务器上执行：

```bash
cd ~/poly-copy-trading
nano src/batch-sell.ts
```

### 删除旧代码（第 1-18 行）
找到并删除：
```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';
...
const sdk = new PolySDK({ privateKey });
```

### 替换为以下代码
```typescript
// 尝试多种导入方式以兼容不同的 SDK 版本
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 初始化 SDK（尝试多种导入方式）
let sdk: any;

try {
  // 方式 1: 尝试 named export
  const { PolySDK } = await import('@catalyst-team/poly-sdk');
  sdk = new PolySDK({ privateKey });
} catch (error1: any) {
  try {
    // 方式 2: 尝试 default export
    const sdkModule = await import('@catalyst-team/poly-sdk');
    const PolySDK = sdkModule.default || sdkModule;
    sdk = new PolySDK({ privateKey });
  } catch (error2: any) {
    try {
      // 方式 3: 尝试直接导入整个模块
      const sdkModule = await import('@catalyst-team/poly-sdk');
      sdk = new sdkModule({ privateKey });
    } catch (error3: any) {
      console.error('❌ SDK 导入失败，尝试了多种方式：');
      console.error('   方式 1 (named export):', error1?.message);
      console.error('   方式 2 (default export):', error2?.message);
      console.error('   方式 3 (direct import):', error3?.message);
      console.error('\n   请检查：');
      console.error('   1. @catalyst-team/poly-sdk 是否正确安装');
      console.error('   2. 运行: pnpm install 或 npm install');
      console.error('   3. 检查 SDK 版本是否与主文件 index.ts 使用的版本一致');
      process.exit(1);
    }
  }
}
```

保存：`Ctrl+O` → `Enter` → `Ctrl+X`

## ✅ 验证
```bash
npx tsx src/batch-sell.ts
```

应该不再出现 SDK 导入错误！
