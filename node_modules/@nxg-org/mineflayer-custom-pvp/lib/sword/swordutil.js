"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopFollow = exports.followEntity = void 0;
const mineflayer_pathfinder_1 = require("mineflayer-pathfinder");
const vec3_1 = require("vec3");
// import { GoalFactory } from "@nxg-org/mineflayer-jump-pathing";
class PredictiveGoal extends mineflayer_pathfinder_1.goals.GoalFollow {
    constructor(bot, entity, range, predictTicks) {
        super(entity, range);
        this.bot = bot;
        this.predictTicks = predictTicks;
        this.bot.tracker.trackEntity(entity);
    }
    heuristic(node) {
        const dx = this.x - node.x;
        const dy = this.y - node.y;
        const dz = this.z - node.z;
        return this.distanceXZ(dx, dz) + Math.abs(dy);
    }
    isEnd(node) {
        const dx = this.x - node.x;
        const dy = this.y - node.y;
        const dz = this.z - node.z;
        return dx * dx + dy * dy + dz * dz <= this.rangeSq;
    }
    hasChanged() {
        const pos = this.entity.position.floored();
        const p = this.predictiveFunction(this.entity.position.minus(this.bot.entity.position), this.entity.position, this.bot.tracker.getEntitySpeed(this.entity) || new vec3_1.Vec3(0, 0, 0));
        const dx = this.x - p.x;
        const dy = this.y - p.y;
        const dz = this.z - p.z;
        if (dx * dx + dy * dy + dz * dz > this.rangeSq) {
            this.x = p.x;
            this.y = p.y;
            this.z = p.z;
            return true;
        }
        return false;
    }
    predictiveFunction(delta, pos, vel) {
        const base = Math.round(Math.sqrt(Math.pow(delta.x, 2) + Math.pow(delta.y, 2) + Math.pow(delta.z, 2)));
        const tickCount = Math.round((base * this.predictTicks) / Math.sqrt(base));
        return pos.plus(vel.scaled(isNaN(tickCount) ? 0 : tickCount));
    }
    distanceXZ(dx, dz) {
        dx = Math.abs(dx);
        dz = Math.abs(dz);
        return Math.abs(dx - dz) + Math.min(dx, dz) * Math.SQRT2;
    }
}
function followEntity(bot, entity, options) {
    var _a;
    switch (options.followConfig.mode) {
        case "jump":
        // const tmp1 = GoalFactory.predictEntity(
        //   bot,
        //   entity,
        //   options.followConfig.distance,
        //   options.followConfig.predict ? options.followConfig.predictTicks ?? 4 : 0
        // );
        // bot.jumpPather.goto(tmp1);
        // return tmp1;
        case "standard":
            const tmp2 = new PredictiveGoal(bot, entity, options.followConfig.distance, options.followConfig.predict ? (_a = options.followConfig.predictTicks) !== null && _a !== void 0 ? _a : 4 : 0);
            bot.pathfinder.setGoal(tmp2, true);
            return tmp2;
    }
}
exports.followEntity = followEntity;
function stopFollow(bot, mode) {
    // bot.jumpPather.stop();
    bot.pathfinder.stop();
}
exports.stopFollow = stopFollow;
