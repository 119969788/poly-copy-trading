# 📤 上传代码到 GitHub 指南

## ✅ 当前状态

- ✅ 所有更改已提交到本地仓库
- ✅ 远程仓库已配置：`https://github.com/119969788/poly-copy-trading.git`
- ⚠️ 推送时遇到网络连接问题

---

## 🚀 方法 1：使用 HTTPS（需要认证）

### 步骤 1：配置 GitHub 认证

#### 选项 A：使用 Personal Access Token（推荐）

1. 访问 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 生成新 token，勾选 `repo` 权限
3. 复制 token

#### 选项 B：使用 GitHub CLI

```bash
# 安装 GitHub CLI（如果还没有）
# Windows: winget install GitHub.cli

# 登录 GitHub
gh auth login
```

### 步骤 2：推送代码

```bash
# 如果使用 token，推送时会提示输入用户名和 token
git push -u origin main

# 或者使用 token 作为密码
# 用户名：你的 GitHub 用户名
# 密码：你的 Personal Access Token
```

---

## 🔐 方法 2：使用 SSH（推荐，更安全）

### 步骤 1：生成 SSH 密钥（如果还没有）

```bash
# 检查是否已有 SSH 密钥
ls ~/.ssh

# 如果没有，生成新密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 按 Enter 使用默认路径
# 设置密码（可选）
```

### 步骤 2：添加 SSH 密钥到 GitHub

```bash
# 复制公钥内容
cat ~/.ssh/id_ed25519.pub
# Windows PowerShell:
Get-Content ~/.ssh/id_ed25519.pub
```

1. 访问 GitHub → Settings → SSH and GPG keys
2. 点击 "New SSH key"
3. 粘贴公钥内容
4. 保存

### 步骤 3：更改远程仓库 URL 为 SSH

```bash
# 查看当前远程仓库
git remote -v

# 更改为 SSH URL
git remote set-url origin git@github.com:119969788/poly-copy-trading.git

# 验证
git remote -v
```

### 步骤 4：推送代码

```bash
git push -u origin main
```

---

## 🌐 方法 3：使用代理（如果网络受限）

### 配置 Git 使用代理

```bash
# HTTP 代理
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy https://proxy.example.com:8080

# SOCKS5 代理
git config --global http.proxy socks5://127.0.0.1:1080
git config --global https.proxy socks5://127.0.0.1:1080

# 推送
git push -u origin main

# 推送完成后，可以取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

---

## 📋 方法 4：使用 GitHub Desktop 或 VS Code

### GitHub Desktop

1. 下载安装 GitHub Desktop
2. 打开项目文件夹
3. 点击 "Publish repository"
4. 选择仓库名称和可见性
5. 点击 "Publish repository"

### VS Code

1. 打开 VS Code
2. 安装 "GitHub" 扩展
3. 使用命令面板（Ctrl+Shift+P）
4. 选择 "Git: Push" 或 "Git: Publish to GitHub"

---

## 🔄 如果远程仓库已存在

如果 GitHub 上已经有代码，可能需要先拉取：

```bash
# 拉取远程更改
git pull origin main --allow-unrelated-histories

# 解决可能的冲突后，再推送
git push -u origin main
```

---

## ✅ 验证上传成功

推送成功后，访问以下 URL 验证：

```
https://github.com/119969788/poly-copy-trading
```

应该能看到所有提交的文件。

---

## 📝 本次提交包含的内容

- ✅ API 凭证生成脚本（`src/generate-api-clob.ts`、`src/generate-api-credentials.ts`）
- ✅ API 凭证生成文档
- ✅ 更新的 `package.json`（添加了依赖和脚本）
- ✅ 更新的 `.gitignore`（排除 API 凭证文件）
- ✅ 其他修复和文档

---

## 🆘 故障排查

### 问题 1：认证失败

**解决**：
- 使用 Personal Access Token 而不是密码
- 或使用 SSH 方式

### 问题 2：网络连接超时

**解决**：
- 检查网络连接
- 使用代理
- 或使用 GitHub Desktop/VS Code

### 问题 3：权限不足

**解决**：
- 确保你有仓库的写入权限
- 检查仓库是否存在

---

## ⚡ 快速命令参考

```bash
# 查看状态
git status

# 查看远程仓库
git remote -v

# 添加所有更改
git add .

# 提交
git commit -m "提交信息"

# 推送到 GitHub（HTTPS）
git push -u origin main

# 推送到 GitHub（SSH）
git remote set-url origin git@github.com:119969788/poly-copy-trading.git
git push -u origin main
```
