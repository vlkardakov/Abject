const fs = require('fs')
const mineflayer = require("mineflayer")
const { plugin: pvPlugin } = require('mineflayer-plasmovoice')
const { spawn } = require('child_process')
const plasmo = require("mineflayer-plasmovoice")

const BOT_USERNAME = 'Abject12'

const bot = mineflayer.createBot({
    host: '212.80.7.178',
    port: 25565,
    username: BOT_USERNAME,
    version: '1.20.4'
})

bot.loadPlugin(plasmo.plugin)

bot.once('spawn', () => {
    bot.chat('/l 22132213')

    const python = spawn('python', ['recognizer.py'])

    python.stdout.on('data', data => {
        const text = data.toString().trim()
        if (text) bot.chat(`/m ${BOT_USERNAME} распознал: ${text}`)
    })

    bot.on('plasmovoice_pcm', (username, buffer) => {
        python.stdin.write(buffer)
    })
})

