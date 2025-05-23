// call respondToMessage for a provided cast hash or warpcast url

// bun run bin/triggerSiteCreation.ts <cast-hash> <url|hash> --tokenTicker=<value> --chainId=<value> --tokenAddress=<value>
// bun run bin/triggerSiteCreation.ts 0xd75ba35b9edfd643e703efa279daf0ea7eef1f2e hash 'I want to create a site for USDC' --tokenTicker=USDC --chainId=1 --tokenAddress=0x7f5c764cbc14f9669b88837ca1497812d69f500f

import neynarClient from '../src/neynarClient';
import { convertCastToWebhookFormat } from '../src/utils/castConverter';

// Ensure CastParamType is defined somewhere in your codebase
type CastParamType = 'url' | 'hash';

// Export the interface for optional parameters
export interface TokenOverride {
  chainId?: string;
  tokenTicker?: string;
  tokenAddress?: string;
}

async function main() {
    const identifier = process.argv[2];
    const castParamType = process.argv[3] as CastParamType;
    const manualTextContext = process.argv[4] || '';

    // Parse optional named arguments
    const tokenOverride: TokenOverride = {};
    process.argv.slice(5).forEach(arg => {
      if (arg.startsWith('--tokenTicker=')) tokenOverride.tokenTicker = arg.split('=')[1];
      if (arg.startsWith('--chainId=')) tokenOverride.chainId = arg.split('=')[1];
      if (arg.startsWith('--tokenAddress=')) tokenOverride.tokenAddress = arg.split('=')[1];
    });

    if (!identifier || !castParamType) {
        console.error('Usage: bun run bin/triggerSiteCreation.ts <cast-hash> <url|hash> [--tokenTicker=<value>] [--chainId=<value>] [--tokenAddress=<value>]');
        process.exit(1);
    }

    // get the cast from neynar
    const cast = await neynarClient.lookupCastByHashOrWarpcastUrl({
        identifier,
        type: castParamType.toLowerCase() as CastParamType // Ensure type is CastParamType
    });
    console.log('Original cast:', cast);

    // Convert the cast to webhook format expected by the bot in respondToMessage
    const webhookFormattedCast = convertCastToWebhookFormat(cast, 'memepage', tokenOverride, manualTextContext);
    console.log('Converted webhook data:', webhookFormattedCast);

    // call /trigger-site-creation endpoint to get the bot to respond to the cast
    const response = await fetch('http://localhost:3000/trigger-site-creation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookFormattedCast)
    });
    console.log('Response:', response);
}

main();
