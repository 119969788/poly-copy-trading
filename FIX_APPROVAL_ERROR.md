# 修复授权失败错误

## 常见授权失败原因

授权失败通常由以下原因引起：

1. **MATIC 余额不足**：无法支付 Gas 费
2. **网络连接问题**：无法连接到 Polygon 网络
3. **交易超时**：交易确认时间过长
4. **授权合约地址错误**：目标合约地址不正确
5. **已授权但验证失败**：授权成功但验证时网络延迟

## 快速修复步骤

### 步骤 1：检查钱包余额

```bash
cd ~/projects/poly-copy-trading
pnpm start
```

查看输出中的余额信息：
- **USDC.e 余额**：建议至少 $10 USDC
- **MATIC 余额**：建议至少 0.1 MATIC（用于 Gas 费）

### 步骤 2：手动授权（推荐）

如果自动授权失败，可以手动授权：

```bash
cd ~/projects/poly-copy-trading
pnpm approve
```

这个命令会：
- 检查余额
- 检查当前授权状态
- 执行授权交易
- 验证授权结果

### 步骤 3：跳过授权检查（临时方案）

如果已经授权过，可以临时跳过授权检查：

编辑 `.env` 文件：

```bash
nano ~/projects/poly-copy-trading/.env
```

添加或修改：

```env
SKIP_APPROVAL_CHECK=true
```

保存文件并重启应用：

```bash
pm2 restart poly-copy-trading
```

## 详细解决方案

### 方案 1：检查并充值 MATIC

**问题**：MATIC 余额不足，无法支付 Gas 费

**解决方法**：

1. **检查 MATIC 余额**：

```bash
# 运行应用查看余额
pnpm start
```

2. **如果余额不足，充值 MATIC**：

- 从交易所（如 Binance、Coinbase）购买 MATIC
- 将 MATIC 发送到你的钱包地址
- 建议至少充值 0.1-0.5 MATIC

3. **验证余额**：

```bash
# 重新运行应用
pnpm start
```

### 方案 2：手动授权 USDC.e

**问题**：自动授权失败或超时

**解决方法**：

1. **使用授权脚本**：

```bash
cd ~/projects/poly-copy-trading
pnpm approve
```

2. **如果脚本也失败，检查网络**：

```bash
# 测试网络连接
ping google.com
curl -I https://polygonscan.com
```

3. **查看详细错误信息**：

```bash
# 查看完整日志
pnpm start 2>&1 | tee approval-log.txt
```

### 方案 3：跳过授权检查

**问题**：已经授权过，但验证失败

**解决方法**：

1. **编辑 .env 文件**：

```bash
nano ~/projects/poly-copy-trading/.env
```

2. **添加跳过授权检查**：

```env
# 跳过授权检查（如果已经授权过）
SKIP_APPROVAL_CHECK=true
```

3. **保存并重启**：

```bash
pm2 restart poly-copy-trading
pm2 logs poly-copy-trading
```

### 方案 4：检查授权合约地址

**问题**：授权给错误的合约地址

**解决方法**：

1. **检查当前授权地址**：

```bash
cat ~/projects/poly-copy-trading/.env | grep APPROVE_CONTRACT_ADDRESS
```

2. **默认合约地址**（Polymarket CTF）：

```
0x4d97dcd97ec945f40cf65f87097ace5ea0476045
```

3. **如果需要修改，编辑 .env**：

```bash
nano ~/projects/poly-copy-trading/.env
```

添加：

```env
APPROVE_CONTRACT_ADDRESS=0x4d97dcd97ec945f40cf65f87097ace5ea0476045
```

4. **重新授权**：

```bash
pnpm approve
```

### 方案 5：增加重试和等待时间

**问题**：网络延迟导致授权验证失败

**解决方法**：

代码已经包含自动重试机制（最多 3 次），如果仍然失败：

1. **检查网络连接**：

```bash
# 测试网络
ping 8.8.8.8
curl -I https://polygonscan.com
```

2. **等待更长时间**：

授权交易通常需要 10-15 秒确认，如果网络较慢，可能需要更长时间。

3. **手动验证授权**：

访问 [Polygonscan](https://polygonscan.com)，搜索你的钱包地址，查看最近的授权交易。

## 使用授权脚本

项目包含专门的授权脚本，可以更详细地处理授权：

```bash
cd ~/projects/poly-copy-trading
pnpm approve
```

这个脚本会：
- ✅ 显示详细的余额信息
- ✅ 检查当前授权状态
- ✅ 执行授权并显示交易哈希
- ✅ 等待交易确认
- ✅ 验证授权结果

## 验证授权是否成功

### 方法 1：查看应用日志

```bash
pm2 logs poly-copy-trading --lines 50
```

查找以下信息：
- `✅ USDC.e 已授权`
- `✅ 授权验证成功`

### 方法 2：使用授权脚本验证

```bash
pnpm approve
```

如果显示 `✅ 授权验证成功`，说明授权已完成。

### 方法 3：在 Polygonscan 上查看

1. 访问 [Polygonscan](https://polygonscan.com)
2. 搜索你的钱包地址
3. 查看 "Token" 标签页
4. 找到 USDC.e 的授权记录

## 常见错误信息

### 错误 1：MATIC 余额不足

```
❌ 错误: MATIC 余额不足，无法支付 Gas 费
```

**解决方法**：充值 MATIC 到钱包

### 错误 2：授权交易失败

```
❌ 授权交易失败: ...
```

**解决方法**：
1. 检查网络连接
2. 检查 MATIC 余额
3. 重试授权

### 错误 3：授权验证失败

```
⚠️  授权验证失败，将在 X 秒后重试...
```

**解决方法**：
1. 等待更长时间（网络可能较慢）
2. 检查 Polygonscan 确认交易是否成功
3. 如果已授权，设置 `SKIP_APPROVAL_CHECK=true`

### 错误 4：网络连接问题

```
Error: network error
```

**解决方法**：
1. 检查服务器网络连接
2. 检查防火墙设置
3. 尝试使用 VPN 或代理

## 预防措施

1. **保持足够的 MATIC**：
   - 建议至少保持 0.1-0.5 MATIC
   - 用于支付 Gas 费

2. **定期检查授权状态**：
   - 授权是永久性的，通常只需要一次
   - 如果授权被撤销，需要重新授权

3. **使用跳过授权选项**：
   - 如果已经授权过，设置 `SKIP_APPROVAL_CHECK=true`
   - 可以加快启动速度

## 环境变量配置

在 `.env` 文件中可以配置以下选项：

```env
# 跳过授权检查（如果已经授权过）
SKIP_APPROVAL_CHECK=true

# 跳过余额检查（加快启动速度）
SKIP_BALANCE_CHECK=true

# 授权目标合约地址（默认是 CTF 合约）
APPROVE_CONTRACT_ADDRESS=0x4d97dcd97ec945f40cf65f87097ace5ea0476045
```

## 相关文档

- [授权合约指南](./APPROVE_CONTRACT_GUIDE.md) - 详细授权说明
- [修复余额/授权错误](./FIX_BALANCE_ALLOWANCE.md) - 余额相关问题
- [快速修复指南](./FIX_BALANCE_ALLOWANCE_QUICK.md) - 快速修复步骤

## 仍然无法解决？

如果以上方法都无法解决授权问题，请：

1. **检查完整错误日志**：

```bash
pm2 logs poly-copy-trading --err --lines 100
```

2. **手动运行授权脚本**：

```bash
pnpm approve
```

3. **检查网络和余额**：

```bash
# 检查网络
ping 8.8.8.8

# 检查余额（运行应用）
pnpm start
```

4. **在 Polygonscan 上手动验证**：
   - 访问 https://polygonscan.com
   - 搜索你的钱包地址
   - 查看最近的授权交易
