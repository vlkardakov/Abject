import { createBot } from "mineflayer";
import { InterceptFunctions } from "@nxg-org/mineflayer-util-plugin";
import { Vec3 } from "vec3";
import { StaticShot, ShotFactory } from "../src"; // "@nxg-org/mineflayer-trajectories"
import { vectorMagnitude } from "../src/calc/mathUtils";

const bot = createBot({
  username: "shot-testing1",
  host: process.argv[2] ?? "localhost",
  port: Number(process.argv[3]) ?? 25565,
  version: process.argv[4],
});

const intercepter = new InterceptFunctions(bot);
const checkedEntities: Record<number, Vec3[]> = {}
const emptyVec = new Vec3(0, 0, 0);


// this code shows the trajectory of a projectile and whether it may hit people.



bot.on("entityMoved", async (ent) => {
  if (checkedEntities[ent.id]) return;
  if (ent.velocity.equals(emptyVec)) return;

  checkedEntities[ent.id] = [];

  if (["arrow", "firework_rocket", "ender_pearl", "egg", "potion", "trident", "fishing_bobber", "snowball", "llama_spit"].includes(ent.name!)) {
    console.log(vectorMagnitude(ent.velocity));

    const initShot = StaticShot.calculateShotForPoints(ent, true, intercepter);
 
    (async () => {

      for (let i = 0; i < 1; i++) {
        for (const idx in initShot.positions) {
          const pos = initShot.positions[idx];
          const vel = initShot.velocities[idx];
          const { x, y, z } = pos;
          bot.chat(`/particle flame ${x} ${y} ${z} 0 0 0 0 1 force`);
          // console.log(`pos: ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)} vel: ${vx.toFixed(3)} ${vy.toFixed(3)} ${vz.toFixed(3)}`);
        }

        await bot.waitForTicks(20);
      }
    
    })();
 
  }

  // console.log(ent)

  // // console.log(vectorMagnitude(orgEntityData.velocity));
  if (["arrow", "firework_rocket", "ender_pearl"].includes(ent.name!)) {

    for (const entity of Object.values(bot.entities).filter((e) => e !== ent && (e.type === "mob" || e.type === "player"))) {
      const hit = ShotFactory.fromEntity(ent, intercepter).hitsEntityWithPrediction(
        { position: entity.position, height: entity.height + 0.18, width: 0.6 },
        emptyVec
      );
      if (!hit.intersectPos) {
        console.log(ent.name, "is not going to hit entity", entity.username ?? entity.name);
        console.log(hit.closestPoint)
        continue;
      }
      if (hit.intersectPos) {
        bot.chat(`/particle note ${ent.position.x} ${ent.position.y} ${ent.position.z} 0 0 0 0 1 force`);
        console.log(ent.name, "is going to hit entity", entity.username ?? entity.name, "at position:", hit.intersectPos);
        bot.chat(`/particle heart ${hit.closestPoint!.x} ${hit.closestPoint!.y} ${hit.closestPoint!.z} 0 0 0 0 1 force`);
        console.log(`/particle heart ${hit.closestPoint!.x} ${hit.closestPoint!.y} ${hit.closestPoint!.z} 0 0 0 0 1 force`)
      }
    }
  }
});
