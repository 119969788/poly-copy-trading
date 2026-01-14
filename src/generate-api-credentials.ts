import { PolySDK } from '@catalyst-team/poly-sdk';
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

// 初始化 SDK
const sdk = new PolySDK({ privateKey });

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket API 凭证生成工具');
  console.log('═══════════════════════════════════════════════════\n');
}

// 主函数
async function main() {
  printBanner();

  try {
    // 获取钱包地址
    const walletAddress = sdk.getAddress();
    console.log(`💰 钱包地址: ${walletAddress}\n`);

    console.log('🔑 正在生成 API 凭证...\n');

    // 尝试使用 SDK 的方法生成 API 凭证
    let apiCredentials: any = null;

    // 方法 1: 尝试使用 SDK 的 createOrDeriveApiKey 方法
    if (typeof sdk.createOrDeriveApiKey === 'function') {
      console.log('📝 使用 createOrDeriveApiKey 方法...');
      apiCredentials = await sdk.createOrDeriveApiKey();
    } 
    // 方法 2: 尝试使用 clobClient
    else if (sdk.clobClient && typeof sdk.clobClient.createOrDeriveApiKey === 'function') {
      console.log('📝 使用 clobClient.createOrDeriveApiKey 方法...');
      apiCredentials = await sdk.clobClient.createOrDeriveApiKey();
    }
    // 方法 3: 尝试使用其他可能的路径
    else if (typeof sdk.getApiCredentials === 'function') {
      console.log('📝 使用 getApiCredentials 方法...');
      apiCredentials = await sdk.getApiCredentials();
    }
    else {
      console.error('❌ 错误：SDK 不支持生成 API 凭证');
      console.log('\n   请检查：');
      console.log('   1. SDK 版本是否支持 API 凭证生成');
      console.log('   2. 是否使用了正确的 SDK 方法');
      console.log('   3. 参考文档：https://docs.polymarket.com/quickstart/first-order');
      console.log('\n   可能需要使用 @polymarket/clob-client 而不是 @catalyst-team/poly-sdk');
      process.exit(1);
    }

    if (!apiCredentials) {
      console.error('❌ 错误：未能生成 API 凭证');
      process.exit(1);
    }

    // 显示生成的凭证
    console.log('\n✅ API 凭证生成成功！\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 API 凭证信息');
    console.log('═══════════════════════════════════════════════════');
    
    if (apiCredentials.apiKey) {
      console.log(`   API Key: ${apiCredentials.apiKey}`);
    }
    if (apiCredentials.secret) {
      console.log(`   Secret: ${apiCredentials.secret}`);
    }
    if (apiCredentials.passphrase) {
      console.log(`   Passphrase: ${apiCredentials.passphrase}`);
    }
    
    // 显示所有字段（用于调试）
    console.log('\n   完整凭证数据:');
    console.log(JSON.stringify(apiCredentials, null, 2));

    // 保存到文件
    const credentialsFile = '.api-credentials.json';
    writeFileSync(credentialsFile, JSON.stringify(apiCredentials, null, 2), 'utf-8');
    console.log(`\n💾 凭证已保存到: ${credentialsFile}`);

    // 更新 .env 文件的建议
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📝 下一步：更新 .env 文件');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n   在 .env 文件中添加以下内容：\n');
    
    if (apiCredentials.apiKey) {
      console.log(`   POLYMARKET_API_KEY=${apiCredentials.apiKey}`);
    }
    if (apiCredentials.secret) {
      console.log(`   POLYMARKET_API_SECRET=${apiCredentials.secret}`);
    }
    if (apiCredentials.passphrase) {
      console.log(`   POLYMARKET_API_PASSPHRASE=${apiCredentials.passphrase}`);
    }
    
    console.log('\n   或者直接使用保存的 .api-credentials.json 文件\n');

    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ 生成 API 凭证失败:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
    console.log('\n   可能的原因：');
    console.log('   1. SDK 版本不支持此功能');
    console.log('   2. 需要使用 @polymarket/clob-client');
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
