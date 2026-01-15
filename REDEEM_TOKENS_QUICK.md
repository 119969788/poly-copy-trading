# 代币回收功能 - 快速使用

## 快速开始

### 方法 1：使用新命令（推荐）

```bash
# 确保代码已更新
cd ~/projects/poly-copy-trading
git pull origin main

# 运行代币回收
DRY_RUN=true pnpm redeem-tokens
```

### 方法 2：如果命令不存在，直接运行脚本

```bash
cd ~/projects/poly-copy-trading

# 直接运行 TypeScript 文件
npx tsx src/redeem-tokens.ts

# 或使用 pnpm
pnpm exec tsx src/redeem-tokens.ts
```

## 如果遇到 "Command not found" 错误

### 解决方案 1：更新代码

```bash
cd ~/projects/poly-copy-trading
git pull origin main
pnpm install
pnpm redeem-tokens
```

### 解决方案 2：直接运行脚本

```bash
cd ~/projects/poly-copy-trading
npx tsx src/redeem-tokens.ts
```

### 解决方案 3：检查文件是否存在

```bash
# 检查文件是否存在
ls -la src/redeem-tokens.ts

# 如果不存在，拉取最新代码
git pull origin main

# 检查 package.json
cat package.json | grep redeem-tokens
```

## 使用旧版回收功能

如果新版本不可用，可以使用旧版本：

```bash
pnpm redeem
```

## 详细文档

查看完整文档：[代币回收功能使用指南](./REDEEM_TOKENS_GUIDE.md)
