const { createBot } = require('mineflayer')
const { plugin: pvPlugin } = require('mineflayer-plasmovoice')
const fs = require('fs')
const mineflayer = require("mineflayer");

const BOT_USERNAME = 'Abject12'

const bot = mineflayer.createBot({
    host: '212.80.7.178', //or f1.play2go.cloud:22034
    port: 25565,
    username: BOT_USERNAME,
    version: '1.20.4'
});

bot.loadPlugin(pvPlugin)

bot.once('spawn', () => {
    bot.chat('/l 22132213')
    bot.plasmoVoice.on('pcm', (user, buffer) => {
        fs.writeFileSync('audio.raw', buffer)
    })
})
