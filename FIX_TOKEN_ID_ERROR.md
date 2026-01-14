# 🔧 修复：代币ID不存在错误

## ⚠️ 错误信息
```
卖出持仓 #1/8
   市场: 0x4b03526f42f46c0e74da490548e43441eea184ff1fc88e01e2d240aec8b17bb7
   条件ID: 0x4b03526f42f46c0e74da490548e43441eea184ff1fc88e01e2d240aec8b17bb7
   代币ID: N/A
   数量: 43.9706
   方向: Down
   状态: ❌ 失败
   错误: 代币ID不存在
```

## ✅ 问题原因

持仓数据包含 `conditionId` 和 `direction`，但缺少 `tokenId` 字段。SDK 的出售功能需要 `tokenId` 才能执行交易。

## 🔍 可能的原因

1. **SDK 返回的持仓数据格式不同**：不同版本的 SDK 可能返回不同格式的持仓数据
2. **需要使用不同的字段名**：可能 tokenId 存储在 `positionId`、`collectionId` 或其他字段中
3. **SDK 方法不同**：可能需要使用不同的方法来获取或使用持仓信息

## 🔧 解决方案

### 方案 1：检查 SDK 版本和文档

查看 SDK 文档，确认：
- 持仓数据的正确字段名
- 如何从 conditionId 和 direction 获取 tokenId
- 是否有其他出售方法

### 方案 2：查看完整持仓数据结构

代码已更新，会在第一个持仓时打印完整的数据结构，以便调试：

```typescript
// 在 batch-sell.ts 中已添加调试信息
if (!tokenId && i === 0) {
  console.log(`   ⚠️  调试信息（第一个持仓的完整数据）:`);
  console.log(`   ${JSON.stringify(position, null, 2)}`);
}
```

### 方案 3：使用不同的 SDK 方法

尝试使用 SDK 的其他方法：

```typescript
// 可能的替代方法：
// 1. 使用 conditionId 和 outcome
sdk.sell({ conditionId, outcome: 0, amount, ... })

// 2. 使用 marketId 和 side
sdk.sell({ marketId, side: 'SELL', amount, ... })

// 3. 使用不同的获取持仓方法
const positions = await sdk.getPositions({ includeTokenId: true });
```

## 📝 已更新的代码

代码已更新以：
1. 尝试多种可能的 tokenId 字段名（tokenId, id, positionId, collectionId）
2. 添加调试信息显示完整的持仓数据
3. 改进错误提示

## 🔍 调试步骤

1. **运行批量出售（模拟模式）**：
   ```bash
   npx tsx src/batch-sell.ts
   ```

2. **查看第一个持仓的完整数据**：
   代码会打印第一个持仓的完整 JSON 数据

3. **根据实际数据格式调整代码**：
   - 查看打印出的 JSON 数据
   - 找到 tokenId 或类似的字段
   - 更新代码以使用正确的字段名

## 💡 临时解决方案

如果无法找到 tokenId，可以：

1. **手动出售**：在 Polymarket 网站上手动出售这些持仓
2. **联系 SDK 支持**：查看 SDK 文档或 GitHub Issues
3. **使用不同的 SDK 方法**：尝试使用条件ID和方向的其他出售方法

## 📚 相关资源

- Polymarket SDK 文档
- GitHub Issues
- SDK 源码

---

## ⚠️ 重要提示

请先运行模拟模式查看调试信息，然后再尝试真实出售！
