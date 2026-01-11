# 切换到实盘交易模式

## ⚠️ 重要警告

切换到实盘交易模式后，脚本将使用**真实资金**进行交易。请务必：

1. ✅ **充分测试模拟模式** - 在模拟模式下运行足够长的时间，确认一切正常
2. ✅ **检查钱包余额** - 确保钱包中有足够的 USDC.e 余额
3. ✅ **理解风险** - 了解自动跟单的风险，可能产生亏损
4. ✅ **检查参数** - 确认风险控制参数符合您的风险承受能力
5. ✅ **监控交易** - 切换到真实模式后，密切关注交易情况

## 快速切换步骤

### 方法 1：编辑 .env 文件（推荐）

#### 在本地（Windows）

1. **打开 `.env` 文件**
   - 在 Cursor/VS Code 中打开项目根目录的 `.env` 文件

2. **修改配置**
   找到或添加以下行：
   ```env
   DRY_RUN=false
   ```

3. **完整 .env 文件示例**：
   ```env
   POLYMARKET_PRIVATE_KEY=你的真实私钥
   DRY_RUN=false
   
   # 可选：指定要跟随的钱包地址
   # TARGET_ADDRESSES=0x1234...,0x5678...
   ```

4. **保存文件**（Ctrl+S）

5. **重启应用**（如果正在运行）

#### 在服务器（Linux）

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 编辑 .env 文件
nano .env

# 3. 修改或添加：
#    DRY_RUN=false

# 4. 保存（nano: Ctrl+O, Enter, Ctrl+X）

# 5. 重启应用（如果使用 PM2）
pm2 restart poly-copy-trading

# 6. 查看日志确认
pm2 logs poly-copy-trading --lines 30
```

### 方法 2：使用命令行（Linux/Mac）

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 使用 sed 命令修改
sed -i 's/DRY_RUN=true/DRY_RUN=false/g' .env

# 或者如果不存在，添加一行
if ! grep -q "DRY_RUN" .env; then
    echo "DRY_RUN=false" >> .env
fi

# 验证修改
grep DRY_RUN .env

# 重启应用
pm2 restart poly-copy-trading
```

### 方法 3：使用 PowerShell（Windows）

```powershell
# 进入项目目录
cd J:\poly-copy-trading

# 读取文件内容
$content = Get-Content .env

# 替换或添加 DRY_RUN
if ($content -match 'DRY_RUN') {
    $content = $content -replace 'DRY_RUN=true', 'DRY_RUN=false'
    $content = $content -replace 'DRY_RUN=false', 'DRY_RUN=false'  # 确保是 false
} else {
    $content += "DRY_RUN=false"
}

# 保存文件
$content | Set-Content .env

# 验证
Get-Content .env | Select-String DRY_RUN
```

## 验证配置

切换后，运行脚本时应该看到：

```
📋 配置信息：
   模式: 💰 实盘模式  ← 这里应该显示"实盘模式"而不是"模拟模式"
```

如果还是显示"🔍 模拟模式 (Dry Run)"，说明配置未生效，请检查：

1. `.env` 文件是否正确保存
2. 是否重启了应用
3. `.env` 文件中的值是否为 `DRY_RUN=false`（注意大小写和拼写）

## 当前风险控制参数

在切换到实盘模式前，确认当前参数：

- **跟随规模**: 20% (sizeScale: 0.2)
- **最大单笔金额**: $100 USDC
- **最大滑点**: 5%
- **最小交易金额**: $1 USDC
- **订单类型**: FOK (Fill or Kill)

如需修改这些参数，请参考 `CONFIG_PARAMS.md` 和 `SERVER_CONFIG_EDIT.md`。

## 切换回模拟模式

如果需要在测试或遇到问题时切换回模拟模式：

```env
DRY_RUN=true
```

然后重启应用。

## 安全建议

### 首次切换到真实模式

1. ✅ **先运行几分钟观察**
   - 启动后密切观察日志
   - 检查交易是否正确执行
   - 确认金额符合预期

2. ✅ **监控交易**
   - 查看每笔交易的详细信息
   - 确认交易状态（成功/失败）
   - 检查交易金额和方向

3. ✅ **检查钱包余额**
   - 定期检查钱包 USDC.e 余额
   - 确保有足够资金继续交易
   - 设置余额告警（如果可能）

### 风险控制

- ✅ 设置合理的最大单笔金额
- ✅ 不要使用超过您能承受损失的资金
- ✅ 考虑设置每日/每周交易限额
- ✅ 定期审查跟单策略和表现

### 紧急停止

如果需要立即停止交易：

**使用 PM2：**
```bash
pm2 stop poly-copy-trading
```

**使用 nohup：**
```bash
ps aux | grep "tsx src/index.ts"
kill <进程ID>
```

**前台运行：**
按 `Ctrl+C`

## 完整切换流程检查清单

- [ ] 已在模拟模式下充分测试
- [ ] 确认风险控制参数符合风险承受能力
- [ ] 钱包中有足够的 USDC.e 余额
- [ ] 理解自动跟单的风险
- [ ] 编辑 `.env` 文件，设置 `DRY_RUN=false`
- [ ] 保存 `.env` 文件
- [ ] 重启应用
- [ ] 查看启动日志，确认显示"💰 实盘模式"
- [ ] 监控前几笔交易
- [ ] 确认交易执行正常

## 常见问题

### Q: 如何知道当前是模拟模式还是真实模式？

A: 查看启动日志，会显示：
- `🔍 模拟模式 (Dry Run)` - 模拟模式
- `💰 实盘模式` - 真实模式

### Q: 切换后需要重启应用吗？

A: 是的，必须重启应用才能应用新的配置。

**PM2:**
```bash
pm2 restart poly-copy-trading
```

**nohup:**
```bash
ps aux | grep "tsx"
kill <PID>
nohup pnpm start > output.log 2>&1 &
```

**本地运行:**
按 `Ctrl+C` 停止，然后重新运行 `pnpm start`

### Q: 真实模式下会有什么不同？

A:
- **模拟模式**: 只记录和显示交易，不执行真实交易，不使用真实资金
- **真实模式**: 会真实执行交易，使用真实资金，会产生真实的盈亏

### Q: 可以同时运行模拟和真实模式吗？

A: 不建议。应该选择一种模式运行。如果想对比，可以在不同时间运行或使用不同的配置。

### Q: 切换真实模式后立即有交易吗？

A: 不一定。交易取决于：
- 被跟随的交易者是否进行交易
- 交易是否符合您的过滤条件（最小金额、滑点等）
- 市场活动情况

## 监控建议

切换到真实模式后，建议：

1. **实时监控日志**
   ```bash
   pm2 logs poly-copy-trading --follow
   ```

2. **检查交易记录**
   - 查看日志中的每笔交易
   - 确认交易金额和方向
   - 检查交易状态（成功/失败）

3. **监控钱包余额**
   - 定期检查钱包 USDC.e 余额
   - 确保有足够资金继续交易

4. **评估表现**
   - 跟踪跟单表现
   - 评估是否达到预期
   - 考虑调整参数或策略

---

**记住：交易有风险，投资需谨慎！请确保充分理解风险后再切换到真实交易模式！**
