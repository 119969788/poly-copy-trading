# 解决 Git Pull 冲突

## 问题

Git pull 失败，提示本地有未提交的更改。

## 解决方法

### 方法1：保存本地更改然后拉取（推荐）

```bash
cd ~/projects/poly-copy-trading

# 保存本地更改
git stash

# 拉取最新代码
git pull origin main

# 如果之前手动修改了 package.json，可以恢复本地更改（可选）
# git stash pop
```

### 方法2：放弃本地更改然后拉取

```bash
cd ~/projects/poly-copy-trading

# 备份本地更改（可选）
cp package.json package.json.bak

# 放弃本地更改
git restore package.json

# 或者使用硬重置（会丢失所有本地更改）
# git reset --hard HEAD

# 拉取最新代码
git pull origin main
```

### 方法3：提交本地更改然后拉取

```bash
cd ~/projects/poly-copy-trading

# 提交本地更改
git add package.json
git commit -m "local changes"

# 拉取最新代码（如果有冲突需要解决）
git pull origin main
```

## 推荐使用方法1

```bash
cd ~/projects/poly-copy-trading
git stash
git pull origin main
pnpm install
pnpm redeem
```

---

**提示**：如果使用 `git stash` 后需要恢复本地更改，使用 `git stash pop`。如果不确定是否需要本地更改，直接使用 `git restore package.json` 放弃更改即可。
