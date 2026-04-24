// Climber (player + companion) built from primitives.
//
// The climber sits near world origin in Y — the mountain scrolls underneath.

import { CONFIG } from "../config.js";
import { clamp, lerp } from "../util.js";

const THREE = window.THREE;

export function makeClimber({ jacketColor = 0xd24136, packColor = 0x324156 } = {}) {
  const group = new THREE.Group();

  const m = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
      ...opts,
    });

  // Torso = red jacket
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.5, 1.1, 8),
    m(jacketColor)
  );
  torso.position.y = 1.0;
  torso.castShadow = true;
  group.add(torso);

  // Harness belt
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.06, 6, 16),
    m(0x2a2d31)
  );
  belt.position.y = 0.55;
  belt.rotation.x = Math.PI / 2;
  group.add(belt);

  // Head + helmet
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    m(0xe6caa8)
  );
  head.position.y = 1.7;
  group.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    m(0xf5ebd6, { flatShading: true })
  );
  helmet.position.y = 1.78;
  helmet.castShadow = true;
  group.add(helmet);

  // Headlamp
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 0.08, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffeab0,
      emissive: 0xffe4a0,
      emissiveIntensity: 1.2,
    })
  );
  lamp.position.set(0, 1.78, 0.22);
  lamp.rotation.x = Math.PI / 2;
  group.add(lamp);

  const spot = new THREE.SpotLight(0xfff2c6, 1.2, 18, Math.PI / 5, 0.4, 1.2);
  spot.position.set(0, 1.78, 0.24);
  const target = new THREE.Object3D();
  target.position.set(0, 1.5, 4);
  spot.target = target;
  group.add(spot);
  group.add(target);

  // Backpack
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.7, 0.34),
    m(packColor)
  );
  pack.position.set(0, 1.0, -0.3);
  group.add(pack);

  // Arms
  const armMat = m(jacketColor);
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.7, 6), armMat);
  leftArm.position.set(-0.42, 1.15, 0.08);
  leftArm.rotation.z = 0.5;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.7, 6), armMat);
  rightArm.position.set(0.42, 1.15, 0.08);
  rightArm.rotation.z = -0.5;
  group.add(rightArm);

  // Legs
  const legMat = m(0x2c3340);
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.75, 6), legMat);
  leftLeg.position.set(-0.18, 0.3, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.75, 6), legMat);
  rightLeg.position.set(0.18, 0.3, 0);
  group.add(rightLeg);

  // Stance ledge — small snowy wedge under the feet so the climber visually
  // stands on something even though the mountain face doesn't carry per-step
  // geometry.
  const ledge = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.22, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0xd4dee9,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true,
    })
  );
  ledge.position.set(0, -0.18, -0.05);
  ledge.receiveShadow = true;
  group.add(ledge);
  const ledgeFront = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.12, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xb6c5d6,
      roughness: 1.0,
      flatShading: true,
    })
  );
  ledgeFront.position.set(0, -0.24, 0.32);
  group.add(ledgeFront);

  // Crampons (cones downward)
  const cramponMat = m(0x8a92a0, { metalness: 0.7, roughness: 0.3 });
  for (const lx of [-0.18, 0.18]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.3), legMat);
    foot.position.set(lx, -0.04, 0.04);
    group.add(foot);
    for (let ix = -1; ix <= 1; ix++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), cramponMat);
      spike.position.set(lx + ix * 0.07, -0.1, 0.16);
      spike.rotation.x = Math.PI;
      group.add(spike);
    }
  }

  // Ice axe: simple L-shape
  const axeShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6),
    m(0x8a5a2a)
  );
  axeShaft.position.set(0.62, 1.1, 0.05);
  axeShaft.rotation.z = -0.6;
  group.add(axeShaft);
  const axeHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.08, 0.06),
    m(0xa8b0bc, { metalness: 0.6, roughness: 0.35 })
  );
  axeHead.position.set(0.94, 1.42, 0.05);
  axeHead.rotation.z = 0.3;
  group.add(axeHead);

  // Harness carabiner
  const carab = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.018, 6, 12),
    m(0xe3b05a, { metalness: 0.8, roughness: 0.3 })
  );
  carab.position.set(0, 0.55, 0.5);
  carab.rotation.y = Math.PI / 2;
  group.add(carab);

  // Breathing reference: small chest marker we animate Y scale on.
  const breather = new THREE.Object3D();
  breather.position.set(0, 1.1, 0);
  group.add(breather);

  return { group, breather, spot, helmet, torso };
}

export class Climber {
  constructor(colors) {
    const made = makeClimber(colors);
    this.group = made.group;
    this.breather = made.breather;
    this.spot = made.spot;
    this.helmet = made.helmet;
    this.torso = made.torso;
    this._t = 0;
    this._roll = 0;
  }

  update(dt, ctx) {
    this._t += dt;
    const breathe = Math.sin(this._t * 2.1) * 0.025;
    this.torso.scale.y = 1 + breathe;

    // lean with sideways velocity
    const leanTarget = clamp(ctx.playerVX * 0.035, -0.4, 0.4);
    this._roll = lerp(this._roll, leanTarget, Math.min(1, dt * 6));
    this.group.rotation.z = -this._roll;

    // bob with climbing motion
    const bob = ctx.climbing ? Math.sin(this._t * 6.8) * 0.04 : 0;
    this.group.position.y = bob;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }
}
