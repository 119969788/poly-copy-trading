# 上传到服务器指南

## 📦 需要上传的文件

### 1. 新增文件：`src/batch-sell.ts`（已修复 SDK 导入问题）

这是最重要的文件！需要在服务器上创建或更新。

**完整文件内容**：请查看 `batch-sell-complete.txt` 文件

### 2. 更新文件：`package.json`

需要添加以下脚本：

```json
"batch-sell": "tsx src/batch-sell.ts",
"batch-sell-real": "tsx src/batch-sell.ts --real"
```

---

## 🚀 快速上传方法

### 方法 1：使用 SCP（从本地电脑上传）

在**本地电脑**上执行：

```bash
# 上传 batch-sell.ts 文件
scp src/batch-sell.ts root@你的服务器IP:/root/poly-copy-trading/src/

# 上传更新后的 package.json（如果需要）
scp package.json root@你的服务器IP:/root/poly-copy-trading/
```

### 方法 2：直接在服务器上创建文件

在**服务器**上执行：

```bash
# 1. 进入项目目录
cd ~/poly-copy-trading

# 2. 创建 src 目录（如果不存在）
mkdir -p src

# 3. 创建 batch-sell.ts 文件
nano src/batch-sell.ts
```

然后：
1. 打开本地文件 `batch-sell-complete.txt`
2. **完整复制**所有内容（从第1行到最后一行）
3. 粘贴到服务器的 nano 编辑器
4. 保存：`Ctrl+O` → `Enter` → `Ctrl+X`

### 方法 3：使用 Git（如果服务器已配置）

在**服务器**上执行：

```bash
cd ~/poly-copy-trading
git pull origin main
```

---

## ✅ 上传后的验证步骤

### 1. 检查文件是否存在

```bash
cd ~/poly-copy-trading
ls -la src/batch-sell.ts
```

### 2. 重新安装依赖（如果需要）

```bash
pnpm install
# 或
npm install
```

### 3. 测试运行（模拟模式）

```bash
npx tsx src/batch-sell.ts
```

如果运行成功，说明文件已正确上传！

---

## 🔧 如果遇到 SDK 导入错误

如果仍然遇到 SDK 导入错误，可能的原因：

1. **SDK 版本不同**：尝试重新安装依赖
   ```bash
   cd ~/poly-copy-trading
   rm -rf node_modules package-lock.json pnpm-lock.yaml
   pnpm install
   ```

2. **检查主文件是否正常**：
   ```bash
   # 如果主文件能正常运行，说明 SDK 导入方式应该一致
   npx tsx src/index.ts
   ```

3. **检查 SDK 版本**：
   ```bash
   pnpm list @catalyst-team/poly-sdk
   ```

---

## 📝 更新后的 batch-sell.ts 特点

✅ **兼容多种 SDK 导入方式**：
- 尝试 named export
- 尝试 default export  
- 尝试直接导入整个模块

✅ **详细的错误提示**：如果导入失败，会显示所有尝试过的错误信息

✅ **自动适配**：根据 SDK 的实际导出方式自动选择正确的导入方法

---

## ⚠️ 重要提示

确保上传的文件是**修复后的版本**（使用动态导入），不是旧版本（静态导入 `import { PolySDK }`）。

检查方法：查看文件开头，应该是：
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

而不是：
```typescript
import { PolySDK } from '@catalyst-team/poly-sdk';
```
