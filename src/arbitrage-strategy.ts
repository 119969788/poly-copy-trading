// 15分钟套利策略
// 赔率80买（价格<=0.80买入），90卖（价格>=0.90卖出）

import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 套利策略配置
const BUY_PRICE = parseFloat(process.env.ARBITRAGE_BUY_PRICE || '0.80');  // 买入价格阈值
const SELL_PRICE = parseFloat(process.env.ARBITRAGE_SELL_PRICE || '0.90'); // 卖出价格阈值
const CHECK_INTERVAL = parseInt(process.env.ARBITRAGE_CHECK_INTERVAL || '60000'); // 检查间隔（毫秒，默认60秒）
const HOLDING_TIMEOUT = parseInt(process.env.ARBITRAGE_HOLDING_TIMEOUT || '900000'); // 持仓超时（毫秒，默认15分钟=900000）
const TOKEN_ID = process.env.ARBITRAGE_TOKEN_ID || ''; // 要监控的代币ID
const DRY_RUN = process.env.DRY_RUN !== 'false'; // 模拟模式

// SDK 变量（将在初始化函数中设置）
let sdk: any = null;

// 持仓记录
interface PositionRecord {
  tokenId: string;
  buyPrice: number;
  buyTime: Date;
  amount: number;
  marketId?: string;
}

const positions = new Map<string, PositionRecord>(); // tokenId -> PositionRecord

// 初始化 SDK - 尝试多种导入方式
async function initializeSDK() {
  try {
    // 方式1: 尝试使用 PolymarketSDK (推荐，与 dip-arb-15m.ts 一致)
    try {
      const { PolymarketSDK } = await import('@catalyst-team/poly-sdk');
      if (PolymarketSDK && typeof PolymarketSDK.create === 'function') {
        sdk = await PolymarketSDK.create({ privateKey });
        console.log('✅ 使用 PolymarketSDK 初始化成功');
        return;
      } else if (PolymarketSDK && typeof PolymarketSDK === 'function') {
        sdk = new PolymarketSDK({ privateKey });
        console.log('✅ 使用 PolymarketSDK (new) 初始化成功');
        return;
      }
    } catch (e) {
      // 继续尝试其他方式
    }

    // 方式2: 尝试使用 PolySDK
    try {
      const { PolySDK } = await import('@catalyst-team/poly-sdk');
      if (PolySDK && typeof PolySDK === 'function') {
        sdk = new PolySDK({ privateKey });
        console.log('✅ 使用 PolySDK 初始化成功');
        return;
      }
    } catch (e) {
      // 继续尝试其他方式
    }

    // 方式3: 尝试使用 default export
    try {
      const sdkModule = await import('@catalyst-team/poly-sdk');
      const SDKClass = sdkModule.default || sdkModule;
      if (SDKClass && typeof SDKClass === 'function') {
        if (typeof SDKClass.create === 'function') {
          sdk = await SDKClass.create({ privateKey });
        } else {
          sdk = new SDKClass({ privateKey });
        }
        console.log('✅ 使用 default export 初始化成功');
        return;
      }
    } catch (e) {
      // 所有方式都失败
    }

    throw new Error('无法初始化 SDK：未找到有效的 SDK 构造函数');
  } catch (error: any) {
    console.error('❌ SDK 初始化失败:', error?.message || error);
    console.error('   请检查 @catalyst-team/poly-sdk 是否正确安装');
    console.error('   可以尝试: npm install @catalyst-team/poly-sdk@latest');
    process.exit(1);
  }
}

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   15分钟套利策略');
  console.log('═══════════════════════════════════════════════════\n');
}

// 打印配置
function printConfig() {
  console.log('📋 策略配置：');
  console.log(`   模式: ${DRY_RUN ? '🔍 模拟模式' : '💰 实盘模式'}`);
  console.log(`   买入价格阈值: $${BUY_PRICE.toFixed(2)}`);
  console.log(`   卖出价格阈值: $${SELL_PRICE.toFixed(2)}`);
  console.log(`   检查间隔: ${CHECK_INTERVAL / 1000} 秒`);
  console.log(`   持仓超时: ${HOLDING_TIMEOUT / 60000} 分钟`);
  if (TOKEN_ID) {
    console.log(`   监控代币: ${TOKEN_ID}`);
  } else {
    console.log(`   监控模式: 所有持仓`);
  }
  console.log('');
}

// 获取市场价格
async function getMarketPrice(tokenId: string): Promise<number | null> {
  if (!sdk) {
    console.error('   ❌ SDK 未初始化');
    return null;
  }

  try {
    // 方法1: 尝试使用 SDK 的 getMarket 方法
    if (typeof (sdk as any).getMarket === 'function') {
      const market = await (sdk as any).getMarket(tokenId);
      if (market && market.price) {
        return parseFloat(market.price.toString());
      }
    }
    
    // 方法2: 尝试从订单簿获取
    if (typeof (sdk as any).getOrderbook === 'function') {
      const orderbook = await (sdk as any).getOrderbook(tokenId);
      if (orderbook && orderbook.bids && orderbook.bids.length > 0) {
        const bestBid = orderbook.bids[0];
        if (bestBid && bestBid.price) {
          return parseFloat(bestBid.price.toString());
        }
      }
    }
    
    // 方法3: 尝试从持仓中获取价格
    try {
      const positions = await getAllPositions();
      // 这里需要根据实际 SDK API 调整
      // 可能需要从持仓数据中获取当前价格
    } catch (e) {
      // 忽略错误
    }
    
    // 如果所有方法都失败，返回 null
    console.warn(`   ⚠️  无法获取价格 (${tokenId})，请检查 SDK API`);
    return null;
  } catch (error: any) {
    console.error(`   ❌ 获取价格失败 (${tokenId}):`, error?.message || error);
    return null;
  }
}

// 买入代币
async function buyToken(tokenId: string, price: number): Promise<boolean> {
  if (!sdk) {
    console.error('   ❌ SDK 未初始化');
    return false;
  }

  try {
    console.log(`\n🛒 买入信号触发`);
    console.log(`   代币ID: ${tokenId}`);
    console.log(`   当前价格: $${price.toFixed(4)}`);
    console.log(`   买入价格阈值: $${BUY_PRICE.toFixed(2)}`);
    
    if (DRY_RUN) {
      console.log(`   🔍 [模拟模式] 将买入代币`);
      // 记录模拟持仓
      positions.set(tokenId, {
        tokenId,
        buyPrice: price,
        buyTime: new Date(),
        amount: 1, // 模拟数量
      });
      return true;
    }
    
    // 实盘买入 - 需要根据实际 SDK API 调整
    // 方法1: 尝试使用 sdk.buy
    if (typeof (sdk as any).buy === 'function') {
      const result = await (sdk as any).buy({
        tokenId,
        price: BUY_PRICE,
        size: 1,
      });
      
      if (result) {
        console.log(`   ✅ 买入成功`);
        positions.set(tokenId, {
          tokenId,
          buyPrice: price,
          buyTime: new Date(),
          amount: 1,
        });
        return true;
      }
    }
    
    // 方法2: 尝试使用 sdk.createOrder 或其他方法
    // 注意：需要根据实际 SDK API 文档调整
    console.log(`   ⚠️  买入功能需要根据 SDK API 实现`);
    console.log(`   请参考 SDK 文档实现买入逻辑`);
    return false;
  } catch (error: any) {
    console.error(`   ❌ 买入错误:`, error?.message || error);
    return false;
  }
}

// 卖出代币
async function sellToken(tokenId: string, position: PositionRecord, currentPrice: number): Promise<boolean> {
  if (!sdk) {
    console.error('   ❌ SDK 未初始化');
    return false;
  }

  try {
    const profit = currentPrice - position.buyPrice;
    const profitPercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
    
    console.log(`\n💰 卖出信号触发`);
    console.log(`   代币ID: ${tokenId}`);
    console.log(`   买入价格: $${position.buyPrice.toFixed(4)}`);
    console.log(`   当前价格: $${currentPrice.toFixed(4)}`);
    console.log(`   卖出价格阈值: $${SELL_PRICE.toFixed(2)}`);
    console.log(`   预期利润: $${profit.toFixed(4)} (${profitPercent.toFixed(2)}%)`);
    
    if (DRY_RUN) {
      console.log(`   🔍 [模拟模式] 将卖出代币`);
      positions.delete(tokenId);
      return true;
    }
    
    // 实盘卖出 - 需要根据实际 SDK API 调整
    // 方法1: 尝试使用 sdk.sell
    if (typeof (sdk as any).sell === 'function') {
      const result = await (sdk as any).sell({
        tokenId,
        price: SELL_PRICE,
        size: position.amount,
      });
      
      if (result) {
        console.log(`   ✅ 卖出成功`);
        positions.delete(tokenId);
        return true;
      }
    }
    
    // 方法2: 尝试使用 batch-sell 中的方法
    // 注意：可以参考 batch-sell.ts 中的卖出逻辑
    console.log(`   ⚠️  卖出功能需要根据 SDK API 实现`);
    console.log(`   请参考 batch-sell.ts 或 SDK 文档实现卖出逻辑`);
    return false;
  } catch (error: any) {
    console.error(`   ❌ 卖出错误:`, error?.message || error);
    return false;
  }
}

// 检查持仓超时
async function checkHoldingTimeout() {
  if (!sdk) {
    return;
  }

  const now = Date.now();
  const timeoutPositions: Array<{ tokenId: string; position: PositionRecord }> = [];
  
  for (const [tokenId, position] of positions.entries()) {
    const holdingTime = now - position.buyTime.getTime();
    if (holdingTime >= HOLDING_TIMEOUT) {
      timeoutPositions.push({ tokenId, position });
    }
  }
  
  // 处理超时持仓
  for (const { tokenId, position } of timeoutPositions) {
    console.log(`\n⏰ 持仓超时（15分钟）`);
    console.log(`   代币ID: ${tokenId}`);
    console.log(`   持仓时间: ${Math.floor((Date.now() - position.buyTime.getTime()) / 60000)} 分钟`);
    
    const currentPrice = await getMarketPrice(tokenId);
      if (currentPrice !== null) {
        await sellToken(tokenId, position, currentPrice);
      } else {
        console.log(`   ⚠️ 无法获取当前价格，强制卖出`);
        if (!DRY_RUN) {
          try {
            // 尝试强制卖出 - 需要根据实际 SDK API 调整
            if (typeof (sdk as any).sell === 'function') {
              await (sdk as any).sell({
                tokenId,
                price: position.buyPrice, // 以买入价卖出，避免亏损
                size: position.amount,
              });
            }
            positions.delete(tokenId);
          } catch (error: any) {
            console.error(`   ❌ 强制卖出失败:`, error?.message || error);
          }
        } else {
          positions.delete(tokenId);
        }
      }
  }
}

// 获取所有持仓
async function getAllPositions(): Promise<string[]> {
  if (!sdk) {
    return [];
  }

  try {
    // 方法1: 尝试使用 sdk.smartMoney.getPositions
    if (typeof (sdk as any).smartMoney?.getPositions === 'function') {
      const userPositions = await (sdk as any).smartMoney.getPositions();
      return userPositions.map((p: any) => p.tokenId || p.id || p.positionId).filter(Boolean);
    }
    
    // 方法2: 尝试使用 sdk.getPositions
    if (typeof (sdk as any).getPositions === 'function') {
      const userPositions = await (sdk as any).getPositions();
      return userPositions.map((p: any) => p.tokenId || p.id || p.positionId).filter(Boolean);
    }
    
    console.warn(`   ⚠️  无法获取持仓，请检查 SDK API`);
    return [];
  } catch (error: any) {
    console.error(`   ❌ 获取持仓失败:`, error?.message || error);
    return [];
  }
}

// 主循环
async function mainLoop() {
  if (!sdk) {
    console.error('   ❌ SDK 未初始化');
    return;
  }

  try {
    // 获取要监控的代币列表
    let tokenIds: string[] = [];
    
    if (TOKEN_ID) {
      // 监控指定代币
      tokenIds = [TOKEN_ID];
    } else {
      // 监控所有持仓
      tokenIds = await getAllPositions();
      // 也监控已有持仓记录
      for (const tokenId of positions.keys()) {
        if (!tokenIds.includes(tokenId)) {
          tokenIds.push(tokenId);
        }
      }
    }
    
    if (tokenIds.length === 0) {
      console.log('   ⏳ 暂无持仓，等待买入机会...');
      return;
    }
    
    // 检查每个代币
    for (const tokenId of tokenIds) {
      const currentPrice = await getMarketPrice(tokenId);
      
      if (currentPrice === null) {
        continue;
      }
      
      const position = positions.get(tokenId);
      
      if (position) {
        // 已有持仓，检查卖出条件
        if (currentPrice >= SELL_PRICE) {
          await sellToken(tokenId, position, currentPrice);
        } else {
          console.log(`   📊 ${tokenId}: 价格 $${currentPrice.toFixed(4)} (持仓中，等待卖出)`);
        }
      } else {
        // 无持仓，检查买入条件
        if (currentPrice <= BUY_PRICE) {
          await buyToken(tokenId, currentPrice);
        } else {
          console.log(`   📊 ${tokenId}: 价格 $${currentPrice.toFixed(4)} (等待买入)`);
        }
      }
    }
    
    // 检查持仓超时
    await checkHoldingTimeout();
    
  } catch (error: any) {
    console.error('   ❌ 主循环错误:', error?.message || error);
  }
}

// 主函数
async function main() {
  printBanner();
  printConfig();
  
  // 初始化 SDK
  console.log('🚀 正在初始化 SDK...');
  await initializeSDK();
  console.log('');
  
  console.log('🚀 开始套利策略监控...\n');
  
  // 立即执行一次
  await mainLoop();
  
  // 定时执行
  const intervalId = setInterval(async () => {
    await mainLoop();
  }, CHECK_INTERVAL);
  
  // 优雅停止
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️ 正在停止套利策略...');
    clearInterval(intervalId);
    
    // 显示当前持仓
    if (positions.size > 0) {
      console.log(`\n📊 当前持仓 (${positions.size}):`);
      for (const [tokenId, position] of positions.entries()) {
        const holdingTime = Math.floor((Date.now() - position.buyTime.getTime()) / 60000);
        console.log(`   ${tokenId}: 买入价 $${position.buyPrice.toFixed(4)}, 持仓 ${holdingTime} 分钟`);
      }
    }
    
    console.log('✅ 已停止\n');
    process.exit(0);
  });
}

// 运行
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  process.exit(1);
});
