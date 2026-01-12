# 代码更新上传指南

## 当前更新的内容

本次更新包含以下功能：

1. ✅ **批量出售代币功能** (`src/batch-sell.ts`)
   - 自动获取所有持仓
   - 批量出售代币
   - 支持模拟模式和实盘模式
   - 可配置最小价格、滑点、延迟等参数

2. ✅ **增强的错误处理**
   - 余额/授权不足的详细错误提示
   - 钱包状态检查
   - 更友好的错误信息

3. ✅ **改进的统计功能**
   - 按地址、市场、方向的详细统计
   - 交易金额统计（最小、最大、中位数）
   - 自动保存统计到文件

4. ✅ **配置优化**
   - 最小交易金额调整为 5 USDC
   - 更详细的参数显示

## 需要上传的文件

### 新增文件
- `src/batch-sell.ts` - 批量出售代币脚本

### 修改的文件
- `src/index.ts` - 主程序（增强错误处理和统计）
- `package.json` - 添加批量出售脚本命令
- `README.md` - 更新文档说明

## 上传方法

### 方法 1：使用 Git（如果已安装）

#### 方式 A：使用脚本（推荐）

**Windows CMD:**
```cmd
git-commit.bat
```

**Windows PowerShell:**
```powershell
.\git-commit.ps1
```

#### 方式 B：手动执行命令

```bash
# 1. 初始化 Git 仓库（如果还没有）
git init

# 2. 添加所有文件
git add .

# 3. 提交更改
git commit -m "feat: 添加批量出售代币功能，增强错误处理和统计功能"

# 4. 如果有远程仓库，推送到远程
git remote add origin <你的仓库地址>
git branch -M main
git push -u origin main
```

### 方法 2：手动上传到服务器

如果需要在服务器上更新代码，可以：

1. **使用 SCP 上传**（Linux/Mac）：
```bash
scp -r src/ package.json README.md user@server:/path/to/poly-copy-trading/
```

2. **使用 FTP/SFTP 工具**：
   - FileZilla
   - WinSCP
   - 其他 FTP 客户端

3. **直接在服务器上编辑**：
   - 使用 `nano` 或 `vim` 编辑文件
   - 或者使用 `git pull` 从远程仓库拉取

### 方法 3：使用 Git 图形界面工具

- **GitHub Desktop**
- **SourceTree**
- **VS Code 的 Git 扩展**

## 服务器上更新步骤

如果代码在服务器上运行（使用 PM2），更新后需要：

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

## 重要提示

⚠️ **上传前请确保**：

1. ✅ `.env` 文件**不要**上传（已配置在 `.gitignore` 中）
2. ✅ `node_modules/` 文件夹**不要**上传
3. ✅ 检查敏感信息（私钥等）是否已排除
4. ✅ 测试代码是否正常运行

## 文件清单

需要上传/更新的文件：

```
poly-copy-trading/
├── src/
│   ├── index.ts          ✅ 已更新（增强错误处理和统计）
│   └── batch-sell.ts     ✅ 新增（批量出售功能）
├── package.json          ✅ 已更新（添加脚本命令）
├── README.md            ✅ 已更新（文档说明）
├── tsconfig.json        ✅ 保持不变
├── .gitignore           ✅ 保持不变
└── env.example.txt      ✅ 保持不变
```

## 验证更新

更新后，可以运行以下命令验证：

```bash
# 检查批量出售功能
pnpm batch-sell

# 检查主程序
pnpm start
```

---

**注意**：如果系统没有安装 Git，可以：
1. 安装 Git：https://git-scm.com/download/win
2. 或者使用其他方式上传代码（FTP、手动复制等）
