# Git 仓库设置说明

## 前提条件

请确保已安装 Git。如果未安装，请访问：https://git-scm.com/download/win

安装后，在终端中运行 `git --version` 验证安装。

## 快速设置步骤

### 方法 1：使用脚本（推荐）

Windows PowerShell:
```powershell
.\setup-git.ps1
```

Windows CMD:
```cmd
setup-git.bat
```

### 方法 2：手动执行命令

在项目根目录的终端中依次执行：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 创建初始提交
git commit -m "Initial commit: Polymarket copy trading bot"

# 4. 添加远程仓库（确保已在 GitHub 创建了仓库）
git remote add origin https://github.com/119969788/poly-copy-trading.git

# 5. 设置主分支为 main
git branch -M main

# 6. 推送到 GitHub（需要先在 GitHub 创建仓库）
git push -u origin main
```

## 创建 GitHub 仓库

⚠️ **重要安全提示**：建议将仓库设置为 **Private（私密）**

1. 访问 https://github.com/119969788
2. 点击右上角 "+" → "New repository"
3. 仓库名称：`poly-copy-trading`
4. **设置为 Private（私密）** ✅
5. **不要**勾选初始化 README、.gitignore 或 license（项目已有）
6. 点击 "Create repository"

## 安全检查

✅ `.gitignore` 已正确配置，会忽略以下文件：
- `.env`（包含私钥）
- `node_modules/`
- 构建输出和日志

✅ 只有 `env.example.txt` 会被提交（不包含真实私钥）

⚠️ **请确保不要将包含真实私钥的 `.env` 文件提交到仓库！**
