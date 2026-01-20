# 服务器 Git 冲突解决指南

## 问题

执行 `git pull` 时遇到错误：
```
error: Your local changes to the following files would be overwritten by merge:
        src/index.ts
error: The following untracked working tree files would be overwritten by merge:
        src/batch-sell.ts
```

## 解决方案

### 方法 1：保存本地修改后更新（推荐）

如果服务器上有重要的本地修改，先保存：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 查看本地修改
git status

# 3. 保存本地修改（stash）
git stash

# 4. 如果有未跟踪的文件，先备份
cp src/batch-sell.ts src/batch-sell.ts.backup 2>/dev/null || true

# 5. 删除未跟踪的文件（如果存在）
rm -f src/batch-sell.ts

# 6. 拉取最新代码
git pull origin main

# 7. 恢复本地修改（如果有需要）
git stash pop

# 8. 如果有冲突，手动解决后：
# git add .
# git commit -m "合并本地修改"

# 9. 安装依赖
pnpm install
```

### 方法 2：放弃本地修改（如果不需要保留）

如果服务器上的修改不重要，可以直接覆盖：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 放弃所有本地修改
git reset --hard HEAD

# 3. 删除未跟踪的文件
rm -f src/batch-sell.ts

# 4. 清理未跟踪的文件和目录
git clean -fd

# 5. 拉取最新代码
git pull origin main

# 6. 安装依赖
pnpm install
```

### 方法 3：先提交本地修改（如果修改很重要）

如果服务器上的修改很重要，先提交：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 查看修改内容
git diff src/index.ts

# 3. 如果有未跟踪的文件，先删除或移动
rm -f src/batch-sell.ts

# 4. 提交本地修改
git add .
git commit -m "保存服务器本地修改"

# 5. 拉取最新代码
git pull origin main

# 6. 如果有冲突，手动解决：
# - 编辑冲突文件
# - git add .
# - git commit -m "解决合并冲突"

# 7. 安装依赖
pnpm install
```

## 一键解决脚本

```bash
cd ~/projects/poly-copy-trading && \
git stash && \
rm -f src/batch-sell.ts && \
git pull origin main && \
git stash pop && \
pnpm install && \
echo "✅ 更新完成！"
```

## 验证

更新后验证：

```bash
# 检查文件是否存在
ls -la src/batch-sell.ts

# 检查 package.json 中的脚本
grep "batch-sell" package.json

# 测试运行
pnpm batch-sell 2>&1 | head -10
```

## 注意事项

1. **备份重要修改**：在执行 `git reset --hard` 前，确保重要修改已备份
2. **检查冲突**：如果有冲突，需要手动解决
3. **重启服务**：如果使用 PM2，更新后需要重启：
   ```bash
   pm2 restart poly-copy-trading
   ```

---

**推荐**：使用方法 1（stash），这样可以保留本地修改，更新后再决定是否应用。
