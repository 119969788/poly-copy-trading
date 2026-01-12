# 快速更新指南

## 一键更新命令

在服务器上执行：

```bash
cd ~/projects/poly-copy-trading && \
git pull origin main && \
pnpm install && \
echo "✅ 更新完成！"
```

## 完整更新步骤

### 1. 进入项目目录
```bash
cd ~/projects/poly-copy-trading
```

### 2. 拉取最新代码
```bash
git pull origin main
```

如果有冲突，执行：
```bash
git reset --hard HEAD
git pull origin main
```

### 3. 安装依赖
```bash
pnpm install
```

### 4. 重启应用（如果使用 PM2）
```bash
pm2 restart poly-copy-trading
```

### 5. 查看日志
```bash
pm2 logs poly-copy-trading --lines 30
```

## 使用更新脚本

如果有 `update-server.sh` 脚本：

```bash
cd ~/projects/poly-copy-trading
bash update-server.sh
```

## 配置新功能（可选）

如果要启用跳过余额和授权检查：

```bash
# 编辑 .env 文件
nano .env

# 添加或修改：
SKIP_BALANCE_CHECK=true
SKIP_APPROVAL_CHECK=true

# 保存并重启
pm2 restart poly-copy-trading
```

---

**提示**：更新后如果遇到问题，可以查看 `FIX_SYNTAX_ERROR.md` 和 `SERVER_GIT_CONFLICT_FIX.md` 解决。
