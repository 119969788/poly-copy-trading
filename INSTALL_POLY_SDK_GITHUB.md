# 在腾讯云服务器上安装 GitHub 版 poly-sdk

本指南说明如何在腾讯云服务器上安装和使用 [cyl19970726/poly-sdk](https://github.com/cyl19970726/poly-sdk) GitHub 版本。

## 方法 1：修改项目依赖（推荐）

### 步骤 1：连接到服务器

```bash
ssh root@你的服务器IP
```

### 步骤 2：进入项目目录

```bash
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading
```

### 步骤 3：修改 package.json

编辑 `package.json` 文件，将 `@catalyst-team/poly-sdk` 改为 GitHub 版本：

```bash
nano package.json
```

找到这一行：
```json
"@catalyst-team/poly-sdk": "latest",
```

修改为：
```json
"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main",
```

或者使用 sed 命令快速修改：

```bash
sed -i 's|"@catalyst-team/poly-sdk": "latest"|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|' package.json
```

### 步骤 4：重新安装依赖

```bash
# 删除旧的 node_modules 和 lock 文件
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

如果遇到网络问题，可以使用国内镜像：

```bash
# 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

### 步骤 5：验证安装

```bash
# 检查是否安装成功
pnpm list @catalyst-team/poly-sdk

# 或查看 node_modules
ls -la node_modules/@catalyst-team/poly-sdk/
```

## 方法 2：直接克隆 GitHub 仓库（开发/调试）

如果需要直接使用 GitHub 仓库的代码进行开发或调试：

### 步骤 1：克隆仓库

```bash
# 创建工作目录
mkdir -p ~/projects
cd ~/projects

# 克隆 poly-sdk 仓库
git clone https://github.com/cyl19970726/poly-sdk.git
cd poly-sdk
```

### 步骤 2：安装依赖

```bash
# 安装依赖
pnpm install

# 构建项目（如果需要）
pnpm build
```

### 步骤 3：在项目中使用（使用 pnpm link）

```bash
# 在 poly-sdk 目录中
cd ~/projects/poly-sdk
pnpm link --global

# 在你的项目中使用
cd ~/projects/poly-copy-trading
pnpm link --global @catalyst-team/poly-sdk
```

## 方法 3：使用 npm/yarn 安装 GitHub 包

### 使用 npm

```bash
cd ~/projects/poly-copy-trading
npm install github:cyl19970726/poly-sdk#main
```

### 使用 yarn

```bash
cd ~/projects/poly-copy-trading
yarn add github:cyl19970726/poly-sdk#main
```

### 使用 pnpm

```bash
cd ~/projects/poly-copy-trading
pnpm add github:cyl19970726/poly-sdk#main
```

## 完整安装脚本

创建一个一键安装脚本 `install-github-sdk.sh`：

```bash
#!/bin/bash

echo "开始安装 GitHub 版 poly-sdk..."

# 进入项目目录
cd ~/projects/poly-copy-trading || cd ~/poly-copy-trading

# 备份 package.json
cp package.json package.json.bak

# 修改 package.json
echo "修改 package.json..."
sed -i 's|"@catalyst-team/poly-sdk": "latest"|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|' package.json

# 删除旧的依赖
echo "清理旧的依赖..."
rm -rf node_modules pnpm-lock.yaml

# 安装依赖
echo "安装新的依赖..."
pnpm install

# 验证安装
echo "验证安装..."
if pnpm list @catalyst-team/poly-sdk > /dev/null 2>&1; then
    echo "✅ 安装成功！"
    echo "版本信息："
    pnpm list @catalyst-team/poly-sdk
else
    echo "❌ 安装失败，请检查错误信息"
    # 恢复备份
    mv package.json.bak package.json
    exit 1
fi

echo "✅ 完成！"
```

使用脚本：

```bash
# 创建脚本
nano install-github-sdk.sh
# 粘贴上面的内容，保存（Ctrl+O, Enter, Ctrl+X）

# 添加执行权限
chmod +x install-github-sdk.sh

# 运行脚本
./install-github-sdk.sh
```

## 验证安装

### 检查版本

```bash
cd ~/projects/poly-copy-trading
pnpm list @catalyst-team/poly-sdk
```

### 测试运行

```bash
# 测试运行（模拟模式）
DRY_RUN=true pnpm start

# 或测试 dip-arb
DRY_RUN=true pnpm dip-arb
```

## 切换回 npm 版本

如果需要切换回 npm 版本：

```bash
cd ~/projects/poly-copy-trading

# 修改 package.json
sed -i 's|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|"@catalyst-team/poly-sdk": "latest"|' package.json

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 常见问题

### Q: 安装失败，提示找不到包？

A: 检查：
1. 网络连接是否正常
2. GitHub 是否可访问
3. 仓库地址是否正确

```bash
# 测试 GitHub 连接
curl -I https://github.com/cyl19970726/poly-sdk
```

### Q: 安装很慢？

A: 使用国内镜像或代理：

```bash
# 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 或设置 GitHub 代理（如果有）
git config --global url."https://ghproxy.com/https://github.com".insteadOf "https://github.com"
```

### Q: 版本冲突？

A: 清理缓存并重新安装：

```bash
# 清理 pnpm 缓存
pnpm store prune

# 删除 node_modules
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

### Q: 如何查看当前使用的版本？

A:

```bash
# 查看安装的版本
pnpm list @catalyst-team/poly-sdk

# 查看 package.json
cat package.json | grep poly-sdk

# 查看实际安装位置
ls -la node_modules/@catalyst-team/poly-sdk/
```

## 更新 GitHub 版本

当 GitHub 仓库有更新时：

```bash
cd ~/projects/poly-copy-trading

# 更新依赖
pnpm update @catalyst-team/poly-sdk

# 或强制重新安装
rm -rf node_modules/@catalyst-team/poly-sdk
pnpm install
```

## 在服务器上快速安装（一键脚本）

```bash
# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/119969788/poly-copy-trading/main/install-github-sdk.sh | bash

# 或手动执行
cd ~/projects/poly-copy-trading
sed -i 's|"@catalyst-team/poly-sdk": "latest"|"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"|' package.json
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 注意事项

1. **GitHub 版本可能包含未发布的特性**，使用前请测试
2. **版本可能不稳定**，建议在测试环境先验证
3. **保持备份**，修改前备份 `package.json`
4. **网络要求**，需要能够访问 GitHub
5. **更新频率**，GitHub 版本更新可能更频繁

## 相关文档

- [poly-sdk GitHub 仓库](https://github.com/cyl19970726/poly-sdk)
- [poly-sdk 中文文档](https://github.com/cyl19970726/poly-sdk/blob/main/README.zh-CN.md)
- [服务器部署指南](./DEPLOY.md)

---

**提示**：安装完成后，建议先在模拟模式（`DRY_RUN=true`）下测试，确认功能正常后再切换到实盘模式。
