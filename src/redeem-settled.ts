import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// CTF 合约地址和 ABI
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const CTF_ABI = [
  'function payoutNumerator(bytes32 conditionId, uint256 outcomeIndex) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)'
];

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
  console.log('   Polymarket 回收结算代币工具');
  console.log('═══════════════════════════════════════════════════\n');
}

// 将 conditionId 转换为 bytes32 格式
function normalizeConditionId(conditionId: string): string {
  let normalized = conditionId.trim();
  
  if (normalized.startsWith('0x') || normalized.startsWith('0X')) {
    normalized = normalized.slice(2);
  }
  
  if (normalized.length < 64) {
    normalized = normalized.padStart(64, '0');
  } else if (normalized.length > 64) {
    normalized = normalized.slice(0, 64);
  }
  
  return '0x' + normalized.toLowerCase();
}

// 检查持仓是否获胜
async function checkWinningStatus(
  provider: ethers.Provider,
  conditionId: string,
  outcomeIndex: number
): Promise<{ isWinning: boolean; payoutRatio: number; payout: string }> {
  try {
    const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);
    const normalizedConditionId = normalizeConditionId(conditionId);
    
    const numerator = await ctf.payoutNumerator(normalizedConditionId, outcomeIndex);
    const denominator = await ctf.payoutDenominator(normalizedConditionId);
    
    if (numerator.eq(0)) {
      return { isWinning: false, payoutRatio: 0, payout: '0' };
    }
    
    const payoutBigInt = numerator.mul(ethers.parseEther('1')).div(denominator);
    const payout = ethers.formatEther(payoutBigInt);
    const payoutRatio = parseFloat(payout);
    
    return { isWinning: true, payoutRatio, payout };
  } catch (error) {
    // 检查失败，返回未知状态
    return { isWinning: false, payoutRatio: 0, payout: '0' };
  }
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

    // 初始化 provider（用于检查获胜状态）
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');

    // 获取持仓
    console.log('📊 正在获取持仓信息...');
    const allPositions = await sdk.dataApi.getPositions(walletAddress);
    
    if (!allPositions || allPositions.length === 0) {
      console.log('✅ 没有持仓需要回收\n');
      return;
    }

    // 过滤出有余额的持仓
    const positions = allPositions.filter((pos: any) => {
      const balance = parseFloat((pos.size || pos.amount || pos.balance || '0').toString());
      return balance > 0;
    });

    if (positions.length === 0) {
      console.log(`找到 ${allPositions.length} 个持仓，但都没有余额可回收\n`);
      return;
    }

    console.log(`\n找到 ${allPositions.length} 个持仓，其中 ${positions.length} 个有余额：\n`);

    // 检查哪些市场已结算并可以回收
    console.log('🔍 正在检查已结算的市场...\n');
    const redeemablePositions: any[] = [];
    
    for (const pos of positions) {
      // 直接使用持仓数据中的 redeemable 字段判断（最可靠的方法）
      const isRedeemable = pos.redeemable === true;
      
      // 如果没有 redeemable 字段，尝试其他判断方法
      if (!isRedeemable) {
        // 尝试从市场信息中获取（备用方法）
        const conditionId = pos.conditionId || pos.market;
        
        if (conditionId) {
          try {
            let marketInfo: any = null;
            
            try {
              marketInfo = await (sdk.dataApi as any).getMarket?.(conditionId) ||
                          await (sdk.dataApi as any).getMarketInfo?.(conditionId);
            } catch (e) {
              // 忽略错误
            }

            // 检查市场是否已结算
            const isSettled = marketInfo?.resolved === true || 
                             marketInfo?.settled === true ||
                             (marketInfo?.endDate && new Date(marketInfo.endDate) < new Date());
            
            if (isSettled) {
              redeemablePositions.push({
                ...pos,
                marketInfo,
              });
            }
          } catch (error) {
            // 忽略错误，继续处理下一个持仓
          }
        }
      } else {
        // redeemable 为 true，添加到可回收列表
        // 注意：redeemable: true 只表示市场已结算，但不代表该方向的代币可以赎回
        // 只有获胜方向的代币才能赎回，失败方向的代币无法赎回
        redeemablePositions.push(pos);
      }
    }
    
    // 重要提示
    if (redeemablePositions.length > 0) {
      console.log('⚠️  重要提示：');
      console.log('   redeemable: true 只表示市场已结算，但不代表该方向的代币可以赎回');
      console.log('   在 Polymarket 中，只有持有获胜方向的代币才能赎回（1:1 兑换成 USDC.e）');
      console.log('   失败方向的代币无法赎回，价值归零');
      console.log('   脚本会尝试赎回所有 redeemable: true 的持仓');
      console.log('   如果赎回失败，说明持有的是失败方向的代币（这是正常情况）\n');
    }

    if (redeemablePositions.length === 0) {
      console.log('✅ 没有已结算的市场需要回收\n');
      console.log('💡 提示：只有已结算（resolved/settled）的市场才能回收代币\n');
      return;
    }

    console.log(`找到 ${redeemablePositions.length} 个已结算市场的持仓：\n`);

    // 检查持仓获胜状态
    console.log('📋 正在检查持仓获胜状态...\n');
    const positionStatuses: Array<{ position: any; isWinning: boolean; payoutRatio: number; payout: string }> = [];
    
    for (const pos of redeemablePositions) {
      const conditionId = pos.conditionId;
      const outcomeIndex = pos.outcomeIndex;
      
      let status = { isWinning: false, payoutRatio: 0, payout: '0' };
      
      if (conditionId && outcomeIndex !== undefined) {
        status = await checkWinningStatus(provider, conditionId, outcomeIndex);
      }
      
      positionStatuses.push({ position: pos, ...status });
    }

    // 显示可回收的持仓
    console.log('📋 可赎回持仓列表：\n');
    positionStatuses.forEach((status, index) => {
      const pos = status.position;
      const size = parseFloat(pos.size || pos.amount || pos.balance || '0');
      const currentValue = parseFloat(pos.currentValue || pos.value || pos.usdcValue || '0');
      const initialValue = parseFloat(pos.initialValue || '0');
      
      const statusIcon = status.isWinning ? '✅' : '❌';
      const statusText = status.isWinning ? '获胜' : '失败';
      
      console.log(`持仓 #${index + 1}: ${statusIcon} ${statusText}`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   代币ID (asset): ${pos.asset || 'N/A'}`);
      console.log(`   数量: ${size.toFixed(4)}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   方向索引: ${pos.outcomeIndex !== undefined ? pos.outcomeIndex : 'N/A'}`);
      
      if (status.isWinning) {
        console.log(`   Payout 比例: ${status.payoutRatio.toFixed(4)} (${(status.payoutRatio * 100).toFixed(2)}%)`);
        console.log(`   预计回收: $${(size * status.payoutRatio).toFixed(2)} USDC.e`);
      } else {
        console.log(`   Payout: 0 (无法回收)`);
      }
      
      if (initialValue > 0) {
        console.log(`   初始价值: $${initialValue.toFixed(2)} USDC.e`);
      }
      if (pos.cashPnl !== undefined) {
        const pnl = parseFloat(pos.cashPnl || '0');
        console.log(`   盈亏: $${pnl.toFixed(2)} USDC.e (${((pnl / initialValue) * 100).toFixed(2)}%)`);
      }
      console.log(`   状态: ✅ 已结算 (redeemable: ${pos.redeemable})`);
      console.log('');
    });

    // 显示统计
    const winningCount = positionStatuses.filter(s => s.isWinning).length;
    const losingCount = positionStatuses.filter(s => !s.isWinning).length;
    const totalWinningValue = positionStatuses
      .filter(s => s.isWinning)
      .reduce((sum, s) => {
        const size = parseFloat(s.position.size || s.position.amount || s.position.balance || '0');
        return sum + (size * s.payoutRatio);
      }, 0);
    
    console.log('📊 持仓统计：');
    console.log(`   总持仓数: ${redeemablePositions.length}`);
    console.log(`   ✅ 获胜持仓: ${winningCount}`);
    console.log(`   ❌ 失败持仓: ${losingCount}`);
    if (winningCount > 0) {
      console.log(`   预计总回收: $${totalWinningValue.toFixed(2)} USDC.e`);
    }
    console.log('');

    if (dryRun) {
      console.log('🔍 模拟模式：不会执行真实回收\n');
      console.log('如需真实回收，请在 .env 中设置 DRY_RUN=false\n');
      return;
    }

    // 确认操作
    console.log('⚠️  警告：即将回收已结算市场的代币！');
    console.log(`   模式: 💰 实盘模式`);
    console.log(`   可回收持仓数量: ${redeemablePositions.length}`);
    console.log('');
    
    // 批量回收（只处理获胜的持仓）
    console.log('🔄 开始批量回收（仅获胜持仓）...\n');
    
    // 过滤出只有获胜的持仓
    const winningPositions = positionStatuses.filter(s => s.isWinning);
    
    if (winningPositions.length === 0) {
      console.log('❌ 没有获胜的持仓需要回收\n');
      console.log('💡 提示：所有持仓都是失败方向，无法回收\n');
      return;
    }
    
    console.log(`准备回收 ${winningPositions.length} 个获胜持仓（跳过 ${positionStatuses.length - winningPositions.length} 个失败持仓）\n`);
    
    const results: Array<{ success: boolean; position: any; error?: string; amount?: number }> = [];
    
    for (let i = 0; i < winningPositions.length; i++) {
      const status = winningPositions[i];
      const pos = status.position;
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`回收持仓 #${i + 1}/${winningPositions.length}`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   状态: ✅ 获胜 (payout: ${status.payoutRatio.toFixed(4)})`);
      
      try {
        // 获取赎回所需的参数
        const conditionId = pos.conditionId || pos.market;
        const outcomeIndex = pos.outcomeIndex;
        const asset = pos.asset || pos.tokenId || pos.outcomeTokenId;
        const amount = parseFloat(pos.size || pos.amount || pos.balance || '0');
        
        if (!conditionId) {
          throw new Error('条件ID（conditionId）不存在，无法赎回');
        }
        
        if (outcomeIndex === undefined || outcomeIndex === null) {
          throw new Error('方向索引（outcomeIndex）不存在，无法赎回');
        }

        console.log(`   条件ID: ${conditionId}`);
        console.log(`   方向索引: ${outcomeIndex}`);
        console.log(`   数量: ${amount.toFixed(4)}`);
        if (asset) {
          console.log(`   代币ID (asset): ${asset}`);
        }

        // 尝试使用 SDK 的 CTF 赎回方法（基于 poly-mcp 的 ctf_redeem 实现思路）
        // 优先使用 conditionId + outcomeIndex 的方式（更符合 CTF 标准）
        let redeemResult: any = null;
        let lastError: any = null;
        
        try {
          // 方法1: 尝试使用 CTF 的 redeem 方法（conditionId + outcomeIndex）
          if ((onchainService as any).ctfRedeem) {
            redeemResult = await (onchainService as any).ctfRedeem(conditionId, outcomeIndex);
          } else if ((onchainService as any).redeemCondition) {
            redeemResult = await (onchainService as any).redeemCondition(conditionId, outcomeIndex);
          } else if ((sdk.tradingService as any).ctfRedeem) {
            redeemResult = await (sdk.tradingService as any).ctfRedeem(conditionId, outcomeIndex);
          } else if ((sdk.tradingService as any).redeemCondition) {
            redeemResult = await (sdk.tradingService as any).redeemCondition(conditionId, outcomeIndex);
          } 
          // 方法2: 尝试使用 CTFClient（如果 SDK 有的话）
          else if ((sdk as any).ctfClient) {
            const ctfClient = (sdk as any).ctfClient;
            if (ctfClient.redeem) {
              redeemResult = await ctfClient.redeem(conditionId, outcomeIndex);
            } else if (ctfClient.redeemPositions) {
              // CTF 的 redeemPositions 方法通常需要 conditionId, indexSets, 和 collateralToken
              const indexSets = [[outcomeIndex]]; // 将 outcomeIndex 包装成 indexSets 格式
              redeemResult = await ctfClient.redeemPositions(conditionId, indexSets);
            }
          }
          // 方法3: 回退到使用 tokenId（asset）的方式
          else if (asset) {
            // 将 tokenId 转换为正确的格式
            let tokenIdParam: string;
            if (typeof asset === 'string') {
              if (asset.startsWith('0x')) {
                tokenIdParam = asset;
              } else {
                // 大整数字符串，转换为十六进制
                try {
                  const bigIntValue = BigInt(asset);
                  tokenIdParam = '0x' + bigIntValue.toString(16);
                } catch (e) {
                  tokenIdParam = asset;
                }
              }
            } else {
              tokenIdParam = '0x' + BigInt(asset).toString(16);
            }
            
            console.log(`   回退到使用 tokenId 方式: ${tokenIdParam}`);
            
            // 尝试使用 tokenId 赎回
            if ((onchainService as any).redeem) {
              redeemResult = await (onchainService as any).redeem(tokenIdParam);
            } else if ((onchainService as any).redeemTokens) {
              redeemResult = await (onchainService as any).redeemTokens(tokenIdParam);
            } else if ((onchainService as any).claimSettledTokens) {
              redeemResult = await (onchainService as any).claimSettledTokens(tokenIdParam);
            } else if ((sdk.tradingService as any).redeem) {
              redeemResult = await (sdk.tradingService as any).redeem(tokenIdParam);
            } else if ((sdk.tradingService as any).redeemTokens) {
              redeemResult = await (sdk.tradingService as any).redeemTokens(tokenIdParam);
            } else {
              throw new Error('SDK 不支持任何赎回方法，请检查 SDK 文档');
            }
          } else {
            throw new Error('无法获取赎回所需的参数（conditionId/outcomeIndex 或 asset）');
          }
        } catch (apiError: any) {
          lastError = apiError;
          const errorMsg = apiError?.message || String(apiError);
          
          // 检查是否是交易回退错误（可能表示代币无法赎回）
          if (errorMsg.includes('revert') || 
              errorMsg.includes('INVALID') || 
              errorMsg.includes('CALL_EXCEPTION') || 
              errorMsg.includes('invalid opcode') ||
              errorMsg.includes('cannot redeem') ||
              errorMsg.includes('not redeemable')) {
            // 这是一个预期的错误 - 持有失败方向的代币无法赎回
            throw new Error(`无法赎回：该方向的代币无法赎回（可能持有的是失败方向的代币，只有获胜方向的代币才能赎回）`);
          } else {
            throw new Error(`赎回 API 调用失败: ${errorMsg.substring(0, 200)}`);
          }
        }
        
        results.push({ 
          success: true, 
          position: pos,
          amount: redeemResult?.amount || parseFloat(pos.size || pos.amount || pos.balance || '0')
        });
        console.log(`   状态: ✅ 成功`);
        if (redeemResult?.amount !== undefined) {
          console.log(`   回收金额: $${redeemResult.amount} USDC.e`);
        }
        if (redeemResult?.txHash || redeemResult?.hash || redeemResult?.transactionHash) {
          const txHash = redeemResult?.txHash || redeemResult?.hash || redeemResult?.transactionHash;
          console.log(`   交易哈希: ${txHash}`);
          console.log(`   查看交易: https://polygonscan.com/tx/${txHash}`);
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 显示结果统计
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 回收结果统计');
    console.log('═══════════════════════════════════════════════════\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalRedeemed = results
      .filter(r => r.success && r.amount)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    console.log(`总持仓数: ${redeemablePositions.length}`);
    console.log(`获胜持仓: ${winningPositions.length}`);
    console.log(`失败持仓: ${positionStatuses.length - winningPositions.length} (已跳过)`);
    console.log(`成功回收: ${successCount}`);
    console.log(`回收失败: ${failCount}`);
    if (totalRedeemed > 0) {
      console.log(`总回收金额: $${totalRedeemed.toFixed(2)} USDC.e`);
    }
    
    if (failCount > 0) {
      console.log('\n失败的持仓：');
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`   ${i + 1}. 条件ID: ${r.position.conditionId || 'N/A'}`);
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
