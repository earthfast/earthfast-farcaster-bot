import { createPublicClient, http } from 'viem';
import { optimism } from 'viem/chains';

// TODO: remove this
export const viemPublicClient = createPublicClient({
  chain: optimism,
  transport: http(),
});
