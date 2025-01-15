import { PublicKey } from '@solana/web3.js';


const webookReq = {"created_at":1736807230,"type":"cast.created","data":{"object":"cast","hash":"0xc92d4913f3795427d9fdb5110b1ee4776bc20677","author":{"object":"user","fid":944283,"username":"memepage","display_name":"memepage_bot","pfp_url":"https://supercast.mypinata.cloud/ipfs/QmZud1JWrNXipfUjFoSSUDVNmnT66YNRR2W6dL4uu9kY7z?filename=grok-pageplex.jpg","custody_address":"0x700a8a8b4964d8700813110b1f296925c6b7d176","profile":{"bio":{"text":"no meme left behind"}},"follower_count":0,"following_count":0,"verifications":[],"verified_addresses":{"eth_addresses":[],"sol_addresses":[]},"verified_accounts":[],"power_badge":false,"experimental":{"neynar_user_score":0.5}},"thread_hash":"0x294f922fe8f5d0cda2a47a2452e07db65ff87cf6","parent_hash":"0xa71d6375e39db4beb013680be5ea713833888feb","parent_url":null,"root_parent_url":null,"parent_author":{"fid":944283},"text":"@pageplex create a site for PENGU on solana 2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv","timestamp":"2025-01-13T22:27:11.000Z","embeds":[],"channel":null,"reactions":{"likes_count":0,"recasts_count":0,"likes":[],"recasts":[]},"replies":{"count":0},"mentioned_profiles":[{"object":"user","fid":897946,"custody_address":"0x6941b82c003fcc71a0ccbee935506631ee40187c","username":"pageplex","display_name":"PagePlex","pfp_url":"https://supercast.mypinata.cloud/ipfs/QmSvzbGWNhyisCPJ1oQ2fnGF5Zkq2g6Arjj8fWK2TLpDVC?filename=ChatGPT-DALLE-Image.webp","profile":{"bio":{"text":"a webpage for every meme. powered by @earthfast","mentioned_profiles":[]}},"follower_count":4,"following_count":5,"verifications":[],"verified_addresses":{"eth_addresses":[],"sol_addresses":[]},"power_badge":false}],"event_timestamp":"2025-01-13T22:27:10.799Z"}}

async function isValidSolanaAddress(address: string): Promise<boolean> {
    
    console.log('sidtest address', address);
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      console.log('error validating solana address', error);
      return false;
    }
  }

// Test your address
async function main() {
  try {
    const address = '0x1Ab0DB79d484a16bA1f13e6E0C50a029999fE51C';
    const isValid = isValidSolanaAddress(address);
    console.log(`Is valid: ${isValid}`);
  } catch (error) {
    console.error('Error testing address:', error);
  }
}

main();