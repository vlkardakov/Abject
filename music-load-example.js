const yts = require('yt-search')
const ytdl = require('ytdl-core')
const fs = require('fs')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.question('Введи название трека: ', async (input) => {
    try {
        const songName = input.trim()
        const fileName = songName.toLowerCase().replace(/ /g, '_') + '.mp3'

        console.log('🔍 Ищем на ютубчике...')
        const res = await yts(songName)
        if (!res.videos.length) {
            console.log('❌ Ничего не найдено 😢')
            rl.close()
            return
        }

        const video = res.videos[0]
        console.log(`✅ Нашёл: ${video.title}`)
        console.log('🎧 Качаю аудио...')

        const stream = ytdl(video.url, { filter: 'audioonly' })
        stream.pipe(fs.createWriteStream(fileName))

        stream.on('end', () => {
            console.log(`🎉 Готово! Файл сохранён как ${fileName}`)
            rl.close()
        })

        stream.on('error', (err) => {
            console.error('💥 Ошибка при скачке:', err)
            rl.close()
        })

    } catch (err) {
        console.error('💥 Что-то пошло не так:', err)
        rl.close()
    }
})
