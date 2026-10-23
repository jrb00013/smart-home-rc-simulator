// Static batching: merge meshes that never move and share the same material object into
// one BufferGeometry per material, so the house/neighborhood costs a few hundred draw
// calls instead of ~750. Vertices are baked into world space; materials are reused as-is
// (identity, not "looks the same"), so runtime material tweaks still apply and nothing
// changes visually.
//
// Anything that moves, toggles visibility or is looked up at runtime is left alone:
// the TV, remote/arm/body, autonomous entities, room device refs, fan, butterflies,
// smoke, sky dome and every descendant of those.

function collectDynamicRoots() {
    const roots = [
        tvMesh, screenMesh, tvFrame, tvPowerLED,
        remoteMesh, remoteGroup, handGroup, armGroup, firstPersonHolder, playerBody,
        window._fanBlades,
    ];
    if (typeof digitalRemoteGroup !== 'undefined') roots.push(digitalRemoteGroup);
    if (typeof findSkyDome === 'function') roots.push(findSkyDome());
    (window._butterflies || []).forEach(function (o) { roots.push(o); });
    (window._smokeParticles || []).forEach(function (o) { roots.push(o); });
    (autonomousEntities || []).forEach(function (e) {
        if (!e) return;
        Object.keys(e).forEach(function (k) {
            if (e[k] && e[k].isObject3D) roots.push(e[k]);
        });
    });
    Object.keys(roomDeviceRefs || {}).forEach(function (k) {
        const v = roomDeviceRefs[k];
        (Array.isArray(v) ? v : [v]).forEach(function (o) { if (o && o.isObject3D) roots.push(o); });
    });
    return new Set(roots.filter(Boolean));
}

function isUnderDynamic(obj, dynamic) {
    for (let o = obj; o; o = o.parent) {
        if (dynamic.has(o)) return true;
    }
    return false;
}

function attributeSignature(geo) {
    const names = Object.keys(geo.attributes).sort();
    return names.map(function (n) {
        const a = geo.attributes[n];
        return n + ':' + a.itemSize + ':' + (a.normalized ? 1 : 0) + ':' + (a.isInterleavedBufferAttribute ? 'i' : 'p');
    }).join(',');
}

function canBatch(mesh) {
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh) return false;
    if (!mesh.visible || mesh.children.length > 0) return false;
    if (!mesh.frustumCulled || mesh.renderOrder !== 0) return false;
    if (mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;
    const mat = mesh.material;
    if (!mat || Array.isArray(mat) || mat.transparent || !mat.visible) return false;
    const geo = mesh.geometry;
    if (!geo || !geo.isBufferGeometry || !geo.attributes.position) return false;
    if (Object.keys(geo.morphAttributes || {}).length > 0) return false;
    if (attributeSignature(geo).indexOf(':i') !== -1) return false; // interleaved: skip
    if (mesh.matrixWorld.determinant() <= 0) return false; // mirrored: winding would flip
    for (let p = mesh.parent; p; p = p.parent) {
        if (!p.visible) return false;
    }
    return true;
}

// Concatenate world-space copies of each mesh's geometry (indexed output).
function mergeWorldGeometries(meshes) {
    const first = meshes[0].geometry;
    const names = Object.keys(first.attributes);
    let vertexCount = 0;
    let indexCount = 0;
    meshes.forEach(function (m) {
        const g = m.geometry;
        vertexCount += g.attributes.position.count;
        indexCount += g.index ? g.index.count : g.attributes.position.count;
    });
    const merged = new THREE.BufferGeometry();
    const arrays = {};
    names.forEach(function (n) {
        const a = first.attributes[n];
        arrays[n] = new a.array.constructor(vertexCount * a.itemSize);
    });
    const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;
    const index = new IndexArray(indexCount);
    const normalMatrix = new THREE.Matrix3();
    const v = new THREE.Vector3();
    let vOffset = 0;
    let iOffset = 0;
    meshes.forEach(function (m) {
        const g = m.geometry;
        const count = g.attributes.position.count;
        normalMatrix.getNormalMatrix(m.matrixWorld);
        names.forEach(function (n) {
            const src = g.attributes[n];
            const dst = arrays[n];
            const size = src.itemSize;
            if (n === 'position' || n === 'normal' || n === 'tangent') {
                for (let i = 0; i < count; i++) {
                    v.fromBufferAttribute(src, i);
                    if (n === 'position') v.applyMatrix4(m.matrixWorld);
                    else v.applyMatrix3(normalMatrix).normalize();
                    dst[(vOffset + i) * size] = v.x;
                    dst[(vOffset + i) * size + 1] = v.y;
                    dst[(vOffset + i) * size + 2] = v.z;
                    if (size === 4) dst[(vOffset + i) * size + 3] = src.getW(i);
                }
            } else {
                dst.set(src.array.subarray(0, count * size), vOffset * size);
            }
        });
        if (g.index) {
            const src = g.index.array;
            for (let i = 0; i < g.index.count; i++) index[iOffset + i] = src[i] + vOffset;
            iOffset += g.index.count;
        } else {
            for (let i = 0; i < count; i++) index[iOffset + i] = vOffset + i;
            iOffset += count;
        }
        vOffset += count;
    });
    names.forEach(function (n) {
        const a = first.attributes[n];
        merged.setAttribute(n, new THREE.BufferAttribute(arrays[n], a.itemSize, a.normalized));
    });
    merged.setIndex(new THREE.BufferAttribute(index, 1));
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
}

// Materials with identical parameters (but different instances) block batching. Collapse
// them onto one shared instance, but only for plain non-emissive materials that belong
// exclusively to static meshes: anything also used by a dynamic/unbatchable mesh, or
// with an emissive glow (LEDs, bulbs - often animated from closures), is left alone.
function dedupeStaticMaterials(staticMeshes, pinned) {
    const canonical = new Map();
    const replaced = new Set();
    staticMeshes.forEach(function (mesh) {
        const mat = mesh.material;
        if (pinned.has(mat)) return;
        if (mat.emissive && mat.emissive.getHex() !== 0) return;
        if (mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return;
        let key;
        try {
            const json = mat.toJSON();
            delete json.uuid;
            delete json.name;
            delete json.metadata;
            key = JSON.stringify(json);
        } catch (e) {
            return;
        }
        const existing = canonical.get(key);
        if (!existing) {
            canonical.set(key, mat);
        } else if (existing !== mat) {
            mesh.material = existing;
            replaced.add(mat);
        }
    });
    return replaced;
}

function batchStaticMeshes(root) {
    if (!root || typeof THREE === 'undefined') return null;
    root.updateMatrixWorld(true);
    const dynamic = collectDynamicRoots();

    // Geometry use counts, so a geometry is only disposed once nothing references it
    const geoUsers = new Map();
    root.traverse(function (o) {
        if (o.isMesh && o.geometry) geoUsers.set(o.geometry, (geoUsers.get(o.geometry) || 0) + 1);
    });

    const staticMeshes = [];
    const pinned = new Set(); // materials also used by meshes we must not touch
    root.traverse(function (o) {
        if (!o.isMesh) return;
        if (canBatch(o) && !isUnderDynamic(o, dynamic)) {
            staticMeshes.push(o);
        } else {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m) pinned.add(m); });
        }
    });
    const replacedMaterials = dedupeStaticMaterials(staticMeshes, pinned);

    const groups = new Map();
    staticMeshes.forEach(function (o) {
        const key = o.material.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) +
            '|' + attributeSignature(o.geometry) + '|' + o.layers.mask;
        let list = groups.get(key);
        if (!list) { list = []; groups.set(key, list); }
        list.push(o);
    });

    let mergedMeshes = 0;
    let createdBatches = 0;
    groups.forEach(function (list) {
        if (list.length < 2) return;
        const geo = mergeWorldGeometries(list);
        const batch = new THREE.Mesh(geo, list[0].material);
        batch.name = 'static-batch';
        batch.castShadow = list[0].castShadow;
        batch.receiveShadow = list[0].receiveShadow;
        batch.layers.mask = list[0].layers.mask;
        batch.matrixAutoUpdate = false; // vertices already in world space
        batch.updateMatrix();
        root.add(batch);
        list.forEach(function (m) {
            if (m.parent) m.parent.remove(m);
            const n = geoUsers.get(m.geometry) - 1;
            geoUsers.set(m.geometry, n);
            if (n === 0) m.geometry.dispose();
        });
        mergedMeshes += list.length;
        createdBatches++;
    });
    // Materials that were collapsed onto a shared instance are no longer referenced
    replacedMaterials.forEach(function (m) { m.dispose(); });
    return { mergedMeshes: mergedMeshes, batches: createdBatches };
}
