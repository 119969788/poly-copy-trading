# 服务器代码更新指南

## 问题

服务器上缺少 `src/batch-sell.ts` 文件，需要更新代码。

## 解决方案

### 方法 1：使用 Git 拉取（推荐）

如果服务器上已配置 Git 仓库：

```bash
# 进入项目目录
cd ~/poly-copy-trading

# 拉取最新代码
git pull origin main

# 如果还没有配置远程仓库，先添加
git remote add origin <你的仓库地址>
git pull origin main
```

### 方法 2：手动上传文件

如果服务器上没有 Git，需要手动上传以下文件：

#### 需要上传的新文件：
- `src/batch-sell.ts` - 批量出售代币脚本

#### 需要更新的文件：
- `src/index.ts` - 主程序（增强错误处理和统计）
- `package.json` - 添加批量出售脚本命令
- `README.md` - 更新文档说明

#### 上传方法：

**使用 SCP：**
```bash
# 从本地电脑上传到服务器
scp src/batch-sell.ts user@server:/root/poly-copy-trading/src/
scp package.json user@server:/root/poly-copy-trading/
scp src/index.ts user@server:/root/poly-copy-trading/src/
```

**使用 FTP/SFTP 工具：**
- FileZilla
- WinSCP
- 其他 FTP 客户端

**直接在服务器上创建文件：**
```bash
# 使用 nano 或 vim 创建文件
nano ~/poly-copy-trading/src/batch-sell.ts
# 然后复制文件内容
```

### 方法 3：从本地复制文件内容

如果可以直接访问服务器，可以：

1. **在本地查看文件内容**：
   ```bash
   cat src/batch-sell.ts
   ```

2. **在服务器上创建文件**：
   ```bash
   nano ~/poly-copy-trading/src/batch-sell.ts
   ```
   然后粘贴文件内容

## 更新后的操作

更新代码后，需要：

```bash
# 1. 进入项目目录
cd ~/poly-copy-trading

# 2. 重新安装依赖（如果有新依赖）
pnpm install
# 或
npm install

# 3. 如果使用 PM2，重启服务
pm2 restart poly-copy-trading

# 4. 验证文件是否存在
ls -la src/batch-sell.ts
```

## 验证更新

更新后，可以运行：

```bash
# 检查文件是否存在
ls -la src/batch-sell.ts

# 测试批量出售功能（模拟模式）
pnpm batch-sell
# 或
npx tsx src/batch-sell.ts
```

## 快速修复命令

如果文件已存在但路径不对，检查：

```bash
# 检查当前目录
pwd

# 检查文件是否存在
ls -la src/batch-sell.ts

# 如果不存在，检查 src 目录
ls -la src/

# 如果 src 目录不存在，创建它
mkdir -p src
```

## 文件清单

确保以下文件存在于服务器：

```
~/poly-copy-trading/
├── src/
│   ├── index.ts          ✅ 需要更新
│   └── batch-sell.ts     ✅ 需要新增
├── package.json          ✅ 需要更新
├── README.md            ✅ 需要更新
├── .env                  ✅ 已存在（不要上传）
└── node_modules/         ✅ 已存在（不要上传）
```
