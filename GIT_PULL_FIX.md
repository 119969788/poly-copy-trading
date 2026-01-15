# 解决 Git Pull 冲突

## 问题

执行 `git pull` 时出现错误：
```
error: Your local changes to the following files would be overwritten by merge:
        src/index.ts
Please commit your changes or stash them before you merge.
```

## 解决方案

### 方法 1：暂存本地更改（推荐）

如果本地更改不重要，可以暂存它们：

```bash
cd ~/projects/poly-copy-trading

# 暂存本地更改
git stash

# 拉取最新代码
git pull origin main

# 如果需要恢复本地更改（通常不需要）
# git stash pop
```

### 方法 2：提交本地更改

如果本地更改重要，先提交：

```bash
cd ~/projects/poly-copy-trading

# 查看更改
git status

# 添加更改
git add src/index.ts

# 提交更改
git commit -m "Local changes to index.ts"

# 拉取最新代码
git pull origin main

# 如果有冲突，解决冲突后：
# git add .
# git commit -m "Merge remote changes"
```

### 方法 3：放弃本地更改（如果更改不重要）

如果本地更改不重要，可以放弃：

```bash
cd ~/projects/poly-copy-trading

# 查看更改
git diff src/index.ts

# 如果确认要放弃，恢复文件
git checkout -- src/index.ts

# 拉取最新代码
git pull origin main
```

### 方法 4：强制覆盖（谨慎使用）

如果确定要用远程版本覆盖本地版本：

```bash
cd ~/projects/poly-copy-trading

# 放弃所有本地更改
git reset --hard HEAD

# 拉取最新代码
git pull origin main
```

## 推荐步骤

对于大多数情况，使用方法 1（暂存）：

```bash
cd ~/projects/poly-copy-trading

# 1. 暂存本地更改
git stash

# 2. 拉取最新代码
git pull origin main

# 3. 验证更新
ls -la src/redeem-tokens.ts
cat package.json | grep redeem-tokens

# 4. 现在可以使用新命令了
pnpm redeem-tokens
```

## 如果仍有问题

如果拉取后仍然有问题：

```bash
# 检查文件是否存在
ls -la src/redeem-tokens.ts

# 如果不存在，手动下载
git fetch origin main
git reset --hard origin/main

# 验证
cat package.json | grep redeem-tokens
```

## 快速修复命令（一键执行）

```bash
cd ~/projects/poly-copy-trading && \
git stash && \
git pull origin main && \
pnpm install && \
pnpm redeem-tokens
```
