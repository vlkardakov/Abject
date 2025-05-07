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

    const python = spawn('python3', ['recognizer.py'])
    python.on('spawn', () => {
        console.log('Python запущен!')
    })

    python.stderr.on('data', (data) => {
        console.error('Python error:', data.toString())
    })
    python.stdout.on('data', data => {
        const text = data.toString().trim()
        if (text) bot.chat(`/m vlkardakov распознал: ${text}`)
    })

    bot.on('plasmovoice_pcm', (username, buffer) => {
        console.log(`[VOICE] ${username} → ${buffer.length} байт`)
        python.stdin.write(buffer)
    })

})

