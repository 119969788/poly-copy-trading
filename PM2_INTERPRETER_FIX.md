# PM2 解释器修复指南

## 问题

错误信息显示：
```
/usr/bin/pnpm: line 2: syntax error near unexpected token `('
```

这是因为 PM2 配置使用了 `/bin/bash` 作为解释器来运行 `pnpm`，但 `pnpm` 是一个 Node.js 脚本，不能用 bash 执行。

## 解决方案

已修复 `ecosystem.config.cjs`，改为直接使用 `tsx` 运行 TypeScript 文件：

```javascript
{
  script: 'src/index.ts',
  interpreter: 'node_modules/.bin/tsx',
  // ...
}
```

## 更新步骤

在服务器上执行：

```bash
# 1. 拉取最新代码
cd ~/projects/poly-copy-trading
git pull origin main

# 2. 停止旧应用
pm2 delete poly-copy-trading

# 3. 启动新应用
pm2 start ecosystem.config.cjs

# 4. 查看状态
pm2 status

# 5. 查看日志
pm2 logs poly-copy-trading --lines 30

# 6. 保存配置
pm2 save
```

## 配置说明

修复后的配置：
- **script**: `src/index.ts` - 直接运行 TypeScript 源文件
- **interpreter**: `node_modules/.bin/tsx` - 使用 tsx 作为解释器
- **cwd**: 项目根目录（自动）

这样 PM2 会使用 `tsx` 直接运行 TypeScript 文件，不需要通过 `pnpm start`。

## 替代方案

如果上述方案不工作，可以使用启动脚本：

### 方案 2：使用启动脚本

创建 `start.sh`：

```bash
#!/bin/bash
cd "$(dirname "$0")"
exec pnpm start
```

然后修改 `ecosystem.config.cjs`：

```javascript
{
  script: './start.sh',
  interpreter: '/bin/bash',
  // ...
}
```

### 方案 3：使用 node 运行编译后的文件

```bash
# 先编译
pnpm build

# 然后修改配置
{
  script: 'dist/index.js',
  interpreter: 'node',
  // ...
}
```

## 验证

启动后检查：

```bash
# 查看状态
pm2 status

# 应该看到应用状态为 "online"

# 查看日志
pm2 logs poly-copy-trading --lines 50

# 应该看到正常的启动日志，而不是语法错误
```

---

**推荐**：使用方案 1（直接使用 tsx），这是最简单直接的方法。
