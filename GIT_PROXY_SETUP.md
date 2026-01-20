# Git 代理设置指南

## 设置 Git 使用代理推送代码

如果无法直接访问 GitHub，可以通过设置代理来解决。

## 方法 1：设置 HTTP/HTTPS 代理（推荐）

### 设置全局代理

```bash
# 设置 HTTP 代理（替换为你的代理地址和端口）
git config --global http.proxy http://127.0.0.1:7890

# 设置 HTTPS 代理
git config --global https.proxy http://127.0.0.1:7890
```

### 仅对 GitHub 设置代理

```bash
# 仅对 GitHub 使用代理
git config --global http.https://github.com.proxy http://127.0.0.1:7890
git config --global https.https://github.com.proxy http://127.0.0.1:7890
```

### 常见代理端口

- **Clash**: `http://127.0.0.1:7890`
- **V2Ray**: `http://127.0.0.1:10809`
- **Shadowsocks**: `http://127.0.0.1:1080`
- **自定义代理**: `http://代理IP:端口`

## 方法 2：设置 SOCKS5 代理

```bash
# SOCKS5 代理
git config --global http.proxy socks5://127.0.0.1:1080
git config --global https.proxy socks5://127.0.0.1:1080
```

## 方法 3：使用环境变量（临时）

```bash
# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:7890"
$env:HTTPS_PROXY="http://127.0.0.1:7890"

# Windows CMD
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890

# Linux/Mac
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
```

## 查看当前代理设置

```bash
# 查看 HTTP 代理
git config --global --get http.proxy

# 查看 HTTPS 代理
git config --global --get https.proxy

# 查看所有 Git 配置
git config --global --list
```

## 取消代理设置

```bash
# 取消全局代理
git config --global --unset http.proxy
git config --global --unset https.proxy

# 取消 GitHub 专用代理
git config --global --unset http.https://github.com.proxy
git config --global --unset https.https://github.com.proxy
```

## 使用代理推送代码的完整流程

### 1. 设置代理

```bash
# 设置代理（根据你的代理软件调整端口）
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

### 2. 验证代理设置

```bash
git config --global --get http.proxy
git config --global --get https.proxy
```

### 3. 测试连接

```bash
# 测试 GitHub 连接
git ls-remote https://github.com/119969788/poly-copy-trading.git
```

### 4. 提交并推送代码

```bash
# 添加更改
git add .

# 提交更改
git commit -m "Add price threshold strategy"

# 拉取远程更改（如果有）
git pull origin main

# 推送到远程
git push origin main
```

## 常见代理软件配置

### Clash for Windows

```bash
# Clash 默认 HTTP 代理端口是 7890
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

### V2RayN

```bash
# V2RayN 默认 HTTP 代理端口是 10809
git config --global http.proxy http://127.0.0.1:10809
git config --global https.proxy http://127.0.0.1:10809
```

### Shadowsocks

```bash
# Shadowsocks 默认 SOCKS5 端口是 1080
git config --global http.proxy socks5://127.0.0.1:1080
git config --global https.proxy socks5://127.0.0.1:1080
```

## 故障排除

### 问题 1：代理设置后仍然无法连接

**解决方案**：
1. 确认代理软件正在运行
2. 检查代理端口是否正确
3. 尝试使用 `git ls-remote` 测试连接

```bash
# 测试连接
git ls-remote https://github.com/119969788/poly-copy-trading.git
```

### 问题 2：需要认证的代理

如果代理需要用户名和密码：

```bash
git config --global http.proxy http://用户名:密码@代理IP:端口
git config --global https.proxy http://用户名:密码@代理IP:端口
```

### 问题 3：SSL 证书错误

如果遇到 SSL 证书错误，可以临时禁用 SSL 验证（不推荐，仅用于测试）：

```bash
git config --global http.sslVerify false
```

**注意**：禁用 SSL 验证会降低安全性，仅用于测试。

## 快速设置脚本

创建 `setup-git-proxy.ps1`（Windows PowerShell）：

```powershell
# Git 代理设置脚本
$proxy = "http://127.0.0.1:7890"

Write-Host "正在设置 Git 代理..." -ForegroundColor Green
git config --global http.proxy $proxy
git config --global https.proxy $proxy

Write-Host "✅ 代理设置完成！" -ForegroundColor Green
Write-Host "代理地址: $proxy" -ForegroundColor Cyan

Write-Host "`n测试连接..." -ForegroundColor Yellow
git ls-remote https://github.com/119969788/poly-copy-trading.git

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 连接成功！" -ForegroundColor Green
} else {
    Write-Host "❌ 连接失败，请检查代理设置" -ForegroundColor Red
}
```

使用：

```powershell
.\setup-git-proxy.ps1
```

## 注意事项

1. **代理地址**：确保代理软件正在运行，并使用正确的端口
2. **仅对 GitHub**：如果只想对 GitHub 使用代理，使用 `http.https://github.com.proxy` 而不是全局代理
3. **安全性**：不要将代理密码提交到代码仓库
4. **临时使用**：如果只是临时需要，可以使用环境变量而不是全局配置

---

**提示**：如果使用 Clash 等代理软件，通常默认端口是 7890，可以直接使用上述命令设置。
