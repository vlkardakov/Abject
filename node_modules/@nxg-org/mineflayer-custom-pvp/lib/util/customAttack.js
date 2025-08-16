"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attack = void 0;
function attack(bot, target, swing = true) {
    // arm animation comes before the use_entity packet
    useEntity(bot, target, 1);
    if (swing) {
        swingArm(bot);
    }
}
exports.attack = attack;
function useEntity(bot, target, leftClick, x, y, z) {
    if (x && y && z) {
        bot._client.write('use_entity', {
            target: target.id,
            mouse: leftClick,
            x,
            y,
            z,
            sneaking: false
        });
    }
    else {
        bot._client.write('use_entity', {
            target: target.id,
            mouse: leftClick,
            sneaking: false
        });
    }
}
function swingArm(bot, arm = 'right', showHand = true) {
    const hand = arm === 'right' ? 0 : 1;
    const packet = {};
    if (showHand)
        Object.assign(packet, hand);
    bot._client.write('arm_animation', packet);
}
