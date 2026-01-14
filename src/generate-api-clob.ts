// 使用 @polymarket/clob-client 生成 API 凭证
// 参考：https://docs.polymarket.com/quickstart/first-order

import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 配置
const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon mainnet
const signer = new Wallet(privateKey);

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket API 凭证生成工具');
  console.log('   (使用 @polymarket/clob-client)');
  console.log('═══════════════════════════════════════════════════\n');
}

// 主函数
async function main() {
  printBanner();

  try {
    // 初始化客户端
    console.log('🔧 初始化 CLOB 客户端...');
    const client = new ClobClient(HOST, CHAIN_ID, signer);
    
    const walletAddress = signer.address;
    console.log(`💰 钱包地址: ${walletAddress}\n`);

    // 生成或派生 API 凭证
    console.log('🔑 正在生成/派生 API 凭证...\n');
    const userApiCreds = await client.createOrDeriveApiKey();

    // 显示凭证
    console.log('✅ API 凭证生成成功！\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 API 凭证信息');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   API Key: ${userApiCreds.apiKey}`);
    console.log(`   Secret: ${userApiCreds.secret}`);
    console.log(`   Passphrase: ${userApiCreds.passphrase}`);
    console.log('═══════════════════════════════════════════════════\n');

    // 保存到文件
    const credentialsFile = '.api-credentials.json';
    const credentialsData = {
      apiKey: userApiCreds.apiKey,
      secret: userApiCreds.secret,
      passphrase: userApiCreds.passphrase,
      walletAddress: walletAddress,
      generatedAt: new Date().toISOString(),
    };
    
    writeFileSync(credentialsFile, JSON.stringify(credentialsData, null, 2), 'utf-8');
    console.log(`💾 凭证已保存到: ${credentialsFile}\n`);

    // 显示下一步
    console.log('═══════════════════════════════════════════════════');
    console.log('📝 下一步：更新 .env 文件');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n   在 .env 文件中添加以下内容：\n');
    console.log(`   POLYMARKET_API_KEY=${userApiCreds.apiKey}`);
    console.log(`   POLYMARKET_API_SECRET=${userApiCreds.secret}`);
    console.log(`   POLYMARKET_API_PASSPHRASE=${userApiCreds.passphrase}`);
    console.log('\n   或者使用保存的 .api-credentials.json 文件\n');

    // 显示签名类型说明
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 签名类型说明');
    console.log('═══════════════════════════════════════════════════');
    console.log('   类型 0 (EOA): 使用 EOA 钱包，自己支付 Gas');
    console.log('   类型 1 (POLY_PROXY): 使用 Polymarket.com 账户（Magic Link/Google）');
    console.log('   类型 2 (GNOSIS_SAFE): 使用 Polymarket.com 账户（浏览器钱包）');
    console.log('\n   如果使用 EOA 钱包，使用类型 0');
    console.log('   如果使用 Polymarket.com 账户，使用类型 1 或 2\n');

    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ 生成 API 凭证失败:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
    console.log('\n   可能的原因：');
    console.log('   1. 未安装 @polymarket/clob-client');
    console.log('   2. 运行: npm install @polymarket/clob-client ethers@5');
    console.log('   3. 网络连接问题');
    console.log('\n   参考文档：https://docs.polymarket.com/quickstart/first-order');
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  process.exit(1);
});
