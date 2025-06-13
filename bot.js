//Это коментарий
// console.warn = () => {}
// console.error = () => {}
// //не засоряя консоль

require('dotenv').config()
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear, GoalFollow, GoalBlock } = goals;
const collectBlock = require('mineflayer-collectblock').plugin;
const toolPlugin = require('mineflayer-tool').plugin;
const { plugin: pvp } = require('mineflayer-pvp');
const customPVP = require('@nxg-org/mineflayer-custom-pvp')
const ShotPlanner = require('@nxg-org/mineflayer-custom-pvp/lib/bow/shotPlanner').ShotPlanner;
const armorManager = require('mineflayer-armor-manager');
const plasmo = require("mineflayer-plasmovoice")
const vec3 = require('vec3');
const movement = require("mineflayer-movement")
const elytrafly = require("mineflayer-elytrafly");
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yts = require("yt-search");
const axios = require('axios');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});
const { exec } = require('child_process')

const WATCHED_PLAYERS = ['vlkardakov', 'Rusvanplay', 'console', 'Molni__', 'pofik888'];// 'monoplan',
const RICH_ITEMS = ["diamond", "gold", "emerald", "netherite", "enchant", "elytr", "_block", "fire", "sword", "totem", "bow", "golden_", "mace", "ore", "music"];
const RANGE_GOAL = 0;
let BOUNCE_POWER = 0
let ANTIFALL = false
let ANTIFALL_CORRECTION = 0
let protectedPlayer = null;
let following = false;
let miningSand = false;
let justCheckedBarrel = false;
let followingProtectedPlayer = false;
let collecting = false;
let collectingId = null
let task = null;
let isInitialSpawn = true;

let collecting_paused = false
let mcData;
let isEating = false;
let containerMemory = []
const musorMemory = [
    { name: '1', x: 7, y: 86, z: 6 },
    { name: '2', x: 7, y: 86, z: -6 },
    { name: '3', x: -26, y: 85, z: -14 },
    { name: '4', x: 30, y: 86, z: 18 },
    { name: '5', x: 16, y: 86, z: -14 },
    // { name: '', x: , y: , z:  },
]
const EAT_THRESHOLD = 16;
let MODE = 'мирный';
let SOUND = null;
let defaultMove
let playing = false;
let latestBrokenBlock = [new vec3(0, 0, 0), 'air']

const SPAWN_POSITIONS = [
    new vec3(-286, 92, 407),
    new vec3(-280, 90, 410),
    new vec3(-241, 65, 410),
    new vec3(-268, 22, 407),
];
const MUSOR_CHESTS = [
    new vec3(-289, 91, 403),
    new vec3(-289, 91, 401),
    new vec3(-289, 90, 403),
    new vec3(-289, 90, 401),
];

let MUSOR_INDEX = 0;

const POFIK_POSITIONS = [
    new vec3(-9, 111, -18),
    new vec3(0, 106, 0),
    new vec3(8, 110, -1),
    new vec3(19, 112, -7),
    new vec3(22, 115, -32),
    new vec3(57, 117, -23),
    new vec3(31, 102, 0),
    new vec3(-21, 106, 14),
];
console.log(process.argv)

const BOT_USERNAME = process.argv[2] || process.env.BOT_USERNAME
const PASSWORD = process.argv[3] || process.env.PASSWORD
const NUMBER = parseInt(process.argv[4] || process.env.NUMBER)

console.log('----------------')
console.log('Сведения о боте :')
console.log("Имя             :", BOT_USERNAME)
console.log("Пароль          :", PASSWORD)
console.log("Порядковый номер: ", NUMBER)
console.log('----------------')
//ЭТО КОММЕНТАРИЙ ДОЛЖЕН ПОЯВИТЬСЯ!
const bot = mineflayer.createBot({
    host: '212.80.7.178', //or
    // host: '87.120.187.6', //or
    port: 25565,
    username: BOT_USERNAME,
    version: '1.20.4'
});

console.log("Запуск бота...");

bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);
bot.loadPlugin(collectBlock);
bot.loadPlugin(toolPlugin);
bot.loadPlugin(movement.plugin)
bot.loadPlugin(plasmo.plugin)
// console.log(plasmo)
bot.loadPlugin(elytrafly.elytrafly)
// console.log(elytrafly)
// console.log(customPVP)
bot.loadPlugin(customPVP.default)

function findFood(botInstance) {
    if (!mcData || !mcData.foods) {
        console.error("mcData или mcData.foods не загружены!");
        return null;
    }
    return botInstance.inventory.items().find(item => mcData.foods[item.type]);
}

function sleep(ms) {
    const end = Date.now() + ms
    while (Date.now() < end) {
    }
}

function setLatestBrokenBlock(block) {
    if (!block) return;
    bpos = block.position
    latestBrokenBlock = [new vec3(bpos.x, bpos.y, bpos.z), block.name]
    console.log(latestBrokenBlock)
}

function hasRichItems() {
    const items = [
        ...bot.inventory.items(),
        bot.entity.heldItem,
        bot.inventory.slots[45],
        ...bot.inventory.slots.slice(5, 9)
    ].filter(item => item);

    return items.some(item =>
        RICH_ITEMS.some(keyword => item.name.toLowerCase().includes(keyword))
    );
}
async function stealItems(itemName, user_name) {
    const containers = containerMemory;
    if (containers.length === 0) {
        replyFeedback(username, "память пустая.");
        return;
        return;
    }

    replyFeedback(username, `вижу ${containers.length} контейнеров, ща чекну чё в них`);

    for (const container of containers) {
        const { name, x, y, z, items } = container;

        const relevantItems = items.filter(item => item.name.toLowerCase().includes(itemName.toLowerCase()));

        if (relevantItems.length > 0) {
//            bot.chat(`Нашел подходящие предметы в контейнере ${name} (${x}, ${y}, ${z}), иду забирать!`);

            try {
                await bot.pathfinder.goto(new GoalNear(Math.floor(x), Math.floor(y), Math.floor(z), 4));
//                await new Promise(res => setTimeout(res, 50));

                const block = bot.blockAt(new vec3(Math.floor(x), Math.floor(y), Math.floor(z)));
                if (!block) continue;

                const chest = await bot.openContainer(block);

                const removedItems = [];

                for (const item of chest.containerItems()) {
                    if (item.name.toLowerCase().includes(itemName.toLowerCase())) {
                        try {
                            await chest.withdraw(item.type, null, item.count);
                            console.log(`украл ${item.name} x${item.count}`);
                            removedItems.push(item);
                        } catch (err) {
                            console.log(`не смог забрать ${item.name}:`, err.message);
                        }
                    }
                }

                chest.close();

                container.items = container.items.filter(item => !removedItems.includes(item));

//                bot.chat(`Удалил ${removedItems.length} предметов из контейнера ${name}`);
            } catch (err) {
                console.log(`ошибка у ${name} в позиции (${x}, ${y}, ${z}):`, err.message);
            }
        } else {
            console.log(`В контейнере ${name} нет подходящих предметов.`);
        }
    }

    const target = bot.players[user_name]?.entity;
    if (!target) {
        replyFeedback(username,  `лут при мне 😏`);
        return;
    }

//    bot.chat(`иду к ${username} с лутом`);
    await bot.pathfinder.goto(new GoalNear(target.position.x, target.position.y, target.position.z, 2));

    const items = bot.inventory.items();
    for (const item of items) {
        try {
            await bot.toss(item.type, null, item.count);
//            bot.chat(`выкинул ${item.name} x${item.count}`);
        } catch (err) {
            console.log(`не смог скинуть ${item.name}:`, err.message);
        }
    }

    replyFeedback(username, "всё скинул, чекни!");
}
async function sborItems(user_name) {
    const containers = musorMemory;
    if (containers.length === 0) {
        replyFeedback(username, "память пустая.");
        return;
        return;
    }

    replyFeedback(username, `вижу ${containers.length} мусорок, ща чекну чё в них`);

    for (const container of containers) {
        //пример: { name: 'barrel', x: 7, y: 92, z: 7 }
        const { name, x, y, z} = container;
//            bot.chat(`Нашел подходящие предметы в контейнере ${name} (${x}, ${y}, ${z}), иду забирать!`);

            try {
                await bot.pathfinder.goto(new GoalNear(Math.floor(x), Math.floor(y), Math.floor(z), 3));
//                await new Promise(res => setTimeout(res, 50));

                const block = bot.blockAt(new vec3(Math.floor(x), Math.floor(y), Math.floor(z)));
                if (!block) continue;

                const chest = await bot.openContainer(block);

                for (const item of chest.containerItems()) {
                        try {
                            await chest.withdraw(item.type, null, item.count);
                            console.log(`украл ${item.name} x${item.count}`);
                            removedItems.push(item);
                        } catch (err) {
                            console.log(`не смог забрать ${item.name}:`, err.message);
                        }
                }

                chest.close();

                container.items = container.items.filter(item => !removedItems.includes(item));
//                bot.chat(`Удалил ${removedItems.length} предметов из контейнера ${name}`);
            } catch (err) {
                console.log(`ошибка у ${name} в позиции (${x}, ${y}, ${z}):`, err.message);
            }
    }

    await depositItems()

    replyFeedback(username, "Ну типа, весь мусор в 1 месте!)");
}
async function autoEat() {
    if (isEating || !mcData) return;

    if (bot.food <= EAT_THRESHOLD) {
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
function initializeBotState() {
    // console.log("Инициализация состояния бота...");
    try {
        mcData = require('minecraft-data')(bot.version);
        if (!mcData) {
            console.error("Не удалось загрузить mcData для версии:", bot.version);
            return;
        }

        // console.log(`[mcData] Загружены данные для Minecraft ${bot.version}. Генерирую карту Protocol ID -> Item Name...`);
        itemProtocolIdMap = {};

        const itemsById = mcData.items;

        if (!itemsById) {
            // console.error("[mcData] Ошибка: Свойство 'items' отсутствует в mcData. Не могу создать карту ID.");
        } else {
            for (const protocolIdStr in itemsById) {
                if (Object.prototype.hasOwnProperty.call(itemsById, protocolIdStr)) {
                    const itemInfo = itemsById[protocolIdStr];
                    const numericProtocolId = parseInt(protocolIdStr, 10);

                    if (!isNaN(numericProtocolId) && itemInfo && itemInfo.name) {
                        itemProtocolIdMap[numericProtocolId] = itemInfo.name;
                    } else {
                        // console.warn(`[mcData] Пропуск некорректной записи предмета: ID='${protocolIdStr}', Info=`, itemInfo);
                    }
                }
            }
            // console.log(`[mcData] Карта Protocol ID -> Item Name создана. Найдено ${Object.keys(itemProtocolIdMap).length} предметов.`);
            // console.log(`[mcData] Проверка: ID 854 = ${itemProtocolIdMap[854]}`);
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

        bot.armorManager.equipAll();

        bot.off('health', autoEat);
        bot.on('health', autoEat);

        // bot.bowpvp.useOffhand = false
        //
        // // bot.swordpvp.options.critConfig.reaction.enabled = true
        // bot.swordpvp.options.critConfig.reaction.enabled = true
        // // bot.swordpvp.options.rotateConfig.smooth = true

        // // критика
        // bot.swordpvp.options.critConfig.enabled = true
        // bot.swordpvp.options.critConfig.mode = 'packet'
        // bot.swordpvp.options.critConfig.reaction.enabled = false

        // прыжки при преследовании
        // bot.swordpvp.options.followConfig.mode = 'jump'

        // // Strafing configuration
        // bot.swordpvp.options.strafeConfig.enabled = true
        // bot.swordpvp.options.strafeConfig.mode.mode = 'intelligent'

        // Tap configuration for knockback
        bot.swordpvp.options.tapConfig.enabled = true
        bot.swordpvp.options.tapConfig.mode = 'wtap'

        // Look behavior
        bot.swordpvp.options.rotateConfig.smooth = false
        bot.swordpvp.options.rotateConfig.mode = 'constant'
        console.log("Состояние бота инициализировано.");

    } catch (error) {
        console.error("Ошибка во время инициализации состояния бота:", error);
    }
}

async function openBlockNoLook(block) {
    return new Promise((resolve, reject) => {
        if (!block || !block.position) return reject(new Error("invalid block"))

        const pos = block.position

        bot._client.write('block_place', {
            location: pos,
            direction: 1,
            hand: 0,
            cursorX: 0.5,
            cursorY: 1.0,
            cursorZ: 0.5,
            insideBlock: false
        })

        const listener = (window) => {
            bot.removeListener('windowOpen', listener)
            resolve(window)
        }

        bot.on('windowOpen', listener)

        setTimeout(() => {
            bot.removeListener('windowOpen', listener)
            reject(new Error("timeout"))
        }, 5000)
    })
}
async function breakBlockManually(block) {
    if (!block || !bot.canDigBlock(block)) {
        console.log('Ну тип... не могу сломать этот блок :|');
        return;
    }

    try {
        await bot.tool.equipForBlock(block);
        await bot.dig(block);
        console.log(`Ручками уничтожил ${block.name}`);
    } catch (err) {
        console.log('Шо-то пошло не так при ручном уничтожении: ', err.message);
    }
}
async function connectToServer() {
    console.log('Пытаюсь зайти!');
    await new Promise(resolve => setTimeout(resolve, 500));
    bot.chat('/server sleepcraft');
}
async function sendFeedback(text) {
    for (const player of WATCHED_PLAYERS) {
        if (bot.players[player]) {
            await new Promise(resolve => setTimeout(resolve, 50));
            bot.chat(`/msg ${player} ${text}`);
        }
    }
}
async function replyFeedback(username, text) {
    bot.chat(`/msg ${username} ${text}`)
}
function equipItem(name) {
    const itemToEquip = bot.inventory.items().find(item => item.name.includes(name));
    if (itemToEquip && (!bot.heldItem || bot.heldItem.type !== itemToEquip.type)) {
        bot.equip(itemToEquip, 'hand').catch(err => console.log(`Ошибка экипировки: ${err.message}`));
    }
}
function selectIdsWithName(substring) {
    if (!itemProtocolIdMap || typeof itemProtocolIdMap !== 'object' || typeof substring !== 'string') {
        return [];
    }
    const lowerCaseSubstring = substring.toLowerCase();
    return Object.entries(itemProtocolIdMap)
        .filter(([idStr, itemName]) =>
            typeof itemName === 'string' && itemName.toLowerCase().includes(lowerCaseSubstring)
        )
        .map(([idStr, itemName]) => parseInt(idStr, 10));
}
async function collectBlockType(blockName, count) {
    if (!mcData) {
        console.log('No mcdata')
        miningSand = false;
        return;
    }

    let collected = 0;
    miningSand = true;
    async function mineNext() {
        if (collected >= count) {
            sendFeedback(`Завершаю.`);
            miningSand = false;
            task = null
            return;
        }

        const block = bot.findBlock({
            matching: block => {
                const nameMatches = block.name.toLowerCase().includes(blockName.toLowerCase())
                const isVisible = bot.canSeeBlock(block)
                return nameMatches && isVisible
            },
            maxDistance: 20,
            useExtraInfo: true
        })

        if (block) {
            try {
                console.log(`Найден ${blockName} в ${block.position}. Иду добывать...`);

                if (block.name === 'chest' || block.name === 'torch' /* и т.д. */) {
                    await breakBlockManually(block);
                } else {
                    await bot.collectBlock.collect(block);
                }
                collected++;
                console.log(`Добыто ${collected}/${count} ${blockName}.`);
                setTimeout(mineNext, 100);
            } catch (err) {
                sendFeedback(`Ошибка: ${err.message}`);
                console.error(`Ошибка collectBlock:`, err);
                miningSand = false;
            }
        } else {
            sendFeedback(`Нет.`);
            miningSand = false;
        }
    }

    mineNext();
}
function readFileWithRetry(filePath, maxAttempts = 40, delay = 200) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content !== '') return content;
    } catch (err) {
        console.error(`Ошибка: ${err}`)
        return 'err'
    }
}
function readStates() {
    const directory = path.join('/rusvan-bots', 'states');
    const filesList = [];
    const files = fs.readdirSync(directory);

    files.forEach(filename => {
        if (filename.endsWith('.txt')) {
            const filePath = path.join(directory, filename);
            const content = readFileWithRetry(filePath);

            filesList.push({
                name: path.basename(filename, '.txt'),
                text: content
            });
        }
    });

    return filesList;
}
function getUsedIds() {
    const data = readStates();
    sorted = data
        .filter(obj => obj.name !== BOT_USERNAME)
        .map(obj => obj.text.split(':')[1])
        .filter(id => id !== 'null')
        .map(id => Number(id))
    // console.log(sorted)
    return sorted
}
function setState(text) {
    const botUsername = BOT_USERNAME;
    if (!botUsername) {
        console.error("BOT_USERNAME не задан.");
        return;
    }

    const filePath = path.join('/rusvan-bots/states', `${botUsername}.txt`);
    fs.writeFileSync(filePath, text, 'utf8')
    // console.log('Файл обновлен!!!')
}
setState(`null`)
console.log(`-----`)
console.log(readStates())
console.log(`-----`)


function findEntityWithName(bot, query, visible=true) {
    let targetQuery = query.toLowerCase();

    return bot.nearestEntity(entity => {
        const matchesCriteria = (
            (entity.type === 'player' && entity.username?.toLowerCase().includes(targetQuery)) ||
            (entity.type === 'mob' && entity.displayName?.toLowerCase().includes(targetQuery)) ||
            (entity.name && (entity.name?.toLowerCase().includes(targetQuery))) ||
            (entity.displayName?.toLowerCase().includes(targetQuery))
        );
        return visible ? (matchesCriteria && isEntityVisible(entity)) : matchesCriteria;
    });
}
function isEntityVisible(entity) {
    if (!entity || !bot.entity) return false;

    const botEyePosition = bot.entity.position.offset(0, bot.entity.height + 1, 0);
    const targetPosition = entity.position.offset(0, entity.height / 2, 0);
    const distance = botEyePosition.distanceTo(targetPosition);

    if (entity === bot.entity || distance > 128) {
        return false;
    }

    const direction = targetPosition.subtract(botEyePosition).normalize();

    try {
        const blockHit = bot.world.raycast(botEyePosition, direction, distance, (block) => {
            return block.boundingBox !== 'empty' && ![
                'glass', 'leaves', 'chest', 'torch', 'snow_layer'
            ].includes(block.name);
        });

        return blockHit === null;

    } catch (e) {
        console.error(`Ошибка Raycast при проверке видимости ${entity.username || entity.name || entity.displayName}:`, e);
        return false;
    }
}
function isEntityVisibleFromPos(fromPos, entity) {
    if (!entity) return false;

    const targetPosition = entity.position.offset(0, entity.height / 2, 0);
    const distance = fromPos.distanceTo(targetPosition);

    if (distance > 128) {
        return false;
    }

    const direction = targetPosition.subtract(fromPos).normalize();

    try {
        const blockHit = bot.world.raycast(fromPos, direction, distance, (block) => {
            return block.boundingBox !== 'empty' && ![
                'glass', 'leaves', 'chest', 'torch', 'snow_layer'
            ].includes(block.name);
        });

        return blockHit === null;

    } catch (e) {
        console.error(`⚠️ Ошибка Raycast при проверке видимости ${entity.username || entity.name || entity.displayName}:`, e);
        return false;
    }
}
async function depositItems() {
    if (justCheckedBarrel) return;

    console.log('Запуск очистки...');
    justCheckedBarrel = true;

    let chest = null;
    let chestBlock = null;
    let attempt = 0;
    const maxAttempts = MUSOR_CHESTS.length;

    while (attempt < maxAttempts) {
        const chestPos = MUSOR_CHESTS[MUSOR_INDEX];
        console.log(`Пробую мусорку #${MUSOR_INDEX} на позиции ${chestPos}`);
        await bot.pathfinder.goto(new goals.GoalNear(chestPos.x, chestPos.y, chestPos.z, 1));
        chestBlock = bot.blockAt(chestPos);

        if (!chestBlock) {
            console.log('Не нашел бочку 😢');
            attempt++;
            MUSOR_INDEX = (MUSOR_INDEX + 1) % MUSOR_CHESTS.length;
            continue;
        }

        try {
            chest = await bot.openBlock(chestBlock, null);
            break;
        } catch (err) {
            console.log('Не смог открыть бочку:', err.message);
            attempt++;
            MUSOR_INDEX = (MUSOR_INDEX + 1) % MUSOR_CHESTS.length;
        }
    }

    if (!chest) {
        bot.chat(`/msg ${username} не удалось найти доступную мусорку 😓`);
        return;
    }

    console.log('Мусорка открыта');

    for (const item of bot.inventory.items()) {
        try {
            console.log(`Кладу ${item.name}`);
            await chest.deposit(item.type, null, item.count);
        } catch (err) {
            console.log(`Не смог положить ${item.name}: ${err.message}`);

            chest.close();
            MUSOR_INDEX = (MUSOR_INDEX + 1) % MUSOR_CHESTS.length;
            await depositItems();
            return;
        }
    }

    const blockToLookAt = bot.findBlock({
        matching: block => {
            const nameMatches = block.name.toLowerCase().includes('log');
            const isVisible = bot.canSeeBlock(block);
            return nameMatches && isVisible;
        },
        maxDistance: 5,
        useExtraInfo: true
    });

    if (blockToLookAt) {
        const center = blockToLookAt.position.offset(0.5, 0.5, 0.5);
        await bot.lookAt(center, true);
    }

    chest.close();
}

function isEntityVisibleFromPositions(entity, positions) {
    if (!entity || !entity.position) return false;
    return positions.some(spawnPos => {
        return isEntityVisibleFromPos(spawnPos, entity);
    });
}
function isItemOnSpawn(itemEntity) {
    return isEntityVisibleFromPositions(itemEntity, SPAWN_POSITIONS);
}

async function downloadMusic(username, songName, fileName) {
    if (!fileName) {
        filename = songName.toLowerCase().replace(/ /g, '_') + '.mp3'
    }
    console.log('ищем на ютубчике...')
    const res = await yts(songName)

    if (!res.videos.length) {
        console.log('ничего не найдено')
        rl.close()
        return
    }

    const video = res.videos[0]
    console.log(`Нашёл: ${video.title}`)
    replyFeedback(username, `Нашел ${video.title}, сохраняю как ${fileName}`)
    console.log('Качаю..')

    const command = `yt-dlp -x --audio-format mp3 -o "/rusvan-bots/music/${fileName}" "${video.url}"`

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`ошибка: ${error.message}`)
        } else {
            console.log(`сохранено как ${fileName}`)
            replyFeedback(username, 'Закончил скачивать.')
        }
        rl.close()
    })

}

function distanceToPofikBase(entity) {
    const pos = entity.position;
    if (!pos) return 1000
    const dx = pos.x - 16;
    const dz = pos.z + 3;
    return Math.sqrt(dx * dx + dz * dz);
}
function getLore(itemEntity) {
    // if (!itemEntity || !itemEntity.metadata[8]) return false
    loreItem = null;
    try {
        loreItem = itemEntity.metadata[8].nbtData.value.display.value.Lore.value.value[0]
            .split('Подпись: #')[1]
            .split('","bold"')[0];
    } catch (e) {
    }
    return loreItem
}
function findNearestItem(searchName = '') {
    let wanted_ids = []
    if (searchName) {
        wanted_ids = selectIdsWithName(searchName);
    }

    return bot.nearestEntity(entity => {
        if (entity.name !== 'item') return false
        if (!entity?.metadata?.[8]?.present) return false
        if (!isEntityVisible(entity)) return false
        const {x, y , z} = entity.position

        if (searchName) {
            return wanted_ids.includes(entity?.metadata?.[8]?.itemId);
        }

        return true;
    });
}

function findNearestItemWithLore() {
    return bot.nearestEntity(entity => {
        loreItem = getLore(entity);
            // console.log(`Подпись предмета: ${loreItem}`)
            return entity.name === 'item' && loreItem === BOT_USERNAME;
    });
}

function findNearestEnemy() {
    return bot.nearestEntity(entity => {
        if (!entity.name) return false;

        const name = entity.name.toLowerCase() || ''
        const isHostile = (
            (
            name.includes('zombie') ||
            name.includes('skeleton') ||
            name.includes('spider') ||
            name.includes('creeper') ||
            name.includes('piglin') ||
            name.includes('enderm') ||
            name.includes('drowned')
            ) && (!name.includes('horse'))//||
            // name.includes('phantom')
        );

        // const isBadPlayer = (
        //     entity.name = 'player' && (
        //         [].includes(entity.username)
        //     )
        // )

        return (isHostile) && isEntityVisibleFromPositions(entity, POFIK_POSITIONS) && distanceToPofikBase(entity) < 50;
    });
}
function getFreeInventorySlots() {
    return bot.inventory.slots.filter(slot => slot === null).length;
}

function activateBlock(cords) { // new vec3({x: 1, y: 80, z: 9})
    const ButtonToActivate = bot.blockAt(cords)
    if (ButtonToActivate) {
        console.log(ButtonToActivate);
        bot.lookAt(ButtonToActivate.position, true)
        bot.activateBlock(ButtonToActivate);
    }
}
async function askGemini(prompt, type) {
    prompt = `${prompt} (тип: ${type})`;
    try {
        const response = await axios.post('http://127.0.0.1:4345/ask', {
            prompt: prompt
        });

        console.log("Ответ от нейросети: ", response.data.response);
        response1 = response.data.response;
        eval(response1)
        return response1
    } catch (err) {
        console.error("Чёт пошло не так. ", err.message);
    }
}
async function infoGemini(prompt) {
    try {
        const response = axios.post('http://127.0.0.1:4345/info', {
            prompt: prompt
        });
    } catch (err) {
        console.error("Чёт пошло не так. ", err.message);
    }
}
async function takeItem(blockPos, itemName, count = 1) {
    const block = bot.blockAt(blockPos)
    if (!block) return sendFeedback('Блок не найден по координатам')

    try {
        await bot.lookAt(blockPos, true)
        const chest = await bot.openContainer(block)
        const items = chest.containerItems().filter(item => item?.name === itemName)

        if (!items.length) {
            chest.close()
            return sendFeedback(`Предмет "${itemName}" не найден в контейнере`)
        }

        for (const item of items) {
            const takeCount = Math.min(item.count, count)
            if (takeCount <= 0) break

            await chest.withdraw(item.type, item.metadata, takeCount)
            sendFeedback(`Забрал ${takeCount} x ${itemName} из контейнера`)
            count -= takeCount

            if (count <= 0) break
        }

        chest.close()
    } catch (err) {
        sendFeedback(`Не получилось взять предмет: ${err.message}`)
    }
}

async function craftItem(itemName, count = 1) {
    const item = bot.registry.itemsByName[itemName]
    if (!item) return sendFeedback(`Неизвестный предмет: ${itemName}`)

    let recipes = bot.recipesFor(item.id, null, count, null)

    let craftingTable = null
    if (recipes.length === 0) {
        craftingTable = bot.findBlock({
            matching: block => bot.registry.blocks[block.type].name === 'crafting_table',
            maxDistance: 10
        })

        if (!craftingTable) return sendFeedback('Верстак не найден поблизости')

        recipes = bot.recipesFor(item.id, null, count, craftingTable)
        if (recipes.length === 0) return sendFeedback(`Нет рецептов даже с верстаком для: ${itemName}`)
    }

    const recipe = recipes[0]

    try {
        await bot.craft(recipe, count, craftingTable)
        // sendFeedback(`Скрафтил ${count} x ${itemName}`)
    } catch (err) {
        // sendFeedback(`Ошибка при крафте: ${err.message}`)
    }
}
async function craftSet(count = 1) {
    const ironBarrel = new vec3({x:3, y:85, z:6})
    const stickBarrel = new vec3({x:2, y:85, z:6})
    const chickenBarrel = new vec3({x:2, y:85, z:5})

    await bot.pathfinder.goto(new goals.GoalNear(1, 87, 6, 2));

    await takeItem(ironBarrel, 'iron_ingot', count=26)
    await takeItem(stickBarrel, 'stick', count=2)
    await takeItem(chickenBarrel, 'cooked_chicken', count=count*9)
    await takeItem(chickenBarrel, 'shield', count=1)

    await craftItem('iron_helmet', count = 1)
    await craftItem('iron_chestplate', count = 1)
    await craftItem('iron_leggings', count = 1)
    await craftItem('iron_boots', count = 1)
    await craftItem('iron_sword', count = 1)

    await bot.armorManager.equipAll()
    equipItem('sword')
}
function getHeightAboveGround() {
    const pos = bot.entity.position;
    const minY = bot.world.minY || 0;
    let y = Math.floor(pos.y) - 1;
    const x = Math.floor(pos.x);
    const z = Math.floor(pos.z);
    while (y >= minY) {
        const block = bot.blockAt(new vec3(x, y, z));
        if (!block) break;
        if (block.name !== 'air') return parseInt(pos.y - (y + 1));
        y--;
    }
    return -1;
}
async function tp(targetX, targetZ, speedFactor, jumpPower=6, safe=true) {
    task = 'flying'
    bot.entity.velocity.y += jumpPower
    await bot.waitForTicks(10)
    let velocityX = 0;
    let velocityZ = 0;
    const deltaX = (targetX - bot.entity.position.x)// - speedFactor;
    const deltaZ = (targetZ - bot.entity.position.z)// - speedFactor;
    const distance = Math.sqrt(deltaX**2 + deltaZ**2);

    if (distance > speedFactor) {
        velocityX = (deltaX / distance) * speedFactor;
        velocityZ = (deltaZ / distance) * speedFactor;
    }

    await new Promise(resolve => {
        const movementInterval = setInterval(() => {
            const pos = bot.entity.position;
            if (Math.abs(pos.x - targetX) < speedFactor && Math.abs(pos.z - targetZ) < speedFactor || task !== 'flying') {
                clearInterval(movementInterval);
                resolve();
            } else {
                bot.entity.velocity.x = velocityX; bot.entity.velocity.y = 0; bot.entity.velocity.z = velocityZ;
            }
        }, 50);
    });
    await new Promise(resolve => {
        const slowMovement = setInterval(() => {
            const pos = bot.entity.position;
            const dx = targetX - pos.x;
            const dz = targetZ - pos.z;
            const dist = Math.sqrt(dx ** 2 + dz ** 2);

            if (dist < 0.2 || task !== 'flying') {
                bot.entity.velocity.x = 0;
                bot.entity.velocity.z = 0;
                clearInterval(slowMovement);
                resolve();
                return;
            }

            const velX = (dx / dist) * 0.5;
            const velZ = (dz / dist) * 0.5;

            bot.entity.velocity.x = velX;
            bot.entity.velocity.y = 0;
            bot.entity.velocity.z = velZ;
        }, 50);
    });

    bot.entity.velocity.y -= 0.7
    bot.entity.velocity.x = 0
    bot.entity.velocity.z = 0

    if (safe) {
    await new Promise((resolve) => {
        const checkHeightInterval = setInterval(() => {
            height = getHeightAboveGround()
            if ((height < 20 && height !== -1) || task !== 'flying') {
                clearInterval(checkHeightInterval);
                resolve();
            }
        }, 10);
    });
                console.log(`Торможение! ${getHeightAboveGround()}`);
                ANTIFALL = true;
                await bot.waitForTicks(10);
                ANTIFALL = false;

    await new Promise((resolve) => {
        const checkHeightInterval = setInterval(() => {
            height = getHeightAboveGround()
            if ((height < 10 && height !== -1) || task !== 'flying') {
                clearInterval(checkHeightInterval);
                resolve();
            }
        }, 10);
    });
                console.log(`Торможение! ${getHeightAboveGround()}`);
                ANTIFALL = true;
                await bot.waitForTicks(5);
                ANTIFALL = false;

    await new Promise((resolve) => {
        const checkHeightInterval = setInterval(() => {
            height = getHeightAboveGround()
            if ((height < 3 && height !== -1) || task !== 'flying') {
                clearInterval(checkHeightInterval);
                resolve();
            }
        }, 10);
    });
                console.log(`Торможение! ${getHeightAboveGround()}`);
                ANTIFALL = true;
                await bot.waitForTicks(5);
                ANTIFALL = false;
    }
    task = null;
}
function digPacket(block) {
    bot._client.write('arm_animation', {}) // чтоб махнул рукой
    bot._client.write('block_dig', {
        status: 0, // START_DESTROY_BLOCK
        location: block.position,
        face: 1,
        sequence: bot._client.sequence ?? 0
    })

    setTimeout(() => {
        bot._client.write('block_dig', {
            status: 2,
            location: block.position,
            face: 1,
            sequence: bot._client.sequence ?? 0
        })
    bot._client.write('arm_animation', {}) // чтоб махнул рукой
    bot._client.write('block_dig', {
        status: 0, // START_DESTROY_BLOCK
        location: block.position,
        face: 1,
        sequence: bot._client.sequence ?? 0
    })

    }, 1000)
}


function getSwordDamage(){
    const item = bot.inventory.items().find(it => it.name === 'netherite_sword')
    if (!item) {
        console.log(`У меня нет в инвентаре`);
        return -1;
    }
    const meta = item.nbt?.value
    console.log(JSON.stringify(meta));
    damageOfItem = meta.Damage.value
    return damageOfItem
}
async function boostBot(speed, targetEntity) {
    await bot.waitForTicks(1);

    const yaw = targetEntity.yaw;
    const pitch = targetEntity.pitch;

    const directionVector = new vec3(
        -Math.sin(yaw) * Math.cos(pitch),
        -Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
    ).normalize();

    bot.entity.velocity.x += ((directionVector.x * speed) + targetEntity.velocity.x);
    bot.entity.velocity.y -= ((directionVector.y * speed) + targetEntity.velocity.y);
    bot.entity.velocity.z += ((directionVector.z * speed) + targetEntity.velocity.z);

    console.log(`Отскакиваю по направлению взгляда ${targetEntity.name}!`);
}

bot.on('entityHurt', async (entity) => {
    if (entity === bot.entity && BOUNCE_POWER !== 0) {
        boostBot(BOUNCE_POWER, findEntityWithName(bot, 'e', false))
    }
})
bot.on('physicsTick', () => {
    if (bot.entity.velocity.y < -0.2 && ANTIFALL) bot.entity.velocity.y += 0.4 + ANTIFALL_CORRECTION
}) 
function processCommand(message, username, plainMessage) {
    const parts = message.trim().toLowerCase().split(" ");
    const command = parts[0];
    const args = parts.slice(1);

    // console.log(`username: '${username}', command: '${command}'`);

    // if ( !WATCHED_PLAYERS.includes(username)) {
    //     // replyFeedback(username, 'Отстань.')
    //     return;
    // }

    switch (command) {
        case "exec":
            if (!WATCHED_PLAYERS.includes(username)) {
                sendFeedback(`${username} хочет выполнить ${plainMessage}`)
                replyFeedback(username, `Я не буду этого делать!!!`)
                return;
            }
            eval(message.split('exec ')[1]);
            // bot.chat("Ест!");
            return;
        case "say":
            if (!WATCHED_PLAYERS.includes(username) && username !== 'Вы') {
                sendFeedback(`${username} хочет ${plainMessage}`)
            }
            bot.chat(message.includes('/') ? message.split('say ')[1] : `!${message.split('say ')[1]}`);
            return;
        case "activate":

            if (args.length < 1) {
                // bot.chat("Укажи цель: activate <ник_игрока | тип_моба>");
                return;
            }
            let targetname = args[0];

            sendFeedback(`Ищу цель для пкм: ${targetname}`);
            bot.chat(`/msg ${username} Ищу цель: ${targetname}`);

            const entityToActivate = findEntityWithName(bot, targetname);
            if (entityToActivate) {
                const headPosition = entityToActivate.position.offset(0, entityToActivate.height * 0.9, 0);
                bot.lookAt(headPosition);
                bot.activateEntity(entityToActivate);
            }
            return;
        case "activateblock":
            const blockToActivate = bot.findBlock({
                matching: block => {
                    const nameMatches = block.name.toLowerCase().includes(parts[1].toLowerCase())
                    const isVisible = bot.canSeeBlock(block)
                    return nameMatches && isVisible
                },
                maxDistance: 5,
                useExtraInfo: true
            })
            if (blockToActivate) {
                bot.lookAt(blockToActivate.position);
                bot.activateBlock(blockToActivate);
            }
            return;
        case "comeblock":
            const blockToCome = bot.findBlock({
                matching: block => {
                    const nameMatches = block.name.toLowerCase().includes(parts[1].toLowerCase())
                    // const isVisible = bot.canSeeBlock(block)
                    return nameMatches //&& isVisible
                },
                maxDistance: 50,
                useExtraInfo: true
            })
            if (blockToCome) {
                bot.pathfinder.setMovements(defaultMove);
                bot.pathfinder.setGoal(new goals.GoalBlock(blockToCome.position.x, blockToCome.position.y, blockToCome.position.z, 2))
                console.log('Иду к блоку')
            } else {
                bot.chat(`/m ${WATCHED_PLAYERS[0]} Блок не найден 😢`)
                bot.chat(`/m ${username} Блок не найден 😢`)
            }
            break;
        case 'reload':
            initializeBotState();

            if (isInitialSpawn) {
            } else {
                bot.setControlState('sprint', true);
            }
            return;
        case 'load-music':
            if (args.length < 1 ) {return;}
            console.log('Начали')
            const songName = args[0];
            const fileName = args[1] || songName.toLowerCase().replace(/ /g, '_') + '.mp3';
            downloadMusic(username, songName, fileName);
            return;

        case "drop":
            if (!WATCHED_PLAYERS.includes(username)) {
                sendFeedback(`${username} хочет чтобы я ${plainMessage}`)
                bot.chat(`/msg ${username} Я не буду этого делать!!!`)
                return;
            }

            ;(async () => {

            async function safeToss(item, amount) {
                const slot = item.slot
                if (slot < 9 || slot > 44) {
                    try {
                        await bot.equip(item, 'hand')
                        await bot.unequip('hand')
                    } catch (err) {
                        bot.chat(`/msg ${WATCHED_PLAYERS[0]} не смог снять ${item.name}: ${err.message}`)
                        return
                    }
                }

                bot.toss(item.type, null, Math.min(item.count, amount), err => {
                    if (!err) {
                        // bot.chat(`/msg ${WATCHED_PLAYERS[0]} выбросил ${Math.min(item.count, amount)} ${item.name}`)
                    } else {
                        // bot.chat(`/msg ${WATCHED_PLAYERS[0]} не смог выкинуть ${item.name}: ${err.message}`)
                    }
                })
            }

            for (let i = 1; i < parts.length; i += 2) {
                const itemName = parts[i].toLowerCase()
                const amount = parts[i + 1] === "all" ? Infinity : parseInt(parts[i + 1])

                const allItems = [
                    ...bot.inventory.items(),
                    bot.inventory.slots[45],
                    bot.inventory.slots[5],
                    bot.inventory.slots[6],
                    bot.inventory.slots[7],
                    bot.inventory.slots[8],
                ].filter(it => it)

                const matchingItems = allItems.filter(it => it.name.toLowerCase().includes(itemName))

                if (matchingItems.length > 0) {
                    for (const item of matchingItems) {
                        await safeToss(item, amount)
                    }
                } else {
                    bot.chat(`/msg ${WATCHED_PLAYERS[0]} у меня нет ничего типа '${itemName}'`)
                    bot.chat(`/msg ${username} у меня нет ничего типа '${itemName}'`)
                }
            }

        })()
            return;
        case "dropall":
            async function expunge() {
                await unequipArmorAndMainHand()
                var inventoryItemCount = bot.inventory.items().length;
                if (inventoryItemCount === 0) return;

                while (inventoryItemCount > 0) {
                    const item = bot.inventory.items()[0];
                    // bot.chat(`Throwed ${item.name}`);
                    await bot.tossStack(item);
                    inventoryItemCount = bot.inventory.items().length;
                }
            }

            expunge();
            return;

        case "collect":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`);
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`);
                return;
            }

//                bot.on('entityHurt', async (entity) => {
//
//                    if (entity === bot.entity) {
//                        // bot.chat('Получен урон :(')
//                        console.log('Меня атакуют!');
//
//                        bot.pathfinder.setGoal(null);
//
//                        const nearestEntity = bot.nearestEntity(entity =>
//                            entity !== bot.entity && isEntityVisible(entity) && !entity.name.includes('item') && !entity.name.includes('stand')
//                        );
//                        // bot.chat('Я знаю, кто ударил!')
//                        if (nearestEntity) {
//                            collecting_paused = true;
//                            console.log(`Атакую сущность: ${nearestEntity.name}`);
//                            bot.pathfinder.setMovements(defaultMove);
//                            bot.pathfinder.setGoal(null)
//                            bot.pathfinder.setGoal(new goals.GoalFollow(nearestEntity, 0));
//                            bot.pvp.attack(nearestEntity);

//
//
//
//                            const healthChecker = setInterval(() => {
//                                if (!isEntityVisible(nearestEntity)) {
//                                    console.log(`${nearestEntity.name} убита!`);
//                                    // bot.chat('Ха! я победил!')
//                                    collecting_paused = false;
//                                    collecting_paused = false;
//                                    bot.pvp.stop()
//                                    clearInterval(healthChecker);
//
//
//                                } else {
//                                    const campsword = bot.inventory.items().find(item => item.name.includes("sword"));
//                                    if (campsword && (!bot.heldItem || bot.heldItem.type !== campsword.type)) {
//                                        bot.equip(campsword, 'hand').catch(err => console.log(`Ошибка экипировки меча: ${err.message}`));
//                                    }
//
//                                }
//                            }, 500);
//
//                        const onEntityGone = (goneEntity) => {
//                            if (goneEntity === nearestEntity) {
//                                console.log(`${goneEntity.name} исчезла или убита!`);
//                                collecting_paused = false;
//                                bot.pvp.stop();
//                                clearInterval(healthChecker);
//                                bot.pathfinder.setMovements(defaultMove);
//                                bot.pathfinder.setGoal(null);
//                            }
//                        };
//
//                        bot.once('entityGone', onEntityGone);
//                        } else {
//                            collecting_paused = false;
//                            console.log('Нет подходящих сущностей для атаки');
//                        }
//                    }
//                });

        function isFarFromCenter() {
            const pos = bot.entity.position;
            const dx = pos.x + 287;
            const dz = pos.z - 404;
            return Math.sqrt(dx * dx + dz * dz) > 15;
        }
        async function unequipArmorAndMainHand() {
            for (let i = 0; i < 4; i++) {
                const armorItem = bot.inventory.slots[i + 5];
                if (armorItem) {
                    await bot.equip(armorItem, 'hand');
                }
            }

            const mainHandItem = bot.inventory.slots[36];
            if (mainHandItem) {
                await bot.equip(mainHandItem, 'hand');
            }
        }

            justCheckedBarrel = true;
            let collectInterval = null;

        function startCollecting(searchName = '') {
            if (collectInterval) clearInterval(collectInterval);

            task = 'collecting';


            let oldTargetItem = null

            collectInterval = setInterval(async () => {
                // if (collecting_paused) {
                //     console.log('Сбор приостановлен, жду 5 секунд...');
                //     await new Promise(resolve => setTimeout(resolve, 5000));
                //     return;
                // }
                const targetItem = findNearestItem(searchName);

                // console.log('targetItem ', targetItem);
                console.log(bot.pathfinder.goal);

                if (targetItem && targetItem !== oldTargetItem && getFreeInventorySlots() > 5) {
                    oldTargetItem = targetItem;
                    setState(`collecting:${targetItem.id}`);
                    // console.log('Нормальный предмет detetcted!')
                    bot.pathfinder.setMovements(defaultMove);
                    id = targetItem?.metadata?.[8]?.itemId
                    count = targetItem?.metadata?.[8]?.itemCount
                    console.log(`ID: ${id}, тип: ${itemProtocolIdMap[id]}, количество ${count}`);
                    // console.log(JSON.stringify(targetItem.metadata, null, 2));
                    justCheckedBarrel = false;
                    bot.chat(`/msg ${WATCHED_PLAYERS[0]} Иду!`)
                    bot.pathfinder.setMovements(defaultMove);
                    bot.pathfinder.setGoal(null)
                    bot.pathfinder.setGoal(new GoalFollow(targetItem, 0));
                } else {
                    if (isFarFromCenter() && !targetItem && !bot.pathfinder.goal) {
                        bot.chat(`/msg ${WATCHED_PLAYERS[0]} Возвращаюсь на базу..`)
                        chestPos = vec3(-289, 91, 403);
                        await bot.pathfinder.goto(new goals.GoalNear(chestPos.x, chestPos.y, chestPos.z, 2));
                    } else if (!justCheckedBarrel && !bot.pathfinder.goal) {
                        await depositItems();
                        bot.chat(`/msg ${WATCHED_PLAYERS[0]} Мусор собран!`)
                        // blockToLookAfterDeposit = bot.findBlock({
                        //     matching: block => {
                        //         const nameMatches = block.name.toLowerCase().includes('calcite')
                        //         const isVisible = bot.canSeeBlock(block)
                        //         return nameMatches && isVisible
                        //     },
                        //     maxDistance: 5,
                        //     useExtraInfo: true
                        // })
                        // if (blockToLookAfterDeposit) {
                        //     bot.lookAt(blockToLookAfterDeposit.position, true );
                        // }
                        // bot.pathfinder.setGoal(new goals.GoalNear(7, 87, 6, 2 ));
                    }
                }

                if (!collecting) {
                    bot.chat(`/msg ${WATCHED_PLAYERS[0]} прекращаю!`);
                    if (collectInterval) clearInterval(collectInterval);
                    bot.pathfinder.setGoal(null);
                    return;
                }

            }, 1000);
        }

            const searchName = parts[1]
            // console.log(searchName)
            collecting = true;
            startCollecting(searchName);
            break;
        case "protect":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`);
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`);
                return;
            }




            let protectInterval = null;

            function startProtecting() {
                if (protectInterval) clearInterval(protectInterval);

                task = 'protecting';


                let oldTargetEnemy = null

                protectInterval = setInterval(async () => {
                    // if (collecting_paused) {
                    //     console.log('Сбор приостановлен, жду 5 секунд...');
                    //     await new Promise(resolve => setTimeout(resolve, 5000));
                    //     return;
                    // }
                    if (task !== 'protecting') {
                        clearInterval(protectInterval)
                        return;
                    }
                    const targetEnemy = findNearestEnemy();

                    // console.log('targetItem ', targetItem);
                    // console.log(bot.pathfinder.goal);

                    my_item = findNearestItemWithLore();
                    if (my_item) {
                        bot.pathfinder.setMovements(defaultMove);
                        id = my_item?.metadata?.[8]?.itemId
                        count = my_item?.metadata?.[8]?.itemCount
                        console.log(`ID: ${id}, тип: ${itemProtocolIdMap[id]}, количество ${count}`);
                        // console.log(JSON.stringify(targetItem.metadata, null, 2));
                        justCheckedBarrel = false;
                        bot.chat(`/msg ${WATCHED_PLAYERS[0]} Иду!`)
                        bot.pathfinder.setMovements(defaultMove);
                        bot.pathfinder.setGoal(null)
                        mp = my_item.position
                        bot.pathfinder.setGoal(new GoalNear(mp.x, mp.y, mp.z, 0));
                    } else if (targetEnemy) {
                        if (targetEnemy !== oldTargetEnemy) {
                        oldTargetEnemy = targetEnemy;// console.log('Нормальный предмет detetcted!')
                        bot.pathfinder.setMovements(defaultMove);
                        name = targetEnemy.name
                        console.log(`name: ${name}`);
                        // console.log(JSON.stringify(targetItem.metadata, null, 2));
                        bot.pathfinder.setMovements(defaultMove);
                        bot.pathfinder.setGoal(null)
                        equipItem('axe')
                        equipItem('sword')
                        bot.pvp.attack(targetEnemy)
                        }
                    } else {
                        if (distanceToPofikBase(bot.entity) > 6 && !targetEnemy && !bot.pvp.target) {
                            pofikPos = vec3(16, 108, -3);
                            bot.pathfinder.setGoal(new goals.GoalNear(pofikPos.x, pofikPos.y, pofikPos.z, 4));
                        } else if (!bot.pathfinder.goal) {
                            // sendFeedback('Я на базе.')
                            // blockToLookAfterDeposit = bot.findBlock({
                            //     matching: block => {
                            //         const nameMatches = block.name.toLowerCase().includes('calcite')
                            //         const isVisible = bot.canSeeBlock(block)
                            //         return nameMatches && isVisible
                            //     },
                            //     maxDistance: 5,
                            //     useExtraInfo: true
                            // })
                            // if (blockToLookAfterDeposit) {
                            //     bot.lookAt(blockToLookAfterDeposit.position, true );
                            // }
                            // bot.pathfinder.setGoal(new goals.GoalNear(7, 87, 6, 2 ));
                        }
                    }

                }, 1000);
            }

            startProtecting();
            break;

        case "camp":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                return;
            }


            if (args.length < 1) {
                bot.chat(`/msg ${username} Укажи цель: camp <ник_игрока | тип_моба>`);
                return;
            }
            if (MODE === "мирный") {
                bot.chat(`/msg ${username} Я сегодня добрый!`)
                return;
            }
            let camptargetUsername = args[0];
            if (camptargetUsername === 'vlkardakov') {
                // bot.chat(Нет идите нафиг')
                return;
            }
            bot.chat(`/msg ${WATCHED_PLAYERS[0]} Ищу цель: ${camptargetUsername}`);
            bot.chat(`/msg ${username} Ищу цель: ${camptargetUsername}`);
            task = 'camp'

        function findNewTarget() {
            return findEntityWithName(bot, camptargetUsername, visible=false);
        }

        function startCampAttack(targetEntity) {
            if (!targetEntity) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Не найдена сущность: ${camptargetUsername}.`);
                task = null
                return;
            }

            const camptargetName = targetEntity.username || targetEntity.displayName || targetEntity.name || 'неизвестная сущность';

            // bot.pathfinder.setGoal(null);
            // bot.pvp.stop();
            // bot.pathfinder.setMovements(defaultMove);
            // bot.pathfinder.setGoal(new GoalFollow(targetEntity, RANGE_GOAL), true);

            let campattackInterval = null;
            const campMAX_ATTEMPTS = 250;
            let campattackAttempts = 0;

            function campattackLoop() {
                if (!targetEntity || !targetEntity.isValid || campattackAttempts >= campMAX_ATTEMPTS) {
                    bot.chat(`/msg ${WATCHED_PLAYERS[0]} Хахаха ничтожество /s`);
                    bot.pathfinder.setGoal(null);
                    bot.pvp.stop();
                    if (campattackInterval) clearInterval(campattackInterval);


                    const newTarget = findNewTarget();
                    if (newTarget && newTarget !== targetEntity) {
                        startCampAttack(newTarget);
                    } else if (!newTarget) {

                    }
                }
                bot.on('message', (jsonMsg, position) => {
                    if (jsonMsg.toString().includes('stop')) {
                        bot.pathfinder.setGoal(null);
                        bot.pvp.stop();
                        if (campattackInterval) clearInterval(campattackInterval);
                        task = null;
                        return;
                    }
                })

                const campsword = bot.inventory.items().find(item => item.name.includes("sword"));
                if (campsword && (!bot.heldItem || bot.heldItem.type !== campsword.type)) {
                    bot.equip(campsword, 'hand').catch(err => console.log(`Ошибка экипировки меча: ${err.message}`));
                }

                if (command === 'kill' && !isEntityVisible(targetEntity)) {
                } else {
                    bot.pvp.attack(targetEntity);
                }

                campattackAttempts++;
            }

            campattackInterval = setInterval(campattackLoop, 500);
        }

            const initialTarget = findNewTarget();
            startCampAttack(initialTarget);
            break;
        case "attack":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                return;
            }

            if (args.length < 1) {
                bot.chat(`/msg ${username} Укажи цель: camp <ник_игрока | тип_моба>`);
                return;
            }
            let inputName = parts[1].toLowerCase()
            let targetUsernameh = Object.keys(bot.players).find(name => name.toLowerCase() === inputName)

            if (!targetUsernameh) {
                sendFeedback("я не вижу такого чела")
                return
            }

            task = 'attack'
            async function attackPlayer() {
                // try {
                console.log(`try attacking '${targetUsernameh}'`)
                badEntity = bot.players[targetUsernameh].entity;
                bot.pathfinder.setGoal(null)
                attackInterval1 = setInterval(() => {
                    if (!badEntity || badEntity.isValid === false || task !== 'attack') {
                        task = null
                        clearInterval(attackInterval1)
                        return
                    }
                    if (!bot.pathfinder.Goal) bot.pathfinder.setGoal(new GoalFollow(badEntity, 2));
                    bot.lookAt(badEntity.position.offset(0, 1.6, 0), true)
                    // if (bot.entity.attackCooldown > 0.9)
                    bot.attack(badEntity)
                }, 1000)
                // } catch(e) {}
            }
            attackPlayer()
            break;
        case "kill":
            if (task) {
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                return;
            }

            if (MODE === "мирный") {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я сегодня добрый!`)
                bot.chat(`/msg ${username} Я сегодня добрый!`)
                return;
            }
            if (args.length < 1) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Укажи цель: attack/kill <ник_игрока | тип_моба>`);
                bot.chat(`/msg ${username} Укажи цель: attack/kill <ник_игрока | тип_моба>`);
                return;
            }
            let targetUsername = args[0];
            if (targetUsername === 'enemy') targetUsername = 'zombie';

            if (targetUsername === 'vlkardakov') {
                bot.chat(`/msg ${username} Нет идите нафиг`)
                return;}

            targetEntity = findEntityWithName(bot, targetUsername);

            if (!targetEntity) {
                bot.chat(`/msg ${username} Не ${command === 'kill' ? 'вижу' : 'найдена'} сущность: ${targetUsername}.`);
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Не ${command === 'kill' ? 'вижу' : 'найдена'} сущность: ${targetUsername}.`);
                return;
            }
            bot.pathfinder.setGoal(null);
            equipItem('axe')
            equipItem('sword')
            bot.pvp.attack(targetEntity);
            break;
        case "custom-kill":
            if (task) {
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                return;
            }

            if (MODE === "мирный") {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я сегодня добрый!`)
                bot.chat(`/msg ${username} Я сегодня добрый!`)
                return;
            }

            if (args.length < 1) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Укажи цель: attack/kill <ник_игрока | тип_моба>`);
                bot.chat(`/msg ${username} Укажи цель: attack/kill <ник_игрока | тип_моба>`);
                return;
            }
            let targetUsernamecustom = args[0];
            if (targetUsernamecustom === 'enemy') targetUsernamecustom = 'zombie';

            if (targetUsernamecustom === 'vlkardakov') {
                bot.chat(`/msg ${username} Нет идите нафиг`)
                return;}

            targetEntitycustom = findEntityWithName(bot, targetUsernamecustom);

            if (!targetEntitycustom) {
                bot.chat(`/msg ${username} Не ${command === 'kill' ? 'вижу' : 'найдена'} сущность: ${targetUsernamecustom}.`);
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Не ${command === 'kill' ? 'вижу' : 'найдена'} сущность: ${targetUsernamecustom}.`);
                return;
            }
            bot.pathfinder.setGoal(null);
            equipItem('axe')
            equipItem('sword')
            bot.swordpvp.attack(targetEntitycustom);
            break;
        case "shot":
            if (task) {
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                return;
            }

            if (MODE === "мирный") {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я сегодня добрый!`)
                bot.chat(`/msg ${username} Я сегодня добрый!`)
                return;
            }

            if (args.length < 1) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Укажи цель: shot <ник_игрока | тип_моба>`);
                bot.chat(`/msg ${username} Укажи цель: shot <ник_игрока | тип_моба>`);
                return;
            }
            let targetUsernameshot = args[0];
            if (targetUsernameshot === 'enemy') targetUsernameshot = 'zombie';

            if (targetUsernameshot === 'vlkardakov') {
                bot.chat(`/msg ${username} Нет идите нафиг`)
                return;}

            targetEntityshot = findEntityWithName(bot, targetUsernameshot);

            if (!targetEntityshot) {
                bot.chat(`/msg ${username} Не ${command === 'kill' ? 'вижу' : 'найдена'} сущность: ${targetUsernameshot}.`);
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Не ${command === 'kill' ? 'вижу' : 'найдена'} сущность: ${targetUsernameshot}.`);
                return;
            }
            bot.pathfinder.setGoal(null);
            equipItem('axe')
            equipItem('sword')
            bot.bowpvp.attack(targetEntityshot);
            break;
        case "remember":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                return;
            }

            task = 'remembering'

            const rememberContainers = async () => {
                const radius = parseInt(parts[1]) || 15

                let blocks = bot.findBlocks({
                    matching: block => {
                        return (
                            block &&
                            (block.name.toLowerCase().includes("shulker") || block.name.toLowerCase().includes("chest"))
                        )
                    },
                    maxDistance: radius,
                    count: 999
                })

                const getDistance = (block1, block2) => {
                    if (!block1.position || !block2.position) return Infinity;

                    return Math.sqrt(
                        Math.pow(block1.position.x - block2.position.x, 2) +
                        Math.pow(block1.position.y - block2.position.y, 2) +
                        Math.pow(block1.position.z - block2.position.z, 2)
                    )
                }

                let currentBlock = blocks[0]
                let remainingBlocks = blocks.slice(1)

                remainingBlocks.sort((a, b) => getDistance(bot.entity, a) - getDistance(bot.entity, b))

                blocks = [currentBlock]
                while (remainingBlocks.length > 0 && (task === 'remembering')) {
                    let nearestBlock = remainingBlocks[0]
                    remainingBlocks.forEach(block => {
                        if (getDistance(currentBlock, block) < getDistance(currentBlock, nearestBlock)) {
                            nearestBlock = block
                        }
                    })

                    blocks.push(nearestBlock)

                    currentBlock = nearestBlock

                    remainingBlocks = remainingBlocks.filter(block => block !== nearestBlock)
                }

                const memoryData = []

                for (let pos of blocks) {
                    const block = bot.blockAt(pos)
                    if (task !== 'remembering') {break}
                    if (!block || !block.position) continue

                    try {
                        await bot.pathfinder.goto(new GoalNear(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), 3))

                        const container = await bot.openContainer(block)
                        const items = container.slots.filter(slot => slot && slot.name)
                        const itemsData = items.map(item => ({
                            name: item.name,
                            count: item.count
                        }))

                        memoryData.push({
                            name: block.name,
                            x: block.position.x,
                            y: block.position.y,
                            z: block.position.z,
                            items: itemsData
                        })

                        container.close()
                    } catch (err) {
                        console.log(`Не удалось открыть контейнер в позиции ${block.position}: ${err.message}`)
                    }
                }

                containerMemory = memoryData
                console.table(memoryData)
                memoryData.forEach(container => {
                    console.log(`Контейнер: ${container.name} (x: ${container.x}, y: ${container.y}, z: ${container.z})`)

                    if (container.items && container.items.length > 0) {
                        console.log(`  Содержимое:`)
                        container.items.forEach(item => {
                            console.log(`    - ${item.name} x${item.count}`)
                        })
                    } else {
                        console.log(`  Нет предметов в этом контейнере`)
                    }
                })

                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Запомнил ${memoryData.length} контейнеров с предметами!`)
                bot.chat(`/msg ${username} Запомнил ${memoryData.length} контейнеров с предметами!`)
                task = null
            }

            rememberContainers()
            break
        case "steal":
            const itemName = parts[1]
            if (!itemName) {
                replyFeedback(username, "че воровать-то? введи чёт типа: steal diamond")
                return
            }

            stealItems(itemName, username)
            break
        case "sbor":
            replyFeedback(
                username,
                "Начинаю собирать мусор из мусорок"
            )
            sborItems(username)
            break
        case "addspawnpos":
            const pos = bot.players[username].entity.position.floored();
            SPAWN_POSITIONS.push(pos);
            bot.chat(`/msg ${username} Добавил позицию: ${pos.x}, ${pos.y}, ${pos.z}`);
            break;
        case "addpofikpos":
            const pofikpos = bot.players[username].entity.position.floored();
            POFIK_POSITIONS.push(pofikpos);
            bot.chat(`/msg ${username} Добавил позицию: ${pofikpos.x}, ${pofikpos.y}, ${pofikpos.z}`);
            break;
        case "logspawnpos":
            console.log('Спавна позици щапрошены')
            if (SPAWN_POSITIONS.length === 0) {
                bot.chat(`/msg ${username} Спаунов нет 😢`);
            } else {
                console.log("const SPAWN_POSITIONS = [");
                SPAWN_POSITIONS.forEach((pos) => {
                    console.log(`    new vec3(${pos.x}, ${pos.y}, ${pos.z}),`);
                });
                console.log("];");

                bot.chat(`/msg ${username} Смотри консоль`);
            }
            break;
        case "logpofikpos":
            console.log('pofik позици щапрошены')
            if (POFIK_POSITIONS.length === 0) {
                bot.chat(`/msg ${username} позиций нет 😢`);
            } else {
                console.log("const POFIK_POSITIONS = [");
                POFIK_POSITIONS.forEach((pos) => {
                    console.log(`    new vec3(${pos.x}, ${pos.y}, ${pos.z}),`);
                });
                console.log("];");

                bot.chat(`/msg ${username} Смотри консоль`);
            }
            break;
        case "play":
            // console.log('Произведение музыки запрошено');
            if (SOUND || playing) {
                bot.chat(`/msg ${username} Я уже играю ${SOUND}`);
                return;
            }

            SOUND = args[0] || "vivalavida";


            const ffmpeg = require('fluent-ffmpeg');
            const fs = require('fs');
            const path = require('path');


            let audioFile;
            try {
                audioFile = path.join('/rusvan-bots/music', `${SOUND}.mp3`);
                if (!fs.existsSync(audioFile)) {
                    console.error('Файл не найден:', audioFile);
                    bot.chat(`/msg ${username} ты просишь несуществующую музыку!!`)
                    SOUND = null;
                    playing = false;
                    return;
                }
            } catch (err) {
                console.error('Ошибка при проверке файла:', err);
                SOUND = null;
                playing = false;
                return;
            }

            const tempDir = path.join('/rusvan-bots/music', `temp_audio${NUMBER}`);
            playing = true;
            ffmpeg.ffprobe(audioFile, (err, metadata) => {
                if (err) {
                    console.error('Ошибка при анализе аудиофайла:', err);
                    return;
                }

                const duration = metadata.format.duration;
                const segmentCount = Math.ceil(duration) / 4;

                // console.log(`Разделение аудио на ${segmentCount} сегментов по 1 секунде`);

                ffmpeg(audioFile)
                    .outputOptions([
                        '-f segment',
                        '-segment_time 4',
                        '-c copy',
                        '-map 0:a'
                    ])
                    .output(`${tempDir}/segment-%03d.mp3`)
                    .on('end', () => {
                        console.log('Аудио успешно разделено');

                        sendSegmentsSequentially(0, segmentCount, tempDir);
                    })
                    .on('error', (err) => {
                        console.error('Ошибка при разделении аудио:', err);
                    })
                    .run();
            });

        function sendSegmentsSequentially(index, total, tempDir) {
            if (index >= total || !playing) {
                // console.log('Все сегменты отправлены');
                // bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я закончил играть!`)
                sendFeedback('Я закончил играть!')
                SOUND = null;
                playing = false;

                fs.readdirSync(tempDir).forEach(file => {
                    try {
                        fs.unlinkSync(path.join(tempDir, file));
                    } catch (e) {console.log('ыыыы ошибка в перелинковке файлов как обычно но зачем нам это?')}
                });
                playing = false;
                return;
            }

            const segmentFile = path.join(tempDir, `segment-${index.toString().padStart(3, '0')}.mp3`);

            bot.plasmovoice.sendAudio(segmentFile)
                .then(() => {
                    // console.log(`Отправлен сегмент ${index + 1}/${total}`);
                    setTimeout(() => {
                        sendSegmentsSequentially(index + 1, total, tempDir);
                    }, 4000);
                })
                .catch(err => {
                    console.error(`Ошибка при отправке сегмента ${index + 1}:`, err);
                    sendSegmentsSequentially(index + 1, total, tempDir);
                });
        }
            break;
        case "hi":
            bot.chat(`/msg ${username} Привета!`);
            break
        case "antifall":
                if (ANTIFALL) ANTIFALL = false
                else ANTIFALL = true           
            break
        case "restart":
            console.error("Ашипка! 😭")
            replyFeedback(username, "Ашипка! 😭")
            process.exit(1)
            break
        case "attacknotme":
            const targetsToAttackNotMe = Object.values(bot.players)
                .filter(p => p.entity)
                .filter(p => BOT_USERNAME !== p.username)//!WATCHED_PLAYERS.includes(p.username) &&
                .filter(p => bot.entity.position.distanceTo(p.entity.position) <= 4)

            for (const target of targetsToAttackNotMe) {
                bot.lookAt(target.position, true)
                bot.attack(target.entity)
                console.log(`атакую ${target.username}`)
            }

            console.log('Атака завершена')
            break
        case "door":
            activateBlock(new vec3({ x: 36, y: 14, z: -2 }))
            break

        // case "lights":
        //     const lightButtons = [
        //         // new vec3({x: 8, y: 79, z: -7}),
        //         // new vec3({x: 8, y: 79, z: -9}),
        //         // new vec3({x: 3, y: 79, z: -13}),
        //         // new vec3({x: 0, y: 79, z: -9}),
        //         // new vec3({x: 0, y: 79, z: -7})
        //         //new vec3({x: , y: , z: }),
        //     ]
        //     for (const cords of lightButtons) {
        //         activateBlock(cords)
        //     }
        //     break
        case "arrow":
            const targetArrowLever1 = new vec3(36, 14, -9)
                activateBlock(targetArrowLever1)
            break
        case "arrows":
            const targetArrowLever = new vec3(36, 14, -9)
            for (let i = 0; i < 30; i++) {
                setTimeout(() => {
                    activateBlock(targetArrowLever)
                }, i * 50)
            }
            break
        case "lava":
            activateBlock(new vec3({x:38, y:11, z:1 }))
            activateBlock(new vec3({ x: 35, y: 16, z: -1 }))
            break
        case "lamp":
            activateBlock(new vec3({x:37, y:11, z:-2 }))
            break
        case "lavalight":
            activateBlock(new vec3({ x: 35, y: 12, z: 2 }))
            break

        case "goto":
            x = parts[1]
            y = parts[2]
            z = parts[3]
            range = parts[4] || 5

            bot.pathfinder.setGoal(null);
            bot.pathfinder.setMovements(defaultMove);
            bot.pathfinder.setGoal(new goals.GoalNear(x,y, z, range));
            break
        case "enderchest":
        {
            if (!WATCHED_PLAYERS.includes(username)) {
                replyFeedback(username, 'Я не буду открывать эндерчест для тебя.')
                return
            }
            const namePart = parts[1]?.toLowerCase()
            const chestBlock = bot.findBlock({
                matching: block => bot.openChest && block.name === 'ender_chest',
                maxDistance: 4
            })
            if (!chestBlock) {
                replyFeedback(username, 'Не нашёл эндер-сундук поблизости')
                break
            }
            bot.openChest(chestBlock).then(chest => {
                if (namePart === "all") {
                    const items = bot.inventory.items()
                    if (items.length === 0) {
                        replyFeedback(username, 'У меня вообще пусто в инвентаре')
                        chest.close()
                        return
                    }
                    unequipArmorAndMainHand()
                    const depositNext = () => {
                        const item = items.shift()
                        if (!item) {
                            chest.close()
                            replyFeedback(username, 'Сложил всё в эндер-сундук')
                            return
                        }
                        chest.deposit(item.type, null, item.count).then(depositNext).catch(err => {
                            replyFeedback(username, `Ошибка при складывании: ${err.message}`)
                            chest.close()
                        })
                    }

                    depositNext()
                    return
                }

                const items = bot.inventory.items().filter(i => i.name.includes(namePart))
                if (items.length === 0) {
                    replyFeedback(username, `У меня нет предметов с "${namePart}"`)
                    chest.close()
                    return
                }

                const depositNext = () => {
                    const item = items.shift()
                    if (!item) {
                        chest.close()
                        replyFeedback(username, `Сложил все предметы с "${namePart}" в эндер-сундук ✅`)
                        return
                    }
                    chest.deposit(item.type, null, item.count).then(depositNext).catch(err => {
                        replyFeedback(username, `Ошибка при складывании: ${err.message}`)
                        chest.close()
                    })
                }
                depositNext()

            }).catch(err => {
                replyFeedback(username, `Не смог открыть эндер-сундук: ${err.message}`)
            })
        }
            break
        case "unenderchest":
        {
            if (!WATCHED_PLAYERS.includes(username)) {
                replyFeedback(username, 'Я не буду открывать эндерчест для тебя.')
                return
            }
            const namePart = parts[1]?.toLowerCase()
            const chestBlock = bot.findBlock({
                matching: block => bot.openChest && block.name === 'ender_chest',
                maxDistance: 4
            })
            if (!chestBlock) {
                replyFeedback(username, 'Где сундук?')
                break
            }
            bot.openChest(chestBlock).then(chest => {
                if (namePart === "all") {
                    const items = chest.containerItems()
                    if (items.length === 0) {
                        replyFeedback(username, 'Эндер-сундук пуст 👀')
                        chest.close()
                        return
                    }

                    const takeNext = () => {
                        const item = items.shift()
                        if (!item) {
                            chest.close()
                            replyFeedback(username, 'Забрал все предметы из эндер-сундука!')
                            return
                        }
                        chest.withdraw(item.type, null, item.count).then(takeNext).catch(err => {
                            replyFeedback(username, `Ошибка: ${err.message}`)
                            chest.close()
                        })
                    }

                    takeNext()
                    return
                }
                const items = chest.containerItems().filter(i => i.name.includes(namePart))
                if (items.length === 0) {
                    replyFeedback(username, `Нет предметов с "${namePart}" в эндер-сундуке`)
                    chest.close()
                    return
                }

                const withdrawNext = () => {
                    const item = items.shift()
                    if (!item) {
                        chest.close()
                        replyFeedback(username, `Достал все предметы с "${namePart}" из эндер-сундука 👜`)
                        return
                    }
                    chest.withdraw(item.type, null, item.count).then(withdrawNext).catch(err => {
                        replyFeedback(username, `Ошибка при доставании: ${err.message}`)
                        chest.close()
                    })
                }
                withdrawNext()

            }).catch(err => {
                replyFeedback(username, `Не смог открыть эндер-сундук: ${err.message}`)
            })
        }
            break

        case "scan":
            blockName = parts[1]
            if (!blockName) {
                bot.chat("Больше слов!")
                return
            }

            replyFeedback(username, 'ждать!')

            blocks = bot.findBlocks({
                matching: block => {
                    const nameMatches = block.name.toLowerCase().includes(blockName.toLowerCase())
                    // const isVisible = bot.canSeeBlock(block)
                    return nameMatches// && isVisible
                },
                maxDistance: 150,
                count: 999,

            })

            if (blocks.length === 0) {
                replyFeedback(username, "не нашёл ничё :(")
                return
            }

            replyFeedback(username, `готово.`)
            console.log("НАЙДЕННЫЕ БЛОКИ:")
            blocks.forEach((pos, i) => {
                const block = bot.blockAt(pos)
                console.log(`${i + 1}) ${block.name} на ${pos}`)
            })
            break
        case "health":
            bot.chat(`/msg ${username} ${bot.health}`);
            break
        case "bounce":
            if (parts.length > 1) BOUNCE_POWER = parseFloat(parts[1])
            else BOUNCE_POWER = 0
            replyFeedback(username, `Теперь отскакиваю с силой ${BOUNCE_POWER}!`);
            break
        case "jump":
            if (parts.length > 1) power_1 = parseFloat(parts[1])
            else power_1 = 1.0
            replyFeedback(username, `Прыгаю с силой ${power_1}!`);
            boostBot(power_1, bot.players[username].entity)
            break

        case "cords":
            if (args.length < 1) {
                entityThatIHaveToFind = bot.entity;
                console.log('[CORDS DEBUG] Цель — я');
            } else {
                const nameToFind = parts[1];
                console.log('[CORDS DEBUG] Цель — по аргументу');
                entityThatIHaveToFind = bot.nearestEntity(entity => {
                        if ((entity.name && entity.name.toLowerCase().includes(nameToFind)) || (entity.username && entity.username.toLowerCase().includes(nameToFind)) ) {
                            return true;
                        }
                });
            }
            if (entityThatIHaveToFind) {
                bot.chat(`/r ${parseInt(entityThatIHaveToFind.position.x)} ${parseInt(entityThatIHaveToFind.position.y)} ${parseInt(entityThatIHaveToFind.position.z)}`)
            } else {
                bot.chat(`/r не нашел`)
            }
            break
        case "quit":
            if (!WATCHED_PLAYERS.includes(username)) {
                replyFeedback(username, 'Отстань!')
                return
            }
            bot.chat(`/msg ${username} Самоуничтожение...`);
            bot.quit()
            break
        case "chosecolor":
            const targetBlock = bot.findBlock({
                matching: () => true,
                maxDistance: 4
            })

            if (!targetBlock) {
                bot.chat(`/msg ${username} Блок не найден`)
                break
            }

            bot.setControlState('sneak', true)

            bot.activateBlock(targetBlock)

            bot.once('windowOpen', async (window) => {
                const wanted = args[0]?.toLowerCase()
                if (!wanted) {
                    bot.chat(`/msg ${username} цвет не задан`)
                    bot.closeWindow(window)
                    bot.setControlState('sneak', false)
                    return
                }

                for (let i = 0; i < window.slots.length; i++) {
                    const item = window.slots[i]
                    if (item && item.name.toLowerCase().includes(wanted)) {
                        try {
                            await bot.clickWindow(i, 0, 0)
                            await bot.waitForTicks(2)
                        } catch (err) {
                            console.log("Ошибка при клике:", err)
                        }
                    }
                }

                bot.closeWindow(window)
                bot.setControlState('sneak', false)
            })
            break
        case "drawto":
        console.log(`Буду искать все кроме ${args[0]}`)
            async function drawLoop() {
            const block = bot.findBlock({
                matching: (b) => b?.name?.includes('wool') && !b.name.includes(args[0]),
                maxDistance: 32
            })

            if (!block) {
                bot.chat(`/msg ${username} блок не найден`)
                return
            }

            try {
                bot.activateBlock(block)
            } catch (e) {
                console.log("ошибка при пути или активации:", e)
            }
            await bot.pathfinder.goto(new GoalNear(block.position.x, block.position.y+1, block.position.z, 0))
            setTimeout(drawLoop, 10000)
        }

            drawLoop()
            break
        case "equip":
            query = args[0] || null
            if (!query) {return}
            equipItem(query)
            break
        case "slot":
            query = args[0] || null
            if (!query) {return}
            query = parseInt(query)
            bot.setQuickBarSlot(query)
            equipItem()
            // bot.chat(`/msg ${username} Привета!`);
            break
        case "сосал?":
            bot.chat(`!Да.`);
            return;
        case "server":
            bot.chat("/server sleepcraft");
            return;

        case "break":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                return;
            }
            if (args.length < 2) {
                console.log('Укажи блок и количество: break <тип_блока> <количество>')
                return;
            }
            const blockType = args[0];
            const amount = parseInt(args[1]);

            if (isNaN(amount) || amount <= 0) {
                return;
            }

            collectBlockType(blockType, amount);
            break;
        case "nearest":
            if (args.length < 1) {
                bot.chat(`/msg ${username} Укажи тип сущности: nearest <тип>`);
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Укажи тип сущности: nearest <тип>`);
                return;
            }
            let entityType = args[0];
            let nearestEntity = findEntityWithName(bot, entityType);

            if (nearestEntity) {
                const neName = nearestEntity.username || nearestEntity.displayName || nearestEntity.name || 'Неизвестная сущность';
                const nePos = nearestEntity.position.floored();
                const dist = bot.entity.position.distanceTo(nearestEntity.position).toFixed(1);
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Ближайший ${entityType}: ${neName} в [${nePos.x}, ${nePos.y}, ${nePos.z}] (${dist}м)`);
                bot.chat(`/msg ${username} Ближайший ${entityType}: ${neName} в [${nePos.x}, ${nePos.y}, ${nePos.z}] (${dist}м)`);
            } else {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Не найдено сущностей типа ${entityType} поблизости.`);
                bot.chat(`/msg ${username} Не найдено сущностей типа ${entityType} поблизости.`);
            }
            break;
        case "come":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                return;
            }

            let playerToCome;

            if (args.length < 1) {
                playerToCome = bot.players[username]?.entity;
                console.log('Аргументов нет')
            } else {
                let targetname = args[0];
                console.log('Аргументы ест')
                playerToCome = findEntityWithName(bot, targetname);
            }



            if (playerToCome) {
                async function comePlayer() {
                    bot.pathfinder.setMovements(defaultMove);
                    // console.log(`[DEBUG] Перед setGoal(GoalFollow): canDig=${bot.pathfinder.movements.canDig}, canPlaceBlocks=${bot.pathfinder.movements.canPlaceBlocks}, allow1by1towers=${bot.pathfinder.movements.allow1by1towers}`);
                    await bot.pathfinder.setGoal(new GoalFollow(playerToCome, 2));
                    task = null;
                    // console.log("Готово!");
                }

                comePlayer();
            } else {
                sendFeedback('Не вижу цель.')
            }
            break;
        case "flyto":
            if (task) {
                bot.chat(`/msg ${WATCHED_PLAYERS[0]} Я уже занят заданием ${task}`)
                bot.chat(`/msg ${username} Я уже занят заданием ${task}`)
                return;
            }

            let playerToFly;

            if (args.length < 1) {
                playerToFly = bot.players[username]?.entity;
                console.log('Аргументов нет')
            } else {
                let targetname = args[0];
                console.log('Аргументы ест')
                playerToFly = findEntityWithName(bot, targetname, false);
            }



            if (playerToFly) {
                poss = playerToFly.position
                tp(poss.x, poss.z, 2.5, 3)
            } else {
                sendFeedback('Не вижу цель.')
            }
            break;
        case "teleport":
            if (task) {
                bot.chat(`/msg ${username} Бро, я занят другим заданием: ${task}`);
                return;
            }

            const planner = new ShotPlanner(bot);

            let playerToTeleport;

            if (args.length < 1) {
                playerToTeleport = bot.players[username]?.entity;
                console.log('[TP DEBUG] Цель — вызывающий');
            } else {
                const targetName = args[0];
                playerToTeleport = findEntityWithName(bot, targetName);
                console.log('[TP DEBUG] Цель — по аргументу');
            }

            if (!playerToTeleport) {
                bot.chat(`/msg ${username} Я не вижу цель для тп 😢`);
                return;
            }

            const enderPearlItem = bot.inventory.items().find(item => item.name === 'ender_pearl');
            if (!enderPearlItem) {
                bot.chat(`/msg ${username} У меня закончились жемчужки 😭`);
                return;
            }

        async function teleportToPlayerWithPlanner(target) {
            try {
                const shot = planner.shotToEntity(target);
                if (!shot || !shot.shotInfo?.intersectPos) {
                    bot.chat(`/msg ${username} Не могу точно прицелиться... 😕`);
                    return;
                }

                await bot.equip(enderPearlItem, 'hand');
                await bot.look(shot.yaw, shot.pitch, true);
                await bot.waitForTicks(10)
                bot.chat(`/msg ${username} Бросаю пёрл в ${target.username || 'цель'} ✨`);

                bot.activateItem();
                await bot.waitForTicks(5); // подожди, пока "зарядится"
                bot.deactivateItem();
                equipItem('sword')
            } catch (err) {
                console.log('[TP ERROR]', err);
                bot.chat(`/msg ${username} Не получилось тпшнуться, сорри 🥲`);
            }
        }

            teleportToPlayerWithPlanner(playerToTeleport);

            break;
        case "cometo":
            const player = bot.players[username]?.entity

            if (player) {
                const block = bot.blockAtEntityCursor(player, 100) // 6 — макс. дистанция (можно больше)

                if (block) {
                    console.log(`юзер смотрит на блок: ${block.name} (${block.position})`)
                    async function comePos() {
                        bot.pathfinder.setMovements(defaultMove);
                        console.log(`[DEBUG] Перед setGoa: canDig=${bot.pathfinder.movements.canDig}, canPlaceBlocks=${bot.pathfinder.movements.canPlaceBlocks}, allow1by1towers=${bot.pathfinder.movements.allow1by1towers}`);
                        //await bot.pathfinder.(new GoalNear(vec3(, , ), 0));
                        await bot.pathfinder.goto(new GoalNear(Math.floor(block.position.x), Math.floor(block.position.y + 1), Math.floor(block.position.z), 2));
                        task = null;
                        console.log("Готово!");
                    }

                    comePos()

                } else {
                    console.log('Он смотрит в пустоту или слишком далеко...')
                }
            } else {
                console.log('юзер не найден или оффлайн')
            }



            break;
        case "mode":
            if (!WATCHED_PLAYERS.includes(username)) {return}
            if (MODE === 'мирный') {
                MODE = 'злой'
            } else {
                MODE = 'мирный'
            }
            bot.chat(`/msg ${WATCHED_PLAYERS[0]} Задан режим '${MODE}'`)
            bot.chat(`/msg ${username} Задан режим '${MODE}'`)
            return
        case "stop":
            if (!WATCHED_PLAYERS.includes(username) && username !== 'Вы') {
                sendFeedback(`${username} хочет чтобы я ${plainMessage}`)
                bot.chat(`/msg ${username} Я не буду этого делать!!!`)
                return;
            }
            sendFeedback(`Останавливаюсь.`)
            bot.pvp.stop();
            bot.swordpvp.stop();
            bot.bowpvp.stop();
            followingProtectedPlayer = false;
            miningSand = false;
            following = false;
            bot.pathfinder.setGoal(null);
            bot.pathfinder.stop();
            bot.clearControlStates();
            collecting = false;
            task = null;
            break;
        case "stop-music":
            if (!WATCHED_PLAYERS.includes(username) && username !== 'Вы') {
                sendFeedback(`${username} хочет чтобы я ${plainMessage}`)
                return;
            }
            SOUND = null;
            playing = false;
            break;
        case "status":
            replyFeedback(username, `task: ${task}, sound: ${SOUND}, playing: ${playing}, statusses: ${readStates()[3]['text']}`)
            break;
        default:
            break;
    }
}

function getRussianName(itemId) {
    const item = mcData.itemsByName[itemId];
    return item ? item.displayName : `Неизвестный предмет (${itemId})`;
}

let justSentLogin = false;

bot.on('resourcePack', (url, hash) => {
    // console.log('Сервер предложил пакет ресурсов. Принимаю.');
    bot.acceptResourcePack();
});

let lastAttackTime = 0

bot.on('entitySwingArm', (entity) => {
    if (entity === bot) lastAttackTime = Date.now()
})

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
    bot.chat('/server sleepcraft');

});

bot.on("plasmovoice_audio_end", () => {
    SOUND = null
})

bot.on('entitySpawn', (entity) => {
    if (entity.name !== 'item') {
        return
    }
    const { x, y, z } = entity.position
    const nearest = Object.values(bot.players)
        .map(p => p.entity)
        .filter(e => e && e.position.distanceTo(entity.position) <= 2.5)
        .sort((a, b) => a.position.distanceTo(entity.position) - b.position.distanceTo(entity.position))[0]
    if (!nearest) return

    setTimeout(() => {
        const meta = entity.metadata?.[8]
        const id = meta?.itemId
        const count = meta?.itemCount
        const name = getRussianName(itemProtocolIdMap?.[id]) || `id:${id}`
        let loreItem = 'нет';
        try {
            loreItem = entity.metadata[8].nbtData.value.display.value.Lore.value.value[0]
                .split('Подпись: #')[1]
                .split('","bold"')[0];
        } catch (e) {
        }
        maybe_latest_block = [new vec3(Math.round(x), Math.round(y), Math.round(z)), itemProtocolIdMap?.[id]]
        if (latestBrokenBlock !== maybe_latest_block) {
            console.log(maybe_latest_block)
            console.log(`${nearest.username} => ${name} x${count} в ${Math.round(x)} ${Math.round(y)} ${Math.round(z)} подпись ${loreItem}`)
        }
    }, 200)
})

bot.on('playerCollect', (player, item) => {
    id = item?.metadata?.[8]?.itemId
    count = item?.metadata?.[8]?.itemCount

    if (id) {
        name = getRussianName(itemProtocolIdMap[id])
    } else {
        name = item.name
    }



    const { x, y, z } = item.position
    const roundedX = Math.round(x)
    const roundedY = Math.round(y)
    const roundedZ = Math.round(z)

    let loreItem = 'нет';
    try {
        loreItem = item.metadata[8].nbtData.value.display.value.Lore.value.value[0]
            .split('Подпись: #')[1]
            .split('","bold"')[0];
    } catch (e) {
    }

    // if (WATCHED_PLAYERS.includes(loreItem)) {
    // if (loreItem) {
    //     bot.chat(`/msg ${WATCHED_PLAYERS[0]} ${player.username} <- ${name} x${count} в ${roundedX} ${roundedY} ${roundedZ}, подпись: ${loreItem}`)
    // } else {
    if (id) console.log(`${player.username} <= ${name} x${count} в ${roundedX} ${roundedY} ${roundedZ} с подписью ${loreItem}`)
    else console.log(`${player.username} <= ${name} в ${roundedX} ${roundedY} ${roundedZ}`)
    // }
    // console.log(JSON.stringify(item?.metadata, null, 2));
    // console.log(require('util').inspect(item?.metadata, { depth: null, colors: true }));
})

bot.on('blockUpdate', (oldBlock, newBlock) => {
    if (!oldBlock || !newBlock || oldBlock.type === newBlock.type) {
        return
    }

    const { x, y, z } = oldBlock.position
    const nearestPlayer = Object.values(bot.players)
        .map(p => p.entity)
        .find(e => e && e.position.distanceTo(oldBlock.position) <= 2.5)

    if (!nearestPlayer) return

    const { username } = nearestPlayer
    const oldBlockName = oldBlock.name
    const newBlockName = newBlock.name

    if (!['air', 'water', 'lava'].includes(oldBlockName)) {
        console.log(`${username} [-] ${oldBlockName} в ${Math.round(x)} ${Math.round(y)} ${Math.round(z)}.`)
        setLatestBrokenBlock(oldBlock)
    } else {
        console.log(`${username} [+] ${newBlockName} в ${Math.round(x)} ${Math.round(y)} ${Math.round(z)}`)
    }

    })


rl.on('line', (line) => {
    const input = line.trim();
    if (input.length === 0) {
        rl.prompt();
        return;
    }

    const fakeUsername = 'console';
    processCommand(input, fakeUsername, input);
    rl.prompt();
});
bot.on('chat', (username, message) => {
    console.log(`I have got a message from ${username}: ${message}`);

    processCommand(message, username, message)
})

bot.on('message', (jsonMsg, position) => {
    console.log(jsonMsg.toAnsi());
    let plainMessage = jsonMsg.toString();

    if (plainMessage === "Your login session has been continued." || plainMessage === "Your connection to sleepcraft encountered a problem." || plainMessage === "You have successfully logged.") {
        connectToServer()
    }

    if (plainMessage.includes(' › ') || plainMessage.startsWith('������ [ДС] ')) {
        let typeOfMessage = null
        if (plainMessage.includes('Вам] › ')) {
            // [vlkardakov -> Вам] › come
            message = plainMessage.split('Вам] › ')[1]
            username = plainMessage.split('[')[1].split(' ->')[0]
            typeOfMessage = 'direct message'

        } else if (plainMessage.startsWith('������ [ДС] ')) {
            //������ [ДС] vlkardakov: сообщение из дискорда
            plainMessage = plainMessage.replace('������ [ДС] ', '')
            // vlkardakov: сообщение из дискорда
            message = plainMessage.split(': ')[1]
            // сообщение из дискорда
            username = plainMessage.split(': ')[0]
            // vlkardakov
            typeOfMessage = 'global chat'


        } else if (plainMessage.includes(' › ')) {
            // vlkardakov › come
            message = plainMessage.split(' › ')[1]
            username = plainMessage.split(' › ')[0]

            player = Object.values(bot.entities).find(
                (e) => e.type === 'player' && e.username === username
            );

            if (player) typeOfMessage = 'local chat'
            else typeOfMessage = 'global chat'
        }

        if (BOT_USERNAME === 'Abject12' && username !== BOT_USERNAME) {
            askGemini(plainMessage, typeOfMessage)
        } else if (username === BOT_USERNAME && BOT_USERNAME === 'Abject12') {
            infoGemini(plainMessage);
        }

        // console.log(`username: '${username}', command: '${command}'`);
        processCommand(message, username, plainMessage)
    }
    else {
        askGemini(plainMessage, 'system')
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
    if (err.message.includes('Invalid typed array length')) {
    console.warn('Пойман баг в PlasmoVoice, пакет проигнорирован')
    } else {
        throw err
    }
});
