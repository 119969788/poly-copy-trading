# 快速上传代码指南

## 方法 1：使用批处理脚本（推荐）

直接双击运行或在终端执行：

```cmd
upload-code.bat
```

脚本会自动：
1. ✅ 检查 Git 是否安装
2. ✅ 初始化仓库（如果还没有）
3. ✅ 添加所有文件
4. ✅ 提交更改
5. ✅ 检查并推送到远程仓库（可选）

## 方法 2：手动执行命令

如果 Git 已安装但当前终端无法识别，请：

1. **重新打开终端**（重要！）
2. 然后执行以下命令：

```bash
# 进入项目目录
cd D:\000\poly-copy-trading-main

# 初始化仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "feat: 添加批量出售代币功能，增强错误处理和统计功能"

# 查看提交
git log --oneline -1

# 如果有远程仓库，推送
git remote add origin <你的仓库地址>
git branch -M main
git push -u origin main
```

## 方法 3：在服务器上执行

如果代码在服务器上，可以在服务器上执行：

```bash
# 进入项目目录
cd ~/poly-copy-trading

# 如果还没有 Git 仓库
git init

# 添加远程仓库（如果有）
git remote add origin <你的仓库地址>

# 拉取或推送
git pull origin main
# 或
git push origin main
```

## 重要提示

⚠️ **如果 Git 刚安装，必须重新打开终端才能使用 Git 命令！**

安装 Git 后，环境变量需要重新加载，所以需要：
1. 关闭当前终端
2. 重新打开新的终端
3. 然后再运行 Git 命令

## 需要上传的文件

### 新增文件
- ✅ `src/batch-sell.ts` - 批量出售代币脚本

### 修改的文件
- ✅ `src/index.ts` - 主程序（增强错误处理和统计）
- ✅ `package.json` - 添加批量出售脚本命令
- ✅ `README.md` - 更新文档说明

### 不要上传
- ❌ `.env` - 包含私钥
- ❌ `node_modules/` - 依赖包
- ❌ `stats/` - 统计文件
