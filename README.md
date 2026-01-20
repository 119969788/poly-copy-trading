# Polymarket 聪明钱自动跟单脚本

一个完整的 TypeScript 实现的 Polymarket 聪明钱自动跟单系统，使用最新的 `@catalyst-team/poly-sdk`。

## 功能特性

- ✅ 支持跟随聪明钱排行榜前 50 名，或指定目标钱包地址
- ✅ 实时自动跟单，使用 `sdk.smartMoney.startAutoCopyTrading()` API
- ✅ 完整的风险控制参数配置
- ✅ 支持模拟模式（dryRun）进行安全测试
- ✅ 详细的交易日志和统计信息
- ✅ 优雅停止（Ctrl+C）
- ✅ 首次运行自动授权 USDC.e
- ✅ TypeScript 完整类型支持

## 风险控制参数

- **sizeScale**: 0.1（跟随 10% 规模）
- **maxSizePerTrade**: 10 USDC（最大单笔交易金额）
- **maxSlippage**: 0.03（最大滑点 3%）
- **orderType**: FOK（Fill or Kill，完全成交或取消）
- **minTradeSize**: 5 USDC（最小交易金额）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 必需：Polymarket 私钥
POLYMARKET_PRIVATE_KEY=your_private_key_here


# 可选：指定要跟随的钱包地址（用逗号分隔）
# 如果不设置，则跟随排行榜前 50 名
# TARGET_ADDRESSES=0x1234...,0x5678...

# 可选：是否启用模拟模式（默认 true）
# DRY_RUN=true
```

### 3. 运行脚本

```bash
# 直接运行（推荐）
pnpm start

# 或者使用开发模式（自动重载）
pnpm dev
```

## 服务器部署

### 🚀 一键安装（推荐）

最简单的方式，自动完成所有步骤：

```bash
# 连接到服务器
ssh root@你的服务器IP

# 下载并运行一键安装脚本
curl -fsSL https://raw.githubusercontent.com/119969788/poly-copy-trading/main/install.sh -o install.sh
chmod +x install.sh
bash install.sh
```

脚本会自动：
- ✅ 安装 Node.js、pnpm、PM2、Git
- ✅ 克隆项目
- ✅ 安装依赖
- ✅ 交互式配置私钥
- ✅ 使用 PM2 启动应用
- ✅ 设置开机自启

📖 **详细说明请查看：[一键安装脚本使用指南](./INSTALL_SCRIPT_GUIDE.md)**

### 📝 手动部署

📖 **详细的服务器部署指南请查看：[DEPLOY.md](./DEPLOY.md) 或 [快速安装教程](./QUICK_INSTALL.md)**

快速部署步骤：

1. 连接到服务器：`ssh root@你的服务器IP`
2. 克隆仓库：`git clone https://github.com/119969788/poly-copy-trading.git`
3. 进入目录：`cd poly-copy-trading`
4. 运行部署脚本：`bash deploy.sh`
5. 配置 `.env` 文件
6. 启动：`pm2 start ecosystem.config.cjs`

## 使用说明

### 模拟模式（推荐首次使用）

默认启用 `DRY_RUN=true`，不会执行真实交易，只模拟跟单逻辑。建议先在此模式下测试。

### 实盘模式

将 `.env` 中的 `DRY_RUN=false`，或删除该配置项并在代码中设置为 `false`。

### 指定目标地址

如果要跟随特定的钱包地址，而不是排行榜：

```env
TARGET_ADDRESSES=0x1234567890abcdef...,0xabcdef1234567890...
```

### 停止脚本

按 `Ctrl+C` 可以优雅停止脚本，系统会：
1. 停止所有跟单活动
2. 显示最终统计信息
3. 安全退出

## 输出日志

脚本会实时输出：

- 🚀 启动信息和配置
- 📈 每笔跟单交易的详细信息
- 📊 定期统计信息（每 5 分钟）
- ✅/❌ 交易成功/失败状态

## 项目结构

```
poly-copy-trading/
├── src/
│   └── index.ts          # 主程序文件
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── .env                  # 环境变量（需自己创建）
└── README.md            # 说明文档
```

## 依赖项

- `@catalyst-team/poly-sdk` - Polymarket SDK
- `dotenv` - 环境变量管理
- `typescript` - TypeScript 编译器
- `tsx` - TypeScript 执行器

## 注意事项

⚠️ **重要安全提示**：

1. **私钥安全**：不要将 `.env` 文件提交到版本控制系统
2. **首次运行**：系统会自动调用 `approveAll()` 授权 USDC.e，请确认授权
3. **测试优先**：强烈建议先在 `dryRun: true` 模式下充分测试
4. **风险控制**：根据自身风险承受能力调整参数
5. **监控交易**：定期检查交易日志和统计信息

## 常见问题

### Q: 如何查看实时统计？

A: 脚本会每 5 分钟自动打印统计信息，也可以通过交易日志查看实时状态。

### Q: 授权失败怎么办？

A: 如果已经授权过，授权错误可以忽略。如果首次授权失败，请检查：
- 网络连接
- 私钥是否正确
- 钱包是否有足够的 USDC.e

### Q: 如何修改风险控制参数？

A: 编辑 `src/index.ts` 中的 `copyTradingOptions` 对象。

## Git 仓库初始化

如果需要将项目推送到 GitHub，执行以下步骤：

### 1. 初始化 Git 仓库

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: Polymarket copy trading bot"
```

### 2. 创建 GitHub 仓库

⚠️ **重要安全提示**：建议将 GitHub 仓库设置为 **Private（私密仓库）**，因为项目包含环境变量示例文件。

1. 访问 [github.com](https://github.com) 并登录
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 仓库名称：`poly-copy-trading`（或你喜欢的名字）
4. **设置为 Private（私密）**
5. 不要初始化 README、.gitignore 或 license（我们已经有了）
6. 点击 "Create repository"

### 3. 推送代码到 GitHub

按照 GitHub 页面上的提示执行（替换 `你的用户名` 为实际的 GitHub 用户名）：

```bash
git remote add origin https://github.com/你的用户名/poly-copy-trading.git
git branch -M main
git push -u origin main
```

### 4. 安全提醒

✅ `.gitignore` 已经配置好，会忽略 `.env` 文件  
✅ 只有 `env.example.txt` 会被提交（不包含真实私钥）  
⚠️ **请确保不要将包含真实私钥的 `.env` 文件提交到仓库！**

## 许可证

MIT
