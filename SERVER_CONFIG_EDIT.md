# 服务器上修改参数配置指南

## 快速步骤

### 1. 连接到服务器

```bash
ssh root@你的服务器IP
# 或使用密钥
ssh -i 你的密钥文件.pem root@你的服务器IP
```

### 2. 进入项目目录

```bash
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading
```

### 3. 编辑配置文件

使用您喜欢的编辑器编辑 `src/index.ts` 文件：

#### 使用 nano（推荐，简单易用）

```bash
nano src/index.ts
```

#### 使用 vi/vim

```bash
vi src/index.ts
```

### 4. 找到配置参数位置

在文件中找到 `copyTradingOptions` 对象（大约在第 112-121 行）：

```typescript
const copyTradingOptions = {
  sizeScale: 0.2,          // 跟随 20% 规模
  maxSizePerTrade: 100,    // 最大单笔 $100
  maxSlippage: 0.05,       // 最大滑点 5%
  orderType: 'FOK' as const, // Fill or Kill
  minTradeSize: 1,         // 最小交易 $1
  dryRun,                  // 模拟模式
  ...(targetAddresses && targetAddresses.length > 0 
    ? { targetAddresses } 
    : { topN: 50 }),       // 如果没有指定地址，则跟随前 50 名
```

### 5. 修改参数

修改您需要的参数值，例如：

```typescript
sizeScale: 0.1,          // 改为跟随 10%
maxSizePerTrade: 50,     // 改为最大 $50
maxSlippage: 0.03,       // 改为 3% 滑点
minTradeSize: 5,         // 改为最小 $5
```

### 6. 保存文件

**nano 编辑器：**
- 按 `Ctrl + O` 保存
- 按 `Enter` 确认文件名
- 按 `Ctrl + X` 退出

**vi/vim 编辑器：**
- 按 `i` 进入编辑模式
- 修改完成后，按 `Esc` 退出编辑模式
- 输入 `:wq` 保存并退出
- 或 `:q!` 不保存退出

### 7. 同时更新打印信息（可选）

如果您修改了参数值，建议同时更新 `printConfig()` 函数中的显示信息（约第 51-55 行），确保启动时显示正确的配置：

```typescript
console.log(`   跟随规模: 20% (sizeScale: 0.2)`);
console.log(`   最大单笔金额: $100 USDC`);
console.log(`   最大滑点: 5%`);
console.log(`   最小交易金额: $1 USDC`);
```

### 8. 重启应用

#### 如果使用 PM2（推荐）

```bash
# 重启应用
pm2 restart poly-copy-trading

# 查看日志确认运行正常
pm2 logs poly-copy-trading --lines 50
```

#### 如果使用 nohup

```bash
# 找到进程ID
ps aux | grep "tsx src/index.ts"

# 停止进程（替换 PID 为实际进程ID）
kill <PID>

# 重新启动
cd ~/projects/poly-copy-trading
nohup pnpm start > output.log 2>&1 &

# 查看日志
tail -f output.log
```

### 9. 验证配置

查看启动日志，确认配置已生效：

```bash
# PM2
pm2 logs poly-copy-trading --lines 30

# nohup
tail -30 output.log
```

应该看到更新后的配置信息：

```
📋 配置信息：
   模式: 🔍 模拟模式 (Dry Run)
   跟随规模: XX% (sizeScale: X.X)  ← 检查这里
   最大单笔金额: $XX USDC          ← 检查这里
   最大滑点: X%                    ← 检查这里
   最小交易金额: $X USDC           ← 检查这里
```

## 使用 sed 快速修改（高级）

如果您熟悉命令行，可以使用 `sed` 命令快速修改：

```bash
# 修改 sizeScale 为 0.1
sed -i 's/sizeScale: 0\.2,/sizeScale: 0.1,/g' src/index.ts

# 修改 maxSizePerTrade 为 50
sed -i 's/maxSizePerTrade: 100,/maxSizePerTrade: 50,/g' src/index.ts

# 修改 maxSlippage 为 0.03
sed -i 's/maxSlippage: 0\.05,/maxSlippage: 0.03,/g' src/index.ts

# 修改 minTradeSize 为 5
sed -i 's/minTradeSize: 1,/minTradeSize: 5,/g' src/index.ts
```

**注意**：使用 sed 修改后，建议检查文件确保修改正确：
```bash
grep -A 5 "copyTradingOptions" src/index.ts
```

## 配置示例

### 保守配置

```typescript
const copyTradingOptions = {
  sizeScale: 0.1,          // 跟随 10%
  maxSizePerTrade: 10,     // 最大 $10
  maxSlippage: 0.03,       // 3% 滑点
  orderType: 'FOK' as const,
  minTradeSize: 5,         // 最小 $5
  // ...
};
```

### 中等配置（当前）

```typescript
const copyTradingOptions = {
  sizeScale: 0.2,          // 跟随 20%
  maxSizePerTrade: 100,    // 最大 $100
  maxSlippage: 0.05,       // 5% 滑点
  orderType: 'FOK' as const,
  minTradeSize: 1,         // 最小 $1
  // ...
};
```

### 激进配置

```typescript
const copyTradingOptions = {
  sizeScale: 0.5,          // 跟随 50%
  maxSizePerTrade: 500,    // 最大 $500
  maxSlippage: 0.08,       // 8% 滑点
  orderType: 'FAK' as const,
  minTradeSize: 1,         // 最小 $1
  // ...
};
```

## 完整操作流程示例

```bash
# 1. 连接服务器
ssh root@your-server-ip

# 2. 进入项目目录
cd ~/projects/poly-copy-trading

# 3. 备份当前文件（推荐）
cp src/index.ts src/index.ts.backup

# 4. 编辑文件
nano src/index.ts

# 5. 找到并修改参数（在 nano 中）
# - 使用方向键导航
# - 直接编辑
# - Ctrl+O 保存，Ctrl+X 退出

# 6. 验证语法（可选）
pnpm typecheck

# 7. 重启应用
pm2 restart poly-copy-trading

# 8. 查看日志
pm2 logs poly-copy-trading --lines 50
```

## 修改 .env 文件参数

某些参数也可以通过 `.env` 文件配置：

```bash
# 编辑 .env 文件
nano .env

# 修改 DRY_RUN（模拟/真实模式）
DRY_RUN=false

# 修改跟随目标地址（可选）
TARGET_ADDRESSES=0x1234...,0x5678...

# 保存后重启应用
pm2 restart poly-copy-trading
```

## 故障排除

### 修改后应用无法启动

```bash
# 检查语法错误
pnpm typecheck

# 查看详细错误日志
pm2 logs poly-copy-trading --err --lines 50

# 如果修改错误，恢复备份
cp src/index.ts.backup src/index.ts
pm2 restart poly-copy-trading
```

### 配置未生效

1. 确认已保存文件
2. 确认已重启应用
3. 检查日志中的配置信息
4. 确认修改的是正确的代码位置

### 需要回退更改

```bash
# 如果有备份
cp src/index.ts.backup src/index.ts
pm2 restart poly-copy-trading

# 或使用 Git 回退
git checkout src/index.ts
pm2 restart poly-copy-trading
```

## 最佳实践

1. **修改前备份**
   ```bash
   cp src/index.ts src/index.ts.backup
   ```

2. **先在模拟模式测试**
   - 确保 `.env` 中 `DRY_RUN=true`
   - 观察新参数的效果
   - 确认无误后再切换真实模式

3. **逐步调整**
   - 不要一次性大幅修改所有参数
   - 每次修改一个或几个参数
   - 观察效果后再继续调整

4. **记录更改**
   - 记录参数修改历史
   - 记录修改原因和效果
   - 便于后续优化

5. **监控效果**
   - 修改后密切关注交易表现
   - 查看日志和统计数据
   - 根据实际情况继续优化

## 常用命令速查

```bash
# 连接服务器
ssh root@your-server-ip

# 进入项目目录
cd ~/projects/poly-copy-trading

# 编辑配置文件
nano src/index.ts

# 查看当前配置（查看代码）
grep -A 10 "copyTradingOptions" src/index.ts

# 重启应用（PM2）
pm2 restart poly-copy-trading

# 查看日志（PM2）
pm2 logs poly-copy-trading --lines 50

# 查看应用状态
pm2 status

# 实时查看日志
pm2 logs poly-copy-trading --follow
```

---

**提示**：修改参数后，建议先在模拟模式下测试，确认无误后再切换到真实交易模式！
