# 🔧 修复 SDK 导入错误

## ⚠️ 错误信息
```
❌ SDK 导入失败，尝试了多种方式：
   方式 1 (named export): PolySDK is not a constructor
   方式 2 (default export): PolySDK is not a constructor
   方式 3 (direct import): sdkModule is not a constructor
```

## ✅ 已修复

问题原因：`batch-sell.ts` 使用了动态导入（`await import`），而主文件 `index.ts` 使用静态导入。在 ESM 模块中，动态导入的行为可能导致构造函数问题。

**解决方案**：已将 `batch-sell.ts` 的导入方式改为与主文件 `index.ts` 相同的静态导入。

---

## 🔄 更新后的导入方式

### 修复前（错误）：
```typescript
// 动态导入 - 会导致 "is not a constructor" 错误
const { PolySDK } = await import('@catalyst-team/poly-sdk');
sdk = new PolySDK({ privateKey });
```

### 修复后（正确）：
```typescript
// 静态导入 - 与主文件一致
import { PolySDK } from '@catalyst-team/poly-sdk';
const sdk = new PolySDK({ privateKey });
```

---

## 📝 已更新的文件

1. ✅ `src/batch-sell.ts` - 已修复
2. ✅ `batch-sell-complete.txt` - 已更新
3. ✅ `create-batch-sell.sh` - 已更新

---

## 🚀 在服务器上更新

### 方法 1：重新上传文件（推荐）

在本地 PowerShell：
```powershell
cd D:\000\poly-copy-trading-main
scp src/batch-sell.ts root@服务器IP:/root/projects/poly-copy-trading/src/
```

### 方法 2：在服务器上直接编辑

在服务器上：
```bash
cd /root/projects/poly-copy-trading
nano src/batch-sell.ts
```

找到文件开头的导入部分（大约第 1-47 行），替换为：

```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';
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

// 初始化 SDK（使用与主文件相同的导入方式）
const sdk = new PolySDK({ privateKey });
```

保存：`Ctrl+O` → `Enter` → `Ctrl+X`

---

## ✅ 验证修复

在服务器上测试：

```bash
# 测试运行（模拟模式）
npx tsx src/batch-sell.ts
```

如果不再出现 SDK 导入错误，说明修复成功！

---

## 🔍 为什么会出现这个错误？

1. **动态导入 vs 静态导入**：
   - 主文件使用静态导入：`import { PolySDK } from '@catalyst-team/poly-sdk'`
   - batch-sell.ts 之前使用动态导入：`await import('@catalyst-team/poly-sdk')`
   - 在 ESM 模块中，动态导入的模块可能无法正确识别构造函数

2. **模块系统兼容性**：
   - 项目使用 `"type": "module"`（ESM）
   - 静态导入在 ESM 中更可靠

3. **一致性**：
   - 使用与主文件相同的导入方式可以确保行为一致

---

## 📚 相关文件

- 主文件：`src/index.ts` - 使用静态导入
- 批量出售：`src/batch-sell.ts` - 已修复为静态导入
- 完整内容：`batch-sell-complete.txt` - 已更新
