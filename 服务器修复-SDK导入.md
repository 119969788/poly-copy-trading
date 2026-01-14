# 🔧 服务器修复：SDK 导入错误

## ⚠️ 错误信息
```
❌ SDK 导入失败，尝试了多种方式：
   方式 1 (named export): PolySDK is not a constructor
   方式 2 (default export): PolySDK is not a constructor
   方式 3 (direct import): sdkModule is not a constructor
```

## ✅ 问题原因

服务器上的 `batch-sell.ts` 文件还是**旧版本**（使用动态导入），需要更新为修复后的版本（静态导入）。

---

## 🚀 快速修复（3种方法）

### 方法 1：使用 SCP 上传修复后的文件（推荐，最快）

在**本地 PowerShell** 执行：

```powershell
cd D:\000\poly-copy-trading-main
scp src\batch-sell.ts root@你的服务器IP:/root/projects/poly-copy-trading/src/
```

**注意**：将 `你的服务器IP` 替换为实际服务器IP。

### 方法 2：使用上传脚本

1. 编辑 `upload-to-server.ps1` 或 `upload-to-server.bat`
2. 修改服务器IP
3. 运行脚本

### 方法 3：在服务器上直接编辑

在**服务器**上执行：

```bash
cd /root/projects/poly-copy-trading
nano src/batch-sell.ts
```

**找到文件开头（第 1-18 行），替换为：**

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

**删除旧的动态导入代码**（如果有类似这样的代码）：
```typescript
// ❌ 删除这些旧代码
let sdk: any;
try {
  const { PolySDK } = await import('@catalyst-team/poly-sdk');
  ...
}
```

保存：`Ctrl+O` → `Enter` → `Ctrl+X`

---

## ✅ 验证修复

在服务器上执行：

```bash
# 1. 检查文件前几行（应该看到静态导入）
head -20 src/batch-sell.ts

# 应该看到：
# import { PolySDK } from '@catalyst-team/poly-sdk';
# import dotenv from 'dotenv';
# ...
# const sdk = new PolySDK({ privateKey });

# 2. 测试运行
npx tsx src/batch-sell.ts
```

如果不再出现 SDK 导入错误，说明修复成功！

---

## 🔍 如何确认文件已更新？

### 检查文件内容

在服务器上执行：

```bash
# 查看文件前 20 行
head -20 src/batch-sell.ts

# 应该看到静态导入（正确）：
# import { PolySDK } from '@catalyst-team/poly-sdk';

# 不应该看到动态导入（错误）：
# const { PolySDK } = await import('@catalyst-team/poly-sdk');
```

### 对比主文件

```bash
# 查看主文件的导入方式（应该是正确的）
head -5 src/index.ts

# 应该和 batch-sell.ts 的导入方式一致
```

---

## 📝 修复前后对比

### ❌ 修复前（错误 - 动态导入）：
```typescript
let sdk: any;
try {
  const { PolySDK } = await import('@catalyst-team/poly-sdk');
  sdk = new PolySDK({ privateKey });
} catch (error1: any) {
  // ... 更多错误处理
}
```

### ✅ 修复后（正确 - 静态导入）：
```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

dotenv.config();

const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

const dryRun = process.env.DRY_RUN !== 'false';
const sdk = new PolySDK({ privateKey });
```

---

## 🎯 一键修复命令

如果服务器上已经有文件，可以快速替换前几行：

```bash
cd /root/projects/poly-copy-trading

# 备份原文件
cp src/batch-sell.ts src/batch-sell.ts.backup

# 使用 sed 替换（如果文件开头是动态导入）
# 注意：这个方法需要根据实际情况调整
```

**更安全的方法**：直接上传修复后的文件（方法 1）。

---

## ⚠️ 重要提示

1. **确保与主文件一致**：`batch-sell.ts` 的导入方式必须与 `index.ts` 完全一致
2. **使用静态导入**：在 ESM 模块中，静态导入更可靠
3. **上传后验证**：上传文件后务必测试运行

---

## 📚 相关文件

- 修复后的文件：`d:\000\poly-copy-trading-main\src\batch-sell.ts`
- 完整内容：`d:\000\poly-copy-trading-main\batch-sell-complete.txt`
- 上传脚本：`upload-to-server.ps1` 或 `upload-to-server.bat`
