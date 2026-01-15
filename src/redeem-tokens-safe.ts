import { ethers } from 'ethers';
import Safe from '@safe-global/protocol-kit';
import axios from 'axios';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 配置常量
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const USER_ADDRESS = process.env.SAFE_PROXY_ADDRESS || process.env.PROXY_WALLET_ADDRESS; // Safe 代理地址（从 portfolio 获取）
const CTF_ADDRESS = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045'; // CTF 合约地址
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e 地址
const DATA_API_BASE = 'https://data-api.polymarket.com';

// 获取配置
let privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 清理私钥
privateKey = privateKey.trim().replace(/\s+/g, '');
if (privateKey.startsWith('0x') || privateKey.startsWith('0X')) {
  privateKey = privateKey.slice(2);
}

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// CTF ABI（仅需要的函数）
const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)',
  'function payoutNumerator(bytes32 conditionId, uint256 outcomeIndex) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)'
];

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 代币回收工具（Safe 代理钱包版本）');
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

// 主函数
async function main() {
  printBanner();

  if (!USER_ADDRESS) {
    console.error('❌ 错误：请在 .env 文件中设置 SAFE_PROXY_ADDRESS 或 PROXY_WALLET_ADDRESS');
    console.error('   这是你的 Safe 代理钱包地址（可以从 Polymarket portfolio 页面获取）');
    process.exit(1);
  }

  try {
    // 初始化 provider 和 wallet
    console.log('🚀 正在初始化...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet('0x' + privateKey, provider);
    
    console.log(`   钱包地址: ${wallet.address}`);
    console.log(`   代理地址: ${USER_ADDRESS}`);
    console.log(`   RPC: ${RPC_URL}`);
    console.log(`   模式: ${dryRun ? '🔍 模拟模式' : '💰 实盘模式'}\n`);

    // 初始化 Safe SDK
    console.log('🔐 正在初始化 Safe SDK...');
    const safeSdk = await Safe.init({
      provider: RPC_URL,
      signer: '0x' + privateKey,
      safeAddress: USER_ADDRESS
    });
    console.log('✅ Safe SDK 初始化成功\n');

    // 获取持仓数据
    console.log('📊 正在获取持仓信息...');
    const dataApiUrl = `${DATA_API_BASE}/positions?proxyWallet=${USER_ADDRESS.toLowerCase()}&redeemable=true&limit=100`;
    console.log(`   API URL: ${dataApiUrl}`);
    
    const response = await axios.get(dataApiUrl);
    const positions = response.data.positions || [];
    console.log(`✅ 找到 ${positions.length} 个可赎回持仓\n`);

    if (positions.length === 0) {
      console.log('✅ 没有可赎回的持仓\n');
      return;
    }

    // 显示持仓信息并检查获胜状态
    console.log('📋 正在检查持仓获胜状态...\n');
    const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);
    const positionStatuses: Array<{ position: any; isWinning: boolean; payout: string; payoutRatio: number }> = [];
    
    for (const pos of positions) {
      const conditionId = pos.conditionId;
      const outcomeIndex = pos.outcomeIndex;
      const size = parseFloat(pos.size || pos.amount || pos.balance || '0');
      
      let isWinning = false;
      let payout = '0';
      let payoutRatio = 0;
      
      if (conditionId && outcomeIndex !== undefined) {
        try {
          const normalizedConditionId = normalizeConditionId(conditionId);
          const numerator = await ctf.payoutNumerator(normalizedConditionId, outcomeIndex);
          const denominator = await ctf.payoutDenominator(normalizedConditionId);
          
          if (!numerator.eq(0)) {
            isWinning = true;
            const payoutBigInt = numerator.mul(ethers.parseEther('1')).div(denominator);
            payout = ethers.formatEther(payoutBigInt);
            payoutRatio = parseFloat(payout);
          }
        } catch (error) {
          // 检查失败，标记为未知状态
        }
      }
      
      positionStatuses.push({ position: pos, isWinning, payout, payoutRatio });
    }
    
    // 显示持仓列表
    console.log('📋 可赎回持仓列表：\n');
    positionStatuses.forEach((status, index) => {
      const pos = status.position;
      const size = parseFloat(pos.size || pos.amount || pos.balance || '0');
      const statusIcon = status.isWinning ? '✅' : '❌';
      const statusText = status.isWinning ? '获胜' : '失败';
      
      console.log(`持仓 #${index + 1}: ${statusIcon} ${statusText}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   数量: ${size.toFixed(4)}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   方向索引: ${pos.outcomeIndex !== undefined ? pos.outcomeIndex : 'N/A'}`);
      if (status.isWinning) {
        console.log(`   Payout 比例: ${status.payoutRatio.toFixed(4)} (${(status.payoutRatio * 100).toFixed(2)}%)`);
        console.log(`   预计回收: $${(size * status.payoutRatio).toFixed(2)} USDC.e`);
      } else {
        console.log(`   Payout: 0 (无法回收)`);
      }
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
    console.log(`   总持仓数: ${positions.length}`);
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

    // 准备 batch transactions（只处理获胜的持仓）
    console.log('🔄 正在准备批量交易（仅获胜持仓）...\n');
    const transactions: any[] = [];
    const skippedPositions: any[] = [];

    for (const status of positionStatuses) {
      const pos = status.position;
      const conditionId = pos.conditionId;
      const outcomeIndex = pos.outcomeIndex;
      
      // 只处理获胜的持仓
      if (!status.isWinning) {
        skippedPositions.push({ ...pos, reason: '失败方向（payout=0）' });
        continue;
      }
      
      if (!conditionId) {
        console.log(`⚠️  跳过持仓：缺少 conditionId`);
        skippedPositions.push({ ...pos, reason: '缺少 conditionId' });
        continue;
      }

      // 规范化 conditionId
      const normalizedConditionId = normalizeConditionId(conditionId);
      
      // 对于二进制市场：使用 [1,2] 批量处理所有方向
      // 只有获胜方向的代币会被赎回，失败方向的会被忽略
      const indexSets = [1, 2]; // 批量处理 YES 和 NO

      try {
        // 编码 redeem data
        const data = ctf.interface.encodeFunctionData('redeemPositions', [
          USDC_ADDRESS,
          ethers.ZeroHash, // parentCollectionId = 0
          normalizedConditionId,
          indexSets // 批量 [1,2]，处理所有方向
        ]);

        transactions.push({
          to: CTF_ADDRESS,
          value: '0',
          data,
          operation: 0 // Call
        });
        
        const size = parseFloat(pos.size || pos.amount || pos.balance || '0');
        console.log(`✅ 已添加: ${conditionId.substring(0, 10)}... (预计回收 $${(size * status.payoutRatio).toFixed(2)})`);
      } catch (error: any) {
        console.log(`⚠️  跳过 ${conditionId.substring(0, 10)}...：${error?.message || error}`);
        skippedPositions.push({ ...pos, reason: error?.message || '编码交易失败' });
      }
    }

    if (transactions.length === 0) {
      console.log('❌ 无获胜持仓可赎回\n');
      if (skippedPositions.length > 0) {
        console.log('跳过的持仓：');
        skippedPositions.forEach((pos, i) => {
          console.log(`   ${i + 1}. ${pos.conditionId?.substring(0, 20) || 'N/A'} - ${pos.reason}`);
        });
      }
      return;
    }

    console.log(`\n准备批量赎回 ${transactions.length} 个持仓...\n`);

    // 执行 batch tx
    console.log('⚠️  警告：即将执行批量赎回交易！');
    console.log(`   交易数量: ${transactions.length}`);
    console.log(`   代理地址: ${USER_ADDRESS}\n`);

    // 创建 Safe 交易
    const safeTransaction = await safeSdk.createTransaction({ 
      transactions 
    });

    // 签名交易
    const signedSafeTx = await safeSdk.signTransaction(safeTransaction);
    
    // 执行交易
    console.log('📤 正在提交交易...');
    const executeTxResponse = await safeSdk.executeTransaction(signedSafeTx, {
      gasLimit: '5000000' // 设置足够的 gas limit
    });
    
    const txHash = executeTxResponse.hash || executeTxResponse.transactionHash;
    console.log(`✅ 交易已提交`);
    console.log(`   交易哈希: ${txHash}`);
    console.log(`   查看交易: https://polygonscan.com/tx/${txHash}`);

    // 等待确认
    console.log('\n⏳ 等待交易确认...');
    if (executeTxResponse.transactionResponse) {
      const receipt = await executeTxResponse.transactionResponse.wait();
      console.log(`✅ 交易已确认`);
      console.log(`   区块号: ${receipt.blockNumber}`);
      console.log(`   Gas 使用: ${receipt.gasUsed.toString()}`);
    } else if (txHash) {
      // 如果没有 transactionResponse，等待一段时间
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log(`✅ 交易已提交（请手动检查确认状态）`);
    }

    console.log('\n✅ 批量赎回完成！\n');

    // 显示统计
    console.log('📊 赎回统计：');
    console.log(`   总持仓数: ${positions.length}`);
    console.log(`   成功赎回: ${transactions.length}`);
    console.log(`   跳过: ${skippedPositions.length}`);
    if (skippedPositions.length > 0) {
      console.log('\n跳过的持仓：');
      skippedPositions.forEach((pos, i) => {
        console.log(`   ${i + 1}. ${pos.conditionId?.substring(0, 20) || 'N/A'} - ${pos.reason}`);
      });
    }
    console.log('');

  } catch (error: any) {
    console.error('\n❌ 发生错误:', error?.message || error);
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
