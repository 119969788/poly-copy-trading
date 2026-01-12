# PM2 配置文件修复

## 问题

由于 `package.json` 中设置了 `"type": "module"`，所有 `.js` 文件都被当作 ES 模块处理，但 `ecosystem.config.js` 使用的是 CommonJS 语法，导致错误。

## 解决方案

已将 `ecosystem.config.js` 重命名为 `ecosystem.config.cjs`。

## 使用方法

启动 PM2 时使用新的文件名：

```bash
pm2 start ecosystem.config.cjs
```

或者更新启动命令：

```bash
pm2 start ecosystem.config.cjs --name poly-copy-trading
```

## 更新后的完整启动流程

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 拉取最新代码（包含修复）
git pull origin main

# 3. 启动应用
pm2 start ecosystem.config.cjs

# 4. 查看状态
pm2 status

# 5. 查看日志
pm2 logs poly-copy-trading --lines 30

# 6. 保存配置
pm2 save
```

## 如果已经启动过

如果之前已经启动过，需要先删除旧的应用：

```bash
# 1. 停止并删除旧应用
pm2 delete poly-copy-trading

# 2. 使用新配置文件启动
pm2 start ecosystem.config.cjs

# 3. 保存配置
pm2 save
```

---

**提示**：`.cjs` 扩展名明确告诉 Node.js 这是 CommonJS 模块，即使 `package.json` 中设置了 `"type": "module"`。
