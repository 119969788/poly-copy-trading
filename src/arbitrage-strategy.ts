// 15分钟套利策略
// 赔率80买（价格<=0.80买入），90卖（价格>=0.90卖出）

// 使用与 index.ts 和 batch-sell.ts 完全相同的导入方式
// 如果服务器上的 SDK 版本不支持 PolySDK，将在 initializeSDK 中使用动态导入作为回退
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
    // 方式1: 尝试使用静态导入的 PolySDK（与 index.ts 一致）
    // 注意：如果静态导入失败，这个方式不会执行
    try {
      // 动态导入 PolySDK
      const { PolySDK } = await import('@catalyst-team/poly-sdk');
      if (PolySDK && typeof PolySDK === 'function') {
        sdk = new PolySDK({ privateKey });
        console.log('✅ 使用 PolySDK 初始化成功');
        return;
      }
    } catch (e: any) {
      // 如果 PolySDK 不存在，继续尝试其他方式
      if (e?.message?.includes('does not provide an export named')) {
        console.log('   ℹ️  PolySDK 导出不存在，尝试其他方式...');
      }
    }

    // 方式2: 尝试使用 PolymarketSDK (与 dip-arb-15m.ts 一致)
    try {
      const { PolymarketSDK } = await import('@catalyst-team/poly-sdk');
      if (PolymarketSDK && typeof PolymarketSDK.create === 'function') {
        sdk = await PolymarketSDK.create({ privateKey });
        console.log('✅ 使用 PolymarketSDK.create() 初始化成功');
        return;
      } else if (PolymarketSDK && typeof PolymarketSDK === 'function') {
        sdk = new PolymarketSDK({ privateKey });
        console.log('✅ 使用 PolymarketSDK (new) 初始化成功');
        return;
      }
    } catch (e: any) {
      // 继续尝试其他方式
      if (e?.message?.includes('does not provide an export named')) {
        console.log('   ℹ️  PolymarketSDK 导出不存在，尝试其他方式...');
      }
    }

    // 方式3: 尝试使用 default export 或整个模块
    try {
      const sdkModule = await import('@catalyst-team/poly-sdk');
      
      // 检查是否有 default export
      if (sdkModule.default) {
        const SDKClass = sdkModule.default;
        if (typeof SDKClass === 'function') {
          if (typeof SDKClass.create === 'function') {
            sdk = await SDKClass.create({ privateKey });
            console.log('✅ 使用 default.create() 初始化成功');
            return;
          } else {
            sdk = new SDKClass({ privateKey });
            console.log('✅ 使用 default (new) 初始化成功');
            return;
          }
        }
      }
      
      // 检查模块本身是否是构造函数
      if (typeof sdkModule === 'function') {
        sdk = new sdkModule({ privateKey });
        console.log('✅ 使用模块本身初始化成功');
        return;
      }
      
      // 列出所有可用的导出
      const exports = Object.keys(sdkModule).filter(key => 
        typeof sdkModule[key as keyof typeof sdkModule] === 'function'
      );
      console.log(`   ℹ️  可用的导出: ${exports.join(', ')}`);
      
    } catch (e) {
      // 所有方式都失败
    }

    // 如果所有方式都失败，提供详细的诊断信息
    console.error('❌ 所有 SDK 初始化方式都失败了');
    console.error('   请检查服务器上的 SDK 安装和导出：');
    console.error('   1. npm list @catalyst-team/poly-sdk');
    console.error('   2. cat node_modules/@catalyst-team/poly-sdk/package.json | grep -E "main|exports|module"');
    console.error('   3. ls -la node_modules/@catalyst-team/poly-sdk/');
    console.error('   4. node -e "const sdk = require(\'@catalyst-team/poly-sdk\'); console.log(Object.keys(sdk))"');
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

// 将市场名称或代币ID转换为实际的代币ID
async function resolveTokenId(input: string): Promise<string | null> {
  if (!sdk) {
    return null;
  }

  // 如果已经是代币ID格式（0x开头），直接返回
  if (input.startsWith('0x') && input.length >= 42) {
    return input;
  }

  // 否则，尝试通过市场名称查找
  try {
    // 方法1: 使用 markets 服务查找市场
    if ((sdk as any).markets) {
      // 尝试通过市场名称查找
      if (typeof (sdk as any).markets.getMarket === 'function') {
        try {
          const market = await (sdk as any).markets.getMarket(input);
          if (market && market.tokenId) {
            return market.tokenId;
          }
          if (market && market.tokens && market.tokens.length > 0) {
            // 返回第一个代币ID（通常是 YES 代币）
            return market.tokens[0].tokenId || market.tokens[0].id;
          }
        } catch (e: any) {
          // 继续尝试其他方法
        }
      }

      // 方法2: 搜索市场
      if (typeof (sdk as any).markets.search === 'function') {
        try {
          const results = await (sdk as any).markets.search({ query: input });
          if (results && results.length > 0) {
            const market = results[0];
            if (market.tokenId) {
              return market.tokenId;
            }
            if (market.tokens && market.tokens.length > 0) {
              return market.tokens[0].tokenId || market.tokens[0].id;
            }
          }
        } catch (e: any) {
          // 继续尝试其他方法
        }
      }
    }

    // 方法3: 使用 dataApi 或 gammaApi 查找
    if ((sdk as any).dataApi) {
      if (typeof (sdk as any).dataApi.getMarket === 'function') {
        try {
          const market = await (sdk as any).dataApi.getMarket(input);
          if (market && market.tokenId) {
            return market.tokenId;
          }
        } catch (e: any) {
          // 忽略错误
        }
      }
    }

    // 如果无法解析，返回 null
    console.warn(`   ⚠️  无法解析市场名称 "${input}" 为代币ID`);
    console.warn(`   提示：请使用完整的代币ID（0x开头的地址），而不是市场名称`);
    return null;
  } catch (error: any) {
    console.error(`   ❌ 解析代币ID失败:`, error?.message || error);
    return null;
  }
}

// 获取市场价格
async function getMarketPrice(tokenIdOrMarket: string): Promise<number | null> {
  if (!sdk) {
    console.error('   ❌ SDK 未初始化');
    return null;
  }

  try {
    // 首先解析为实际的代币ID
    let actualTokenId = await resolveTokenId(tokenIdOrMarket);
    if (!actualTokenId) {
      // 如果无法解析，尝试直接使用输入（可能是代币ID）
      if (tokenIdOrMarket.startsWith('0x')) {
        actualTokenId = tokenIdOrMarket;
      } else {
        console.error(`   ❌ 无法解析 "${tokenIdOrMarket}" 为有效的代币ID或市场名称`);
        console.error(`   提示：请使用完整的代币ID（0x开头的地址）或有效的市场名称`);
        return null;
      }
    }

    // 方法1: 尝试使用 markets 服务获取价格
    if ((sdk as any).markets) {
      if (typeof (sdk as any).markets.getMarketPrice === 'function') {
        try {
          const price = await (sdk as any).markets.getMarketPrice(actualTokenId);
          if (price !== null && price !== undefined) {
            return parseFloat(price.toString());
          }
        } catch (e: any) {
          // 继续尝试其他方法
        }
      }

      // 尝试获取市场信息，然后从市场数据中提取价格
      if (typeof (sdk as any).markets.getMarket === 'function') {
        try {
          const market = await (sdk as any).markets.getMarket(actualTokenId);
          if (market) {
            // 尝试从市场数据中获取价格
            if (market.price !== undefined) {
              return parseFloat(market.price.toString());
            }
            if (market.currentPrice !== undefined) {
              return parseFloat(market.currentPrice.toString());
            }
            if (market.lastPrice !== undefined) {
              return parseFloat(market.lastPrice.toString());
            }
            // 如果有代币信息，尝试从代币中获取价格
            if (market.tokens && market.tokens.length > 0) {
              const token = market.tokens.find((t: any) => 
                (t.tokenId === actualTokenId || t.id === actualTokenId)
              );
              if (token && token.price !== undefined) {
                return parseFloat(token.price.toString());
              }
            }
          }
        } catch (e: any) {
          // 继续尝试其他方法
        }
      }
    }

    // 方法2: 尝试使用 dataApi 获取价格
    if ((sdk as any).dataApi) {
      if (typeof (sdk as any).dataApi.getPrice === 'function') {
        try {
          const price = await (sdk as any).dataApi.getPrice(actualTokenId);
          if (price !== null && price !== undefined) {
            return parseFloat(price.toString());
          }
        } catch (e: any) {
          // 继续尝试其他方法
        }
      }
    }

    // 方法3: 尝试从订单簿获取（使用最佳买价）
    if ((sdk as any).tradingService) {
      if (typeof (sdk as any).tradingService.getOrderbook === 'function') {
        try {
          const orderbook = await (sdk as any).tradingService.getOrderbook(actualTokenId);
          if (orderbook && orderbook.bids && orderbook.bids.length > 0) {
            const bestBid = orderbook.bids[0];
            if (bestBid && bestBid.price !== undefined) {
              return parseFloat(bestBid.price.toString());
            }
          }
        } catch (e: any) {
          // 继续尝试其他方法
        }
      }
    }

    // 方法4: 尝试使用 SDK 的 getMarket 方法
    if (typeof (sdk as any).getMarket === 'function') {
      try {
        const market = await (sdk as any).getMarket(actualTokenId);
        if (market && market.price) {
          return parseFloat(market.price.toString());
        }
      } catch (e: any) {
        // 继续尝试其他方法
      }
    }
    
    // 方法5: 尝试从订单簿获取
    if (typeof (sdk as any).getOrderbook === 'function') {
      try {
        const orderbook = await (sdk as any).getOrderbook(actualTokenId);
        if (orderbook && orderbook.bids && orderbook.bids.length > 0) {
          const bestBid = orderbook.bids[0];
          if (bestBid && bestBid.price) {
            return parseFloat(bestBid.price.toString());
          }
        }
      } catch (e: any) {
        // 继续尝试其他方法
      }
    }
    
    // 如果所有方法都失败，返回 null
    console.warn(`   ⚠️  无法获取价格 (${tokenIdOrMarket})，请检查 SDK API`);
    console.warn(`   提示：请确保使用正确的代币ID（0x开头的地址）`);
    return null;
  } catch (error: any) {
    console.error(`   ❌ 获取价格失败 (${tokenIdOrMarket}):`, error?.message || error);
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
    // 方法1: 尝试使用 sdk.smartMoney.getPositions (PolySDK 方式)
    if ((sdk as any).smartMoney && typeof (sdk as any).smartMoney.getPositions === 'function') {
      try {
        const userPositions = await (sdk as any).smartMoney.getPositions();
        if (Array.isArray(userPositions) && userPositions.length > 0) {
          const tokenIds = userPositions.map((p: any) => p.tokenId || p.id || p.positionId || p.collectionId).filter(Boolean);
          if (tokenIds.length > 0) {
            console.log(`   ✅ 通过 smartMoney.getPositions 获取到 ${tokenIds.length} 个持仓`);
            return tokenIds;
          }
        } else if (Array.isArray(userPositions) && userPositions.length === 0) {
          // 返回空数组，表示没有持仓
          return [];
        }
      } catch (e: any) {
        console.log(`   ℹ️  smartMoney.getPositions 失败: ${e?.message || e}`);
      }
    }
    
    // 方法2: 检查 smartMoney 对象的所有方法
    if ((sdk as any).smartMoney) {
      const smartMoneyMethods = Object.keys((sdk as any).smartMoney).filter(key => 
        typeof (sdk as any).smartMoney[key] === 'function'
      );
      console.log(`   ℹ️  smartMoney 可用方法: ${smartMoneyMethods.join(', ')}`);
      
      // 尝试其他可能的方法
      for (const method of ['getUserPositions', 'getPositions', 'positions', 'getHoldings']) {
        if (typeof (sdk as any).smartMoney[method] === 'function') {
          try {
            const result = await (sdk as any).smartMoney[method]();
            if (Array.isArray(result) && result.length > 0) {
              const tokenIds = result.map((p: any) => p.tokenId || p.id || p.positionId || p.collectionId).filter(Boolean);
              if (tokenIds.length > 0) {
                console.log(`   ✅ 通过 smartMoney.${method} 获取到 ${tokenIds.length} 个持仓`);
                return tokenIds;
              }
            }
          } catch (e: any) {
            // 忽略错误，继续尝试下一个方法
          }
        }
      }
    }
    
    // 方法3: 尝试使用 sdk.getPositions
    if (typeof (sdk as any).getPositions === 'function') {
      try {
        const userPositions = await (sdk as any).getPositions();
        if (Array.isArray(userPositions) && userPositions.length > 0) {
          const tokenIds = userPositions.map((p: any) => p.tokenId || p.id || p.positionId || p.collectionId).filter(Boolean);
          if (tokenIds.length > 0) {
            console.log(`   ✅ 通过 getPositions 获取到 ${tokenIds.length} 个持仓`);
            return tokenIds;
          }
        }
      } catch (e: any) {
        console.log(`   ℹ️  getPositions 失败: ${e?.message || e}`);
      }
    }
    
    // 方法4: 尝试使用 wallets 服务（PolymarketSDK 可能通过钱包获取持仓）
    if ((sdk as any).wallets) {
      try {
        const walletAddress = (sdk as any).getAddress?.() || (sdk as any).wallet?.address;
        if (walletAddress && typeof (sdk as any).wallets.getPositions === 'function') {
          const userPositions = await (sdk as any).wallets.getPositions(walletAddress);
          if (Array.isArray(userPositions) && userPositions.length > 0) {
            const tokenIds = userPositions.map((p: any) => p.tokenId || p.id || p.positionId || p.collectionId).filter(Boolean);
            if (tokenIds.length > 0) {
              console.log(`   ✅ 通过 wallets.getPositions 获取到 ${tokenIds.length} 个持仓`);
              return tokenIds;
            }
          }
        }
      } catch (e: any) {
        console.log(`   ℹ️  wallets.getPositions 失败: ${e?.message || e}`);
      }
    }
    
    // 如果没有找到持仓，返回空数组（这是正常的，表示当前没有持仓）
    console.log(`   ℹ️  当前没有持仓（这是正常的，如果没有实际持仓）`);
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
      // 监控指定代币或市场名称
      // 先尝试解析为实际的代币ID
      const resolvedTokenId = await resolveTokenId(TOKEN_ID);
      if (resolvedTokenId) {
        tokenIds = [resolvedTokenId];
      } else if (TOKEN_ID.startsWith('0x')) {
        // 如果已经是代币ID格式，直接使用
        tokenIds = [TOKEN_ID];
      } else {
        console.error(`   ❌ 无法解析 "${TOKEN_ID}" 为有效的代币ID或市场名称`);
        console.error(`   提示：请使用完整的代币ID（0x开头的地址）`);
        return;
      }
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
      console.log('   💡 提示：如果需要监控特定代币，请设置 ARBITRAGE_TOKEN_ID 环境变量');
      console.log('   💡 提示：ARBITRAGE_TOKEN_ID 可以是代币ID（0x开头）或市场名称');
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
          console.log(`   📊 ${tokenId.substring(0, 10)}...: 价格 $${currentPrice.toFixed(4)} (持仓中，等待卖出)`);
        }
      } else {
        // 无持仓，检查买入条件
        if (currentPrice <= BUY_PRICE) {
          await buyToken(tokenId, currentPrice);
        } else {
          console.log(`   📊 ${tokenId.substring(0, 10)}...: 价格 $${currentPrice.toFixed(4)} (等待买入)`);
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
