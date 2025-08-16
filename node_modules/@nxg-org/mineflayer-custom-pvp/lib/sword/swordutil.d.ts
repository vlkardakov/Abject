import { Entity } from "prismarine-entity";
import { goals } from "mineflayer-pathfinder";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { FollowConfig, FullConfig } from "./swordconfigs";
declare class PredictiveGoal extends goals.GoalFollow {
    readonly bot: Bot;
    predictTicks: number;
    constructor(bot: Bot, entity: Entity, range: number, predictTicks: number);
    heuristic(node: {
        x: number;
        y: number;
        z: number;
    }): number;
    isEnd(node: {
        x: number;
        y: number;
        z: number;
    }): boolean;
    hasChanged(): boolean;
    predictiveFunction(delta: Vec3, pos: Vec3, vel: Vec3): Vec3;
    distanceXZ(dx: number, dz: number): number;
}
export declare function followEntity(bot: Bot, entity: Entity, options: FullConfig): PredictiveGoal;
export declare function stopFollow(bot: Bot, mode: FollowConfig["mode"]): void;
export {};
