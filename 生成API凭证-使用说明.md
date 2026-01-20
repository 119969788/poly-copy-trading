# 🔑 生成 API 凭证 - 使用说明

## ⚠️ 重要：先配置 .env 文件

在运行生成脚本之前，需要先创建 `.env` 文件并设置私钥。

---

## 📝 步骤 1：创建 .env 文件

在项目根目录创建 `.env` 文件，内容如下：

```env
# Polymarket 私钥（必需）
POLYMARKET_PRIVATE_KEY=你的私钥（不要包含 0x 前缀，或包含都可以）

# 可选：指定要跟随的钱包地址
# TARGET_ADDRESSES=0x1234...,0x5678...

# 可选：模拟模式
# DRY_RUN=true
```

**重要**：将 `你的私钥` 替换为你的实际私钥。

---

## 🚀 步骤 2：运行生成脚本

### 方法 1：使用 @polymarket/clob-client（推荐）

```bash
npx tsx src/generate-api-clob.ts
```

或使用 npm 脚本：

```bash
npm run generate-api-clob
```

### 方法 2：使用当前 SDK（如果支持）

```bash
npx tsx src/generate-api-credentials.ts
```

或使用 npm 脚本：

```bash
npm run generate-api
```

---

## ✅ 步骤 3：查看生成的凭证

脚本运行成功后，会显示：

```
✅ API 凭证生成成功！

📋 API 凭证信息
   API Key: xxxxxx
   Secret: xxxxxx
   Passphrase: xxxxxx

💾 凭证已保存到: .api-credentials.json
```

---

## 📝 步骤 4：更新 .env 文件

将生成的凭证添加到 `.env` 文件：

```env
POLYMARKET_PRIVATE_KEY=你的私钥
POLYMARKET_API_KEY=生成的api_key
POLYMARKET_API_SECRET=生成的secret
POLYMARKET_API_PASSPHRASE=生成的passphrase
```

---

## 🔐 安全提示

1. **不要提交 .env 文件到 Git**
   - `.env` 文件已在 `.gitignore` 中
   - `.api-credentials.json` 也在 `.gitignore` 中

2. **保护私钥和凭证**
   - 不要分享给他人
   - 不要在公共场合显示

---

## 🆘 故障排查

### 问题 1：找不到 .env 文件

**解决**：在项目根目录创建 `.env` 文件，参考 `env.example.txt`

### 问题 2：私钥错误

**解决**：确保 `.env` 文件中的 `POLYMARKET_PRIVATE_KEY` 正确

### 问题 3：未安装依赖

**解决**：运行 `npm install @polymarket/clob-client ethers@5`

---

## ⚡ 快速命令

```bash
# 1. 创建 .env 文件（如果还没有）
# 复制 env.example.txt 为 .env，然后编辑添加私钥

# 2. 安装依赖（如果还没有）
npm install @polymarket/clob-client ethers@5

# 3. 生成 API 凭证
npm run generate-api-clob

# 4. 查看生成的凭证
cat .api-credentials.json
```

---

## 📚 参考文档

- 官方文档：https://docs.polymarket.com/quickstart/first-order
