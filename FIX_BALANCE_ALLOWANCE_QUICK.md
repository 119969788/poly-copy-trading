# 快速修复 "not enough balance / allowance" 错误

## 错误信息

```
[CLOB Client] request error {"status":400,"statusText":"Bad Request","data":{"error":"not enough balance / allowance"}
```

## 快速解决方案

### 方案 1：确保授权检查已启用（推荐）

检查 `.env` 文件，确保**没有**设置以下选项（或设置为 `false`）：

```bash
# 不要设置这些，或设置为 false
SKIP_BALANCE_CHECK=false
SKIP_APPROVAL_CHECK=false
```

### 方案 2：手动授权 USDC.e

如果自动授权失败，可以手动授权：

1. **访问 Polymarket 网站**
   - 打开 https://polymarket.com
   - 连接您的钱包

2. **触发授权**
   - 尝试进行一次交易（买入或卖出）
   - 钱包会弹出授权请求
   - 确认授权

3. **验证授权**
   - 授权后，等待几秒让交易确认
   - 重新运行脚本

### 方案 3：检查钱包余额

确保钱包中有足够的资金：

- **USDC.e 余额**：至少 $10（建议 $50-100）
- **MATIC 余额**：至少 0.1 MATIC（用于 Gas 费）

### 方案 4：更新代码并重启

代码已改进，包含更详细的授权检查和重试机制：

```bash
# 在服务器上
cd ~/projects/poly-copy-trading
git pull origin main
pnpm install
pm2 restart poly-copy-trading
pm2 logs poly-copy-trading --lines 50
```

## 检查清单

运行脚本前，请确认：

- [ ] 钱包中有足够的 USDC.e 余额（至少 $10）
- [ ] 钱包中有足够的 MATIC 余额（至少 0.1 MATIC）
- [ ] `.env` 文件中 `SKIP_APPROVAL_CHECK` 未设置或为 `false`
- [ ] `.env` 文件中 `SKIP_BALANCE_CHECK` 未设置或为 `false`
- [ ] 授权逻辑已执行并成功（查看日志）

## 查看日志

运行脚本后，查看授权相关的日志：

```bash
# 应该看到类似以下内容：
🔐 正在检查并授权 USDC.e...
✅ USDC.e 已授权

# 或
⚠️  需要授权，问题: ...
正在授权 USDC.e...
✅ 授权交易已提交
   等待交易确认（约 10-15 秒）...
   验证授权状态...
✅ USDC.e 授权验证成功
```

## 如果仍然失败

1. **检查网络连接**
   - 确保服务器可以访问 Polygon 网络
   - 检查 RPC 节点是否正常

2. **检查私钥**
   - 确认 `.env` 中的 `POLYMARKET_PRIVATE_KEY` 正确
   - 确认私钥对应的钱包有资金

3. **手动授权**
   - 在 Polymarket 网站上手动授权
   - 然后设置 `SKIP_APPROVAL_CHECK=true` 跳过检查

4. **查看详细错误**
   - 运行 `pm2 logs poly-copy-trading --lines 100`
   - 查找具体的错误信息

## 临时解决方案

如果急需运行，可以临时跳过检查（不推荐）：

```bash
# 在 .env 文件中添加（仅临时使用）
SKIP_APPROVAL_CHECK=true
SKIP_BALANCE_CHECK=true
```

**注意**：这不会解决余额或授权不足的问题，只是跳过检查。如果余额或授权不足，交易仍会失败。
