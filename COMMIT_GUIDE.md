# 代码提交和上传指南

## 本次更新内容

### 新增功能
1. ✅ **批量出售代币功能** (`src/batch-sell.ts`)
   - 自动获取所有持仓并批量出售
   - 支持模拟模式和实盘模式
   - 可配置参数（最小价格、滑点、延迟等）

### 功能增强
2. ✅ **增强的错误处理** (`src/index.ts`)
   - 余额/授权不足的详细错误提示
   - 钱包状态检查
   - 更友好的错误信息

3. ✅ **改进的统计功能** (`src/index.ts`)
   - 按地址、市场、方向的详细统计
   - 交易金额统计（最小、最大、中位数）
   - 自动保存统计到文件

4. ✅ **配置优化**
   - 最小交易金额调整为 5 USDC
   - 更详细的参数显示

## 快速提交步骤

### 如果已安装 Git

#### 方式 1：使用脚本（推荐）

**PowerShell:**
```powershell
.\git-commit.ps1
```

**CMD:**
```cmd
git-commit.bat
```

#### 方式 2：手动执行

```bash
# 1. 检查状态
git status

# 2. 添加所有更改
git add .

# 3. 提交更改
git commit -m "feat: 添加批量出售代币功能，增强错误处理和统计功能

- 新增批量出售代币脚本 (src/batch-sell.ts)
- 增强错误处理和钱包状态检查
- 改进统计功能（按地址、市场、方向统计）
- 优化配置参数显示"

# 4. 推送到远程仓库（如果有）
git push origin main
```

### 如果未安装 Git

#### 方法 1：安装 Git

1. 下载安装：https://git-scm.com/download/win
2. 安装后重新打开终端
3. 然后按照上面的步骤执行

#### 方法 2：手动上传到服务器

如果代码在服务器上运行，可以：

1. **使用 SCP 上传**：
```bash
scp -r src/ package.json README.md user@server:/path/to/poly-copy-trading/
```

2. **使用 FTP/SFTP 工具**：
   - FileZilla
   - WinSCP
   - 其他 FTP 客户端

3. **直接在服务器上编辑**：
   - 使用 `nano` 或 `vim` 编辑文件

## 需要上传的文件清单

### 新增文件
- ✅ `src/batch-sell.ts` - 批量出售代币脚本

### 修改的文件
- ✅ `src/index.ts` - 主程序（增强错误处理和统计）
- ✅ `package.json` - 添加批量出售脚本命令
- ✅ `README.md` - 更新文档说明

### 不需要上传的文件（已在 .gitignore 中）
- ❌ `.env` - 包含私钥，不要上传
- ❌ `node_modules/` - 依赖包
- ❌ `stats/` - 统计文件
- ❌ `dist/` - 构建输出

## 服务器上更新后的操作

如果代码在服务器上运行（使用 PM2），更新后需要：

```bash
# 1. 停止服务
pm2 stop poly-copy-trading

# 2. 更新代码（使用 git pull 或手动上传）
git pull origin main
# 或者手动上传文件

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

## 提交信息模板

如果手动提交，可以使用以下提交信息：

```
feat: 添加批量出售代币功能，增强错误处理和统计功能

新增功能：
- 批量出售代币脚本 (src/batch-sell.ts)
- 支持模拟模式和实盘模式
- 可配置参数（最小价格、滑点、延迟）

功能增强：
- 增强错误处理和钱包状态检查
- 改进统计功能（按地址、市场、方向统计）
- 优化配置参数显示
- 最小交易金额调整为 5 USDC
```
