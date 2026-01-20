# 服务器更新指南

## 快速更新命令

在服务器上执行以下命令更新代码：

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# 拉取最新代码
git pull origin main

# 安装新依赖（如果有）
pnpm install

# 如果使用 PM2 运行，重启应用
pm2 restart poly-copy-trading

# 查看日志确认运行正常
pm2 logs poly-copy-trading --lines 50
```

## 详细步骤

### 1. 连接到服务器

```bash
ssh root@你的服务器IP
# 或使用密钥
ssh -i 你的密钥文件.pem root@你的服务器IP
```

### 2. 进入项目目录

```bash
# 根据您的部署位置选择
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading
```

### 3. 检查当前状态

```bash
# 查看当前分支和状态
git status

# 查看当前代码版本
git log --oneline -5
```

### 4. 拉取最新代码

```bash
# 拉取远程代码
git pull origin main
```

如果有本地修改冲突，可以：

```bash
# 方式1：暂存本地修改（推荐，保留本地更改）
git stash
git pull origin main
git stash pop

# 方式2：强制使用远程版本（会丢失本地修改）
git fetch origin
git reset --hard origin/main
```

### 5. 更新依赖

```bash
# 安装新依赖
pnpm install
```

### 6. 重启应用

#### 如果使用 PM2 运行：

```bash
# 重启应用
pm2 restart poly-copy-trading

# 查看状态
pm2 status

# 查看日志
pm2 logs poly-copy-trading --lines 100
```

#### 如果使用 nohup 运行：

```bash
# 找到进程ID
ps aux | grep "tsx src/index.ts"

# 停止进程（替换 PID 为实际进程ID）
kill PID

# 重新启动
nohup pnpm start > output.log 2>&1 &

# 查看日志
tail -f output.log
```

#### 如果前台运行：

按 `Ctrl+C` 停止，然后重新运行：

```bash
pnpm start
```

### 7. 验证更新

```bash
# 检查应用是否正常运行
pm2 status  # 如果使用 PM2
ps aux | grep "tsx"  # 如果使用 nohup

# 查看日志确认无错误
pm2 logs poly-copy-trading  # PM2
tail -f output.log  # nohup
```

## 一键更新脚本

可以在服务器上创建更新脚本 `update.sh`：

```bash
#!/bin/bash

echo "开始更新项目..."

# 进入项目目录
cd ~/projects/poly-copy-trading || cd ~/poly-copy-trading

# 拉取代码
echo "拉取最新代码..."
git pull origin main

# 安装依赖
echo "更新依赖..."
pnpm install

# 重启应用（如果使用 PM2）
if command -v pm2 &> /dev/null; then
    echo "重启 PM2 应用..."
    pm2 restart poly-copy-trading
    pm2 logs poly-copy-trading --lines 20
else
    echo "请手动重启应用"
fi

echo "更新完成！"
```

使用：

```bash
chmod +x update.sh
./update.sh
```

## 常见问题

### Q: 更新后代码不生效？

A: 确保已重启应用。如果使用 PM2，执行 `pm2 restart poly-copy-trading`。

### Q: 有合并冲突怎么办？

A: 
```bash
# 查看冲突文件
git status

# 编辑冲突文件，解决冲突后
git add .
git commit -m "解决合并冲突"
```

### Q: 如何回退到之前的版本？

A:
```bash
# 查看提交历史
git log --oneline

# 回退到指定版本（替换 COMMIT_ID）
git reset --hard COMMIT_ID

# 重启应用
pm2 restart poly-copy-trading
```

### Q: 更新后出现错误？

A:
1. 查看日志：`pm2 logs poly-copy-trading`
2. 检查依赖：`pnpm install`
3. 检查 .env 文件配置
4. 如果问题持续，可以回退到上一个稳定版本

## 更新检查清单

- [ ] 代码已提交并推送到 GitHub
- [ ] 连接到服务器
- [ ] 进入项目目录
- [ ] 拉取最新代码
- [ ] 更新依赖
- [ ] 重启应用
- [ ] 检查日志确认运行正常
- [ ] 验证功能正常
