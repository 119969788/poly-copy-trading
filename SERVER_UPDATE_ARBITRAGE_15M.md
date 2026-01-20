# 服务器更新 arbitrage-15m.ts 文件指南

## 问题

服务器上找不到 `src/arbitrage-15m.ts` 文件，错误：
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/root/projects/poly-copy-trading/src/arbitrage-15m.ts'
```

## 快速修复（在服务器上执行）

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# 2. 拉取最新代码
git pull origin main

# 3. 检查文件是否存在
ls -la src/arbitrage-15m.ts

# 4. 如果文件存在，更新依赖并重启
pnpm install
pm2 restart arbitrage-15m --update-env

# 5. 查看日志确认
pm2 logs arbitrage-15m --lines 30
```

## 详细步骤

### 步骤1：检查当前状态

```bash
cd ~/projects/poly-copy-trading

# 查看当前分支
git branch

# 查看 Git 状态
git status

# 查看最近的提交
git log --oneline -10
```

### 步骤2：拉取最新代码

```bash
# 如果有本地修改，先暂存
git stash

# 拉取最新代码
git pull origin main

# 如果有冲突，解决冲突
# 或者强制使用远程版本（会丢失本地修改）
# git fetch origin
# git reset --hard origin/main

# 恢复本地修改（如果有）
git stash pop
```

### 步骤3：验证文件存在

```bash
# 检查文件
ls -la src/arbitrage-15m.ts

# 应该看到类似输出：
# -rw-r--r-- 1 root root 12345 Jan 20 10:00 src/arbitrage-15m.ts

# 如果文件不存在，检查 src 目录
ls -la src/
```

### 步骤4：更新依赖

```bash
# 更新依赖
pnpm install

# 验证 tsx 已安装
pnpm list tsx
```

### 步骤5：重启应用

```bash
# 重启并更新环境变量
pm2 restart arbitrage-15m --update-env

# 或者如果应用不存在，先启动
pm2 start "pnpm arbitrage-15m" --name arbitrage-15m

# 查看状态
pm2 status

# 查看日志
pm2 logs arbitrage-15m --lines 50
```

## 如果 Git Pull 失败

### 方法1：强制重置（会丢失本地修改）

```bash
cd ~/projects/poly-copy-trading

# 备份当前状态
git stash

# 强制重置到远程版本
git fetch origin
git reset --hard origin/main

# 重新安装依赖
pnpm install
```

### 方法2：重新克隆（最后手段）

```bash
# 备份当前配置
cd ~/projects
cp -r poly-copy-trading poly-copy-trading-backup
cp poly-copy-trading/.env poly-copy-trading-backup/.env

# 重新克隆
rm -rf poly-copy-trading
git clone https://github.com/119969788/poly-copy-trading.git
cd poly-copy-trading

# 恢复配置
cp ../poly-copy-trading-backup/.env .env

# 安装依赖
pnpm install

# 重新启动
pm2 start "pnpm arbitrage-15m" --name arbitrage-15m
pm2 save
```

## 验证修复

```bash
# 1. 检查文件存在
ls -la src/arbitrage-15m.ts

# 2. 测试运行（模拟模式）
cd ~/projects/poly-copy-trading
DRY_RUN=true pnpm arbitrage-15m

# 如果测试成功，按 Ctrl+C 停止

# 3. 使用 PM2 启动
pm2 restart arbitrage-15m --update-env

# 4. 查看日志
pm2 logs arbitrage-15m --lines 50
```

## 一键修复脚本

在服务器上创建 `fix-arbitrage.sh`：

```bash
#!/bin/bash

echo "开始修复 arbitrage-15m.ts 文件..."

cd ~/projects/poly-copy-trading || cd ~/poly-copy-trading

echo "1. 拉取最新代码..."
git pull origin main

echo "2. 检查文件..."
if [ -f "src/arbitrage-15m.ts" ]; then
    echo "✅ 文件存在"
else
    echo "❌ 文件不存在，尝试强制拉取..."
    git fetch origin
    git reset --hard origin/main
fi

echo "3. 更新依赖..."
pnpm install

echo "4. 重启应用..."
if pm2 list | grep -q "arbitrage-15m"; then
    pm2 restart arbitrage-15m --update-env
else
    pm2 start "pnpm arbitrage-15m" --name arbitrage-15m
    pm2 save
fi

echo "5. 查看状态..."
pm2 status
pm2 logs arbitrage-15m --lines 20

echo "✅ 修复完成！"
```

使用：

```bash
chmod +x fix-arbitrage.sh
./fix-arbitrage.sh
```

## 常见问题

### Q: Git pull 显示 "Already up to date" 但文件不存在？

A: 可能是分支不对或文件被删除：
```bash
# 检查当前分支
git branch

# 切换到 main 分支
git checkout main

# 检查文件是否在提交历史中
git log --all --full-history -- src/arbitrage-15m.ts

# 如果存在，恢复文件
git checkout HEAD -- src/arbitrage-15m.ts
```

### Q: 文件存在但 PM2 还是报错？

A: 检查 PM2 的工作目录和路径：
```bash
# 查看 PM2 配置
pm2 show arbitrage-15m

# 检查 cwd 和 script 路径
# 确保 cwd 指向项目根目录
# 确保 script 路径正确
```

### Q: 权限问题？

A: 检查文件权限：
```bash
# 检查权限
ls -la src/arbitrage-15m.ts

# 如果需要，修改权限
chmod 644 src/arbitrage-15m.ts
```

## 预防措施

为了避免将来出现此问题：

1. **定期更新**：定期在服务器上执行 `git pull origin main`
2. **使用更新脚本**：使用 `update-server.sh` 脚本
3. **监控日志**：定期检查 PM2 日志，及时发现问题

---

**提示**：如果问题持续，可以查看 `git log` 确认文件是否在提交历史中，或联系技术支持。
