# 服务器更新回收脚本

## 快速更新步骤

在服务器上执行：

```bash
cd ~/projects/poly-copy-trading
git pull origin main
pnpm install
pnpm redeem
```

## 如果遇到 Git 冲突

如果 `git pull` 失败，执行：

```bash
cd ~/projects/poly-copy-trading

# 保存或放弃本地更改
git stash
# 或
git restore package.json

# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install

# 运行回收脚本
pnpm redeem
```

## 最新修复内容

- 修复了赎回 API 调用，现在只传递 tokenId 字符串参数（而不是对象）
- 改进了错误处理，提供更清晰的错误信息
- 添加了代币ID和方向索引的显示

## 注意事项

如果所有持仓都显示"交易被回退"错误，这可能意味着：

1. **持有的是失败方向的代币**：在 Polymarket 中，只有获胜方向的代币才能赎回
   - 如果市场结算结果是 Up/Yes，只有 Up/Yes 代币可以赎回
   - 如果市场结算结果是 Down/No，只有 Down/No 代币可以赎回
   - 失败方向的代币无法赎回（这是正常情况）

2. **代币已被赎回**：如果代币已经被赎回，再次尝试会失败

3. **市场尚未完全结算**：可能需要等待更长时间

如果这些代币确实无法赎回，你可以：
- 在市场上卖出这些代币（如果还有流动性）
- 或者接受损失（这是交易的一部分）
