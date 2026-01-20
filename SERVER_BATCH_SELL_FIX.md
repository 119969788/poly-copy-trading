# 服务器批量卖出功能修复指南

## 问题

如果遇到错误：
```
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "batch-sell" not found
```

说明服务器上的 `package.json` 还没有更新。

## 解决方案

### 方法 1：更新服务器代码（推荐）

在服务器上执行：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 拉取最新代码
git pull origin main

# 3. 重新安装依赖（确保 package.json 更新生效）
pnpm install

# 4. 验证脚本是否存在
grep "batch-sell" package.json

# 5. 现在可以运行了
pnpm batch-sell
```

### 方法 2：直接使用 tsx 运行（临时方案）

如果暂时无法更新，可以直接运行：

```bash
cd ~/projects/poly-copy-trading

# 直接使用 tsx 运行脚本
pnpm tsx src/batch-sell.ts
```

### 方法 3：使用更新脚本

如果项目中有 `update-server.sh`，可以直接运行：

```bash
cd ~/projects/poly-copy-trading
bash update-server.sh
```

## 验证更新

更新后，检查以下内容：

```bash
# 1. 检查 package.json 中是否有 batch-sell 脚本
cat package.json | grep -A 5 "scripts"

# 应该看到：
# "batch-sell": "tsx src/batch-sell.ts"

# 2. 检查 batch-sell.ts 文件是否存在
ls -la src/batch-sell.ts

# 3. 检查 BATCH_SELL_GUIDE.md 是否存在
ls -la BATCH_SELL_GUIDE.md
```

## 完整更新流程

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 备份当前状态（可选）
cp package.json package.json.backup

# 拉取最新代码
git pull origin main

# 如果有冲突，先解决冲突
# git status
# 编辑冲突文件，然后 git add . && git commit

# 安装依赖
pnpm install

# 验证
pnpm batch-sell --version 2>&1 || pnpm batch-sell 2>&1 | head -5
```

## 如果仍然失败

如果更新后仍然失败，检查：

1. **Node.js 和 pnpm 版本**
   ```bash
   node --version
   pnpm --version
   ```

2. **package.json 格式是否正确**
   ```bash
   cat package.json | python -m json.tool
   ```

3. **直接运行脚本测试**
   ```bash
   pnpm tsx src/batch-sell.ts
   ```

4. **检查文件权限**
   ```bash
   ls -la src/batch-sell.ts
   chmod +x src/batch-sell.ts  # 如果需要
   ```

## 快速命令

一键更新并验证：

```bash
cd ~/projects/poly-copy-trading && \
git pull origin main && \
pnpm install && \
echo "✅ 更新完成，测试运行..." && \
pnpm batch-sell 2>&1 | head -10
```

---

**提示**：如果 `pnpm batch-sell` 不工作，可以直接使用 `pnpm tsx src/batch-sell.ts` 运行，效果是一样的。
