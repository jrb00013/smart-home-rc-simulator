// Walk-mode collision, built once from the finished scene (before static batching
// merges meshes). Floors and stair treads become a height field; walls and
// furniture become circles-vs-AABB blockers. Doors are hinged here and stay
// dynamic so a closed door is solid and an open one is not.
//
//   FP.collide.collect(scene)
//   FP.collide.groundAt(x, z, feetY) -> support height
//   FP.collide.blocked(x, z, feetY, bodyHeight, radius) -> bool
//   FP.collide.move(x, z, dx, dz, feetY, bodyHeight, radius) -> {x, z}
//   FP.world.doors[]   { name, group, angle, target, toggle(), blocks }
(function () {
    const floors = [];
    const blockers = [];
    const movers = [];
    const doors = [];
    const _q = new THREE.Quaternion();
    const _n = new THREE.Vector3();
    let ready = false;

    // Openings the exterior wall planes were built across. The door meshes
    // themselves supply the solid when shut.
    const HOLES = [
        { minX: -1.5, maxX: 1.5, minY: 0, maxY: 2.7, minZ: 23.6, maxZ: 24.6 },
        { minX: -10.8, maxX: -5.2, minY: 0, maxY: 2.6, minZ: 23.6, maxZ: 24.6 },
    ];

    function plain(box) {
        return {
            minX: box.min.x, maxX: box.max.x,
            minY: box.min.y, maxY: box.max.y,
            minZ: box.min.z, maxZ: box.max.z,
        };
    }

    function worldBox(mesh) {
        const geo = mesh.geometry;
        if (!geo) return null;
        if (!geo.boundingBox) geo.computeBoundingBox();
        if (!geo.boundingBox) return null;
        mesh.updateWorldMatrix(true, false);
        return geo.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    }

    function inflateXZ(b, half) {
        const sx = b.maxX - b.minX;
        const sz = b.maxZ - b.minZ;
        if (sx < half * 2) {
            const c = (b.minX + b.maxX) / 2;
            b.minX = c - half;
            b.maxX = c + half;
        }
        if (sz < half * 2) {
            const c = (b.minZ + b.maxZ) / 2;
            b.minZ = c - half;
            b.maxZ = c + half;
        }
    }

    function overlapsHole(b, h) {
        return !(b.maxX <= h.minX || b.minX >= h.maxX || b.maxY <= h.minY || b.minY >= h.maxY || b.maxZ <= h.minZ || b.minZ >= h.maxZ);
    }

    function punch(box, hole) {
        if (!overlapsHole(box, hole)) return [box];
        const parts = [];
        if (box.minX < hole.minX) parts.push(Object.assign({}, box, { maxX: hole.minX }));
        if (box.maxX > hole.maxX) parts.push(Object.assign({}, box, { minX: hole.maxX }));
        const x0 = Math.max(box.minX, hole.minX);
        const x1 = Math.min(box.maxX, hole.maxX);
        if (x1 > x0) {
            if (box.minY < hole.minY) parts.push(Object.assign({}, box, { minX: x0, maxX: x1, maxY: hole.minY }));
            if (box.maxY > hole.maxY) parts.push(Object.assign({}, box, { minX: x0, maxX: x1, minY: hole.maxY }));
            const y0 = Math.max(box.minY, hole.minY);
            const y1 = Math.min(box.maxY, hole.maxY);
            if (y1 > y0) {
                if (box.minZ < hole.minZ) parts.push(Object.assign({}, box, { minX: x0, maxX: x1, minY: y0, maxY: y1, maxZ: hole.minZ }));
                if (box.maxZ > hole.maxZ) parts.push(Object.assign({}, box, { minX: x0, maxX: x1, minY: y0, maxY: y1, minZ: hole.maxZ }));
            }
        }
        return parts;
    }

    function addBlock(b) {
        let parts = [b];
        for (const hole of HOLES) {
            const next = [];
            for (const p of parts) next.push.apply(next, punch(p, hole));
            parts = next;
        }
        for (const p of parts) {
            if (p.maxX - p.minX < 0.02 || p.maxY - p.minY < 0.02 || p.maxZ - p.minZ < 0.02) continue;
            blockers.push(p);
        }
    }

    function addFloor(box, stair) {
        const y = box.max.y;
        if (y < -0.2 || y > 18) return;
        floors.push({
            minX: box.min.x, maxX: box.max.x,
            minZ: box.min.z, maxZ: box.max.z,
            y: y < 0.03 ? 0 : y,
            stair: !!stair,
        });
    }

    function planeNormal(mesh) {
        const g = mesh.geometry;
        if (!g || g.type !== 'PlaneGeometry') return null;
        mesh.getWorldQuaternion(_q);
        return _n.set(0, 0, 1).applyQuaternion(_q);
    }

    function dynamicRoot(mesh) {
        for (let p = mesh; p; p = p.parent) {
            if (p.userData && p.userData.fpDynamic) return true;
        }
        return false;
    }

    function boxParams(mesh) {
        const g = mesh.geometry;
        if (!g || g.type !== 'BoxGeometry' || !g.parameters) return null;
        return g.parameters;
    }

    function near(mesh, x, y, z, r) {
        const p = mesh.getWorldPosition(_n);
        return Math.abs(p.x - x) < r && Math.abs(p.y - y) < r && Math.abs(p.z - z) < r;
    }

    function hingeAround(meshes, x, y, z) {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        g.userData.fpDynamic = true;
        (roomGroup || scene).add(g);
        g.updateMatrixWorld(true);
        meshes.forEach((m) => g.attach(m));
        return g;
    }

    function adoptDoors(root) {
        let front = null;
        let frontFrame = null;
        let garage = null;
        let garageFrame = null;
        root.traverse((obj) => {
            if (!obj.isMesh) return;
            const p = boxParams(obj);
            if (!p) return;
            const w = p.width, h = p.height, d = p.depth;
            if (Math.abs(w - 2.6) < 0.02 && Math.abs(h - 2.6) < 0.02 && Math.abs(d - 0.08) < 0.02 && near(obj, 0, 1.3, 24.15, 0.4)) front = obj;
            else if (Math.abs(w - 2.8) < 0.02 && Math.abs(h - 2.8) < 0.02 && Math.abs(d - 0.12) < 0.02 && near(obj, 0, 1.3, 24, 0.5)) frontFrame = obj;
            else if (Math.abs(w - 5) < 0.02 && Math.abs(h - 2.4) < 0.02 && Math.abs(d - 0.1) < 0.02 && near(obj, -8, 1.2, 24.15, 0.5)) garage = obj;
            else if (Math.abs(w - 5.3) < 0.02 && Math.abs(h - 2.7) < 0.02 && Math.abs(d - 0.15) < 0.02 && near(obj, -8, 1.35, 24, 0.6)) garageFrame = obj;
        });
        if (front) {
            const group = hingeAround([front, frontFrame].filter(Boolean), -1.3, 0, 24.15);
            doors.push(makeDoor('Front door', group, 'yaw'));
        }
        if (garage) {
            const group = hingeAround([garage, garageFrame].filter(Boolean), -8, 0, 24.15);
            doors.push(makeDoor('Garage door', group, 'lift'));
        }
    }

    function makeDoor(name, group, kind) {
        const door = {
            name: name,
            group: group,
            kind: kind,
            angle: 0,
            target: 0,
            lift: 0,
            targetLift: 0,
            blocks: true,
            get open() { return kind === 'lift' ? this.targetLift > 0.5 : Math.abs(this.target) > 0.4; },
            toggle() {
                if (kind === 'lift') this.targetLift = this.targetLift > 0.5 ? 0 : 2.7;
                else this.target = Math.abs(this.target) > 0.4 ? 0 : 1.35;
                FP.emit('use', { kind: 'door', name: name, open: this.open });
            },
            prompt() { return this.open ? 'Close ' + name.toLowerCase() : 'Open ' + name.toLowerCase(); },
        };
        movers.push(door);
        return door;
    }

    function classify(mesh) {
        if (!mesh.isMesh || !mesh.visible || dynamicRoot(mesh)) return;
        const mat = mesh.material;
        if (mat && !Array.isArray(mat) && mat.transparent && mat.opacity < 0.08) return;
        const box = worldBox(mesh);
        if (!box || box.isEmpty()) return;
        const sx = box.max.x - box.min.x;
        const sy = box.max.y - box.min.y;
        const sz = box.max.z - box.min.z;
        const minXZ = Math.min(sx, sz);
        const maxXZ = Math.max(sx, sz);
        if (maxXZ > 120 || (sx > 80 && sy > 80) || (sz > 80 && sy > 80)) return;

        const n = planeNormal(mesh);
        if (n && n.y < -0.65) return;
        if (n && n.y > 0.65) {
            addFloor(box, false);
            return;
        }
        const stairish = sy >= 0.03 && sy < 0.9 && minXZ < 0.72 && maxXZ >= 0.4 && maxXZ <= 2.25 && box.max.y > 0.12 && box.max.y < 16;
        if (stairish) {
            addFloor(box, true);
            return;
        }
        if (sy < 0.55 && minXZ > 0.28 && maxXZ > 0.28) {
            addFloor(box, false);
            if (box.max.y > 0.38 && box.max.y < 1.55 && box.min.y < 1.15 && minXZ > 0.3 && maxXZ < 8) {
                addBlock(plain(box));
            }
            return;
        }
        const wallish = sy > 1.35 && minXZ < 0.6 && maxXZ > 0.7;
        if (wallish || (n && Math.abs(n.y) < 0.45 && sy > 1.15 && maxXZ > 0.5)) {
            const b = plain(box);
            inflateXZ(b, 0.1);
            addBlock(b);
            return;
        }
        const fromFloor = box.min.y < 0.6 && box.max.y > 0.45 && box.max.y < 2.8 && sy < 3.2 && minXZ > 0.25 && maxXZ < 22;
        if (fromFloor) addBlock(plain(box));
    }

    function collect(root) {
        floors.length = 0;
        blockers.length = 0;
        root.updateMatrixWorld(true);
        adoptDoors(root);
        root.traverse((obj) => classify(obj));
        ready = true;
        FP.world = { doors: doors, movers: movers, floors: floors, blockers: blockers };
    }

    function dynamicBoxes() {
        const out = [];
        for (const door of movers) {
            if (!door.blocks) continue;
            door.group.updateWorldMatrix(true, true);
            door.group.traverse((obj) => {
                if (!obj.isMesh) return;
                const b = worldBox(obj);
                if (b) out.push(plain(b));
            });
        }
        return out;
    }

    function circleHits(x, z, radius, b, feetY, height) {
        const y0 = feetY + 0.14;
        const y1 = feetY + height;
        if (y1 < b.minY || y0 > b.maxY) return false;
        const cx = Math.max(b.minX, Math.min(b.maxX, x));
        const cz = Math.max(b.minZ, Math.min(b.maxZ, z));
        const dx = x - cx;
        const dz = z - cz;
        return dx * dx + dz * dz < radius * radius;
    }

    function hits(x, z, feetY, height, radius, list) {
        for (let i = 0; i < list.length; i++) {
            if (circleHits(x, z, radius, list[i], feetY, height)) return true;
        }
        return false;
    }

    function blocked(x, z, feetY, height, radius) {
        return hits(x, z, feetY, height, radius, blockers) || hits(x, z, feetY, height, radius, dynamicBoxes());
    }

    function pushOut(x, z, feetY, height, radius) {
        const dyn = dynamicBoxes();
        for (let iter = 0; iter < 5; iter++) {
            let hit = null;
            for (let i = 0; i < blockers.length; i++) {
                if (circleHits(x, z, radius, blockers[i], feetY, height)) { hit = blockers[i]; break; }
            }
            if (!hit) {
                for (let i = 0; i < dyn.length; i++) {
                    if (circleHits(x, z, radius, dyn[i], feetY, height)) { hit = dyn[i]; break; }
                }
            }
            if (!hit) break;
            const cx = Math.max(hit.minX, Math.min(hit.maxX, x));
            const cz = Math.max(hit.minZ, Math.min(hit.maxZ, z));
            let dx = x - cx;
            let dz = z - cz;
            const len = Math.hypot(dx, dz);
            if (len < 1e-4) {
                const left = x - hit.minX;
                const right = hit.maxX - x;
                const back = z - hit.minZ;
                const front = hit.maxZ - z;
                const m = Math.min(left, right, back, front);
                if (m === left) x = hit.minX - radius - 0.01;
                else if (m === right) x = hit.maxX + radius + 0.01;
                else if (m === back) z = hit.minZ - radius - 0.01;
                else z = hit.maxZ + radius + 0.01;
            } else {
                const push = radius - len + 0.01;
                x += (dx / len) * push;
                z += (dz / len) * push;
            }
        }
        return { x: x, z: z };
    }

    function groundPoint(x, z, feetY) {
        let h = 0;
        for (let i = 0; i < floors.length; i++) {
            const f = floors[i];
            if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
            const limit = feetY + (f.stair ? 1.15 : 0.46);
            if (f.y <= limit + 0.02 && f.y > h) h = f.y;
        }
        return h;
    }

    function groundAt(x, z, feetY) {
        const r = 0.1;
        return Math.max(
            groundPoint(x, z, feetY),
            groundPoint(x + r, z, feetY),
            groundPoint(x - r, z, feetY),
            groundPoint(x, z + r, feetY),
            groundPoint(x, z - r, feetY)
        );
    }

    function move(x, z, dx, dz, feetY, height, radius) {
        const dist = Math.hypot(dx, dz);
        const steps = Math.max(1, Math.ceil(dist / 0.18));
        const sx = dx / steps;
        const sz = dz / steps;
        const dyn = dynamicBoxes();
        function bad(px, pz) {
            return hits(px, pz, feetY, height, radius, blockers) || hits(px, pz, feetY, height, radius, dyn);
        }
        for (let s = 0; s < steps; s++) {
            const nx = x + sx;
            const nz = z + sz;
            if (!bad(nx, nz)) { x = nx; z = nz; continue; }
            if (!bad(nx, z)) { x = nx; continue; }
            if (!bad(x, nz)) { z = nz; continue; }
            break;
        }
        return pushOut(x, z, feetY, height, radius);
    }

    FP.collide = {
        collect: collect,
        groundAt: groundAt,
        blocked: blocked,
        move: move,
        pushOut: pushOut,
        get ready() { return ready; },
        get stats() { return { floors: floors.length, blockers: blockers.length, doors: doors.length }; },
    };
    FP.world = { doors: doors, movers: movers, floors: floors, blockers: blockers };
})();
