# 修改参数指南

## 快速修改参数

### 方法 1：使用交互式工具（推荐）

运行参数配置工具：

```bash
pnpm modify-params
```

工具会显示：
1. 当前配置
2. 参数选择菜单
3. 推荐配置选项
4. 参数说明

### 方法 2：直接编辑 .env 文件

编辑项目根目录下的 `.env` 文件：

```env
# ===== 15分钟市场暴跌套利策略配置 =====
COIN=ETH
SLIDING_WINDOW_MS=3000
DIP_THRESHOLD=0.3
SUM_TARGET=0.95
LEG2_TIMEOUT_SECONDS=100
```

## 参数说明

### COIN（币种）
- **默认值**：`ETH`
- **可选值**：`ETH`, `BTC` 等
- **说明**：选择要监控的市场

### SLIDING_WINDOW_MS（滑动窗口）
- **默认值**：`3000`（3秒）
- **推荐值**：2000-5000（毫秒）
- **说明**：检测暴跌的时间窗口

### DIP_THRESHOLD（暴跌阈值）
- **默认值**：`0.3`（30%）
- **推荐值**：0.25-0.35
- **说明**：触发买入的暴跌幅度

### SUM_TARGET（成本目标）
- **默认值**：`0.95`（5%利润）
- **推荐值**：0.90-0.97
- **说明**：Leg2 的利润目标

### LEG2_TIMEOUT_SECONDS（止损时间）
- **默认值**：`100`（100秒）
- **推荐值**：60-120（秒）
- **说明**：Leg2 超时时间

## 推荐配置

### 保守配置

```env
COIN=ETH
SLIDING_WINDOW_MS=3000
DIP_THRESHOLD=0.25
SUM_TARGET=0.93
LEG2_TIMEOUT_SECONDS=120
```

### 中等配置（推荐）

```env
COIN=ETH
SLIDING_WINDOW_MS=3000
DIP_THRESHOLD=0.3
SUM_TARGET=0.95
LEG2_TIMEOUT_SECONDS=100
```

## 使用交互式工具

运行：

```bash
pnpm modify-params
```

然后按照提示操作：

1. 查看当前配置
2. 选择要修改的参数（1-8）
3. 输入新值
4. 保存配置

### 工具功能

- ✅ 显示当前配置
- ✅ 逐个修改参数
- ✅ 应用推荐配置（保守/中等）
- ✅ 查看参数说明
- ✅ 自动保存到 .env 文件

## 在服务器上修改

### 方法 1：使用工具

```bash
cd ~/projects/poly-copy-trading
pnpm modify-params
```

### 方法 2：直接编辑

```bash
cd ~/projects/poly-copy-trading
nano .env
# 修改参数后保存（Ctrl+O, Enter, Ctrl+X）
```

### 方法 3：使用 sed 命令

```bash
cd ~/projects/poly-copy-trading

# 修改暴跌阈值
sed -i 's/DIP_THRESHOLD=.*/DIP_THRESHOLD=0.25/' .env

# 修改成本目标
sed -i 's/SUM_TARGET=.*/SUM_TARGET=0.93/' .env

# 修改止损时间
sed -i 's/LEG2_TIMEOUT_SECONDS=.*/LEG2_TIMEOUT_SECONDS=120/' .env
```

## 修改后重启

修改参数后，需要重启应用：

```bash
# 如果使用 PM2
pm2 restart dip-arb-15m

# 或者直接运行
pnpm dip-arb
```

## 验证配置

运行策略时，会显示当前配置：

```
📋 配置信息：
   模式: 💰 实盘模式
   币种: ETH
   市场周期: 15分钟
   Leg1 滑动窗口: 3000ms (3秒)
   Leg1 暴跌阈值: 30%
   Leg2 成本目标: 0.95 USDC (获得 1 USDC)
   Leg2 止损时间: 100秒
```

## 相关文档

- [详细参数指南](./DIP_ARB_PARAMS_GUIDE.md)
- [策略使用指南](./DIP_ARB_GUIDE.md)
