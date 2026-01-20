# 🔑 生成 Polymarket API 凭证指南

参考官方文档：https://docs.polymarket.com/quickstart/first-order

---

## 📋 方法说明

Polymarket API 凭证用于认证交易请求。有两种方法生成：

1. **使用 @polymarket/clob-client**（推荐，官方方法）
2. **使用 @catalyst-team/poly-sdk**（如果支持）

---

## 🚀 方法 1：使用 @polymarket/clob-client（推荐）

### 步骤 1：安装依赖

```bash
npm install @polymarket/clob-client ethers@5
# 或
pnpm add @polymarket/clob-client ethers@5
```

### 步骤 2：运行生成脚本

```bash
npx tsx src/generate-api-clob.ts
```

### 步骤 3：查看生成的凭证

脚本会显示：
- API Key
- Secret
- Passphrase

并保存到 `.api-credentials.json` 文件。

### 步骤 4：更新 .env 文件

在 `.env` 文件中添加：

```env
POLYMARKET_PRIVATE_KEY=your_private_key
POLYMARKET_API_KEY=生成的api_key
POLYMARKET_API_SECRET=生成的secret
POLYMARKET_API_PASSPHRASE=生成的passphrase
```

---

## 🔧 方法 2：使用当前 SDK

### 运行生成脚本

```bash
npx tsx src/generate-api-credentials.ts
```

**注意**：如果当前 SDK 不支持，会提示使用方法 1。

---

## 📝 手动生成（使用 TypeScript）

如果脚本不可用，可以手动创建文件：

```typescript
import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const signer = new Wallet(process.env.POLYMARKET_PRIVATE_KEY!);

const client = new ClobClient(HOST, CHAIN_ID, signer);

// 生成 API 凭证
const userApiCreds = await client.createOrDeriveApiKey();

console.log('API Key:', userApiCreds.apiKey);
console.log('Secret:', userApiCreds.secret);
console.log('Passphrase:', userApiCreds.passphrase);
```

---

## ⚙️ 签名类型配置

生成凭证后，需要确定签名类型：

| 交易方式 | 类型 | 值 | 资金地址 |
|---------|------|-----|---------|
| 使用 EOA 钱包（自己支付 Gas） | EOA | 0 | 你的 EOA 钱包地址 |
| Polymarket.com 账户（Magic Link/Google） | POLY_PROXY | 1 | 代理钱包地址 |
| Polymarket.com 账户（浏览器钱包） | GNOSIS_SAFE | 2 | 代理钱包地址 |

**对于 EOA 钱包，使用类型 0。**

---

## 📚 完整示例

### 初始化客户端并生成凭证

```typescript
import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const signer = new Wallet(process.env.POLYMARKET_PRIVATE_KEY!);

// 步骤 1: 初始化客户端
const client = new ClobClient(HOST, CHAIN_ID, signer);

// 步骤 2: 生成 API 凭证
const userApiCreds = await client.createOrDeriveApiKey();

// 步骤 3: 配置签名类型和资金地址
const SIGNATURE_TYPE = 0; // EOA
const FUNDER_ADDRESS = signer.address;

// 步骤 4: 重新初始化客户端（完整认证）
const authenticatedClient = new ClobClient(
  HOST,
  CHAIN_ID,
  signer,
  userApiCreds,
  SIGNATURE_TYPE,
  FUNDER_ADDRESS
);
```

---

## ✅ 验证凭证

生成后，可以测试使用：

```typescript
// 获取市场信息
const market = await client.getMarket('TOKEN_ID');

// 查看持仓
const positions = await client.getPositions();

// 查看订单
const orders = await client.getOpenOrders();
```

---

## 🔐 安全提示

1. **保护凭证**：
   - 不要将 `.api-credentials.json` 提交到 Git
   - 不要分享 API 凭证给他人
   - 使用 `.env` 文件存储，并确保在 `.gitignore` 中

2. **文件权限**：
   ```bash
   chmod 600 .api-credentials.json
   chmod 600 .env
   ```

---

## 📝 已创建的脚本

1. `src/generate-api-clob.ts` - 使用 @polymarket/clob-client 生成
2. `src/generate-api-credentials.ts` - 使用当前 SDK 生成（如果支持）

---

## 🆘 故障排查

### 问题 1：未安装 clob-client

```bash
npm install @polymarket/clob-client ethers@5
```

### 问题 2：网络错误

检查网络连接和防火墙设置。

### 问题 3：私钥错误

确保 `.env` 文件中的 `POLYMARKET_PRIVATE_KEY` 正确。

---

## 📚 参考文档

- 官方文档：https://docs.polymarket.com/quickstart/first-order
- CLOB 客户端：https://docs.polymarket.com/clob/introduction

---

## ⚡ 快速命令

```bash
# 安装依赖
pnpm add @polymarket/clob-client ethers@5

# 生成凭证
npx tsx src/generate-api-clob.ts

# 查看生成的凭证
cat .api-credentials.json
```
