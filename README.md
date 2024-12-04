# Earthfast Farcaster Bot

## Setup

1. `npm install`
2. `cp .env.tmpl .env`
3. Update the `.env` file with your API keys
4. `npm run generate-bot-signer`
5. `npm run start`

### Create a sub project

This bot will create a sub project on the project multiplex contract based on the user's message.

The bot expects the following format:
`@EarthfastBot !create <token ticker> <token address> <escrow amount>`

Once the project is created, the bot will publish a cast in response to the user's message with the project id and a link to the website.

#### Guides:

- [How to create a basic bot](https://github.com/neynarxyz/farcaster-examples/blob/main/gm-bot/README.md)
