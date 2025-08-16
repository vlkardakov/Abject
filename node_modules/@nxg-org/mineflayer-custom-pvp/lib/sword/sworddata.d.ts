import type { Bot } from "mineflayer";
import type { Item } from "prismarine-item";
export declare const attackSpeeds: {
    wooden_sword: number;
    golden_sword: number;
    stone_sword: number;
    iron_sword: number;
    diamond_sword: number;
    netherite_sword: number;
    trident: number;
    wooden_shovel: number;
    golden_shovel: number;
    stone_shovel: number;
    iron_shovel: number;
    diamond_shovel: number;
    netherite_shovel: number;
    wooden_pickaxe: number;
    golden_pickaxe: number;
    stone_pickaxe: number;
    iron_pickaxe: number;
    diamond_pickaxe: number;
    netherite_pickaxe: number;
    wooden_axe: number;
    golden_axe: number;
    stone_axe: number;
    iron_axe: number;
    diamond_axe: number;
    netherite_axe: number;
    wooden_hoe: number;
    golden_hoe: number;
    stone_hoe: number;
    iron_hoe: number;
    diamond_hoe: number;
    netherite_hoe: number;
    other: number;
};
export declare class Cooldown {
    weaponName: string;
    x: number;
    min: number;
    max: number;
    constructor(weaponName: string, x: number, min: number, max: number);
    getAttackSpeed(weaponName: string): any;
    clamp(x: number, min: number, max: number): number;
    getCooldown(weaponName: string): number;
    getDamageMultiplier(weaponName: string): number;
}
export declare abstract class MaxDamageOffset {
    minDmg: number;
    maxDmg: number;
    bot: Bot;
    constructor(bot: Bot, min?: number, max?: number);
    abstract getTicks(item: Item): number;
}
export declare class NewPVPTicks extends MaxDamageOffset {
    getTicks(item: Item): number;
}
export declare class OldPVPTicks extends MaxDamageOffset {
    cps: number;
    private lastAttackTime;
    constructor(bot: Bot, cps: number);
    getTicks(item: Item): number;
}
