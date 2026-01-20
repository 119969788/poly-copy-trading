# 修复 CLOB Token ID 404 错误

## 问题描述

程序报错：
```
CLOB /book?token_id=... 404：No orderbook exists for the requested token id
```

这通常是因为使用的 token_id 不是正确的 `clobTokenIds`。

## 解决方案

### 1. 检查市场数据

在服务器上运行：

```bash
curl -s "https://gamma-api.polymarket.com/markets?slug=eth-updown-15m-1768877100"
```

查找以下字段：
- `"conditionId": "..."` 
- `"clobTokenIds": [...]`
- `"outcomes": ...`

### 2. 清理 .env 文件

确保 `.env` 文件格式正确：

```env
# 必需：私钥
POLYMARKET_PRIVATE_KEY=你的私钥

# 套利策略配置
ARBITRAGE_BUY_PRICE=0.80
ARBITRAGE_SELL_PRICE=0.90
ARBITRAGE_MARKET_COIN=ETH
ARBITRAGE_TRADE_SIZE=10
ARBITRAGE_CHECK_INTERVAL=5000
ARBITRAGE_HOLDING_TIMEOUT=900000

# 事件 slug（可选，如果设置会优先使用）
ARBITRAGE_EVENT_SLUG=eth-updown-15m-1768877100

# 模拟模式
DRY_RUN=true
```

**注意**：
- 不要重复设置 `ARBITRAGE_EVENT_SLUG`
- 确保私钥格式正确

### 3. 代码修复

代码已修复，现在会：
- ✅ **只使用 `clobTokenIds`**（官方 CLOB 代币ID）
- ✅ **不从 `outcomes` 推断 tokenId**
- ✅ **验证 tokenId 格式**（必须是纯数字字符串）
- ✅ **如果 clobTokenIds 不存在，直接报错**（不猜测）

### 4. 验证修复

更新代码后运行：

```bash
cd /root/poly-copy-trading
git pull origin main
npm run arbitrage-15m
```

检查日志中是否显示：
```
✅ 使用 clobTokenIds（官方 CLOB 代币ID）
   Token 0: 9083486101485271... (Yes)
   Token 1: 5934961671707836... (No)
```

如果 tokenId 格式正确，应该不会再出现 404 错误。

## 如果仍然出现 404

可能的原因：
1. **市场已关闭**：15分钟市场已到期，订单簿不存在
   - 解决：更新 `ARBITRAGE_EVENT_SLUG` 为新的活跃市场

2. **市场还未开始交易**：市场存在但还未开始
   - 解决：等待市场开始，或使用其他市场

3. **Token ID 仍然不正确**：虽然代码已修复，但市场数据可能有问题
   - 解决：手动验证 `clobTokenIds` 是否正确

## 手动验证 Token ID

```bash
# 获取市场数据
curl -s "https://gamma-api.polymarket.com/markets?slug=eth-updown-15m-1768877100" | grep -A 5 "clobTokenIds"

# 验证订单簿是否存在
curl -s "https://clob.polymarket.com/book?token_id=90834861014852715753820580140737836519720652159432165389737359533362721017586"
```

如果订单簿返回 404，说明：
- Token ID 不正确，或
- 市场已关闭/未开始
