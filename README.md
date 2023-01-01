# api.zani.wtf

API server for https://zani.wtf

### Running

Create a .env file with the following contents

```dotenv
GEN_BOT=... # bot id for image generation

DISCORD_TOKEN=... # discord bot token
GEN_CHANNEL_ID=... # channel to generate images in

MONGO_URI=... # mongodb uri
DEV_MONGO_URI=... # mongodb uri for dev (optional)
```

Then run

```shell
npm install
npm run build
npm run start
```