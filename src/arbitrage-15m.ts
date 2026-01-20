// 15分钟市场套利策略
// 赔率80买（价格<=0.80买入），90卖（价格>=0.90卖出）
// 参考：https://github.com/cyl19970726/poly-sdk

import { PolymarketSDK } from '@catalyst-team/poly-sdk';
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
const BUY_PRICE = parseFloat(process.env.ARBITRAGE_BUY_PRICE || '0.80');  // 买入价格阈值（赔率80买）
const SELL_PRICE = parseFloat(process.env.ARBITRAGE_SELL_PRICE || '0.90'); // 卖出价格阈值（赔率90卖）
const CHECK_INTERVAL = parseInt(process.env.ARBITRAGE_CHECK_INTERVAL || '60000'); // 检查间隔（毫秒，默认60秒）
const HOLDING_TIMEOUT = parseInt(process.env.ARBITRAGE_HOLDING_TIMEOUT || '900000'); // 持仓超时（毫秒，默认15分钟=900000）
const MARKET_COIN = process.env.ARBITRAGE_MARKET_COIN || 'ETH'; // 监控的市场币种（ETH, BTC, SOL等）
const TRADE_SIZE = parseFloat(process.env.ARBITRAGE_TRADE_SIZE || '10'); // 每次交易金额（USDC）
const DRY_RUN = process.env.DRY_RUN !== 'false'; // 模拟模式

// SDK 实例
let sdk: PolymarketSDK | null = null;

// 持仓记录
interface PositionRecord {
  tokenId: string;
  conditionId: string;
  marketSlug: string;
  buyPrice: number;
  buyTime: Date;
  amount: number; // 代币数量
  side: 'YES' | 'NO'; // 买入的方向
}

const positions = new Map<string, PositionRecord>(); // tokenId -> PositionRecord

// 当前监控的市场
let currentMarket: any = null;
let currentTokenId: string | null = null;

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   15分钟市场套利策略');
  console.log('   赔率80买（价格<=0.80买入），90卖（价格>=0.90卖出）');
  console.log('═══════════════════════════════════════════════════\n');
}

// 打印配置
function printConfig() {
  console.log('📋 策略配置：');
  console.log(`   模式: ${DRY_RUN ? '🔍 模拟模式' : '💰 实盘模式'}`);
  console.log(`   监控币种: ${MARKET_COIN}`);
  console.log(`   市场周期: 15分钟`);
  console.log(`   买入价格阈值: $${BUY_PRICE.toFixed(2)} (赔率80)`);
  console.log(`   卖出价格阈值: $${SELL_PRICE.toFixed(2)} (赔率90)`);
  console.log(`   交易金额: $${TRADE_SIZE} USDC`);
  console.log(`   检查间隔: ${CHECK_INTERVAL / 1000} 秒`);
  console.log(`   持仓超时: ${HOLDING_TIMEOUT / 60000} 分钟`);
  console.log('');
}

// 查找15分钟市场
async function find15mMarket(coin: string): Promise<any> {
  if (!sdk) {
    return null;
  }

  try {
    // 方法1: 使用 gammaApi 搜索市场
    if (sdk.gammaApi) {
      const markets = await sdk.gammaApi.searchMarkets({
        query: `${coin} 15m`,
        limit: 20,
      });

      // 查找15分钟市场
      for (const market of markets) {
        if (market.duration === '15m' || market.duration === '15分钟' || 
            market.slug?.includes('15m') || market.slug?.includes('15分钟')) {
          return market;
        }
      }
    }

    // 方法2: 使用 markets 服务
    if (sdk.markets) {
      // 尝试通过市场名称查找
      const marketSlug = `${coin.toLowerCase()}-15m`;
      try {
        const market = await sdk.markets.getMarket(marketSlug);
        if (market) {
          return market;
        }
      } catch (e) {
        // 继续尝试其他方法
      }
    }

    console.warn(`   ⚠️  未找到 ${coin} 15分钟市场`);
    return null;
  } catch (error: any) {
    console.error(`   ❌ 查找市场失败:`, error?.message || error);
    return null;
  }
}

// 获取当前市场价格
async function getCurrentPrice(tokenId: string): Promise<number | null> {
  if (!sdk) {
    return null;
  }

  try {
    // 方法1: 使用实时服务获取价格
    if (sdk.realtime) {
      const price = sdk.realtime.getPrice(tokenId);
      if (price !== null && price !== undefined) {
        return parseFloat(price.toString());
      }
    }

    // 方法2: 使用订单簿获取最佳买价（作为当前价格）
    if (sdk.tradingService) {
      try {
        const orderbook = await sdk.getOrderbook(currentMarket?.conditionId || '');
        if (orderbook && orderbook.bids && orderbook.bids.length > 0) {
          // 使用最佳买价作为当前价格
          const bestBid = orderbook.bids[0];
          if (bestBid && bestBid.price !== undefined) {
            return parseFloat(bestBid.price.toString());
          }
        }
      } catch (e) {
        // 继续尝试其他方法
      }
    }

    // 方法3: 从市场数据获取
    if (currentMarket) {
      const token = currentMarket.tokens?.find((t: any) => 
        t.tokenId === tokenId || t.id === tokenId
      );
      if (token && token.price !== undefined) {
        return parseFloat(token.price.toString());
      }
    }

    return null;
  } catch (error: any) {
    console.error(`   ❌ 获取价格失败:`, error?.message || error);
    return null;
  }
}

// 买入代币
async function buyToken(tokenId: string, market: any, side: 'YES' | 'NO', price: number): Promise<boolean> {
  if (!sdk || !sdk.tradingService) {
    console.error('   ❌ SDK 或 TradingService 未初始化');
    return false;
  }

  try {
    console.log(`\n🛒 买入信号触发`);
    console.log(`   市场: ${market.slug || market.name || 'N/A'}`);
    console.log(`   方向: ${side}`);
    console.log(`   代币ID: ${tokenId.substring(0, 10)}...`);
    console.log(`   当前价格: $${price.toFixed(4)}`);
    console.log(`   买入价格阈值: $${BUY_PRICE.toFixed(2)}`);
    console.log(`   交易金额: $${TRADE_SIZE} USDC`);
    
    if (DRY_RUN) {
      console.log(`   🔍 [模拟模式] 将买入代币`);
      // 记录模拟持仓
      positions.set(tokenId, {
        tokenId,
        conditionId: market.conditionId || '',
        marketSlug: market.slug || market.name || '',
        buyPrice: price,
        buyTime: new Date(),
        amount: TRADE_SIZE / price, // 计算代币数量
        side,
      });
      return true;
    }
    
    // 实盘买入
    try {
      // 使用市场订单（FAK - Fill and Kill，部分成交也可以）
      const order = await sdk.tradingService.createMarketOrder({
        tokenId,
        side: 'BUY',
        amount: TRADE_SIZE, // $10 USDC
        orderType: 'FAK',
      });

      if (order && order.id) {
        console.log(`   ✅ 买入成功，订单ID: ${order.id}`);
        
        // 计算实际买入的代币数量
        const actualAmount = order.filledSize || (TRADE_SIZE / price);
        
        positions.set(tokenId, {
          tokenId,
          conditionId: market.conditionId || '',
          marketSlug: market.slug || market.name || '',
          buyPrice: price,
          buyTime: new Date(),
          amount: actualAmount,
          side,
        });
        return true;
      } else {
        console.log(`   ⚠️  订单创建但未确认成功`);
        return false;
      }
    } catch (error: any) {
      console.error(`   ❌ 买入失败:`, error?.message || error);
      return false;
    }
  } catch (error: any) {
    console.error(`   ❌ 买入错误:`, error?.message || error);
    return false;
  }
}

// 卖出代币
async function sellToken(position: PositionRecord, currentPrice: number): Promise<boolean> {
  if (!sdk || !sdk.tradingService) {
    console.error('   ❌ SDK 或 TradingService 未初始化');
    return false;
  }

  try {
    const profit = currentPrice - position.buyPrice;
    const profitPercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;
    const profitUsdc = profit * position.amount;
    
    console.log(`\n💰 卖出信号触发`);
    console.log(`   市场: ${position.marketSlug}`);
    console.log(`   方向: ${position.side}`);
    console.log(`   代币ID: ${position.tokenId.substring(0, 10)}...`);
    console.log(`   买入价格: $${position.buyPrice.toFixed(4)}`);
    console.log(`   当前价格: $${currentPrice.toFixed(4)}`);
    console.log(`   卖出价格阈值: $${SELL_PRICE.toFixed(2)}`);
    console.log(`   代币数量: ${position.amount.toFixed(4)}`);
    console.log(`   预期利润: $${profitUsdc.toFixed(4)} (${profitPercent.toFixed(2)}%)`);
    
    if (DRY_RUN) {
      console.log(`   🔍 [模拟模式] 将卖出代币`);
      positions.delete(position.tokenId);
      return true;
    }
    
    // 实盘卖出
    try {
      // 使用市场订单（FAK - Fill and Kill）
      const order = await sdk.tradingService.createMarketOrder({
        tokenId: position.tokenId,
        side: 'SELL',
        amount: position.amount, // 卖出所有代币
        orderType: 'FAK',
      });

      if (order && order.id) {
        console.log(`   ✅ 卖出成功，订单ID: ${order.id}`);
        positions.delete(position.tokenId);
        return true;
      } else {
        console.log(`   ⚠️  订单创建但未确认成功`);
        return false;
      }
    } catch (error: any) {
      console.error(`   ❌ 卖出失败:`, error?.message || error);
      return false;
    }
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
  const timeoutPositions: Array<PositionRecord> = [];
  
  for (const [tokenId, position] of positions.entries()) {
    const holdingTime = now - position.buyTime.getTime();
    if (holdingTime >= HOLDING_TIMEOUT) {
      timeoutPositions.push(position);
    }
  }
  
  // 处理超时持仓
  for (const position of timeoutPositions) {
    console.log(`\n⏰ 持仓超时（15分钟）`);
    console.log(`   市场: ${position.marketSlug}`);
    console.log(`   代币ID: ${position.tokenId.substring(0, 10)}...`);
    console.log(`   持仓时间: ${Math.floor((Date.now() - position.buyTime.getTime()) / 60000)} 分钟`);
    
    const currentPrice = await getCurrentPrice(position.tokenId);
    if (currentPrice !== null) {
      await sellToken(position, currentPrice);
    } else {
      console.log(`   ⚠️ 无法获取当前价格，强制卖出`);
      if (!DRY_RUN) {
        try {
          // 尝试强制卖出
          if (sdk.tradingService) {
            await sdk.tradingService.createMarketOrder({
              tokenId: position.tokenId,
              side: 'SELL',
              amount: position.amount,
              orderType: 'FAK',
            });
          }
          positions.delete(position.tokenId);
        } catch (error: any) {
          console.error(`   ❌ 强制卖出失败:`, error?.message || error);
        }
      } else {
        positions.delete(position.tokenId);
      }
    }
  }
}

// 主循环
async function mainLoop() {
  if (!sdk || !currentMarket) {
    return;
  }

  try {
    // 获取市场的 YES 和 NO 代币
    const yesToken = currentMarket.tokens?.find((t: any) => t.outcome === 'Yes' || t.outcome === 'YES');
    const noToken = currentMarket.tokens?.find((t: any) => t.outcome === 'No' || t.outcome === 'NO');

    if (!yesToken || !noToken) {
      console.warn(`   ⚠️  市场数据不完整，跳过本次检查`);
      return;
    }

    const yesTokenId = yesToken.tokenId || yesToken.id;
    const noTokenId = noToken.tokenId || noToken.id;

    // 获取当前价格
    const yesPrice = await getCurrentPrice(yesTokenId);
    const noPrice = await getCurrentPrice(noTokenId);

    if (yesPrice === null || noPrice === null) {
      console.warn(`   ⚠️  无法获取价格，跳过本次检查`);
      return;
    }

    // 检查 YES 代币
    const yesPosition = positions.get(yesTokenId);
    if (yesPosition) {
      // 已有持仓，检查卖出条件
      if (yesPrice >= SELL_PRICE) {
        await sellToken(yesPosition, yesPrice);
      } else {
        const holdingTime = Math.floor((Date.now() - yesPosition.buyTime.getTime()) / 60000);
        console.log(`   📊 YES: 价格 $${yesPrice.toFixed(4)} (持仓中，等待卖出，已持仓 ${holdingTime} 分钟)`);
      }
    } else {
      // 无持仓，检查买入条件
      if (yesPrice <= BUY_PRICE) {
        await buyToken(yesTokenId, currentMarket, 'YES', yesPrice);
      } else {
        console.log(`   📊 YES: 价格 $${yesPrice.toFixed(4)} (等待买入，阈值 $${BUY_PRICE.toFixed(2)})`);
      }
    }

    // 检查 NO 代币
    const noPosition = positions.get(noTokenId);
    if (noPosition) {
      // 已有持仓，检查卖出条件
      if (noPrice >= SELL_PRICE) {
        await sellToken(noPosition, noPrice);
      } else {
        const holdingTime = Math.floor((Date.now() - noPosition.buyTime.getTime()) / 60000);
        console.log(`   📊 NO: 价格 $${noPrice.toFixed(4)} (持仓中，等待卖出，已持仓 ${holdingTime} 分钟)`);
      }
    } else {
      // 无持仓，检查买入条件
      if (noPrice <= BUY_PRICE) {
        await buyToken(noTokenId, currentMarket, 'NO', noPrice);
      } else {
        console.log(`   📊 NO: 价格 $${noPrice.toFixed(4)} (等待买入，阈值 $${BUY_PRICE.toFixed(2)})`);
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

  try {
    // 初始化 SDK
    console.log('🚀 正在初始化 SDK...');
    sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 查找15分钟市场
    console.log(`🔍 正在查找 ${MARKET_COIN} 15分钟市场...`);
    currentMarket = await find15mMarket(MARKET_COIN);

    if (!currentMarket) {
      console.error(`❌ 未找到 ${MARKET_COIN} 15分钟市场`);
      console.error('   请检查市场是否存在，或尝试其他币种（ETH, BTC, SOL等）');
      process.exit(1);
    }

    console.log(`✅ 找到市场: ${currentMarket.slug || currentMarket.name || 'N/A'}`);
    console.log(`   条件ID: ${currentMarket.conditionId || 'N/A'}`);
    
    // 订阅实时价格更新
    if (sdk.realtime && currentMarket.tokens) {
      const tokenIds = currentMarket.tokens
        .map((t: any) => t.tokenId || t.id)
        .filter(Boolean);
      
      if (tokenIds.length > 0) {
        sdk.realtime.subscribeMarket(tokenIds);
        console.log(`✅ 已订阅实时价格更新\n`);
      }
    }

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
          console.log(`   ${position.side} (${tokenId.substring(0, 10)}...): 买入价 $${position.buyPrice.toFixed(4)}, 持仓 ${holdingTime} 分钟`);
        }
      }
      
      // 清理资源
      if (sdk) {
        sdk.stop();
      }
      
      console.log('✅ 已停止\n');
      process.exit(0);
    });

  } catch (error: any) {
    console.error('\n❌ 启动失败:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
    if (sdk) {
      sdk.stop();
    }
    process.exit(1);
  }
}

// 运行
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  if (sdk) {
    sdk.stop();
  }
  process.exit(1);
});
