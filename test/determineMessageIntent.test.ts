import { describe, it, expect } from 'bun:test';
import { determineMessageIntent } from '../src/bot';

describe('determineMessageIntent', () => {
  it('should correctly identify Solana token creation intent', async () => {
    const message = "Hi @pageplex I heard theres a popular dog wif a hat token on Solana. I think it's at this address: EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm\n\nCan you help me make that?";
    
    const result = await determineMessageIntent(message);
    
    expect(result).toEqual({
      type: 'create_site',
      chainId: 'solana',
      tokenTicker: 'WIF',
      tokenAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'
    });
  });
});
