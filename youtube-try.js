const yts = require('yt-search')
const { exec } = require('child_process')
const readline = require('readline')
const path = require('path')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.question('Введи название трека: ', async (input) => {
    const songName = input.trim()
    const fileName = songName.toLowerCase().replace(/ /g, '_') + '.mp3'

    console.log('ищем на ютубчике...')
    const res = await yts(songName)

    if (!res.videos.length) {
        console.log('ничего не найдено')
        rl.close()
        return
    }

    const video = res.videos[0]
    console.log(`Нашёл: ${video.title}`)
    console.log('Качаю..')

    const command = `yt-dlp -x --audio-format mp3 -o "${fileName}" "${video.url}"`

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`ошибка: ${error.message}`)
        } else {
            console.log(`сохранено как ${fileName}`)
        }
        rl.close()
    })
})
