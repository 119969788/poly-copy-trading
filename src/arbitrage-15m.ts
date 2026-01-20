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
const EVENT_SLUG = process.env.ARBITRAGE_EVENT_SLUG || ''; // 事件 slug（如：eth-updown-15m-1768877100）
const TRADE_SIZE = parseFloat(process.env.ARBITRAGE_TRADE_SIZE || '10'); // 每次交易金额（USDC）
const DRY_RUN = process.env.DRY_RUN !== 'false'; // 模拟模式

// 纯套利策略配置（参考：https://github.com/terauss/Polymarket-trading-bot-15min-BTC）
const USE_PURE_ARBITRAGE = process.env.USE_PURE_ARBITRAGE === 'true'; // 是否使用纯套利策略（UP+DOWN < $1.00）
const ARBITRAGE_COST_THRESHOLD = parseFloat(process.env.ARBITRAGE_COST_THRESHOLD || '0.99'); // 纯套利成本阈值（默认0.99，即UP+DOWN < 0.99时买入）
const ORDER_SIZE = parseFloat(process.env.ARBITRAGE_ORDER_SIZE || '5'); // 纯套利策略的订单大小（shares数量）

// 统计跟踪
interface TradeStats {
  totalOpportunities: number; // 检测到的套利机会数
  totalTrades: number; // 总交易数
  successfulTrades: number; // 成功交易数
  totalInvested: number; // 总投入
  totalPayout: number; // 总收益
  totalProfit: number; // 总利润
  trades: Array<{
    timestamp: Date;
    marketSlug: string;
    side: 'YES' | 'NO' | 'BOTH';
    buyPrice: number;
    sellPrice?: number;
    amount: number;
    invested: number;
    payout?: number;
    profit?: number;
    profitPercent?: number;
  }>;
}

const stats: TradeStats = {
  totalOpportunities: 0,
  totalTrades: 0,
  successfulTrades: 0,
  totalInvested: 0,
  totalPayout: 0,
  totalProfit: 0,
  trades: [],
};

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
  if (USE_PURE_ARBITRAGE) {
    console.log('   纯套利策略（UP + DOWN < $1.00时买入，保证盈利）');
    console.log('   参考：https://github.com/terauss/Polymarket-trading-bot-15min-BTC');
  } else {
    console.log('   价格阈值策略（赔率80买，90卖）');
  }
  console.log('═══════════════════════════════════════════════════\n');
}

// 打印统计信息
function printStats() {
  if (stats.totalTrades === 0) {
    return;
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 统计信息');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (USE_PURE_ARBITRAGE) {
    console.log(`   检测到的套利机会: ${stats.totalOpportunities}`);
    console.log(`   总交易数: ${stats.totalTrades}`);
    console.log(`   成功交易: ${stats.successfulTrades}`);
    console.log(`   总投入: $${stats.totalInvested.toFixed(4)}`);
    console.log(`   总收益: $${stats.totalPayout.toFixed(4)}`);
    console.log(`   总利润: $${stats.totalProfit.toFixed(4)}`);
    
    if (stats.totalInvested > 0) {
      const profitPercent = (stats.totalProfit / stats.totalInvested) * 100;
      console.log(`   利润率: ${profitPercent.toFixed(2)}%`);
    }
    
    if (stats.totalTrades > 0) {
      const winRate = (stats.successfulTrades / stats.totalTrades) * 100;
      console.log(`   成功率: ${winRate.toFixed(2)}%`);
    }
  } else {
    console.log(`   总交易数: ${stats.totalTrades}`);
    console.log(`   成功交易: ${stats.successfulTrades}`);
    if (stats.totalTrades > 0) {
      const winRate = (stats.successfulTrades / stats.totalTrades) * 100;
      console.log(`   成功率: ${winRate.toFixed(2)}%`);
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 打印配置
function printConfig() {
  console.log('📋 策略配置：');
  console.log(`   模式: ${DRY_RUN ? '🔍 模拟模式' : '💰 实盘模式'}`);
  console.log(`   监控币种: ${MARKET_COIN}`);
  console.log(`   市场周期: 15分钟`);
  
  if (USE_PURE_ARBITRAGE) {
    console.log(`   策略: 🎯 纯套利策略（UP + DOWN < $${ARBITRAGE_COST_THRESHOLD.toFixed(2)}）`);
    console.log(`   订单大小: ${ORDER_SIZE} shares (每边)`);
    console.log(`   成本阈值: $${ARBITRAGE_COST_THRESHOLD.toFixed(2)} (总成本需小于此值)`);
  } else {
    console.log(`   策略: 📊 价格阈值策略`);
    console.log(`   买入价格阈值: $${BUY_PRICE.toFixed(2)} (赔率80)`);
    console.log(`   卖出价格阈值: $${SELL_PRICE.toFixed(2)} (赔率90)`);
    console.log(`   交易金额: $${TRADE_SIZE} USDC`);
  }
  
  console.log(`   检查间隔: ${CHECK_INTERVAL / 1000} 秒`);
  console.log(`   持仓超时: ${HOLDING_TIMEOUT / 60000} 分钟`);
  console.log('');
}

// 通过 Gamma API 获取 Token IDs（辅助函数）
async function getTokenIdsFromGammaAPI(marketSlug: string): Promise<{ yesTokenId: string | null; noTokenId: string | null; market: any } | null> {
  try {
    // 方法1: 尝试通过市场 slug 获取
    const marketUrl = `https://gamma-api.polymarket.com/markets?slug=${marketSlug}`;
    let marketRes = await fetch(marketUrl);
    
    // 如果失败，尝试 path 参数方式
    if (!marketRes.ok) {
      const marketUrl2 = `https://gamma-api.polymarket.com/markets/slug/${marketSlug}`;
      marketRes = await fetch(marketUrl2);
    }
    
    if (!marketRes.ok) {
      return null;
    }
    
    const marketData = await marketRes.json();
    const market = Array.isArray(marketData) ? marketData[0] : marketData;
    
    if (!market || !market.clobTokenIds || market.clobTokenIds.length < 2) {
      return null;
    }
    
    // 确保 clobTokenIds 是数组且元素是字符串
    const clobTokenIds = Array.isArray(market.clobTokenIds) 
      ? market.clobTokenIds.map((id: any) => String(id))
      : [];
    
    if (clobTokenIds.length < 2) {
      return null;
    }
    
    return {
      yesTokenId: clobTokenIds[0],
      noTokenId: clobTokenIds[1],
      market: market,
    };
  } catch (error: any) {
    return null;
  }
}

// 规范化 outcomes 字段（防御式解析）
function normalizeOutcomes(outcomes: any): Array<{ outcome: string; tokenId?: string; price?: number }> {
  // 如果已经是数组，直接返回
  if (Array.isArray(outcomes)) {
    return outcomes.map((o: any) => {
      if (typeof o === 'string') {
        return { outcome: o };
      }
      return {
        outcome: o.outcome || o.title || String(o),
        tokenId: o.tokenId,
        price: o.price,
      };
    });
  }

  // 如果是字符串，尝试解析
  if (typeof outcomes === 'string') {
    const s = outcomes.trim();
    
    // 尝试 JSON 解析（如 '["Up","Down"]'）
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((x: any) => ({ outcome: String(x) }));
        }
      } catch (e) {
        // JSON 解析失败，继续尝试其他方式
      }
    }
    
    // 逗号分隔（如 'Up,Down'）
    if (s.includes(',')) {
      return s.split(',').map(x => ({ outcome: x.trim() })).filter(x => x.outcome);
    }
    
    // 单个值
    if (s) {
      return [{ outcome: s }];
    }
  }

  // 空值或其他类型
  return [];
}

// 通过事件 slug 直接获取市场信息（最可靠的方法）
async function getMarketByEventSlug(eventSlug: string): Promise<any> {
  try {
    console.log(`   🔍 通过事件 slug 获取市场: ${eventSlug}`);
    
    // 1. 先获取 event 信息
    const eventUrl = `https://gamma-api.polymarket.com/events/slug/${eventSlug}`;
    const eventRes = await fetch(eventUrl);
    
    if (!eventRes.ok) {
      console.log(`   ⚠️  获取事件失败: ${eventRes.status} ${eventRes.statusText}`);
      return null;
    }
    
    const eventData = await eventRes.json();
    
    if (!eventData.markets || eventData.markets.length === 0) {
      console.log(`   ⚠️  事件中没有市场数据`);
      return null;
    }
    
    // 2. 获取第一个 market 的 slug
    const marketSlug = eventData.markets[0].slug || eventData.markets[0].marketSlug;
    if (!marketSlug) {
      console.log(`   ⚠️  无法获取 market slug`);
      return null;
    }
    
    console.log(`   ✅ 找到 market slug: ${marketSlug}`);
    
    // 3. 获取 market 详情（包含 clobTokenIds）
    // 优先使用 query 参数方式（更稳定）
    const marketUrl = `https://gamma-api.polymarket.com/markets?slug=${marketSlug}`;
    let marketRes = await fetch(marketUrl);
    
    // 如果失败，尝试 path 参数方式
    if (!marketRes.ok) {
      const marketUrl2 = `https://gamma-api.polymarket.com/markets/slug/${marketSlug}`;
      marketRes = await fetch(marketUrl2);
    }
    
    if (!marketRes.ok) {
      console.log(`   ⚠️  获取市场详情失败: ${marketRes.status} ${marketRes.statusText}`);
      return null;
    }
    
    const marketData = await marketRes.json();
    const market = Array.isArray(marketData) ? marketData[0] : marketData;
    
    if (!market) {
      console.log(`   ⚠️  市场数据为空`);
      return null;
    }
    
    console.log(`   ✅ 成功获取市场数据`);
    
    // 4. 提取关键信息（只使用 clobTokenIds，不从 outcomes 推断）
    // 确保 clobTokenIds 是数组
    let clobTokenIds: string[] = [];
    if (Array.isArray(market.clobTokenIds)) {
      clobTokenIds = market.clobTokenIds.map((id: any) => String(id));
    } else if (typeof market.clobTokenIds === 'string') {
      // 如果是字符串，尝试解析为数组
      try {
        const parsed = JSON.parse(market.clobTokenIds);
        if (Array.isArray(parsed)) {
          clobTokenIds = parsed.map((id: any) => String(id));
        }
      } catch (e) {
        // 解析失败，忽略
      }
    }
    
    const conditionId = market.conditionId || eventData.markets[0].conditionId;
    
    // 验证 clobTokenIds 是否存在且格式正确
    if (!clobTokenIds || clobTokenIds.length < 2) {
      console.error(`   ❌ 市场数据缺少有效的 clobTokenIds（必需字段）`);
      console.error(`   提示：请检查市场是否有效，或尝试其他市场`);
      return null;
    }
    
    // 验证每个 tokenId 都是纯数字字符串
    for (let i = 0; i < clobTokenIds.length; i++) {
      if (!/^\d+$/.test(clobTokenIds[i])) {
        console.error(`   ❌ Token ID ${i} 格式错误（应该是纯数字）: ${clobTokenIds[i].substring(0, 20)}...`);
        return null;
      }
    }
    
    // 规范化 outcomes（仅用于显示标签，不用于 tokenId）
    const normalizedOutcomes = normalizeOutcomes(market.outcomes);
    
    // 构建 tokens 数组（只使用 clobTokenIds）
    const tokens: Array<{ tokenId: string; id: string; outcome: string; price?: number }> = [
      {
        tokenId: clobTokenIds[0],
        id: clobTokenIds[0],
        outcome: normalizedOutcomes[0]?.outcome || 'Yes' || 'Up',
        price: normalizedOutcomes[0]?.price,
      },
      {
        tokenId: clobTokenIds[1],
        id: clobTokenIds[1],
        outcome: normalizedOutcomes[1]?.outcome || 'No' || 'Down',
        price: normalizedOutcomes[1]?.price,
      },
    ];
    
    console.log(`   ✅ 使用 clobTokenIds（官方 CLOB 代币ID）`);
    console.log(`      Token 0: ${clobTokenIds[0].substring(0, 20)}... (${tokens[0].outcome})`);
    console.log(`      Token 1: ${clobTokenIds[1].substring(0, 20)}... (${tokens[1].outcome})`);
    
    // 5. 构建完整的市场对象
    const fullMarket = {
      ...market,
      name: market.name || eventData.title || eventData.question,
      slug: market.slug || marketSlug,
      conditionId: conditionId,
      clobTokenIds: clobTokenIds,
      tokens: tokens,
    };
    
    console.log(`   ✅ 市场信息构建完成`);
    console.log(`      条件ID: ${fullMarket.conditionId || 'N/A'}`);
    console.log(`      Token IDs: ${fullMarket.clobTokenIds?.length || 0} 个`);
    if (fullMarket.tokens.length > 0) {
      console.log(`      代币: ${fullMarket.tokens.map(t => `${t.outcome}(${t.tokenId?.substring(0, 10)}...)`).join(', ')}`);
    }
    
    return fullMarket;
  } catch (error: any) {
    console.error(`   ❌ 通过事件 slug 获取市场失败: ${error?.message || error}`);
    if (error?.stack) {
      console.error(`   堆栈: ${error.stack}`);
    }
    return null;
  }
}

// 检查市场状态
async function checkMarketStatus(market: any): Promise<'active' | 'closed' | 'ended' | 'unknown'> {
  try {
    // 方法1: 检查市场数据中的状态字段
    if (market.active !== undefined) {
      return market.active ? 'active' : 'closed';
    }
    if (market.status) {
      const status = String(market.status).toLowerCase();
      if (status.includes('closed') || status.includes('ended') || status.includes('resolved')) {
        return 'closed';
      }
      if (status.includes('active') || status.includes('open')) {
        return 'active';
      }
    }
    
    // 方法2: 尝试获取订单簿（如果订单簿不存在，市场可能已关闭）
    if (market.clobTokenIds && market.clobTokenIds.length > 0) {
      try {
        const tokenId = Array.isArray(market.clobTokenIds) 
          ? String(market.clobTokenIds[0])
          : String(market.clobTokenIds);
        
        const orderbookUrl = `https://clob.polymarket.com/book?token_id=${tokenId}`;
        const response = await fetch(orderbookUrl);
        
        if (response.status === 404) {
          return 'closed';
        }
        if (response.ok) {
          return 'active';
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    // 方法3: 通过 Gamma API 检查市场状态
    if (market.slug) {
      try {
        const marketUrl = `https://gamma-api.polymarket.com/markets?slug=${market.slug}`;
        const response = await fetch(marketUrl);
        if (response.ok) {
          const marketData = await response.json();
          const m = Array.isArray(marketData) ? marketData[0] : marketData;
          if (m) {
            if (m.active === false || m.status === 'closed' || m.status === 'ended') {
              return 'closed';
            }
            if (m.active === true || m.status === 'active') {
              return 'active';
            }
          }
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    return 'unknown';
  } catch (error: any) {
    return 'unknown';
  }
}

// 查找15分钟市场
async function find15mMarket(coin: string): Promise<any> {
  if (!sdk) {
    return null;
  }

  try {
    // 方法0（最优先）: 如果提供了事件 slug，优先使用，失败时回退到自动搜索
    if (EVENT_SLUG) {
      console.log(`   🔍 优先使用指定的事件 slug: ${EVENT_SLUG}`);
      const market = await getMarketByEventSlug(EVENT_SLUG);
      if (market) {
        // 检查市场状态
        const status = await checkMarketStatus(market);
        if (status === 'closed' || status === 'ended') {
          console.log(`   ⚠️  指定的事件 slug 对应的市场已关闭，回退到自动搜索...`);
          // 继续执行下面的自动搜索逻辑
        } else {
          console.log(`   ✅ 通过事件 slug 成功获取市场（状态: ${status}）`);
          return market;
        }
      } else {
        console.log(`   ⚠️  通过事件 slug 获取失败，回退到自动搜索...`);
        // 继续执行下面的自动搜索逻辑
      }
    }
    // 方法1: 使用 dipArb 服务查找市场（专门用于15分钟市场）
    // 注意：需要先确保服务没有在运行
    if (sdk.dipArb && typeof sdk.dipArb.findAndStart === 'function') {
      try {
        // 先确保 DipArb 服务已停止
        if (typeof sdk.dipArb.stop === 'function') {
          try {
            await sdk.dipArb.stop();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e: any) {
            // 如果服务没有运行，忽略错误
            if (!e?.message?.includes('not running')) {
              console.log(`   ⚠️  停止 DipArb 服务时出错: ${e?.message || e}`);
            }
          }
        }
        
        console.log(`   🔍 使用 dipArb 服务查找 ${coin} 15分钟市场...`);
        const result = await sdk.dipArb.findAndStart({
          coin,
          preferDuration: '15m',
        });
        
        if (result && result.market) {
          console.log(`   ✅ 通过 dipArb 找到市场: ${result.market.name || result.market.slug || 'N/A'}`);
          // 停止 dipArb（我们只需要市场信息，不使用它的交易功能）
          if (typeof sdk.dipArb.stop === 'function') {
            await sdk.dipArb.stop();
          }
          return result.market;
        }
      } catch (e: any) {
        console.log(`   ⚠️  dipArb 查找失败: ${e?.message || e}`);
      }
    }

    // 方法2: 直接调用 Gamma API 搜索市场（不依赖 SDK 版本）
    try {
      console.log(`   🔍 使用 Gamma API 搜索 ${coin} 15分钟市场...`);
      const searchUrl = `https://gamma-api.polymarket.com/public-search?query=${encodeURIComponent(`${coin} 15m`)}&limit=20`;
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        const markets = data?.markets || data?.results || data || [];
        
        // 查找15分钟市场
        for (const market of markets) {
          if (market.duration === '15m' || market.duration === '15分钟' || 
              market.slug?.includes('15m') || market.slug?.includes('15分钟') ||
              market.name?.toLowerCase().includes('15m') ||
              market.name?.toLowerCase().includes('15分钟')) {
            console.log(`   ✅ 通过 Gamma API 找到市场: ${market.slug || market.name || 'N/A'}`);
            
            // 如果市场没有 clobTokenIds，尝试通过 Gamma API 获取完整信息
            if (!market.clobTokenIds && market.slug) {
              console.log(`   🔍 获取市场的完整 Token IDs...`);
              const tokenData = await getTokenIdsFromGammaAPI(market.slug);
              if (tokenData) {
                // 合并 Token IDs 信息
                market.clobTokenIds = [tokenData.yesTokenId, tokenData.noTokenId];
                if (!market.tokens) {
                  market.tokens = [];
                }
                if (tokenData.yesTokenId) {
                  market.tokens.push({
                    tokenId: tokenData.yesTokenId,
                    id: tokenData.yesTokenId,
                    outcome: 'Yes',
                  });
                }
                if (tokenData.noTokenId) {
                  market.tokens.push({
                    tokenId: tokenData.noTokenId,
                    id: tokenData.noTokenId,
                    outcome: 'No',
                  });
                }
              }
            }
            
            return market;
          }
        }
      }
    } catch (e: any) {
      console.log(`   ⚠️  Gamma API 搜索失败: ${e?.message || e}`);
    }

    // 方法3: 使用 markets 服务，尝试常见的市场 slug 格式
    if (sdk.markets) {
      const possibleSlugs = [
        `${coin.toLowerCase()}-15m-up-down`,
        `${coin.toLowerCase()}-15m`,
        `${coin.toLowerCase()}-15min`,
        `will-${coin.toLowerCase()}-be-up-in-15m`,
        `will-${coin.toLowerCase()}-be-down-in-15m`,
      ];

      for (const slug of possibleSlugs) {
        try {
          console.log(`   🔍 尝试查找市场: ${slug}`);
          const market = await sdk.markets.getMarket(slug);
          if (market) {
            console.log(`   ✅ 找到市场: ${slug}`);
            return market;
          }
        } catch (e: any) {
          // 继续尝试下一个
          if (!e?.message?.includes('not found') && !e?.message?.includes('404')) {
            console.log(`   ⚠️  查找 ${slug} 时出错: ${e?.message || e}`);
          }
        }
      }
    }

    // 方法4: 尝试使用 gammaApi（如果方法存在且版本支持）
    if (sdk.gammaApi) {
      try {
        // 尝试不同的方法名
        const searchMethods = [
          'searchMarkets',
          'search',
          'getMarkets',
          'findMarkets',
        ];

        for (const methodName of searchMethods) {
          if (typeof (sdk.gammaApi as any)[methodName] === 'function') {
            try {
              console.log(`   🔍 使用 gammaApi.${methodName} 搜索市场...`);
              const result = await (sdk.gammaApi as any)[methodName]({
                query: `${coin} 15m`,
                limit: 20,
              });

              const markets = Array.isArray(result) ? result : (result?.markets || result?.results || []);
              
              // 查找15分钟市场
              for (const market of markets) {
                if (market.duration === '15m' || market.duration === '15分钟' || 
                    market.slug?.includes('15m') || market.slug?.includes('15分钟') ||
                    market.name?.toLowerCase().includes('15m') ||
                    market.name?.toLowerCase().includes('15分钟')) {
                  console.log(`   ✅ 通过 gammaApi 找到市场: ${market.slug || market.name || 'N/A'}`);
                  return market;
                }
              }
            } catch (e: any) {
              // 继续尝试下一个方法
              if (!e?.message?.includes('not a function')) {
                console.log(`   ⚠️  ${methodName} 失败: ${e?.message || e}`);
              }
            }
          }
        }
      } catch (e: any) {
        console.log(`   ⚠️  gammaApi 搜索失败: ${e?.message || e}`);
      }
    }

    console.warn(`   ⚠️  未找到 ${coin} 15分钟市场`);
    console.warn(`   提示：可以手动设置 ARBITRAGE_CONDITION_ID 环境变量来指定市场`);
    return null;
  } catch (error: any) {
    console.error(`   ❌ 查找市场失败:`, error?.message || error);
    return null;
  }
}

// 市场关闭标记（避免重复尝试已关闭的市场）
let marketClosedTokens = new Set<string>();

// 连续404计数（用于触发市场切换）
let consecutive404Count = 0;
const MAX_CONSECUTIVE_404 = 2; // 连续2次404就切换市场

// 探测token是否在CLOB可交易（探针函数）
async function probeTokenTradable(tokenId: string): Promise<boolean> {
  try {
    // 方法1: 先用轻量的price接口探测（更快更轻量）
    try {
      const priceUrl = `https://clob.polymarket.com/price?token_id=${tokenId}&side=buy`;
      const priceRes = await fetch(priceUrl);
      if (priceRes.status === 200) {
        return true; // 可交易
      }
      if (priceRes.status === 404) {
        return false; // 不可交易
      }
    } catch (e) {
      // 继续尝试book接口
    }

    // 方法2: 用book接口探测（兜底）
    const bookUrl = `https://clob.polymarket.com/book?token_id=${tokenId}`;
    const bookRes = await fetch(bookUrl);
    if (bookRes.status === 200) {
      return true; // 可交易
    }
    if (bookRes.status === 404) {
      return false; // 不可交易
    }

    // 其他状态码，保守返回false
    return false;
  } catch (error: any) {
    // 网络错误等，保守返回false
    return false;
  }
}

// 不可交易的市场slug缓存（避免重复尝试）
const nonTradableSlugs = new Set<string>();

// 确保获取到可交易的15分钟市场
async function ensureWorkingMarket(coin: string): Promise<any> {
  console.log(`   🔍 正在查找最新的可交易 ${coin} 15分钟市场...`);
  
  // 最多尝试10次
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      // 获取最新的15分钟市场（确保是active/open状态）
      // 传入已尝试过的不可交易slug列表，避免重复尝试
      const market = await findLatestActive15mMarket(coin, nonTradableSlugs);
      
      if (!market || !market.clobTokenIds || market.clobTokenIds.length < 2) {
        console.log(`   ⚠️  第 ${attempt + 1} 次尝试：未找到有效的市场数据`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // 如果这个市场已经在不可交易列表中，跳过
      const marketSlug = market.slug || market.name || '';
      if (nonTradableSlugs.has(marketSlug)) {
        console.log(`   ⚠️  第 ${attempt + 1} 次尝试：市场 ${marketSlug} 已在不可交易列表，跳过`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const [upTokenId, downTokenId] = market.clobTokenIds.map((id: any) => String(id));

      // 探测两个token是否都可交易
      console.log(`   🔍 探测市场可交易性...`);
      const upTradable = await probeTokenTradable(upTokenId);
      const downTradable = await probeTokenTradable(downTokenId);

      if (upTradable && downTradable) {
        console.log(`   ✅ 找到可交易的市场: ${marketSlug}`);
        // 清除关闭标记
        marketClosedTokens.clear();
        consecutive404Count = 0;
        // 从不可交易列表中移除（如果存在）
        nonTradableSlugs.delete(marketSlug);
        return market;
      } else {
        console.log(`   ⚠️  第 ${attempt + 1} 次尝试：市场在CLOB不可交易`);
        console.log(`      UP token 可交易: ${upTradable ? '✅' : '❌'}`);
        console.log(`      DOWN token 可交易: ${downTradable ? '✅' : '❌'}`);
        // 添加到不可交易列表
        if (marketSlug) {
          nonTradableSlugs.add(marketSlug);
          console.log(`   💡 已标记市场 ${marketSlug} 为不可交易，将跳过此市场`);
        }
      }

      // 等待一段时间再尝试（避免API限流）
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.log(`   ⚠️  第 ${attempt + 1} 次尝试失败: ${error?.message || error}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`找不到可交易的 ${coin} 15分钟市场（CLOB侧无订单簿）`);
}

// 查找最新的活跃15分钟市场（确保是active/open状态）
async function findLatestActive15mMarket(coin: string, skipSlugs?: Set<string>): Promise<any> {
  if (!sdk) {
    return null;
  }

  try {
    // 如果指定了EVENT_SLUG，先检查是否在跳过列表中
    if (EVENT_SLUG && skipSlugs && skipSlugs.has(EVENT_SLUG)) {
      console.log(`   ⚠️  指定的事件slug ${EVENT_SLUG} 已在不可交易列表，跳过并搜索最新市场`);
      // 继续执行下面的搜索逻辑，不再使用指定的slug
    } else if (EVENT_SLUG && (!skipSlugs || !skipSlugs.has(EVENT_SLUG))) {
      // 如果指定了EVENT_SLUG且不在跳过列表中，先尝试使用它
      console.log(`   🔍 优先使用指定的事件 slug: ${EVENT_SLUG}`);
      const marketBySlug = await getMarketByEventSlug(EVENT_SLUG);
      if (marketBySlug) {
        // 检查市场状态
        const status = await checkMarketStatus(marketBySlug);
        if (status === 'active' || status === 'open') {
          console.log(`   ✅ 通过事件 slug 成功获取市场（状态: ${status}）`);
          return marketBySlug;
        } else {
          console.log(`   ⚠️  指定的事件slug对应的市场状态为 ${status}，搜索最新市场...`);
        }
      } else {
        console.log(`   ⚠️  通过指定的事件slug获取失败，搜索最新市场...`);
      }
    }

    // 方法1: 使用Gamma API搜索最新的活跃市场
    try {
      console.log(`   🔍 通过Gamma API搜索最新的活跃 ${coin} 15分钟市场...`);
      const searchUrl = `https://gamma-api.polymarket.com/public-search?query=${encodeURIComponent(`${coin} 15m`)}&limit=50`;
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        const markets = data?.markets || data?.results || data || [];
        
        // 过滤出15分钟市场，并按活跃状态和时间排序
        const active15mMarkets = markets
          .filter((m: any) => {
            const is15m = m.duration === '15m' || 
                         m.duration === '15分钟' || 
                         m.slug?.includes('15m') || 
                         m.slug?.includes('15分钟') ||
                         m.name?.toLowerCase().includes('15m') ||
                         m.name?.toLowerCase().includes('15分钟');
            
            // 优先选择active/open状态的市场
            const isActive = m.active === true || 
                            m.status === 'active' || 
                            m.status === 'open' ||
                            m.active === undefined; // 如果没有状态字段，也尝试
            
            // 跳过不可交易的市场
            const marketSlug = m.slug || m.name || '';
            const shouldSkip = skipSlugs && skipSlugs.has(marketSlug);
            
            return is15m && isActive && !shouldSkip;
          })
          .sort((a: any, b: any) => {
            // 按创建时间或开始时间排序，最新的在前
            const timeA = a.startDate || a.createdAt || a.startTime || 0;
            const timeB = b.startDate || b.createdAt || b.startTime || 0;
            return timeB - timeA; // 降序
          });

        // 遍历市场列表，找到第一个不在跳过列表中的
        for (const market of active15mMarkets) {
          const marketSlug = market.slug || market.name || '';
          if (skipSlugs && skipSlugs.has(marketSlug)) {
            continue; // 跳过不可交易的市场
          }
          
          console.log(`   ✅ 找到最新的活跃市场: ${marketSlug}`);
          
          // 如果市场没有完整的clobTokenIds，通过Gamma API获取
          if (!market.clobTokenIds && market.slug) {
            const tokenData = await getTokenIdsFromGammaAPI(market.slug);
            if (tokenData) {
              market.clobTokenIds = [tokenData.yesTokenId, tokenData.noTokenId];
              if (!market.tokens) {
                market.tokens = [];
              }
              if (tokenData.yesTokenId) {
                market.tokens.push({
                  tokenId: tokenData.yesTokenId,
                  id: tokenData.yesTokenId,
                  outcome: 'Yes',
                });
              }
              if (tokenData.noTokenId) {
                market.tokens.push({
                  tokenId: tokenData.noTokenId,
                  id: tokenData.noTokenId,
                  outcome: 'No',
                });
              }
            }
          }
          
          return market;
        }
      }
    } catch (e: any) {
      console.log(`   ⚠️  Gamma API搜索失败: ${e?.message || e}`);
    }

    // 方法2: 回退到原有的查找逻辑（但不使用指定的EVENT_SLUG如果它在跳过列表中）
    if (EVENT_SLUG && skipSlugs && skipSlugs.has(EVENT_SLUG)) {
      // 临时清除EVENT_SLUG，避免使用不可交易的slug
      const originalEventSlug = EVENT_SLUG;
      (process.env as any).ARBITRAGE_EVENT_SLUG = '';
      try {
        const market = await find15mMarket(coin);
        (process.env as any).ARBITRAGE_EVENT_SLUG = originalEventSlug;
        return market;
      } catch (e) {
        (process.env as any).ARBITRAGE_EVENT_SLUG = originalEventSlug;
        throw e;
      }
    }
    
    return await find15mMarket(coin);
  } catch (error: any) {
    console.error(`   ❌ 查找最新活跃市场失败:`, error?.message || error);
    return null;
  }
}

// 获取当前市场价格
async function getCurrentPrice(tokenId: string): Promise<number | null> {
  if (!sdk) {
    return null;
  }

  // 如果该token已被标记为市场关闭，直接返回null，避免重复尝试
  if (marketClosedTokens.has(tokenId)) {
    return null;
  }

  try {
    // 方法1: 使用实时服务获取价格（WebSocket，最可靠）
    if (sdk.realtime) {
      try {
        const price = sdk.realtime.getPrice(tokenId);
        if (price !== null && price !== undefined) {
          const priceNum = parseFloat(price.toString());
          if (!isNaN(priceNum) && priceNum > 0) {
            return priceNum;
          }
        }
      } catch (e: any) {
        // 继续尝试其他方法
      }
    }

    // 方法2: 从市场数据获取（如果市场对象中有价格）
    if (currentMarket && currentMarket.tokens) {
      const token = currentMarket.tokens.find((t: any) => 
        t.tokenId === tokenId || t.id === tokenId
      );
      if (token && token.price !== undefined) {
        const priceNum = parseFloat(token.price.toString());
        if (!isNaN(priceNum) && priceNum > 0) {
          return priceNum;
        }
      }
    }

    // 方法3: 使用订单簿获取（如果订单簿存在）
    // 注意：如果市场已关闭，订单簿可能不存在，所以放在最后
    if (sdk.tradingService && currentMarket?.conditionId) {
      try {
        // 尝试通过 conditionId 获取订单簿
        const orderbook = await sdk.getOrderbook(currentMarket.conditionId);
        if (orderbook) {
          // 尝试从订单簿中找到对应 token 的价格
          if (orderbook.bids && orderbook.bids.length > 0) {
            const bestBid = orderbook.bids[0];
            if (bestBid && bestBid.price !== undefined) {
              const priceNum = parseFloat(bestBid.price.toString());
              if (!isNaN(priceNum) && priceNum > 0) {
                return priceNum;
              }
            }
          }
          // 或者从订单簿的 tokens 中查找
          if (orderbook.tokens) {
            const token = orderbook.tokens.find((t: any) => 
              t.tokenId === tokenId || t.id === tokenId
            );
            if (token && token.price !== undefined) {
              const priceNum = parseFloat(token.price.toString());
              if (!isNaN(priceNum) && priceNum > 0) {
                return priceNum;
              }
            }
          }
        }
      } catch (e: any) {
        // 订单簿不存在或获取失败（404错误），标记为市场关闭
        if (e?.message?.includes('No orderbook') || 
            e?.message?.includes('404') || 
            e?.status === 404 ||
            e?.response?.status === 404) {
          // 标记该token的市场已关闭，避免重复尝试
          marketClosedTokens.add(tokenId);
          // 静默失败，不输出错误
          return null;
        }
      }
    }

    // 方法4: 尝试通过 Gamma API 获取最新价格
    if (currentMarket?.slug) {
      try {
        const marketUrl = `https://gamma-api.polymarket.com/markets?slug=${currentMarket.slug}`;
        const response = await fetch(marketUrl);
        if (response.ok) {
          const marketData = await response.json();
          const market = Array.isArray(marketData) ? marketData[0] : marketData;
          if (market && market.outcomes) {
            const normalizedOutcomes = normalizeOutcomes(market.outcomes);
            const outcome = normalizedOutcomes.find((o: any) => {
              // 尝试匹配 tokenId
              if (o.tokenId === tokenId) return true;
              // 或者通过索引匹配（第一个是 YES/UP，第二个是 NO/DOWN）
              const index = currentMarket.clobTokenIds?.indexOf(tokenId);
              if (index !== undefined && index >= 0 && index < normalizedOutcomes.length) {
                return normalizedOutcomes[index] === o;
              }
              return false;
            });
            if (outcome && outcome.price !== undefined) {
              const priceNum = parseFloat(outcome.price.toString());
              if (!isNaN(priceNum) && priceNum > 0) {
                return priceNum;
              }
            }
          }
        }
      } catch (e: any) {
        // 静默失败
      }
    }

    return null;
  } catch (error: any) {
    // 不输出详细错误，避免日志过多
    return null;
  }
}

// 纯套利策略：买入代币（指定shares数量）
async function buyTokenPureArbitrage(tokenId: string, market: any, side: 'YES' | 'NO', price: number, shares: number): Promise<boolean> {
  if (!sdk || !sdk.tradingService) {
    console.error('   ❌ SDK 或 TradingService 未初始化');
    return false;
  }

  try {
    if (DRY_RUN) {
      // 模拟模式
      positions.set(tokenId, {
        tokenId,
        conditionId: market.conditionId || '',
        marketSlug: market.slug || market.name || '',
        buyPrice: price,
        buyTime: new Date(),
        amount: shares,
        side,
      });
      return true;
    }
    
    // 实盘买入
    try {
      // 计算需要的USDC金额
      const usdcAmount = price * shares;
      
      // 使用市场订单（FAK - Fill and Kill）
      const order = await sdk.tradingService.createMarketOrder({
        tokenId,
        side: 'BUY',
        amount: usdcAmount, // USDC金额
        orderType: 'FAK',
      });

      if (order && order.id) {
        // 计算实际买入的shares数量
        const actualShares = order.filledSize || (order.filled || shares);
        
        positions.set(tokenId, {
          tokenId,
          conditionId: market.conditionId || '',
          marketSlug: market.slug || market.name || '',
          buyPrice: price,
          buyTime: new Date(),
          amount: actualShares,
          side,
        });
        return true;
      } else {
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

// 买入代币（价格阈值策略）
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
    // 获取市场的 YES/UP 和 NO/DOWN 代币（只使用 clobTokenIds）
    let yesTokenId: string | null = null;
    let noTokenId: string | null = null;
    
    // 方法1（最优先）: 直接从 clobTokenIds 获取（这是官方 CLOB 代币ID）
    if (currentMarket.clobTokenIds) {
      // 确保 clobTokenIds 是数组
      let clobTokenIds: string[] = [];
      if (Array.isArray(currentMarket.clobTokenIds)) {
        clobTokenIds = currentMarket.clobTokenIds.map((id: any) => String(id));
      } else if (typeof currentMarket.clobTokenIds === 'string') {
        // 如果是字符串，尝试解析
        try {
          const parsed = JSON.parse(currentMarket.clobTokenIds);
          if (Array.isArray(parsed)) {
            clobTokenIds = parsed.map((id: any) => String(id));
          }
        } catch (e) {
          // 解析失败
        }
      }
      
      if (clobTokenIds.length >= 2) {
        yesTokenId = clobTokenIds[0];
        noTokenId = clobTokenIds[1];
        // 验证 tokenId 格式（应该是纯数字字符串）
        if (yesTokenId && noTokenId && /^\d+$/.test(yesTokenId) && /^\d+$/.test(noTokenId)) {
          // Token IDs 有效，继续使用
        } else {
          console.warn(`   ⚠️  clobTokenIds 格式异常（不是纯数字），尝试其他方法...`);
          yesTokenId = null;
          noTokenId = null;
        }
      }
    }
    
    // 方法2: 如果 clobTokenIds 不可用，尝试从 tokens 数组获取（但优先验证格式）
    if ((!yesTokenId || !noTokenId) && currentMarket.tokens && currentMarket.tokens.length >= 2) {
      const yesToken = currentMarket.tokens.find((t: any) => 
        t.outcome === 'Yes' || t.outcome === 'YES' || t.outcome === 'Up' || t.outcome === 'UP'
      );
      const noToken = currentMarket.tokens.find((t: any) => 
        t.outcome === 'No' || t.outcome === 'NO' || t.outcome === 'Down' || t.outcome === 'DOWN'
      );
      
      if (yesToken && noToken) {
        const yesId = yesToken.tokenId || yesToken.id;
        const noId = noToken.tokenId || noToken.id;
        // 验证格式
        if (yesId && noId && /^\d+$/.test(yesId) && /^\d+$/.test(noId)) {
          yesTokenId = yesId;
          noTokenId = noId;
        }
      }
    }
    
    // 方法3: 如果还是没有，尝试通过 Gamma API 获取
    if ((!yesTokenId || !noTokenId) && currentMarket.slug) {
      console.log(`   🔍 市场缺少有效的 clobTokenIds，尝试通过 Gamma API 获取...`);
      const tokenData = await getTokenIdsFromGammaAPI(currentMarket.slug);
      if (tokenData && tokenData.yesTokenId && tokenData.noTokenId) {
        // 验证格式
        if (/^\d+$/.test(tokenData.yesTokenId) && /^\d+$/.test(tokenData.noTokenId)) {
          yesTokenId = tokenData.yesTokenId;
          noTokenId = tokenData.noTokenId;
          // 更新市场对象
          currentMarket.clobTokenIds = [yesTokenId, noTokenId];
          if (!currentMarket.tokens) {
            currentMarket.tokens = [];
          }
          currentMarket.tokens.push({ tokenId: yesTokenId, id: yesTokenId, outcome: 'Yes' });
          currentMarket.tokens.push({ tokenId: noTokenId, id: noTokenId, outcome: 'No' });
        }
      }
    }

    if (!yesTokenId || !noTokenId) {
      console.error(`   ❌ 无法获取有效的 clobTokenIds（必需字段）`);
      console.error(`   提示：请检查市场数据是否完整，或尝试更新 ARBITRAGE_EVENT_SLUG`);
      return;
    }
    
    // 验证 tokenId 格式（CLOB tokenId 应该是纯数字字符串）
    if (!/^\d+$/.test(yesTokenId) || !/^\d+$/.test(noTokenId)) {
      console.error(`   ❌ Token ID 格式错误（应该是纯数字）`);
      console.error(`   YES Token ID: ${yesTokenId?.substring(0, 20)}...`);
      console.error(`   NO Token ID: ${noTokenId?.substring(0, 20)}...`);
      return;
    }

    // 获取当前价格
    const yesPrice = await getCurrentPrice(yesTokenId);
    const noPrice = await getCurrentPrice(noTokenId);

    // 如果无法获取价格，检查市场是否在CLOB可交易
    if (yesPrice === null && noPrice === null) {
      // 探测两个token是否在CLOB可交易
      const upTradable = await probeTokenTradable(yesTokenId);
      const downTradable = await probeTokenTradable(noTokenId);
      
      // 如果任意一个token不可交易（404），增加连续404计数
      if (!upTradable || !downTradable) {
        consecutive404Count++;
        
        console.warn(`   ⚠️  检测到CLOB订单簿不可用（404）`);
        console.warn(`      UP token 可交易: ${upTradable ? '✅' : '❌'}`);
        console.warn(`      DOWN token 可交易: ${downTradable ? '✅' : '❌'}`);
        console.warn(`      连续404次数: ${consecutive404Count}/${MAX_CONSECUTIVE_404}`);
        
        // 标记为不可交易
        if (!upTradable) marketClosedTokens.add(yesTokenId);
        if (!downTradable) marketClosedTokens.add(noTokenId);
        
        // 如果连续404达到阈值，切换到最新市场
        if (consecutive404Count >= MAX_CONSECUTIVE_404) {
          console.warn(`   🔄 连续${MAX_CONSECUTIVE_404}次404，切换到最新可交易市场...`);
          
          try {
            // 获取最新的可交易市场
            const newMarket = await ensureWorkingMarket(MARKET_COIN);
            
            if (newMarket && newMarket.slug !== currentMarket.slug) {
              console.log(`   ✅ 已切换到新市场: ${newMarket.slug || newMarket.name || 'N/A'}`);
              currentMarket = newMarket;
              
              // 清除关闭标记，重置计数
              marketClosedTokens.clear();
              consecutive404Count = 0;
              
              // 重新订阅实时价格
              if (sdk.realtime && newMarket.tokens) {
                const tokenIds = newMarket.tokens
                  .map((t: any) => t.tokenId || t.id)
                  .filter(Boolean);
                if (tokenIds.length > 0) {
                  sdk.realtime.subscribeMarket(tokenIds);
                  console.log(`   ✅ 已订阅新市场的实时价格更新`);
                }
              }
              
              // 继续下一次循环（使用新市场）
              return;
            } else {
              console.error(`   ❌ 无法切换到新市场，请检查网络或手动更新 ARBITRAGE_EVENT_SLUG`);
            }
          } catch (error: any) {
            console.error(`   ❌ 切换市场失败: ${error?.message || error}`);
            console.error(`   💡 提示：请手动更新 ARBITRAGE_EVENT_SLUG 环境变量`);
          }
        }
      } else {
        // 如果可交易，重置404计数
        consecutive404Count = 0;
      }
      
      return;
    } else {
      // 如果成功获取价格，重置404计数
      consecutive404Count = 0;
    }
    
    // 如果只有一个价格获取失败，使用另一个价格推算（YES + NO = 1）
    let finalYesPrice = yesPrice;
    let finalNoPrice = noPrice;
    
    if (yesPrice === null && noPrice !== null) {
      finalYesPrice = Math.max(0, Math.min(1, 1 - noPrice));
      console.log(`   ⚠️  YES 价格不可用，使用推算值: $${finalYesPrice.toFixed(4)} (基于 NO: $${noPrice.toFixed(4)})`);
    } else if (noPrice === null && yesPrice !== null) {
      finalNoPrice = Math.max(0, Math.min(1, 1 - yesPrice));
      console.log(`   ⚠️  NO 价格不可用，使用推算值: $${finalNoPrice.toFixed(4)} (基于 YES: $${yesPrice.toFixed(4)})`);
    }
    
    // 确保价格有效
    if (finalYesPrice === null || finalNoPrice === null) {
      console.warn(`   ⚠️  价格数据不完整，跳过本次检查`);
      return;
    }

    // 纯套利策略：检查 UP + DOWN 总成本
    if (USE_PURE_ARBITRAGE) {
      const totalCost = finalYesPrice + finalNoPrice;
      
      // 检查是否已有持仓（纯套利需要同时持有UP和DOWN）
      const yesPosition = positions.get(yesTokenId);
      const noPosition = positions.get(noTokenId);
      const hasBothPositions = yesPosition && noPosition;
      
      if (hasBothPositions) {
        // 已有持仓，等待市场结束或价格回归
        const holdingTime = Math.floor((Date.now() - yesPosition.buyTime.getTime()) / 60000);
        console.log(`   📊 纯套利持仓中`);
        console.log(`      UP: $${finalYesPrice.toFixed(4)} | DOWN: $${finalNoPrice.toFixed(4)}`);
        console.log(`      总成本: $${(yesPosition.buyPrice + noPosition.buyPrice).toFixed(4)}`);
        console.log(`      当前总价: $${totalCost.toFixed(4)}`);
        console.log(`      已持仓: ${holdingTime} 分钟`);
        console.log(`      预期利润: $${(1.00 - (yesPosition.buyPrice + noPosition.buyPrice)).toFixed(4)} per share`);
      } else if (totalCost < ARBITRAGE_COST_THRESHOLD) {
        // 检测到套利机会
        stats.totalOpportunities++;
        const profitPerShare = 1.00 - totalCost;
        const profitPercent = (profitPerShare / totalCost) * 100;
        const totalInvestment = totalCost * ORDER_SIZE;
        const expectedPayout = 1.00 * ORDER_SIZE;
        const expectedProfit = profitPerShare * ORDER_SIZE;
        
        console.log('\n🎯 纯套利机会检测到！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   UP 价格: $${finalYesPrice.toFixed(4)}`);
        console.log(`   DOWN 价格: $${finalNoPrice.toFixed(4)}`);
        console.log(`   总成本: $${totalCost.toFixed(4)}`);
        console.log(`   利润/股: $${profitPerShare.toFixed(4)}`);
        console.log(`   利润率: ${profitPercent.toFixed(2)}%`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   订单大小: ${ORDER_SIZE} shares (每边)`);
        console.log(`   总投入: $${totalInvestment.toFixed(4)}`);
        console.log(`   预期收益: $${expectedPayout.toFixed(4)}`);
        console.log(`   预期利润: $${expectedProfit.toFixed(4)}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // 同时买入UP和DOWN
        const buyYes = await buyTokenPureArbitrage(yesTokenId, currentMarket, 'YES', finalYesPrice, ORDER_SIZE);
        const buyNo = await buyTokenPureArbitrage(noTokenId, currentMarket, 'NO', finalNoPrice, ORDER_SIZE);
        
        if (buyYes && buyNo) {
          stats.totalTrades += 2;
          stats.successfulTrades += 2;
          stats.totalInvested += totalInvestment;
          
          // 记录交易
          stats.trades.push({
            timestamp: new Date(),
            marketSlug: currentMarket.slug || currentMarket.name || '',
            side: 'BOTH',
            buyPrice: totalCost,
            amount: ORDER_SIZE,
            invested: totalInvestment,
          });
          
          console.log(`   ✅ 纯套利执行成功！`);
        } else {
          console.log(`   ⚠️  纯套利执行部分失败`);
        }
      } else {
        console.log(`   📊 扫描中... UP: $${finalYesPrice.toFixed(4)} + DOWN: $${finalNoPrice.toFixed(4)} = $${totalCost.toFixed(4)} (需要 < $${ARBITRAGE_COST_THRESHOLD.toFixed(2)})`);
      }
    } else {
      // 价格阈值策略（原有逻辑）
      // 检查 YES 代币
      const yesPosition = positions.get(yesTokenId);
      if (yesPosition) {
        // 已有持仓，检查卖出条件
        if (finalYesPrice >= SELL_PRICE) {
          await sellToken(yesPosition, finalYesPrice);
        } else {
          const holdingTime = Math.floor((Date.now() - yesPosition.buyTime.getTime()) / 60000);
          console.log(`   📊 YES: 价格 $${finalYesPrice.toFixed(4)} (持仓中，等待卖出，已持仓 ${holdingTime} 分钟)`);
        }
      } else {
        // 无持仓，检查买入条件
        if (finalYesPrice <= BUY_PRICE) {
          await buyToken(yesTokenId, currentMarket, 'YES', finalYesPrice);
        } else {
          console.log(`   📊 YES: 价格 $${finalYesPrice.toFixed(4)} (等待买入，阈值 $${BUY_PRICE.toFixed(2)})`);
        }
      }

      // 检查 NO 代币
      const noPosition = positions.get(noTokenId);
      if (noPosition) {
        // 已有持仓，检查卖出条件
        if (finalNoPrice >= SELL_PRICE) {
          await sellToken(noPosition, finalNoPrice);
        } else {
          const holdingTime = Math.floor((Date.now() - noPosition.buyTime.getTime()) / 60000);
          console.log(`   📊 NO: 价格 $${finalNoPrice.toFixed(4)} (持仓中，等待卖出，已持仓 ${holdingTime} 分钟)`);
        }
      } else {
        // 无持仓，检查买入条件
        if (finalNoPrice <= BUY_PRICE) {
          await buyToken(noTokenId, currentMarket, 'NO', finalNoPrice);
        } else {
          console.log(`   📊 NO: 价格 $${finalNoPrice.toFixed(4)} (等待买入，阈值 $${BUY_PRICE.toFixed(2)})`);
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

  try {
    // 初始化 SDK
    console.log('🚀 正在初始化 SDK...');
    sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 查找15分钟市场
    if (EVENT_SLUG) {
      console.log(`🔍 查找市场（优先使用事件 slug: ${EVENT_SLUG}）...`);
    } else {
      console.log(`🔍 正在自动查找 ${MARKET_COIN} 15分钟市场...`);
    }
    
    // 确保 DipArb 服务已停止（避免冲突）
    if (sdk.dipArb && typeof sdk.dipArb.stop === 'function') {
      try {
        await sdk.dipArb.stop();
        // 等待一小段时间确保服务完全停止
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`   🔄 已确保 DipArb 服务已停止`);
      } catch (e: any) {
        // 如果停止失败（可能没有运行），继续
        if (!e?.message?.includes('not running')) {
          console.log(`   ⚠️  停止 DipArb 服务时出错: ${e?.message || e}`);
        }
      }
    }
    
    // 使用统一的查找函数，确保获取到可交易的市场
    // 如果设置了 EVENT_SLUG，优先使用，但如果不可交易会被标记并跳过
    // ensureWorkingMarket 会自动处理不可交易的市场，避免重复尝试
    currentMarket = await ensureWorkingMarket(MARKET_COIN);

    // 如果找不到市场，尝试使用手动指定的代币ID或条件ID
    if (!currentMarket) {
      const tokenId = process.env.ARBITRAGE_TOKEN_ID;
      const conditionId = process.env.ARBITRAGE_CONDITION_ID;
      
      if (tokenId || conditionId) {
        console.log(`\n🔍 尝试使用手动指定的 ${tokenId ? '代币ID' : '条件ID'}...`);
        
        try {
          if (conditionId && sdk.markets) {
            // 通过条件ID获取市场
            const market = await sdk.markets.getMarket(conditionId);
            if (market) {
              currentMarket = market;
              console.log(`✅ 通过条件ID找到市场: ${market.slug || market.name || 'N/A'}`);
            }
          } else if (tokenId) {
            // 如果有代币ID，尝试通过代币获取市场信息
            // 注意：这需要从代币ID推断条件ID，可能需要其他方法
            console.log(`   ⚠️  仅提供代币ID时，需要手动设置条件ID或市场slug`);
            console.error(`❌ 未找到市场，请手动设置 ARBITRAGE_CONDITION_ID 环境变量`);
            process.exit(1);
          }
        } catch (e: any) {
          console.error(`   ❌ 使用手动ID查找市场失败: ${e?.message || e}`);
        }
      }
      
      if (!currentMarket) {
        console.error(`\n❌ 未找到 ${MARKET_COIN} 15分钟市场`);
        console.error('   解决方案：');
        console.error('   1. 检查市场是否存在，或尝试其他币种（ETH, BTC, SOL等）');
        console.error('   2. 手动设置 ARBITRAGE_CONDITION_ID 环境变量（市场的条件ID）');
        console.error('   3. 或者设置 ARBITRAGE_TOKEN_ID 和 ARBITRAGE_CONDITION_ID 环境变量');
        process.exit(1);
      }
    }

    // 显示市场信息（类似 DipArb 的输出格式）
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 已启动监控市场');
    const marketName = currentMarket.name || currentMarket.slug || currentMarket.question || 'N/A';
    console.log(`   市场: ${marketName}`);
    console.log(`   币种: ${MARKET_COIN}`);
    console.log(`   周期: 15分钟`);
    if (currentMarket.conditionId) {
      console.log(`   条件ID: ${currentMarket.conditionId}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 如果市场没有 Token IDs，尝试通过 Gamma API 获取
    if ((!currentMarket.clobTokenIds || !currentMarket.tokens || currentMarket.tokens.length < 2) && currentMarket.slug) {
      console.log(`   🔍 通过 Gamma API 获取 Token IDs...`);
      const tokenData = await getTokenIdsFromGammaAPI(currentMarket.slug);
      if (tokenData) {
        currentMarket.clobTokenIds = [tokenData.yesTokenId, tokenData.noTokenId];
        if (!currentMarket.tokens) {
          currentMarket.tokens = [];
        }
        if (tokenData.yesTokenId && !currentMarket.tokens.find((t: any) => t.tokenId === tokenData.yesTokenId)) {
          currentMarket.tokens.push({
            tokenId: tokenData.yesTokenId,
            id: tokenData.yesTokenId,
            outcome: 'Yes',
          });
        }
        if (tokenData.noTokenId && !currentMarket.tokens.find((t: any) => t.tokenId === tokenData.noTokenId)) {
          currentMarket.tokens.push({
            tokenId: tokenData.noTokenId,
            id: tokenData.noTokenId,
            outcome: 'No',
          });
        }
        console.log(`   ✅ 已获取 Token IDs`);
      }
    }
    
    // 获取并显示代币信息
    if (currentMarket.tokens && currentMarket.tokens.length >= 2) {
      const yesToken = currentMarket.tokens.find((t: any) => 
        t.outcome === 'Yes' || t.outcome === 'YES' || t.outcome === 'Up' || t.outcome === 'UP'
      );
      const noToken = currentMarket.tokens.find((t: any) => 
        t.outcome === 'No' || t.outcome === 'NO' || t.outcome === 'Down' || t.outcome === 'DOWN'
      );
      
      if (yesToken && noToken) {
        const yesPrice = yesToken.price || 0;
        const noPrice = noToken.price || 0;
        console.log(`📊 当前价格:`);
        console.log(`   ${yesToken.outcome || 'YES'}: $${yesPrice.toFixed(4)}`);
        console.log(`   ${noToken.outcome || 'NO'}: $${noPrice.toFixed(4)}`);
        if (yesToken.tokenId) {
          console.log(`   YES Token ID: ${yesToken.tokenId.substring(0, 20)}...`);
        }
        if (noToken.tokenId) {
          console.log(`   NO Token ID: ${noToken.tokenId.substring(0, 20)}...`);
        }
        console.log('');
      } else if (currentMarket.clobTokenIds && currentMarket.clobTokenIds.length >= 2) {
        // 如果 tokens 数组没有，但 clobTokenIds 有，显示 Token IDs
        console.log(`📊 Token IDs:`);
        console.log(`   YES Token ID: ${currentMarket.clobTokenIds[0].substring(0, 20)}...`);
        console.log(`   NO Token ID: ${currentMarket.clobTokenIds[1].substring(0, 20)}...`);
        console.log('');
      }
    }
    
    // 订阅实时价格更新
    if (sdk.realtime && currentMarket.tokens) {
      const tokenIds = currentMarket.tokens
        .map((t: any) => t.tokenId || t.id)
        .filter(Boolean);
      
      if (tokenIds.length > 0) {
        sdk.realtime.subscribeMarket(tokenIds);
        console.log(`✅ 已订阅实时价格更新（Chainlink 价格）\n`);
      }
    }

    console.log('🚀 开始套利策略监控...');
    console.log('   策略: 赔率80买（价格<=0.80买入），90卖（价格>=0.90卖出）');
    console.log('   按 Ctrl+C 可以优雅停止\n');

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
      
      // 显示统计信息
      printStats();
      
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
