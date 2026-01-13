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
  console.log('   Polymarket 回收结算代币工具');
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
        // redeemable 为 true，直接添加到可回收列表
        redeemablePositions.push(pos);
      }
    }

    if (redeemablePositions.length === 0) {
      console.log('✅ 没有已结算的市场需要回收\n');
      console.log('💡 提示：只有已结算（resolved/settled）的市场才能回收代币\n');
      return;
    }

    console.log(`找到 ${redeemablePositions.length} 个已结算市场的持仓：\n`);

    // 显示可回收的持仓
    redeemablePositions.forEach((pos: any, index: number) => {
      console.log(`持仓 #${index + 1}:`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   代币ID (asset): ${pos.asset || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   方向索引: ${pos.outcomeIndex !== undefined ? pos.outcomeIndex : 'N/A'}`);
      console.log(`   价值: $${pos.value || pos.usdcValue || '0'}`);
      console.log(`   状态: ✅ 已结算 (redeemable: ${pos.redeemable})`);
      console.log('');
    });

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
    
    // 批量回收
    console.log('🔄 开始批量回收...\n');
    
    const results: Array<{ success: boolean; position: any; error?: string; amount?: number }> = [];
    
    for (let i = 0; i < redeemablePositions.length; i++) {
      const pos = redeemablePositions[i];
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`回收持仓 #${i + 1}/${redeemablePositions.length}`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      
      try {
        // 获取 asset（tokenId），这是赎回时需要使用的
        let asset = pos.asset || pos.tokenId || pos.outcomeTokenId;
        const conditionId = pos.conditionId || pos.market;
        const outcomeIndex = pos.outcomeIndex;
        
        if (!asset) {
          throw new Error('代币ID（asset）不存在，无法赎回');
        }

        // 将 tokenId 转换为正确的格式（如果需要的话）
        // 如果已经是 0x 开头的十六进制，保持不变；否则转换为 BigInt 再转回字符串
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
              // 如果转换失败，直接使用原始值
              tokenIdParam = asset;
            }
          }
        } else {
          // 如果是数字，转换为十六进制
          tokenIdParam = '0x' + BigInt(asset).toString(16);
        }

        console.log(`   使用 asset (tokenId): ${tokenIdParam}`);
        if (outcomeIndex !== undefined) {
          console.log(`   方向索引: ${outcomeIndex}`);
        }

        // 尝试使用 SDK 的赎回方法
        // 注意：SDK 可能有不同的 API 方法名，这里尝试几种可能的方法
        let redeemResult: any = null;
        let lastError: any = null;
        
        try {
          // 方法1: 尝试使用 asset (tokenId) 作为参数
          if ((onchainService as any).redeem) {
            try {
              redeemResult = await (onchainService as any).redeem(tokenIdParam);
            } catch (e: any) {
              lastError = e;
              // 如果失败，尝试传递对象参数
              if (conditionId && outcomeIndex !== undefined) {
                try {
                  redeemResult = await (onchainService as any).redeem({
                    conditionId,
                    outcomeIndex,
                    tokenId: tokenIdParam
                  });
                } catch (e2: any) {
                  lastError = e2;
                }
              }
            }
          } else if ((onchainService as any).redeemTokens) {
            try {
              redeemResult = await (onchainService as any).redeemTokens(tokenIdParam);
            } catch (e: any) {
              lastError = e;
            }
          } else if ((onchainService as any).claimSettledTokens) {
            try {
              redeemResult = await (onchainService as any).claimSettledTokens(tokenIdParam);
            } catch (e: any) {
              lastError = e;
            }
          } else if ((sdk.tradingService as any).redeem) {
            try {
              redeemResult = await (sdk.tradingService as any).redeem(tokenIdParam);
            } catch (e: any) {
              lastError = e;
            }
          } else if ((sdk.tradingService as any).redeemTokens) {
            try {
              redeemResult = await (sdk.tradingService as any).redeemTokens(tokenIdParam);
            } catch (e: any) {
              lastError = e;
            }
          }
          
          // 如果所有方法都失败，抛出最后一个错误
          if (!redeemResult && lastError) {
            throw lastError;
          }
        } catch (apiError: any) {
          const errorMsg = apiError?.message || String(apiError);
          
          // 检查是否是交易回退错误（可能表示代币无法赎回）
          if (errorMsg.includes('revert') || errorMsg.includes('INVALID') || errorMsg.includes('CALL_EXCEPTION')) {
            throw new Error(`赎回失败：交易被回退。这可能意味着：1) 该方向的代币无法赎回（市场结算结果不支持），2) 代币已被赎回，或 3) 市场尚未完全结算。原始错误: ${errorMsg.substring(0, 200)}`);
          } else {
            throw new Error(`赎回 API 调用失败: ${errorMsg}`);
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
        if (redeemResult?.txHash) {
          console.log(`   交易哈希: ${redeemResult.txHash}`);
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
    console.log(`成功回收: ${successCount}`);
    console.log(`失败: ${failCount}`);
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
