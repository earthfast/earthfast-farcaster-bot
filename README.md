# Earthfast Farcaster Bot

## Setup

1. `npm install`
2. `cp .env.tmpl .env`
3. Update the `.env` file with your API keys
4. `npm run start`

### Create a sub project

This bot will create a site based upon a token sub project defined by the user's message.

The bot expects the user to tag @pageplex, or reply to @pageplex in their message. The message must contain a token address, ticker, and chainId (or chain name). It currently supports Ethereum, Polygon, BSC, Solana, Base, Arbitrum, and Optimism.

Once the project is created, the bot will publish a cast in response to the user's message with a link to the new website.

#### Guides:

- [How to create a basic bot](https://github.com/neynarxyz/farcaster-examples/blob/main/gm-bot/README.md)
