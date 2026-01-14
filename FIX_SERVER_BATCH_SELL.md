# 服务器上修复 batch-sell.ts 文件

## ⚠️ 当前问题

服务器上的 `src/batch-sell.ts` 文件是旧版本，使用静态导入：
```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';  // ❌ 旧版本
```

这会导致错误：`does not provide an export named 'PolySDK'`

## ✅ 解决方案

需要更新为修复后的版本，使用动态导入：
```typescript
// 尝试多种导入方式以兼容不同的 SDK 版本
let sdk: any;
try {
  const { PolySDK } = await import('@catalyst-team/poly-sdk');  // ✅ 新版本
  ...
}
```

---

## 🚀 快速修复步骤

### 方法 1：直接在服务器上更新（推荐）

在服务器上执行：

```bash
# 1. 进入项目目录
cd ~/poly-copy-trading

# 2. 备份旧文件（可选）
cp src/batch-sell.ts src/batch-sell.ts.backup

# 3. 编辑文件
nano src/batch-sell.ts
```

然后：
1. 删除文件开头的这一行：
   ```typescript
   import { PolySDK } from '@catalyst-team/poly-sdk';
   ```

2. 删除这一行：
   ```typescript
   const sdk = new PolySDK({ privateKey });
   ```

3. 在文件开头（在 `import dotenv` 之后）添加以下代码：

```typescript
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

4. 保存：`Ctrl+O` → `Enter` → `Ctrl+X`

### 方法 2：使用 SCP 上传修复后的文件

在本地电脑执行：

```bash
# 上传修复后的 batch-sell.ts 文件
scp src/batch-sell.ts root@你的服务器IP:/root/poly-copy-trading/src/
```

### 方法 3：使用 Git 拉取（如果已配置）

在服务器上执行：

```bash
cd ~/poly-copy-trading
git pull origin main
```

---

## ✅ 验证修复

更新后，在服务器上验证：

```bash
# 1. 检查文件前几行，应该看到动态导入
head -30 src/batch-sell.ts

# 应该看到类似：
# // 尝试多种导入方式以兼容不同的 SDK 版本
# let sdk: any;
# try {
#   const { PolySDK } = await import('@catalyst-team/poly-sdk');
#   ...

# 2. 测试运行（模拟模式）
npx tsx src/batch-sell.ts
```

如果运行成功，说明修复完成！

---

## 🔍 检查文件是否正确更新

更新后的文件**开头**应该是：

```typescript
// 尝试多种导入方式以兼容不同的 SDK 版本
import dotenv from 'dotenv';
...
let sdk: any;
try {
  const { PolySDK } = await import('@catalyst-team/poly-sdk');
  ...
}
```

**不应该**是：

```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';  // ❌ 旧版本
...
const sdk = new PolySDK({ privateKey });
```

---

## 📝 快速修复脚本（可选）

如果文件内容太多，可以创建一个临时修复脚本：

```bash
# 在服务器上创建修复脚本
cat > fix-batch-sell.sh << 'EOF'
#!/bin/bash
# 这个脚本会自动替换旧的导入方式

# 检查文件是否存在
if [ ! -f "src/batch-sell.ts" ]; then
    echo "❌ 文件不存在"
    exit 1
fi

# 备份
cp src/batch-sell.ts src/batch-sell.ts.backup

# 这里可以添加 sed 命令来替换，但手动编辑更安全
echo "✅ 已备份，请手动编辑文件"
EOF

chmod +x fix-batch-sell.sh
```

但建议直接使用 `nano` 手动编辑，更安全可靠。
