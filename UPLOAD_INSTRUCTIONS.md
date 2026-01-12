# 代码上传说明

## ⚠️ 当前状态

系统未检测到 Git，无法自动执行 Git 提交。

## 解决方案

### 方案 1：安装 Git（推荐）

1. **下载 Git**：https://git-scm.com/download/win
2. **安装 Git**：运行安装程序，使用默认设置
3. **重新打开终端**：安装后需要重新打开 PowerShell/CMD
4. **执行提交脚本**：
   ```powershell
   .\git-commit.ps1
   ```
   或
   ```cmd
   git-commit.bat
   ```

### 方案 2：手动上传到服务器

如果代码在服务器上运行，可以手动上传以下文件：

#### 需要上传的文件：

1. **新增文件**：
   - `src/batch-sell.ts` - 批量出售代币脚本

2. **修改的文件**：
   - `src/index.ts` - 主程序（增强错误处理和统计）
   - `package.json` - 添加批量出售脚本命令
   - `README.md` - 更新文档说明

#### 上传方法：

**方法 A：使用 SCP（Linux/Mac）**
```bash
scp -r src/ package.json README.md user@server:/path/to/poly-copy-trading/
```

**方法 B：使用 FTP/SFTP 工具**
- FileZilla
- WinSCP
- 其他 FTP 客户端

**方法 C：直接在服务器上编辑**
- 使用 `nano` 或 `vim` 编辑文件
- 或者使用 `git pull` 从远程仓库拉取（如果服务器上有 Git）

### 方案 3：在服务器上使用 Git

如果服务器上已安装 Git，可以在服务器上执行：

```bash
# 1. 进入项目目录
cd ~/poly-copy-trading

# 2. 如果还没有 Git 仓库，初始化
git init

# 3. 添加远程仓库（如果有）
git remote add origin <你的仓库地址>

# 4. 拉取最新代码
git pull origin main

# 或者手动上传文件后，提交
git add .
git commit -m "feat: 添加批量出售代币功能，增强错误处理和统计功能"
git push origin main
```

## 服务器上更新后的操作

更新代码后，需要重启服务：

```bash
# 1. 停止服务
pm2 stop poly-copy-trading

# 2. 更新代码（使用 git pull 或手动上传）

# 3. 重新安装依赖（如果有新依赖）
pnpm install

# 4. 重启服务
pm2 restart poly-copy-trading

# 5. 查看日志
pm2 logs poly-copy-trading
```

## 验证更新

更新后，可以运行以下命令验证：

```bash
# 检查批量出售功能（模拟模式）
pnpm batch-sell

# 检查主程序
pnpm start
```

## 本次更新内容总结

### 新增功能
- ✅ 批量出售代币功能 (`src/batch-sell.ts`)
- ✅ 增强的错误处理和钱包状态检查
- ✅ 改进的统计功能（按地址、市场、方向统计）

### 配置优化
- ✅ 最小交易金额调整为 5 USDC
- ✅ 更详细的参数显示

---

**注意**：如果选择安装 Git，安装后需要重新打开终端才能使用 Git 命令。
