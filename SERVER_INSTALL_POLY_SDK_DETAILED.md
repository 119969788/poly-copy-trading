# 腾讯云服务器安装 GitHub 版 poly-sdk - 详细步骤

本指南提供在腾讯云服务器上安装 [cyl19970726/poly-sdk](https://github.com/cyl19970726/poly-sdk) 的详细步骤。

## 📋 前置要求

- ✅ 已购买腾讯云服务器
- ✅ 已获取服务器 IP 地址和 root 密码（或 SSH 密钥）
- ✅ 服务器已安装 Node.js 和 pnpm（参考 [DEPLOY.md](./DEPLOY.md)）
- ✅ 项目已部署到服务器（参考 [DEPLOY.md](./DEPLOY.md)）

## 🔍 第一步：连接到服务器

### 1.1 使用 SSH 连接

**Windows 用户（使用 PowerShell 或 CMD）：**

```bash
ssh root@你的服务器IP
```

**示例：**
```bash
ssh root@123.456.789.0
```

**如果使用密钥文件：**
```bash
ssh -i 你的密钥文件.pem root@你的服务器IP
```

**Mac/Linux 用户：**
```bash
ssh root@你的服务器IP
```

### 1.2 验证连接

连接成功后，你应该看到类似这样的提示：

```
Welcome to Ubuntu 20.04 LTS
...
root@your-server:~#
```

## 📁 第二步：定位项目目录

### 2.1 查找项目位置

项目可能在以下位置之一：

```bash
# 检查常见位置
ls -la ~/projects/poly-copy-trading
ls -la ~/poly-copy-trading
ls -la /root/projects/poly-copy-trading
```

### 2.2 进入项目目录

找到项目后，进入目录：

```bash
# 如果项目在 ~/projects/poly-copy-trading
cd ~/projects/poly-copy-trading

# 或如果项目在 ~/poly-copy-trading
cd ~/poly-copy-trading

# 或如果项目在其他位置
cd /root/projects/poly-copy-trading
```

### 2.3 验证项目结构

确认你在正确的目录：

```bash
# 查看当前目录
pwd

# 列出文件
ls -la

# 应该看到以下文件：
# - package.json
# - src/
# - tsconfig.json
# 等
```

## 🔧 第三步：检查当前环境

### 3.1 检查 Node.js 版本

```bash
node --version
```

**应该显示：** `v20.x.x` 或更高版本

**如果未安装 Node.js：**

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
```

### 3.2 检查 pnpm 版本

```bash
pnpm --version
```

**应该显示：** `8.x.x` 或更高版本

**如果未安装 pnpm：**

```bash
npm install -g pnpm
```

### 3.3 检查 Git（可选，用于克隆）

```bash
git --version
```

**如果未安装 Git：**

```bash
# Ubuntu/Debian
apt install -y git

# CentOS/RHEL
yum install -y git
```

## 📦 第四步：备份当前配置

### 4.1 备份 package.json

```bash
# 创建备份
cp package.json package.json.bak

# 验证备份
ls -la package.json.bak
```

### 4.2 查看当前 SDK 版本

```bash
# 查看当前配置
cat package.json | grep poly-sdk
```

**应该看到类似：**
```json
"@catalyst-team/poly-sdk": "latest"
```

## 🔄 第五步：修改 package.json

### 5.1 使用 nano 编辑器（推荐新手）

```bash
nano package.json
```

**操作步骤：**

1. 使用方向键找到这一行：
   ```json
   "@catalyst-team/poly-sdk": "latest",
   ```

2. 将 `"latest"` 改为 `"github:cyl19970726/poly-sdk#main"`

3. 修改后应该是：
   ```json
   "@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main",
   ```

4. 保存文件：
   - 按 `Ctrl + O`（保存）
   - 按 `Enter`（确认文件名）
   - 按 `Ctrl + X`（退出）

### 5.2 使用 sed 命令（快速方法）

```bash
sed -i 's|"@catalyst-team/poly-sdk": "latest"|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|' package.json
```

### 5.3 验证修改

```bash
# 查看修改后的内容
cat package.json | grep poly-sdk
```

**应该看到：**
```json
"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"
```

## 🧹 第六步：清理旧的依赖

### 6.1 删除旧的 SDK 安装

```bash
# 删除旧的 SDK 模块
rm -rf node_modules/@catalyst-team/poly-sdk

# 删除锁文件（可选，但推荐）
rm -f pnpm-lock.yaml
```

### 6.2 清理 pnpm 缓存（可选）

```bash
# 清理缓存
pnpm store prune
```

## 📥 第七步：安装 GitHub 版 SDK

### 7.1 使用 pnpm 安装

```bash
# 安装依赖
pnpm install
```

**这个过程可能需要 2-5 分钟，取决于网络速度。**

### 7.2 如果遇到网络问题

**使用国内镜像：**

```bash
# 设置淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 重新安装
pnpm install
```

**如果 GitHub 访问困难，可以设置代理：**

```bash
# 设置 Git 代理（如果有代理服务器）
git config --global url."https://ghproxy.com/https://github.com".insteadOf "https://github.com"

# 然后重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 7.3 安装过程输出

安装过程中，你会看到类似这样的输出：

```
Packages: +1234
++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 1234, reused 0, downloaded 0, added 1234
Done in 45.2s
```

## ✅ 第八步：验证安装

### 8.1 检查安装的版本

```bash
# 查看安装的 SDK 版本
pnpm list @catalyst-team/poly-sdk
```

**应该看到类似：**
```
poly-copy-trading@1.0.0 /root/projects/poly-copy-trading
└── @catalyst-team/poly-sdk@github:cyl19970726/poly-sdk#main
```

### 8.2 检查 SDK 文件

```bash
# 查看 SDK 目录
ls -la node_modules/@catalyst-team/poly-sdk/

# 应该看到：
# - package.json
# - src/
# - dist/
# 等文件
```

### 8.3 查看 package.json 中的实际版本

```bash
# 查看 package.json
cat package.json | grep -A 2 -B 2 poly-sdk
```

## 🧪 第九步：测试安装

### 9.1 测试基本功能

```bash
# 在模拟模式下测试
DRY_RUN=true pnpm start
```

**如果看到类似输出，说明安装成功：**

```
═══════════════════════════════════════════════════
   Polymarket 聪明钱自动跟单系统
═══════════════════════════════════════════════════

🚀 正在初始化 SDK...
✅ SDK 初始化成功
```

**按 `Ctrl+C` 停止测试。**

### 9.2 测试 DipArb 功能（如果使用）

```bash
# 测试 DipArb
DRY_RUN=true pnpm dip-arb
```

## 🔄 第十步：重启应用（如果正在运行）

### 10.1 如果使用 PM2

```bash
# 查看运行状态
pm2 status

# 重启应用
pm2 restart poly-copy-trading

# 或重启 dip-arb
pm2 restart dip-arb-15m

# 查看日志
pm2 logs poly-copy-trading --lines 50
```

### 10.2 如果使用 nohup

```bash
# 查找进程
ps aux | grep "tsx src/index.ts"

# 停止进程（替换 PID 为实际进程ID）
kill PID

# 重新启动
nohup pnpm start > output.log 2>&1 &
```

## 📝 完整安装命令（一键执行）

如果你想一次性执行所有步骤，可以使用以下命令：

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading || cd ~/poly-copy-trading

# 备份 package.json
cp package.json package.json.bak

# 修改 package.json
sed -i 's|"@catalyst-team/poly-sdk": "latest"|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|' package.json

# 清理旧的依赖
rm -rf node_modules/@catalyst-team/poly-sdk pnpm-lock.yaml

# 安装新依赖
pnpm install

# 验证安装
pnpm list @catalyst-team/poly-sdk

echo "✅ 安装完成！"
```

## 🛠️ 使用安装脚本（最简单）

### 方法 1：使用项目中的脚本

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 下载脚本（如果还没有）
# 或直接使用项目中的脚本
chmod +x install-github-sdk.sh
./install-github-sdk.sh
```

### 方法 2：从 GitHub 下载脚本

```bash
# 下载脚本
curl -fsSL https://raw.githubusercontent.com/119969788/poly-copy-trading/main/install-github-sdk.sh -o install-github-sdk.sh

# 添加执行权限
chmod +x install-github-sdk.sh

# 运行脚本
./install-github-sdk.sh
```

## ⚠️ 常见问题解决

### 问题 1：网络连接超时

**错误信息：**
```
Error: connect ETIMEDOUT
```

**解决方法：**

```bash
# 使用国内镜像
pnpm config set registry https://registry.npmmirror.com

# 设置 Git 代理（如果有）
git config --global url."https://ghproxy.com/https://github.com".insteadOf "https://github.com"

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 问题 2：找不到 GitHub 仓库

**错误信息：**
```
Error: Could not resolve host: github.com
```

**解决方法：**

```bash
# 测试 GitHub 连接
ping github.com

# 如果无法连接，检查网络或使用代理
# 或使用镜像站点
git config --global url."https://ghproxy.com/https://github.com".insteadOf "https://github.com"
```

### 问题 3：权限错误

**错误信息：**
```
EACCES: permission denied
```

**解决方法：**

```bash
# 检查文件权限
ls -la package.json

# 修复权限
chmod 644 package.json
chmod 755 node_modules 2>/dev/null || true
```

### 问题 4：版本冲突

**错误信息：**
```
Conflicting peer dependency
```

**解决方法：**

```bash
# 清理缓存
pnpm store prune

# 删除 node_modules
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install --force
```

### 问题 5：安装后功能不工作

**解决方法：**

```bash
# 1. 检查 SDK 是否正确安装
pnpm list @catalyst-team/poly-sdk

# 2. 检查 package.json
cat package.json | grep poly-sdk

# 3. 重新安装
rm -rf node_modules/@catalyst-team/poly-sdk
pnpm install

# 4. 测试运行
DRY_RUN=true pnpm start
```

## 🔙 恢复 npm 版本

如果需要切换回 npm 版本：

### 方法 1：使用恢复脚本

```bash
chmod +x restore-npm-sdk.sh
./restore-npm-sdk.sh
```

### 方法 2：手动恢复

```bash
# 恢复 package.json
cp package.json.bak package.json

# 或手动修改
sed -i 's|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|"@catalyst-team/poly-sdk": "latest"|' package.json

# 重新安装
rm -rf node_modules/@catalyst-team/poly-sdk pnpm-lock.yaml
pnpm install
```

## 📊 验证清单

安装完成后，请确认：

- [ ] `package.json` 中 SDK 版本已修改为 `github:cyl19970726/poly-sdk#main`
- [ ] `pnpm list @catalyst-team/poly-sdk` 显示 GitHub 版本
- [ ] `node_modules/@catalyst-team/poly-sdk/` 目录存在
- [ ] 测试运行 `DRY_RUN=true pnpm start` 成功
- [ ] 应用可以正常启动（如果使用 PM2，检查 `pm2 status`）

## 📚 相关文档

- [完整安装指南](./INSTALL_POLY_SDK_GITHUB.md)
- [服务器部署指南](./DEPLOY.md)
- [poly-sdk GitHub 仓库](https://github.com/cyl19970726/poly-sdk)
- [poly-sdk 中文文档](https://github.com/cyl19970726/poly-sdk/blob/main/README.zh-CN.md)

## 🎯 快速参考

**安装命令：**
```bash
cd ~/projects/poly-copy-trading && \
sed -i 's|"@catalyst-team/poly-sdk": "latest"|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|' package.json && \
rm -rf node_modules/@catalyst-team/poly-sdk pnpm-lock.yaml && \
pnpm install
```

**验证命令：**
```bash
pnpm list @catalyst-team/poly-sdk
```

**测试命令：**
```bash
DRY_RUN=true pnpm start
```

---

**💡 提示：** 安装完成后，建议先在模拟模式（`DRY_RUN=true`）下测试，确认功能正常后再切换到实盘模式！
