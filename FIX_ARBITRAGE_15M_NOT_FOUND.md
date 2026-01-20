# 修复 arbitrage-15m.ts 文件未找到错误

## 错误信息

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/root/projects/poly-copy-trading/src/arbitrage-15m.ts'
```

## 原因分析

这个错误通常是因为：
1. 服务器上的代码没有更新（文件未推送到服务器）
2. 文件路径不正确
3. Git pull 没有成功拉取最新代码

## 解决方案

### 方案1：更新服务器代码（推荐）

在服务器上执行：

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# 2. 检查当前状态
git status

# 3. 拉取最新代码
git pull origin main

# 4. 检查文件是否存在
ls -la src/arbitrage-15m.ts

# 5. 如果文件不存在，检查是否有未提交的更改
git log --oneline -5

# 6. 更新依赖
pnpm install

# 7. 重新启动
pm2 restart arbitrage-15m --update-env
```

### 方案2：检查文件是否存在

```bash
# 检查文件
ls -la src/arbitrage-15m.ts

# 如果文件不存在，查看 src 目录下的所有文件
ls -la src/

# 检查是否有其他套利相关文件
ls -la src/arbitrage*
```

### 方案3：手动创建文件（如果拉取失败）

如果 Git pull 失败，可以：

```bash
# 1. 检查 Git 状态
git status

# 2. 如果有冲突，解决冲突
git stash
git pull origin main
git stash pop

# 3. 或者强制重置（会丢失本地修改）
git fetch origin
git reset --hard origin/main

# 4. 重新安装依赖
pnpm install
```

### 方案4：使用正确的文件路径

如果文件存在但路径不对，检查 PM2 配置：

```bash
# 查看 PM2 配置
pm2 show arbitrage-15m

# 或者查看 ecosystem.config.cjs
cat ecosystem.config.cjs
```

确保配置中的路径正确：

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'arbitrage-15m',
    script: 'npx',
    args: 'tsx src/arbitrage-15m.ts',  // 确保路径正确
    cwd: __dirname,  // 确保工作目录正确
    // ...
  }]
};
```

## 验证步骤

### 1. 检查文件是否存在

```bash
cd ~/projects/poly-copy-trading
ls -la src/arbitrage-15m.ts
```

应该看到类似输出：
```
-rw-r--r-- 1 root root 12345 Jan 20 10:00 src/arbitrage-15m.ts
```

### 2. 检查 Git 状态

```bash
git status
git log --oneline -5
```

### 3. 手动测试运行

```bash
# 测试文件是否可以执行
cd ~/projects/poly-copy-trading
pnpm tsx src/arbitrage-15m.ts --help
# 或
node --loader tsx src/arbitrage-15m.ts
```

### 4. 检查依赖

```bash
# 确保 tsx 已安装
pnpm list tsx

# 如果没有，重新安装
pnpm install
```

## 快速修复命令

```bash
# 一键修复脚本
cd ~/projects/poly-copy-trading && \
git pull origin main && \
pnpm install && \
ls -la src/arbitrage-15m.ts && \
pm2 restart arbitrage-15m --update-env
```

## 如果文件确实不存在

如果确认文件在 GitHub 上但服务器上没有：

```bash
# 1. 检查远程仓库
git remote -v

# 2. 强制拉取
git fetch origin
git checkout main
git reset --hard origin/main

# 3. 检查文件
ls -la src/arbitrage-15m.ts

# 4. 如果还是没有，手动克隆
cd ~
rm -rf poly-copy-trading-backup
mv poly-copy-trading poly-copy-trading-backup
git clone https://github.com/119969788/poly-copy-trading.git
cd poly-copy-trading
pnpm install
# 然后重新配置 .env 文件
```

## 常见问题

### Q: Git pull 显示 "Already up to date" 但文件不存在？

A: 可能是分支不对，检查当前分支：
```bash
git branch
git checkout main
git pull origin main
```

### Q: 文件存在但 PM2 还是报错？

A: 检查 PM2 的工作目录：
```bash
pm2 show arbitrage-15m
# 查看 cwd 字段，确保指向正确的目录
```

### Q: 权限问题？

A: 检查文件权限：
```bash
chmod +x src/arbitrage-15m.ts  # 虽然不需要执行权限，但可以尝试
ls -la src/arbitrage-15m.ts
```

## 验证修复

修复后验证：

```bash
# 1. 检查文件
ls -la src/arbitrage-15m.ts

# 2. 测试运行（模拟模式）
DRY_RUN=true pnpm arbitrage-15m

# 3. 如果测试成功，重启 PM2
pm2 restart arbitrage-15m --update-env

# 4. 查看日志
pm2 logs arbitrage-15m --lines 50
```

---

**提示**：如果问题持续，可以查看 `git log` 确认文件是否在提交历史中。
