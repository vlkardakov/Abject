require('dotenv').config()
const mineflayer = require('mineflayer')

const plasmo = require("mineflayer-plasmovoice")
const vec3 = require('vec3');
const {Movements} = require("mineflayer-pathfinder");

const BOT_USERNAME = process.argv[2] || process.env.BOT_USERNAME
const PASSWORD = process.argv[3] || process.env.PASSWORD
const NUMBER = parseInt(process.argv[4] || process.env.NUMBER)

let mcData;
let isEating = false;

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
    // await bot.waitForTicks(40)

}
function initializeBotState() {
    // console.log("Инициализация состояния бота...");
    try {
        mcData = require('minecraft-data')(bot.version);
        if (!mcData) {
            console.error("Не удалось загрузить mcData для версии:", bot.version);
            return;
        }

        defaultMove = new Movements(bot, mcData);


        defaultMove.speed = 10
        defaultMove.allowFreeMotion = true
        defaultMove.allow1by1towers = false
        // defaultMove.allowParkour = false
        defaultMove.canPlaceBlocks = false
        defaultMove.scafoldingBlocks = []
        defaultMove.canDig = false


        bot.pathfinder.setMovements(defaultMove);
        bot.pathfinder.setGoal(null);

        following = false;
        miningSand = false;
        followingProtectedPlayer = false;
        protectedPlayer = null;
        isEating = false;

        bot.off('health', autoEat);
        bot.on('health', autoEat);

        console.log("Состояние бота инициализировано.");

    } catch (error) {
        console.error("Ошибка во время инициализации состояния бота:", error);
    }
}

bot.on('resourcePack', (url, hash) => {
    bot.acceptResourcePack();
});
function findFood(botInstance) {
    if (!mcData || !mcData.foods) {
        console.error("mcData или mcData.foods не загружены!");
        return null;
    }
    return botInstance.inventory.items().find(item => mcData.foods[item.type]);
}
async function autoEat() {
    if (isEating || !mcData) return;

    const target = bot.swordpvp?.target
    const distanceToTarget = target ? bot.entity.position.distanceTo(target.position) : Infinity
    const justAttacked = Date.now() - lastAttackTime < 1000


    if (bot.food <= EAT_THRESHOLD) {

        if (target && distanceToTarget < 4) {
            console.log(`[АвтоЕда] Враг слишком близко (${distanceToTarget.toFixed(2)} блоков), не ем.`)
            return
        }
        if (justAttacked) {
            console.log(`[АвтоЕда] Только что ударил, подожду с едой.`)
            return
        }

        const food = findFood(bot);
        if (food) {
            console.log(`[АвтоЕда] Голод ${bot.food}/${bot.foodSaturation}. Найдена еда: ${food.name}. Начинаю есть.`);
            isEating = true;
            try {
                await bot.equip(food, 'hand');
                console.log(`[АвтоЕда] Взял ${food.name} в руку.`);
                await bot.consume();
                console.log(`[АвтоЕда] Поел ${food.name}.`);
            } catch (err) {
                console.error(`[АвтоЕда] Ошибка во время еды: ${err.message}`);
                try { await bot.unequip('hand'); } catch (unequipErr) {/* Игнорируем */}
            } finally {
                isEating = false;
                equipItem('axe')
                equipItem('sword')
            }
        } else {
            console.log(`[АвтоЕда] Голод ${bot.food}/${bot.foodSaturation}, но еды в инвентаре нет.`);
            // bot.chat(`/msg ${WATCHED_PLAYERS[0]} Дайте едыыы..`)
        }
    }
}
bot.on('spawn', () => {
    initializeBotState()
    const attackLoop = async () => {
        while (true) {
            const skel = bot.nearestEntity(e =>
                e.name === 'skeleton' &&
                e.position.distanceTo(bot.entity.position) <= 6
            )
            if (skel) {
                bot.lookAt(skel.position.offset(0, 1.6, 0), true)
                //if (bot.entity.attackCooldown > 0.9)
                bot.attack(skel)
                await bot.waitForTicks(20)
            } else {
                await bot.waitForTicks(100)
            }
        }
    }
    attackLoop()
})

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

bot.on('entityHurt', async (entity) => {
    if (entity === bot.entity) {
        // bot.chat('Получен урон :(')
        console.log('Меня атакуют!');
        bot.quit()
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
