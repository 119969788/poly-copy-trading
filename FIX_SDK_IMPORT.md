# 🔧 修复 SDK 导入错误

## ⚠️ 错误信息

### 错误 1：PolySDK is not a constructor
```
❌ SDK 导入失败，尝试了多种方式：
   方式 1 (named export): PolySDK is not a constructor
   方式 2 (default export): PolySDK is not a constructor
   方式 3 (direct import): sdkModule is not a constructor
```

### 错误 2：Cannot find module
```
Cannot find module '/root/projects/poly-copy-trading/node_modules/@catalyst-team/poly-sdk/dist/src/index.js'
```

---

## ✅ 解决方案

### 问题 1：PolySDK is not a constructor

**原因**：`batch-sell.ts` 使用了动态导入（`await import`），而主文件 `index.ts` 使用静态导入。在 ESM 模块中，动态导入的行为可能导致构造函数问题。

**解决方案**：将 `batch-sell.ts` 的导入方式改为与主文件 `index.ts` 相同的静态导入。

#### 修复前（错误）：
```typescript
// 动态导入 - 会导致 "is not a constructor" 错误
const { PolySDK } = await import('@catalyst-team/poly-sdk');
sdk = new PolySDK({ privateKey });
```

#### 修复后（正确）：
```typescript
// 静态导入 - 与主文件一致
import { PolySDK } from '@catalyst-team/poly-sdk';
const sdk = new PolySDK({ privateKey });
```

---

### 问题 2：Cannot find module

**原因**：从 GitHub 安装的 SDK 包结构可能与 npm 版本不同。

**解决方案**：

#### 方法 1：检查 SDK 的实际导出路径

```bash
# 在服务器上检查 SDK 的实际结构
cd ~/projects/poly-copy-trading
ls -la node_modules/@catalyst-team/poly-sdk/
cat node_modules/@catalyst-team/poly-sdk/package.json | grep -A 10 '"exports"'
cat node_modules/@catalyst-team/poly-sdk/package.json | grep '"main"'
```

#### 方法 2：重新安装依赖

```bash
# 删除并重新安装
cd ~/projects/poly-copy-trading
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 如果还是失败，尝试清除缓存
pnpm store prune
pnpm install
```

#### 方法 3：切换回 npm 版本（临时方案）

如果 GitHub 版本有问题，可以临时切换回 npm 版本：

```bash
# 编辑 package.json
# 将：
"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"
# 改为：
"@catalyst-team/poly-sdk": "latest"

# 然后重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📝 已更新的文件

1. ✅ `src/batch-sell.ts` - 已修复为静态导入
2. ✅ `batch-sell-complete.txt` - 已更新
3. ✅ `create-batch-sell.sh` - 已更新

---

## 🚀 在服务器上更新

### 方法 1：使用 Git 拉取（推荐）

```bash
cd /root/projects/poly-copy-trading
git pull origin main
npm install  # 或 pnpm install
```

### 方法 2：重新上传文件

在本地 PowerShell：
```powershell
cd D:\000\poly-copy-trading-main
scp src/batch-sell.ts root@服务器IP:/root/projects/poly-copy-trading/src/
```

### 方法 3：在服务器上直接编辑

在服务器上：
```bash
cd /root/projects/poly-copy-trading
nano src/batch-sell.ts
```

找到文件开头的导入部分，替换为：

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
