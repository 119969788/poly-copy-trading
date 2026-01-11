# Git 推送帮助

## 当前情况

您有一个本地提交需要推送到 GitHub，Git 正在提示输入凭据。

## 解决方案

### 方法 1：使用 Personal Access Token (PAT)（推荐 HTTPS）

GitHub 已不再支持密码认证，需要使用 Personal Access Token。

1. **创建 Personal Access Token：**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token" -> "Generate new token (classic)"
   - 设置名称和过期时间
   - 勾选 `repo` 权限
   - 点击 "Generate token"
   - **复制生成的 token（只显示一次）**

2. **使用 Token 推送：**
   ```bash
   # 在提示用户名时，输入您的 GitHub 用户名
   # 在提示密码时，粘贴您的 Personal Access Token
   git push origin main
   ```

3. **或配置 Git 凭据管理器（Windows）：**
   ```bash
   git config --global credential.helper manager-core
   # 然后再次推送，会弹出窗口保存凭据
   git push origin main
   ```

### 方法 2：切换到 SSH 方式（推荐长期使用）

1. **检查是否已有 SSH 密钥：**
   ```bash
   ls ~/.ssh/id_rsa.pub
   # Windows: type %USERPROFILE%\.ssh\id_rsa.pub
   ```

2. **如果没有，生成 SSH 密钥：**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # 按回车使用默认位置
   # 可以设置密码或直接回车
   ```

3. **添加 SSH 密钥到 GitHub：**
   - 复制公钥内容：
     ```bash
     cat ~/.ssh/id_rsa.pub
     # Windows: type %USERPROFILE%\.ssh\id_rsa.pub
     ```
   - 访问：https://github.com/settings/keys
   - 点击 "New SSH key"
   - 粘贴公钥内容，保存

4. **更改远程仓库地址为 SSH：**
   ```bash
   git remote set-url origin git@github.com:119969788/poly-copy-trading.git
   ```

5. **测试 SSH 连接：**
   ```bash
   ssh -T git@github.com
   ```

6. **推送代码：**
   ```bash
   git push origin main
   ```

### 方法 3：使用 GitHub CLI（如果已安装）

```bash
gh auth login
git push origin main
```

## 快速解决（如果当前提示卡住）

如果当前 Git 提示已卡住：

1. **按 `Ctrl+C` 取消当前操作**

2. **配置 Git 凭据管理器（Windows）：**
   ```bash
   git config --global credential.helper manager-core
   ```

3. **重新推送：**
   ```bash
   git push origin main
   ```

   这次会弹出 Windows 凭据管理器窗口，可以输入用户名和 Personal Access Token。

## 当前待推送的提交

使用以下命令查看待推送的提交：

```bash
git log origin/main..HEAD --oneline
```

## 验证推送成功

推送成功后，可以验证：

```bash
git status
# 应该显示: "Your branch is up to date with 'origin/main'"

# 或在浏览器查看
# https://github.com/119969788/poly-copy-trading
```

## 常见问题

### Q: 忘记 Personal Access Token 怎么办？

A: 重新生成一个新的 Token。旧的 Token 即使忘记了也无法找回。

### Q: SSH 密钥在哪里？

A: 
- Linux/Mac: `~/.ssh/`
- Windows: `C:\Users\您的用户名\.ssh\`

### Q: 如何查看当前的远程仓库地址？

A:
```bash
git remote -v
```

### Q: 推送时提示 "Permission denied"？

A: 检查：
1. SSH 密钥是否正确添加到 GitHub
2. Personal Access Token 是否有 `repo` 权限
3. 用户名是否正确
