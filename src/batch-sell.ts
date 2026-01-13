import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 批量卖出代币工具');
  console.log('═══════════════════════════════════════════════════\n');
}

// 主函数
async function main() {
  printBanner();

  let sdk: PolymarketSDK | null = null;
  let onchainService: OnchainService | null = null;

  try {
    // 初始化 SDK
    console.log('🚀 正在初始化 SDK...');
    sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 创建 OnchainService
    onchainService = new OnchainService({
      privateKey: privateKey as string,
    });

    // 获取钱包地址
    const walletAddress = sdk.tradingService.getAddress();
    console.log(`钱包地址: ${walletAddress}\n`);

    // 获取持仓
    console.log('📊 正在获取持仓信息...');
    const allPositions = await sdk.dataApi.getPositions(walletAddress);
    
    if (!allPositions || allPositions.length === 0) {
      console.log('✅ 没有持仓需要卖出\n');
      return;
    }

    // 过滤出有余额的持仓（可以卖出的）
    const positions = allPositions.filter((pos: any) => {
      const balance = parseFloat((pos.size || pos.amount || pos.balance || '0').toString());
      return balance > 0;
    });

    if (positions.length === 0) {
      console.log(`找到 ${allPositions.length} 个持仓，但都没有余额可卖出\n`);
      return;
    }

    console.log(`\n找到 ${allPositions.length} 个持仓，其中 ${positions.length} 个有余额可卖出：\n`);
    
    // 显示持仓信息（调试：打印第一个持仓的完整数据结构）
    if (positions.length > 0) {
      console.log('🔍 调试：第一个持仓的完整数据结构：');
      console.log(JSON.stringify(positions[0], null, 2));
      console.log('');
    }
    
    // 尝试为每个持仓获取 tokenId
    console.log('🔍 正在尝试从市场信息中获取 tokenId...\n');
    const positionsWithTokenId = [];
    
    for (let idx = 0; idx < positions.length; idx++) {
      const pos = positions[idx];
      let tokenId = pos.tokenId || pos.outcomeTokenId || pos.token_id || pos.outcome_token_id;
      
      // 如果 tokenId 不存在，尝试从市场信息中获取
      if (!tokenId && pos.conditionId) {
        try {
          const marketId = pos.conditionId;
          const outcome = pos.outcome || pos.side;
          
          console.log(`   处理持仓 #${idx + 1}: conditionId=${marketId.slice(0, 20)}..., outcome=${outcome}`);
          
          // 尝试获取市场信息（不同的 API 方法）
          let marketInfo: any = null;
          let apiMethod = '';
          
          // 方法1: 尝试 getMarket
          try {
            if ((sdk.dataApi as any).getMarket) {
              marketInfo = await (sdk.dataApi as any).getMarket(marketId);
              apiMethod = 'getMarket';
            }
          } catch (e: any) {
            console.log(`     getMarket 失败: ${e?.message || e}`);
          }
          
          // 方法2: 尝试 getMarketInfo
          if (!marketInfo) {
            try {
              if ((sdk.dataApi as any).getMarketInfo) {
                marketInfo = await (sdk.dataApi as any).getMarketInfo(marketId);
                apiMethod = 'getMarketInfo';
              }
            } catch (e: any) {
              console.log(`     getMarketInfo 失败: ${e?.message || e}`);
            }
          }
          
          // 方法3: 尝试 getMarketById
          if (!marketInfo) {
            try {
              if ((sdk.dataApi as any).getMarketById) {
                marketInfo = await (sdk.dataApi as any).getMarketById(marketId);
                apiMethod = 'getMarketById';
              }
            } catch (e: any) {
              console.log(`     getMarketById 失败: ${e?.message || e}`);
            }
          }
          
          if (marketInfo) {
            console.log(`     使用 ${apiMethod} 获取到市场信息`);
            console.log(`     市场信息结构: ${Object.keys(marketInfo).join(', ')}`);
            
            // 尝试从 tokens 数组中查找
            if (marketInfo.tokens && Array.isArray(marketInfo.tokens)) {
              console.log(`     找到 tokens 数组，长度: ${marketInfo.tokens.length}`);
              const token = marketInfo.tokens.find((t: any) => 
                (t.outcome === outcome || t.side === outcome || t.name === outcome) ||
                (outcome === 'Down' && (t.name === 'No' || t.outcome === 'No')) ||
                (outcome === 'Up' && (t.name === 'Yes' || t.outcome === 'Yes'))
              );
              if (token && (token.tokenId || token.id)) {
                tokenId = token.tokenId || token.id;
                console.log(`     ✅ 从 tokens 数组中找到 tokenId: ${tokenId}`);
              } else {
                console.log(`     ❌ tokens 数组中未找到匹配的 token (outcome: ${outcome})`);
              }
            }
            
            // 尝试从 outcomeTokens 对象中查找
            if (!tokenId && marketInfo.outcomeTokens) {
              console.log(`     找到 outcomeTokens 对象`);
              const outcomeLower = outcome.toLowerCase();
              const possibleKeys = [outcomeLower, outcome, outcome === 'Down' ? 'no' : 'yes', outcome === 'Down' ? 'No' : 'Yes'];
              for (const key of possibleKeys) {
                if (marketInfo.outcomeTokens[key]) {
                  tokenId = marketInfo.outcomeTokens[key];
                  console.log(`     ✅ 从 outcomeTokens 中找到 tokenId (key: ${key}): ${tokenId}`);
                  break;
                }
              }
              if (!tokenId) {
                console.log(`     ❌ outcomeTokens 中未找到匹配的 token (尝试的键: ${possibleKeys.join(', ')})`);
              }
            }
            
            if (!tokenId) {
              console.log(`     ❌ 无法从市场信息中提取 tokenId`);
              console.log(`     调试：市场信息的完整结构（前500字符）:`);
              console.log(JSON.stringify(marketInfo, null, 2).substring(0, 500));
            }
          } else {
            console.log(`     ❌ 无法获取市场信息（尝试了 getMarket, getMarketInfo, getMarketById）`);
          }
        } catch (error: any) {
          console.log(`     ❌ 获取 tokenId 时发生错误: ${error?.message || error}`);
        }
      } else if (!tokenId) {
        console.log(`   持仓 #${idx + 1}: 没有 conditionId，无法获取 tokenId`);
      } else {
        console.log(`   持仓 #${idx + 1}: 已有 tokenId: ${tokenId}`);
      }
      
      positionsWithTokenId.push({
        ...pos,
        _resolvedTokenId: tokenId, // 保存解析到的 tokenId
      });
    }
    
    console.log('');
    
    // 显示持仓信息
    positionsWithTokenId.forEach((pos: any, index: number) => {
      console.log(`持仓 #${index + 1}:`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   代币ID: ${pos._resolvedTokenId || pos.tokenId || pos.outcomeTokenId || pos.token_id || pos.outcome_token_id || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   价值: $${pos.value || pos.usdcValue || '0'}`);
      console.log(`   PnL: $${pos.cashPnl || pos.pnl || '0'}`);
      console.log('');
    });

    if (dryRun) {
      console.log('🔍 模拟模式：不会执行真实卖出\n');
      console.log('如需真实卖出，请在 .env 中设置 DRY_RUN=false\n');
      return;
    }

    // 过滤出有 tokenId 的持仓
    const validPositions = positionsWithTokenId.filter((pos: any) => pos._resolvedTokenId);
    const invalidPositions = positionsWithTokenId.filter((pos: any) => !pos._resolvedTokenId);
    
    if (invalidPositions.length > 0) {
      console.log(`⚠️  警告: ${invalidPositions.length} 个持仓无法获取 tokenId，将被跳过\n`);
    }
    
    if (validPositions.length === 0) {
      console.log('❌ 错误：所有持仓都无法获取 tokenId，无法执行卖出操作\n');
      console.log('💡 提示：这可能是因为持仓数据结构发生了变化，或者市场信息无法获取');
      console.log('   请查看上方的调试信息，了解持仓数据的完整结构\n');
      return;
    }
    
    // 确认操作
    console.log('⚠️  警告：即将卖出所有持仓！');
    console.log(`   模式: 💰 实盘模式`);
    console.log(`   持仓数量: ${validPositions.length} (${invalidPositions.length} 个无法获取 tokenId，已跳过)`);
    console.log('');
    
    // 批量卖出
    console.log('🔄 开始批量卖出...\n');
    
    const results: Array<{ success: boolean; position: any; error?: string }> = [];
    
    for (let i = 0; i < validPositions.length; i++) {
      const pos = validPositions[i];
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`卖出持仓 #${i + 1}/${validPositions.length}`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   代币ID: ${pos._resolvedTokenId || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      
      try {
        // 使用解析到的 tokenId
        const tokenId = pos._resolvedTokenId;
        const amount = pos.size || pos.amount || pos.balance || '1';
        
        if (!tokenId) {
          throw new Error('代币ID不存在');
        }
        
        // 尝试使用市场订单卖出
        // 注意：对于 SELL，amount 是 shares 数量
        const order = await sdk.tradingService.createMarketOrder({
          tokenId: tokenId,
          side: 'SELL',
          amount: parseFloat(amount.toString()), // 转换为数字
          orderType: 'FAK', // Fill and Kill，部分成交也可以
        });
        
        results.push({ success: true, position: pos });
        console.log(`   状态: ✅ 成功`);
        if (order.id) {
          console.log(`   订单ID: ${order.id}`);
        }
        if (order.success === false && order.error) {
          console.log(`   警告: ${order.error}`);
        }
      } catch (error: any) {
        results.push({ 
          success: false, 
          position: pos, 
          error: error?.message || String(error) 
        });
        console.log(`   状态: ❌ 失败`);
        console.log(`   错误: ${error?.message || error}`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // 避免请求过快，稍作延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 显示结果统计
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 卖出结果统计');
    console.log('═══════════════════════════════════════════════════\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`总持仓数: ${positionsWithTokenId.length} (${validPositions.length} 个有效，${invalidPositions.length} 个无法获取 tokenId)`);
    console.log(`成功卖出: ${successCount}`);
    console.log(`失败: ${failCount}`);
    
    if (invalidPositions.length > 0) {
      console.log(`\n无法获取 tokenId 的持仓（${invalidPositions.length} 个）：`);
      invalidPositions.forEach((pos, i) => {
        console.log(`   ${i + 1}. 条件ID: ${pos.conditionId || 'N/A'}`);
        console.log(`      方向: ${pos.outcome || pos.side || 'N/A'}`);
      });
    }
    
    if (failCount > 0) {
      console.log('\n失败的持仓：');
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`   ${i + 1}. 条件ID: ${r.position.conditionId || 'N/A'}`);
        console.log(`      代币ID: ${r.position._resolvedTokenId || r.position.tokenId || r.position.outcomeTokenId || r.position.token_id || r.position.outcome_token_id || 'N/A'}`);
        console.log(`      方向: ${r.position.outcome || r.position.side || 'N/A'}`);
        console.log(`      错误: ${r.error}`);
      });
    }
    
    console.log('');

  } catch (error: any) {
    console.error('\n❌ 发生错误:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
  } finally {
    // 清理资源
    if (sdk) {
      sdk.stop();
    }
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  process.exit(1);
});
