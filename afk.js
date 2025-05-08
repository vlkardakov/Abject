require('dotenv').config()
const mineflayer = require('mineflayer')

const plasmo = require("mineflayer-plasmovoice")
const vec3 = require('vec3');

const BOT_USERNAME = process.argv[2] || process.env.BOT_USERNAME
const PASSWORD = process.argv[3] || process.env.PASSWORD
const NUMBER = parseInt(process.argv[4] || process.env.NUMBER)

console.log('----------------')
console.log('Сведения о боте :')
console.log("Имя             :", BOT_USERNAME)
console.log("Пароль          :", PASSWORD)
console.log("Порядковый номер: ", NUMBER)
console.log('----------------')
const bot = mineflayer.createBot({
    host: '212.80.7.178', //or
    // host: '87.120.187.6', //or
    port: 25565,
    username: BOT_USERNAME,
    version: '1.20.4'
});

console.log("Запуск бота...");

bot.loadPlugin(plasmo.plugin)
async function connectToServer() {
    console.log('Пытаюсь зайти!');
    await new Promise(resolve => setTimeout(resolve, 500));
    bot.chat('/server sleepcraft');
    await bot.waitForTicks(40)
    bot.chat('/sit')
}

bot.on('resourcePack', (url, hash) => {
    bot.acceptResourcePack();
});

bot.on('spawn', () => {
    sendFeedback(`плюх!`);
    // console.log("Событие 'spawn' получено.");
    initializeBotState();
});

bot.once('login', () => {
    // bot.chat(`/msg ${WATCHED_PLAYERS[0]} плюх`);
    bot.chat(`/l ${PASSWORD}`);
    // console.log("Событие 'spawn' получено.");
    // initializeBotState();
    bot.chat('/server sleepcraft')
});

bot.on('message', (jsonMsg, position) => {
    console.log(jsonMsg.toAnsi());
    let plainMessage = jsonMsg.toString();

    if (plainMessage === "Your login session has been continued." || plainMessage === "Your connection to sleepcraft encountered a problem." || plainMessage === "You have successfully logged." || plainMessage.toLowerCase().includes("restart") || plainMessage.toLowerCase().includes("kicked")) {
        connectToServer()
    }
});

bot.on('kicked', (reason, loggedIn) => {
    console.error('Бот был кикнут!');
    console.error('--- Детали Причины Кика ---');
    try {
        console.error(JSON.stringify(reason, null, 2));
    } catch (e) {
        console.error(reason);
    }
    console.error('-------------------------');
    isInitialSpawn = true;
});

bot.on('error', (err) => {
    console.error('Ошибка бота:', err);
});

bot.on('end', (reason) => {
    console.log(`Бот отключился. Причина: ${reason}`);
    isInitialSpawn = true;
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Неперехваченное исключение:', err);
});
