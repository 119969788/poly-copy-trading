# 修复 redeem-tokens-safe 命令找不到

## 问题

执行 `pnpm redeem-tokens-safe` 时出现错误：
```
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "redeem-tokens-safe" not found
```

## 原因

服务器上的代码还没有更新，缺少新添加的脚本和文件。

## 解决方案

### 方法 1：更新代码（推荐）

在服务器上执行以下命令：

```bash
cd ~/projects/poly-copy-trading

# 如果有本地更改，先暂存
git stash

# 拉取最新代码
git pull origin main

# 安装新依赖
pnpm install

# 现在可以使用新命令了
pnpm redeem-tokens-safe
```

### 方法 2：一键修复命令

```bash
cd ~/projects/poly-copy-trading && \
git stash && \
git pull origin main && \
pnpm install && \
pnpm redeem-tokens-safe
```

### 方法 3：如果 git pull 有冲突

如果遇到 git pull 冲突，参考 [GIT_PULL_FIX.md](./GIT_PULL_FIX.md) 解决冲突。

## 验证更新

更新后，检查以下内容：

```bash
# 1. 检查 package.json 是否包含新脚本
cat package.json | grep redeem-tokens-safe

# 2. 检查文件是否存在
ls -la src/redeem-tokens-safe.ts

# 3. 检查依赖是否安装
pnpm list | grep -E "(ethers|@safe-global|axios)"
```

## 如果仍然有问题

### 检查文件是否存在

```bash
# 检查文件
ls -la src/redeem-tokens-safe.ts

# 如果文件不存在，手动拉取
git fetch origin main
git reset --hard origin/main
pnpm install
```

### 检查依赖安装

```bash
# 手动安装缺失的依赖
pnpm add ethers@^6.9.0 @safe-global/protocol-kit@^3.0.0 axios@^1.6.0

# 然后重试
pnpm redeem-tokens-safe
```

## 配置要求

更新代码后，确保 `.env` 文件中包含以下配置：

```bash
# 必需：EOA owner 的私钥
POLYMARKET_PRIVATE_KEY=your_private_key_here

# 必需：Safe 代理钱包地址（从 Polymarket portfolio 获取）
SAFE_PROXY_ADDRESS=0x316Df7B970dDC7CCF4f3DfBD2587E422b98E38bF

# 可选：模拟模式（默认 true）
DRY_RUN=true
```

## 相关文档

- [Safe 代理钱包回收指南](./REDEEM_TOKENS_SAFE_GUIDE.md)
- [Git Pull 冲突解决](./GIT_PULL_FIX.md)
