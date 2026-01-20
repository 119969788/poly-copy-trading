import { OnchainService } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 默认授权给 CTF 合约（可以从环境变量获取）
const TARGET_CONTRACT = process.env.APPROVE_CONTRACT_ADDRESS || '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   USDC.e 授权工具');
  console.log('═══════════════════════════════════════════════════\n');
}

// 主函数
async function main() {
  printBanner();

  let onchainService: OnchainService | null = null;

  try {
    // 初始化 OnchainService
    console.log('🚀 正在初始化...');
    onchainService = new OnchainService({
      privateKey: privateKey as string,
    });

    // 获取钱包地址（通过检查余额来获取）
    console.log('📋 获取钱包信息...');
    const balances = await onchainService.getTokenBalances();
    const walletAddress = (onchainService as any).wallet?.address || (onchainService as any).signer?.address;
    
    console.log(`钱包地址: ${walletAddress || 'N/A'}`);
    console.log(`目标合约: ${TARGET_CONTRACT}`);
    console.log(`USDC.e 合约: ${USDC_E_ADDRESS}\n`);

    // 检查余额
    console.log('💰 检查钱包余额...');
    const usdcBalance = parseFloat(balances.usdcE || '0');
    const maticBalance = parseFloat(balances.matic || '0');
    console.log(`   USDC.e 余额: ${usdcBalance.toFixed(2)} USDC`);
    console.log(`   MATIC 余额: ${maticBalance.toFixed(4)} MATIC\n`);

    if (usdcBalance < 0.01) {
      console.warn('⚠️  警告: USDC.e 余额不足');
    }
    if (maticBalance < 0.01) {
      console.error('❌ 错误: MATIC 余额不足，无法支付 Gas 费');
      process.exit(1);
    }

    // 检查授权状态
    console.log('🔍 检查当前授权状态...');
    try {
      const status = await onchainService.checkReadyForCTF('10000');
      if (status.ready) {
        console.log('✅ 已有授权');
        if (status.issues && status.issues.length > 0) {
          console.log(`   提示: ${status.issues.join(', ')}`);
        }
        console.log('');
      } else {
        console.log('⚠️  需要授权');
        if (status.issues && status.issues.length > 0) {
          console.log(`   问题: ${status.issues.join(', ')}`);
        }
        console.log('');
      }
    } catch (error: any) {
      console.log('⚠️  无法检查授权状态，将继续执行授权\n');
    }

    // 使用 SDK 的 approveAll 方法授权
    console.log('🔐 准备授权...');
    console.log(`   授权给: ${TARGET_CONTRACT}`);
    console.log(`   授权额度: 无限（最大额度）`);
    console.log('');

    // 确认操作
    console.log('⚠️  即将执行授权交易...');
    console.log('   这将消耗少量 MATIC 作为 Gas 费\n');

    // 执行授权
    console.log('📝 正在发送授权交易...');
    const result = await onchainService.approveAll();
    
    console.log('✅ 授权交易已提交！');
    const totalApprovals = (result.erc20Approvals?.length || 0) + (result.erc1155Approvals?.length || 0);
    if (totalApprovals > 0) {
      console.log(`   已授权 ${totalApprovals} 个代币`);
    }
    if (result.summary) {
      console.log(`   摘要: ${result.summary}`);
    }
    
    // 查找交易哈希
    const txHash = (result as any).txHash || (result as any).hash || (result as any).transactionHash;
    if (txHash) {
      console.log(`   交易哈希: ${txHash}`);
      console.log(`   查看交易: https://polygonscan.com/tx/${txHash}`);
    }
    
    console.log('   等待交易确认（约 10-15 秒）...\n');

    // 等待交易确认
    await new Promise(resolve => setTimeout(resolve, 12000));

    // 验证授权
    console.log('🔍 验证授权状态...');
    try {
      const verifyStatus = await onchainService.checkReadyForCTF('10000');
      if (verifyStatus.ready) {
        console.log('✅ 授权验证成功！');
        console.log('   授权额度: 无限（最大额度）\n');
      } else {
        console.log('⚠️  授权验证中...');
        if (verifyStatus.issues && verifyStatus.issues.length > 0) {
          console.log(`   提示: ${verifyStatus.issues.join(', ')}`);
        }
        console.log('   如果授权失败，请稍后重试\n');
      }
    } catch (error: any) {
      console.log('⚠️  无法验证授权状态');
      console.log('   如果授权交易已确认，授权应该已生效\n');
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ 授权完成！');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ 发生错误:', error?.message || error);
    if (error?.code === 'ACTION_REJECTED' || error?.message?.includes('user rejected')) {
      console.error('\n❌ 交易被拒绝');
      console.error('   请确认授权交易');
    } else if (error?.code === 'INSUFFICIENT_FUNDS') {
      console.error('\n❌ Gas 费不足');
      console.error('   请向钱包充值 MATIC');
    } else if (error?.stack) {
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
