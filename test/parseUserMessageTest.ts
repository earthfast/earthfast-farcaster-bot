import { expect } from 'chai';
import { parseUserMessage } from '../src/createSubProject';

describe('parseUserMessage', () => {
  it('should correctly parse a valid message', () => {
    const message = '@EarthfastBot !create USDC 0x1234567890123456789012345678901234567890 1000';
    const result = parseUserMessage(message);

    expect(result).to.deep.equal({
      tokenTicker: 'USDC',
      tokenAddress: '0x1234567890123456789012345678901234567890',
      escrowAmount: '1000',
    });
  });

  it('should handle extra spaces in the message', () => {
    const message =
      '@EarthfastBot    !create    USDC    0x1234567890123456789012345678901234567890    1000   ';
    const result = parseUserMessage(message);

    expect(result).to.deep.equal({
      tokenTicker: 'USDC',
      tokenAddress: '0x1234567890123456789012345678901234567890',
      escrowAmount: '1000',
    });
  });

  it('should throw error when !create is missing', () => {
    const message = '@EarthfastBot USDC 0x1234567890123456789012345678901234567890 1000';

    expect(() => parseUserMessage(message)).to.throw(
      'Invalid message format. Expected: !create <token ticker> <token address> <escrow amount>',
    );
  });

  it('should throw error when parameters are missing', () => {
    const message = '@EarthfastBot !create USDC 0x1234567890123456789012345678901234567890';

    expect(() => parseUserMessage(message)).to.throw(
      'Missing required parameters. Expected: !create <token ticker> <token address> <escrow amount>',
    );
  });

  it('should handle message with extra text before !create', () => {
    const message =
      'Hello world @EarthfastBot !create USDC 0x1234567890123456789012345678901234567890 1000';
    const result = parseUserMessage(message);

    expect(result).to.deep.equal({
      tokenTicker: 'USDC',
      tokenAddress: '0x1234567890123456789012345678901234567890',
      escrowAmount: '1000',
    });
  });

  it('should handle message with extra text after parameters', () => {
    const message =
      '@EarthfastBot !create USDC 0x1234567890123456789012345678901234567890 1000 please and thank you';
    const result = parseUserMessage(message);

    expect(result).to.deep.equal({
      tokenTicker: 'USDC',
      tokenAddress: '0x1234567890123456789012345678901234567890',
      escrowAmount: '1000',
    });
  });
});
