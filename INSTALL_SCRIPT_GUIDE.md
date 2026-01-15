# 一键安装脚本使用指南

## 📋 简介

`install.sh` 是一个全自动安装脚本，可以一键完成从环境准备到应用启动的所有步骤。

## 🚀 快速开始

### 方法 1：从 GitHub 直接下载运行（推荐）

```bash
# 连接到服务器
ssh root@你的服务器IP

# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/119969788/poly-copy-trading/main/install.sh -o install.sh
chmod +x install.sh
bash install.sh
```

### 方法 2：如果项目已克隆

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 给脚本执行权限
chmod +x install.sh

# 运行脚本
bash install.sh
```

## 📝 脚本功能

脚本会自动完成以下步骤：

1. **系统检测**
   - 自动检测操作系统（Ubuntu/Debian/CentOS）
   - 检查是否为 root 用户

2. **环境安装**
   - 安装 Node.js 20.x LTS
   - 安装 pnpm
   - 安装 PM2
   - 安装 Git

3. **项目部署**
   - 克隆项目到 `~/projects/poly-copy-trading`
   - 如果项目已存在，可选择更新或使用现有版本

4. **依赖安装**
   - 安装项目依赖
   - 可选择使用国内镜像加速

5. **配置环境变量**
   - 交互式输入私钥
   - 自动创建 `.env` 文件
   - 设置文件权限为 600

6. **测试运行**（可选）
   - 可选择是否测试运行
   - 验证配置是否正确

7. **启动应用**
   - 使用 PM2 启动应用
   - 保存 PM2 配置
   - 设置开机自启

## 🎯 使用流程

### 步骤 1：连接到服务器

```bash
ssh root@你的服务器IP
```

### 步骤 2：运行安装脚本

```bash
curl -fsSL https://raw.githubusercontent.com/119969788/poly-copy-trading/main/install.sh -o install.sh
chmod +x install.sh
bash install.sh
```

### 步骤 3：按提示操作

脚本会交互式询问以下信息：

1. **是否更新项目**（如果项目已存在）
   - 输入 `y` 更新到最新版本
   - 输入 `n` 使用现有版本

2. **是否使用国内镜像**
   - 如果网络较慢，输入 `y` 使用淘宝镜像
   - 输入 `n` 使用默认源

3. **输入私钥**
   - 输入你的 Polymarket 私钥（输入时不会显示，这是正常的）
   - 私钥可以包含或不包含 `0x` 前缀

4. **是否测试运行**
   - 输入 `y` 进行测试（推荐）
   - 输入 `n` 跳过测试

5. **是否设置开机自启**
   - 输入 `y` 自动设置
   - 输入 `n` 稍后手动设置

### 步骤 4：完成安装

安装完成后，脚本会显示：
- 项目目录位置
- 配置文件位置
- 常用管理命令
- 当前应用状态

## 📊 安装后操作

### 查看应用状态

```bash
pm2 status
```

### 查看日志

```bash
# 查看所有日志
pm2 logs poly-copy-trading

# 实时查看日志
pm2 logs poly-copy-trading --follow

# 查看最后 50 行
pm2 logs poly-copy-trading --lines 50
```

### 管理应用

```bash
# 重启应用
pm2 restart poly-copy-trading

# 停止应用
pm2 stop poly-copy-trading

# 删除应用（从 PM2 列表中移除）
pm2 delete poly-copy-trading
```

### 修改配置

```bash
# 编辑配置文件
nano ~/projects/poly-copy-trading/.env

# 重启应用使配置生效
pm2 restart poly-copy-trading
```

### 切换到实盘模式

编辑 `.env` 文件，将 `DRY_RUN=true` 改为 `DRY_RUN=false`：

```bash
nano ~/projects/poly-copy-trading/.env
# 修改 DRY_RUN=false
pm2 restart poly-copy-trading
```

## ⚠️ 注意事项

### 1. 权限要求

脚本需要 root 权限运行：

```bash
# 如果使用非 root 用户
sudo bash install.sh
```

### 2. 网络要求

- 需要能够访问 GitHub（克隆项目）
- 需要能够访问 npm 仓库（安装依赖）
- 如果网络较慢，建议使用国内镜像

### 3. 私钥安全

- 私钥输入时不会显示（安全考虑）
- `.env` 文件权限自动设置为 600（只有所有者可读）
- 不要将 `.env` 文件提交到 Git

### 4. 首次运行

- 默认设置 `DRY_RUN=true`（模拟模式）
- 强烈建议先在模拟模式下测试
- 确认一切正常后再切换到实盘模式

## 🔧 故障排除

### 问题 1：脚本下载失败

**解决方法：**

```bash
# 手动下载脚本
wget https://raw.githubusercontent.com/119969788/poly-copy-trading/main/install.sh
chmod +x install.sh
bash install.sh
```

### 问题 2：GitHub 访问失败

**解决方法：**

```bash
# 使用 GitHub 镜像
git clone https://ghproxy.com/https://github.com/119969788/poly-copy-trading.git
cd poly-copy-trading
bash install.sh
```

### 问题 3：依赖安装失败

**解决方法：**

脚本会询问是否使用国内镜像，选择 `y` 使用淘宝镜像：

```bash
# 或手动设置
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

### 问题 4：PM2 启动失败

**解决方法：**

```bash
# 查看错误日志
pm2 logs poly-copy-trading --err

# 检查配置文件
cat ~/projects/poly-copy-trading/.env

# 手动测试运行
cd ~/projects/poly-copy-trading
pnpm start
```

### 问题 5：开机自启未设置

**解决方法：**

```bash
# 手动设置
pm2 startup
# 按提示执行显示的命令
pm2 save
```

## 📚 相关文档

- [快速安装教程](./QUICK_INSTALL.md) - 手动安装步骤
- [详细安装指南](./SERVER_INSTALL_GUIDE.md) - 完整安装流程
- [PM2 使用指南](./PM2_SETUP.md) - PM2 详细说明

## 🎉 完成！

安装完成后，你的应用应该已经在后台运行了。使用 `pm2 status` 查看状态，使用 `pm2 logs poly-copy-trading` 查看日志。

---

**💡 提示：** 如果遇到任何问题，请查看 [详细安装指南](./SERVER_INSTALL_GUIDE.md) 中的"常见问题解决"部分。
