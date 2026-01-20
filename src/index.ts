import { PolySDK } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 解析目标地址（可选）
const targetAddressesStr = process.env.TARGET_ADDRESSES;
const targetAddresses = targetAddressesStr 
  ? targetAddressesStr.split(',').map(addr => addr.trim()).filter(Boolean)
  : undefined;

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 初始化 SDK
const sdk = new PolySDK({ privateKey });

// 交易记录
interface TradeRecord {
  timestamp: Date;
  targetAddress: string;
  marketId: string;
  side: string;
  amount: number;
  price: string;
  success: boolean;
}

// 统计信息
interface TradingStats {
  totalTrades: number;
  totalVolume: number;
  successfulTrades: number;
  failedTrades: number;
  startTime: Date;
  trades: TradeRecord[];
  // 按地址统计
  byAddress: Map<string, { count: number; volume: number; success: number }>;
  // 按市场统计
  byMarket: Map<string, { count: number; volume: number; success: number }>;
  // 按方向统计
  bySide: Map<string, { count: number; volume: number; success: number }>;
  // 交易金额统计
  amounts: number[];
}

const stats: TradingStats = {
  totalTrades: 0,
  totalVolume: 0,
  successfulTrades: 0,
  failedTrades: 0,
  startTime: new Date(),
  trades: [],
  byAddress: new Map(),
  byMarket: new Map(),
  bySide: new Map(),
  amounts: [],
};

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 聪明钱自动跟单系统');
  console.log('═══════════════════════════════════════════════════\n');
}

// 打印配置信息
function printConfig() {
  console.log('📋 配置信息：');
  console.log(`   模式: ${dryRun ? '🔍 模拟模式 (Dry Run)' : '💰 实盘模式'}`);
  console.log(`   跟随规模: 10% (sizeScale: 0.1)`);
  console.log(`   最大单笔金额: $10 USDC`);
  console.log(`   最大滑点: 3%`);
  console.log(`   订单类型: FOK (Fill or Kill)`);
  console.log(`   最小交易金额: $5 USDC（小于此金额不跟单）`);
  
  if (targetAddresses && targetAddresses.length > 0) {
    console.log(`   指定地址数量: ${targetAddresses.length}`);
    console.log(`   目标地址: ${targetAddresses.slice(0, 3).join(', ')}${targetAddresses.length > 3 ? '...' : ''}`);
  } else {
    console.log(`   跟随排行榜: 前 50 名`);
  }
  console.log('');
}

// 打印统计信息
function printStats() {
  const runtime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
  const hours = Math.floor(runtime / 3600);
  const minutes = Math.floor((runtime % 3600) / 60);
  const seconds = runtime % 60;
  const runtimeHours = runtime / 3600;
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 模拟跟单统计信息');
  console.log('═'.repeat(60));
  
  // 基础统计
  console.log('\n【基础统计】');
  console.log(`   运行时间: ${hours}h ${minutes}m ${seconds}s`);
  console.log(`   总交易数: ${stats.totalTrades}`);
  console.log(`   成功交易: ${stats.successfulTrades}`);
  console.log(`   失败交易: ${stats.failedTrades}`);
  console.log(`   总交易量: $${stats.totalVolume.toFixed(2)} USDC`);
  
  if (stats.totalTrades > 0) {
    const successRate = (stats.successfulTrades / stats.totalTrades) * 100;
    const avgAmount = stats.totalVolume / stats.successfulTrades;
    const tradesPerHour = stats.totalTrades / Math.max(runtimeHours, 0.01);
    
    console.log(`   成功率: ${successRate.toFixed(2)}%`);
    console.log(`   平均交易金额: $${avgAmount.toFixed(2)} USDC`);
    console.log(`   交易速率: ${tradesPerHour.toFixed(2)} 笔/小时`);
    
    // 交易金额统计
    if (stats.amounts.length > 0) {
      const sortedAmounts = [...stats.amounts].sort((a, b) => a - b);
      const minAmount = sortedAmounts[0];
      const maxAmount = sortedAmounts[sortedAmounts.length - 1];
      const medianAmount = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
      console.log(`   最小交易: $${minAmount.toFixed(2)} USDC`);
      console.log(`   最大交易: $${maxAmount.toFixed(2)} USDC`);
      console.log(`   中位交易: $${medianAmount.toFixed(2)} USDC`);
    }
  }
  
  // 按地址统计（Top 5）
  if (stats.byAddress.size > 0) {
    console.log('\n【按跟随地址统计 (Top 5)】');
    const addressStats = Array.from(stats.byAddress.entries())
      .map(([addr, data]) => ({
        address: addr.substring(0, 10) + '...' + addr.substring(addr.length - 8),
        ...data,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    addressStats.forEach((item, index) => {
      const successRate = item.count > 0 ? (item.success / item.count * 100).toFixed(1) : '0.0';
      console.log(`   ${index + 1}. ${item.address}`);
      console.log(`      交易数: ${item.count} | 交易量: $${item.volume.toFixed(2)} | 成功率: ${successRate}%`);
    });
  }
  
  // 按市场统计（Top 5）
  if (stats.byMarket.size > 0) {
    console.log('\n【按市场统计 (Top 5)】');
    const marketStats = Array.from(stats.byMarket.entries())
      .map(([market, data]) => ({
        market: market.length > 40 ? market.substring(0, 37) + '...' : market,
        ...data,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    marketStats.forEach((item, index) => {
      const successRate = item.count > 0 ? (item.success / item.count * 100).toFixed(1) : '0.0';
      console.log(`   ${index + 1}. ${item.market}`);
      console.log(`      交易数: ${item.count} | 交易量: $${item.volume.toFixed(2)} | 成功率: ${successRate}%`);
    });
  }
  
  // 按方向统计
  if (stats.bySide.size > 0) {
    console.log('\n【按方向统计】');
    const sideStats = Array.from(stats.bySide.entries())
      .sort((a, b) => b[1].count - a[1].count);
    
    sideStats.forEach(([side, data]) => {
      const successRate = data.count > 0 ? (data.success / data.count * 100).toFixed(1) : '0.0';
      const percentage = stats.totalTrades > 0 ? (data.count / stats.totalTrades * 100).toFixed(1) : '0.0';
      console.log(`   ${side}: ${data.count} 笔 (${percentage}%) | 交易量: $${data.volume.toFixed(2)} | 成功率: ${successRate}%`);
    });
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

// 保存统计信息到文件
function saveStatsToFile() {
  try {
    const statsDir = join(process.cwd(), 'stats');
    mkdirSync(statsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `stats-${timestamp}.json`;
    const filepath = join(statsDir, filename);
    
    // 准备要保存的数据
    const dataToSave = {
      summary: {
        totalTrades: stats.totalTrades,
        successfulTrades: stats.successfulTrades,
        failedTrades: stats.failedTrades,
        totalVolume: stats.totalVolume,
        successRate: stats.totalTrades > 0 
          ? ((stats.successfulTrades / stats.totalTrades) * 100).toFixed(2) + '%'
          : '0%',
        startTime: stats.startTime.toISOString(),
        endTime: new Date().toISOString(),
        runtime: Math.floor((Date.now() - stats.startTime.getTime()) / 1000),
      },
      byAddress: Object.fromEntries(
        Array.from(stats.byAddress.entries()).map(([addr, data]) => [
          addr,
          {
            ...data,
            successRate: data.count > 0 ? ((data.success / data.count) * 100).toFixed(2) + '%' : '0%',
          }
        ])
      ),
      byMarket: Object.fromEntries(
        Array.from(stats.byMarket.entries()).map(([market, data]) => [
          market,
          {
            ...data,
            successRate: data.count > 0 ? ((data.success / data.count) * 100).toFixed(2) + '%' : '0%',
          }
        ])
      ),
      bySide: Object.fromEntries(
        Array.from(stats.bySide.entries()).map(([side, data]) => [
          side,
          {
            ...data,
            successRate: data.count > 0 ? ((data.success / data.count) * 100).toFixed(2) + '%' : '0%',
          }
        ])
      ),
      amounts: {
        count: stats.amounts.length,
        total: stats.amounts.reduce((sum, amt) => sum + amt, 0),
        average: stats.amounts.length > 0 
          ? (stats.amounts.reduce((sum, amt) => sum + amt, 0) / stats.amounts.length).toFixed(2)
          : '0',
        min: stats.amounts.length > 0 ? Math.min(...stats.amounts).toFixed(2) : '0',
        max: stats.amounts.length > 0 ? Math.max(...stats.amounts).toFixed(2) : '0',
        median: stats.amounts.length > 0 
          ? [...stats.amounts].sort((a, b) => a - b)[Math.floor(stats.amounts.length / 2)].toFixed(2)
          : '0',
      },
      trades: stats.trades.map(t => ({
        ...t,
        timestamp: t.timestamp.toISOString(),
      })),
    };
    
    writeFileSync(filepath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    console.log(`\n💾 统计数据已保存到: ${filepath}\n`);
    return filepath;
  } catch (error: any) {
    console.error('⚠️  保存统计文件失败:', error?.message || error);
    return null;
  }
}

// 主函数
async function main() {
  printBanner();
  printConfig();

  try {
    // 检查钱包余额和授权状态
    console.log('🔍 正在检查钱包状态...');
    try {
      // 获取钱包地址
      const walletAddress = sdk.getAddress();
      console.log(`   钱包地址: ${walletAddress}`);
      
      // 检查 USDC.e 余额（如果 SDK 支持）
      if (typeof sdk.smartMoney.getBalance === 'function') {
        try {
          const balance = await sdk.smartMoney.getBalance();
          console.log(`   USDC.e 余额: $${balance || 'N/A'}`);
          
          if (balance && parseFloat(balance) < 5) {
            console.warn('   ⚠️  警告：余额可能不足，建议至少保留 $10 USDC.e');
          }
        } catch (e) {
          // 如果获取余额失败，继续执行
          console.log('   ⚠️  无法获取余额信息（某些 SDK 版本不支持）');
        }
      }
      
      // 授权 USDC.e
      console.log('🔐 正在授权 USDC.e...');
      try {
        await sdk.smartMoney.approveAll();
        console.log('✅ USDC.e 授权成功\n');
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '未知错误';
        console.error('⚠️  授权失败:', errorMsg);
        
        // 检查是否是余额不足的错误
        if (errorMsg.includes('balance') || errorMsg.includes('allowance') || errorMsg.includes('insufficient')) {
          console.error('\n❌ 错误：余额或授权不足！');
          console.error('   请检查：');
          console.error('   1. 钱包中是否有足够的 USDC.e（建议至少 $10）');
          console.error('   2. 网络是否连接正常');
          console.error('   3. 私钥是否正确');
          console.error('\n   如果是首次运行，请确保：');
          console.error('   - 钱包地址: 0x4599C8C95853A01c3E6d1DEe6cC2da1716c0cBA0');
          console.error('   - 钱包中有足够的 USDC.e 用于交易\n');
        } else {
          console.log('   如果已经授权过，可以忽略此错误\n');
        }
      }
    } catch (error: any) {
      console.error('⚠️  检查钱包状态失败:', error?.message || error);
      console.log('   继续尝试启动...\n');
    }

    // 准备跟单选项
    const copyTradingOptions = {
      sizeScale: 0.1,          // 跟随 10% 规模
      maxSizePerTrade: 10,     // 最大单笔 $10
      maxSlippage: 0.03,       // 最大滑点 3%
      orderType: 'FOK' as const, // Fill or Kill
      minTradeSize: 5,         // 最小交易 $5（小于此金额不跟单）
      dryRun,                  // 模拟模式
      ...(targetAddresses && targetAddresses.length > 0 
        ? { targetAddresses } 
        : { topN: 50 }),       // 如果没有指定地址，则跟随前 50 名
    };

    console.log('🚀 正在启动自动跟单系统...');
    console.log(`📦 跟单参数: minTradeSize=${copyTradingOptions.minTradeSize}, maxSizePerTrade=${copyTradingOptions.maxSizePerTrade}\n`);

    // 启动自动跟单
    const autoCopyTrading = await sdk.smartMoney.startAutoCopyTrading(copyTradingOptions);

    // 处理交易记录的函数
    const handleTrade = (trade: any) => {
      stats.totalTrades++;
      const timestamp = new Date();
      const targetAddr = trade.targetAddress || trade.address || 'unknown';
      const marketId = trade.marketId || trade.market || 'unknown';
      const side = trade.side || trade.position || 'unknown';
      const amount = parseFloat(trade.size || trade.amount || '0');
      const isSuccess = trade.status === 'success' || trade.success || false;
      
      // 记录交易
      const record: TradeRecord = {
        timestamp,
        targetAddress: targetAddr,
        marketId,
        side,
        amount: isSuccess ? amount : 0,
        price: trade.price || 'N/A',
        success: isSuccess,
      };
      stats.trades.push(record);
      
      // 更新成功/失败计数
      if (isSuccess) {
        stats.successfulTrades++;
        stats.totalVolume += amount;
        stats.amounts.push(amount);
      } else {
        stats.failedTrades++;
      }
      
      // 按地址统计
      if (!stats.byAddress.has(targetAddr)) {
        stats.byAddress.set(targetAddr, { count: 0, volume: 0, success: 0 });
      }
      const addrData = stats.byAddress.get(targetAddr)!;
      addrData.count++;
      if (isSuccess) {
        addrData.volume += amount;
        addrData.success++;
      }
      
      // 按市场统计
      if (!stats.byMarket.has(marketId)) {
        stats.byMarket.set(marketId, { count: 0, volume: 0, success: 0 });
      }
      const marketData = stats.byMarket.get(marketId)!;
      marketData.count++;
      if (isSuccess) {
        marketData.volume += amount;
        marketData.success++;
      }
      
      // 按方向统计
      if (!stats.bySide.has(side)) {
        stats.bySide.set(side, { count: 0, volume: 0, success: 0 });
      }
      const sideData = stats.bySide.get(side)!;
      sideData.count++;
      if (isSuccess) {
        sideData.volume += amount;
        sideData.success++;
      }
      
      // 打印交易详情
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📈 跟单交易 #${stats.totalTrades}`);
      console.log(`   时间: ${timestamp.toLocaleString('zh-CN')}`);
      console.log(`   跟随地址: ${targetAddr.substring(0, 10)}...${targetAddr.substring(targetAddr.length - 8)}`);
      console.log(`   市场: ${marketId.length > 50 ? marketId.substring(0, 47) + '...' : marketId}`);
      console.log(`   方向: ${side}`);
      console.log(`   金额: $${amount.toFixed(2)} USDC`);
      console.log(`   价格: ${record.price}`);
      console.log(`   状态: ${isSuccess ? '✅ 成功' : '❌ 失败'}`);
      if (!isSuccess) {
        const errorMsg = trade.error || trade.message || trade.data?.error || '未知错误';
        const errorStr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
        console.log(`   错误: ${errorStr}`);
        
        // 针对余额/授权不足的错误给出详细提示
        if (errorStr.includes('not enough balance') || 
            errorStr.includes('not enough allowance') ||
            errorStr.includes('insufficient') ||
            errorStr.includes('balance / allowance')) {
          console.log('\n   ⚠️  余额或授权不足！解决方案：');
          console.log('   1. 检查钱包 USDC.e 余额（建议至少保留 $10）');
          console.log('   2. 重新授权 USDC.e：停止程序后重新启动');
          console.log('   3. 确认钱包地址: 0x4599C8C95853A01c3E6d1DEe6cC2da1716c0cBA0');
          console.log('   4. 如果余额充足，可能需要重新授权合约');
        }
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // 每 10 笔交易打印一次详细统计
      if (stats.totalTrades % 10 === 0) {
        printStats();
      }
    };

    // 监听交易事件（使用 onTrade 回调）
    if (typeof autoCopyTrading.onTrade === 'function') {
      autoCopyTrading.onTrade(handleTrade);
    } else if (typeof autoCopyTrading.on === 'function') {
      // 兼容事件监听器模式
      autoCopyTrading.on('trade', handleTrade);
    }

    // 定期打印统计（每 5 分钟）
    const statsInterval = setInterval(() => {
      printStats();
    }, 5 * 60 * 1000);

    // 定期获取和打印统计信息（使用 getStats 方法）
    const statsFetchInterval = setInterval(async () => {
      try {
        let currentStats: any = null;
        
        // 尝试使用 getStats 方法
        if (typeof autoCopyTrading.getStats === 'function') {
          currentStats = await autoCopyTrading.getStats();
        }
        
        // 如果有统计信息，打印它
        if (currentStats) {
          console.log('\n📊 SDK 统计信息：');
          console.log(JSON.stringify(currentStats, null, 2));
          console.log('');
        }
        
        // 同时打印本地统计
        printStats();
      } catch (error: any) {
        // 忽略统计获取错误，只打印本地统计
        console.log('⚠️  获取 SDK 统计信息失败，显示本地统计：');
        printStats();
      }
    }, 10 * 60 * 1000); // 每 10 分钟获取一次

    // 优雅停止处理
    let isStopping = false;
    const gracefulShutdown = async (signal: string) => {
      if (isStopping) return;
      isStopping = true;

      console.log(`\n\n🛑 收到 ${signal} 信号，正在优雅停止...`);
      clearInterval(statsInterval);
      clearInterval(statsFetchInterval);

      try {
        // 停止自动跟单
        if (typeof autoCopyTrading.stop === 'function') {
          await autoCopyTrading.stop();
        } else if (typeof autoCopyTrading.destroy === 'function') {
          await autoCopyTrading.destroy();
        }

        // 打印最终统计
        console.log('\n');
        printStats();
        
        // 保存统计到文件
        if (stats.totalTrades > 0) {
          saveStatsToFile();
        }
        
        console.log('✅ 已安全停止自动跟单系统\n');
        
        process.exit(0);
      } catch (error: any) {
        console.error('❌ 停止时发生错误:', error?.message || error);
        process.exit(1);
      }
    };

    // 监听退出信号
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    console.log('✅ 自动跟单系统已启动！');
    console.log('   按 Ctrl+C 可以优雅停止\n');
    console.log('⏳ 等待跟单交易...\n');

  } catch (error: any) {
    console.error('\n❌ 启动失败:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  process.exit(1);
});
