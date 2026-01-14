# 🚀 快速上传修复后的 batch-sell.ts 到服务器

## ⚠️ 问题
服务器上的文件仍然是旧版本，第 1 行是：
```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';  // ❌ 旧版本，会报错
```

## ✅ 解决方案：上传修复后的文件

### 方法 1：使用 SCP 上传（推荐）

在**本地电脑**的 PowerShell 中执行：

```powershell
# 进入项目目录
cd D:\000\poly-copy-trading-main

# 上传修复后的文件到服务器（替换为你的服务器IP）
scp src/batch-sell.ts root@你的服务器IP:/root/poly-copy-trading/src/

# 如果提示输入密码，输入服务器密码
```

### 方法 2：在服务器上直接创建修复后的文件

如果 SCP 不可用，可以在服务器上直接创建修复后的文件。

**在服务器上执行：**

```bash
cd ~/poly-copy-trading

# 备份旧文件
cp src/batch-sell.ts src/batch-sell.ts.backup

# 使用本地文件 batch-sell-complete.txt 的内容替换
# 或者直接从以下位置复制完整的修复后代码
```

然后编辑文件：

```bash
nano src/batch-sell.ts
```

**替换整个文件内容为 `batch-sell-complete.txt` 中的内容**（该文件已包含修复后的代码）。

---

## ✅ 验证修复

上传后，在服务器上验证：

```bash
cd ~/poly-copy-trading

# 检查文件前几行，应该看到动态导入
head -30 src/batch-sell.ts

# 应该看到：
# // 尝试多种导入方式以兼容不同的 SDK 版本
# import dotenv from 'dotenv';
# ...
# let sdk: any;
# try {
#   const { PolySDK } = await import('@catalyst-team/poly-sdk');

# 测试运行
npx tsx src/batch-sell.ts
```

如果不再出现 `does not provide an export named 'PolySDK'` 错误，说明修复成功！
