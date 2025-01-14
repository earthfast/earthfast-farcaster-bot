// call respondToMessage for a provided cast hash or warpcast url

// bun run bin/triggerSiteCreation.ts <cast-hash> <url|hash>

import { neynarClient } from '../src/neynarClient';
import { convertCastToWebhookFormat } from '../src/utils/castConverter';

const identifier = process.argv[2];
const castParamType = process.argv[3];

// get the cast from neynar
const cast = await neynarClient.lookupCastByHashOrWarpcastUrl(
    {identifier: identifier, CastParamType: castParamType}
);
console.log('Original cast:', cast);

// Convert the cast to webhook format expected by the bot in respondToMessage
const webhookFormattedCast = convertCastToWebhookFormat(cast);
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
