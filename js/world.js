// ========================================================
// Mumbai Island Taxi Sim 3D - 3D World Generation & Environment
// ========================================================

function checkBuildingCollision(x, z, radius) {
    const gx = Math.floor(x / GRID_STEP);
    const gz = Math.floor(z / GRID_STEP);
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const list = spatialGrid.get(`${gx + dx},${gz + dz}`);
            if (!list) continue;
            for (let i = 0; i < list.length; i++) {
                const b = list[i];
                if (x + radius > b.minX && x - radius < b.maxX &&
                    z + radius > b.minZ && z - radius < b.maxZ) {
                    return b;
                }
            }
        }
    }
    return null;
}

function isInsideWorldBounds(x, z, margin = 20) {
    // 1. Main City Island
    if (Math.abs(x) <= MAP_HALF - margin && Math.abs(z) <= MAP_HALF - margin) {
        return true;
    }
    // 2. Grand Sea Link Bridge
    if (x >= BRIDGE_START_X - 60 && x <= BRIDGE_END_X + 60) {
        if (Math.abs(z - BRIDGE_Z) <= (BRIDGE_WIDTH / 2) - 4) {
            return true;
        }
    }
    // 3. Second Island (Palm Resort & Marina Island)
    if (Math.abs(x - ISLAND2_CENTER_X) <= ISLAND2_HALF_W - margin &&
        Math.abs(z - ISLAND2_CENTER_Z) <= ISLAND2_HALF_D - margin) {
        return true;
    }
    return false;
}

function pickRoadLocation(minDistFromX, minDistFromZ) {
    for (let tries = 0; tries < 50; tries++) {
        let gx, gz;
        // 35% chance to pick destination on Palm Resort Island
        const pickIsland2 = Math.random() < 0.35;
        if (pickIsland2) {
            const opts = [
                { x: 6700 + Math.random() * 2600, z: 0 },
                { x: 6900 + Math.random() * 2400, z: 1000 },
                { x: 6900 + Math.random() * 2400, z: -1000 },
                { x: 7200, z: -850 + Math.random() * 1700 },
                { x: 8200, z: -850 + Math.random() * 1700 },
                { x: 9200, z: -850 + Math.random() * 1700 }
            ];
            const chosen = opts[Math.floor(Math.random() * opts.length)];
            gx = chosen.x;
            gz = chosen.z;
        } else {
            gx = -3200 + Math.floor(Math.random() * 13) * GRID_STEP;
            gz = -3200 + Math.floor(Math.random() * 13) * GRID_STEP;
            if (Math.abs(gx - RIVER_X) < RIVER_WIDTH) continue;
        }
        if (Math.hypot(gx - minDistFromX, gz - minDistFromZ) > 900) {
            return { x: gx + 36, z: gz + 36 };
        }
    }
    return { x: 1286, z: 1286 };
}

function init3D() {
    const canvas = document.getElementById('gameCanvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7dd3fc);
    scene.fog = new THREE.Fog(0x7dd3fc, 2200, 11000);

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 1, 14000);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1.0); // Solid 60 FPS performance default

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xfffbeb, 0.95);
    dirLight.position.set(600, 1200, 400);
    scene.add(dirLight);

    // Cache shared textures once
    sharedEnvCube = createEnvCubeTexture();
    sharedContactShadowTex = createContactShadowTexture();
    sharedTaxiSideTex = createCarSideTexture(true);
    sharedTrafficSideTex = createCarSideTexture(false);
    sharedFrontFaceTex = createFrontFasciaTexture(true);
    sharedRearFaceTex = createRearFasciaTexture(true);
    sharedTaxiSignTex = createTaxiSignTexture();
    sharedDriverFaceTex = createHumanFaceTexture();

    // Layered Ocean, Sandy Island & City Base
    const ocean = new THREE.Mesh(
        new THREE.PlaneGeometry(36000, 36000),
        new THREE.MeshLambertMaterial({ color: 0x0284c7 })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(4500, -2.2, 0);
    scene.add(ocean);

    const beach = new THREE.Mesh(
        new THREE.PlaneGeometry(MAP_HALF * 2 + 420, MAP_HALF * 2 + 420),
        new THREE.MeshLambertMaterial({ color: 0xfde68a })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = -0.8;
    scene.add(beach);

    const cityGround = new THREE.Mesh(
        new THREE.PlaneGeometry(MAP_HALF * 2, MAP_HALF * 2),
        new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    cityGround.rotation.x = -Math.PI / 2;
    cityGround.position.y = 0;
    scene.add(cityGround);

    // River Channel
    const river = new THREE.Mesh(
        new THREE.PlaneGeometry(RIVER_WIDTH, MAP_HALF * 2 + 500),
        new THREE.MeshLambertMaterial({ color: 0x0369a1 })
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(RIVER_X, 0.12, 0);
    scene.add(river);

    // GPU Instanced City Roads & Lane Markings
    const roadTiles = [];
    const yellowDashes = [];
    for (let pos = -MAP_HALF + GRID_STEP; pos <= MAP_HALF - GRID_STEP; pos += GRID_STEP) {
        // North-South avenues (skip river)
        if (Math.abs(pos - RIVER_X) > RIVER_WIDTH * 0.7) {
            roadTiles.push({ x: pos, z: 0, w: ROAD_WIDTH, d: MAP_HALF * 2 });
            for (let z = -MAP_HALF + 60; z < MAP_HALF - 60; z += 90) {
                yellowDashes.push({ x: pos, z, w: 3, d: 36 });
            }
        }
        // East-West avenues
        roadTiles.push({ x: 0, z: pos, w: MAP_HALF * 2, d: ROAD_WIDTH });
        for (let x = -MAP_HALF + 60; x < MAP_HALF - 60; x += 90) {
            if (Math.abs(x - RIVER_X) > RIVER_WIDTH * 0.55) {
                yellowDashes.push({ x, z: pos, w: 36, d: 3 });
            }
        }
    }

    const planeGeo = new THREE.PlaneGeometry(1, 1);
    planeGeo.rotateX(-Math.PI / 2);

    const roadInst = new THREE.InstancedMesh(
        planeGeo,
        new THREE.MeshLambertMaterial({ color: 0x1e293b }),
        roadTiles.length
    );
    const dummy = new THREE.Object3D();
    roadTiles.forEach((r, i) => {
        dummy.position.set(r.x, 0.22, r.z);
        dummy.scale.set(r.w, 1, r.d);
        dummy.updateMatrix();
        roadInst.setMatrixAt(i, dummy.matrix);
    });
    roadInst.instanceMatrix.needsUpdate = true;
    scene.add(roadInst);

    const dashInst = new THREE.InstancedMesh(
        planeGeo,
        new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
        yellowDashes.length
    );
    yellowDashes.forEach((d, i) => {
        dummy.position.set(d.x, 0.3, d.z);
        dummy.scale.set(d.w, 1, d.d);
        dummy.updateMatrix();
        dashInst.setMatrixAt(i, dummy.matrix);
    });
    dashInst.instanceMatrix.needsUpdate = true;
    scene.add(dashInst);

    // River Bridges
    const bridgeDeckMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const railMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    for (let bz = -MAP_HALF + GRID_STEP; bz <= MAP_HALF - GRID_STEP; bz += GRID_STEP) {
        const deck = new THREE.Mesh(new THREE.BoxGeometry(RIVER_WIDTH + 60, 2.5, ROAD_WIDTH + 12), bridgeDeckMat);
        deck.position.set(RIVER_X, -0.6, bz);
        scene.add(deck);

        [-1, 1].forEach((side) => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(RIVER_WIDTH + 60, 4.5, 4), railMat);
            rail.position.set(RIVER_X, 2.4, bz + side * (ROAD_WIDTH * 0.5 + 4));
            scene.add(rail);
        });
    }

    // Elevated Highway Overpass
    const overpassDeck = new THREE.Mesh(
        new THREE.BoxGeometry(MAP_HALF * 1.8, 4, 140),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    overpassDeck.position.set(0, 28, HIGHWAY_Z);
    scene.add(overpassDeck);

    // GPU Instanced Multi-Story Buildings
    const bldgConfigs = [];
    const palette = [0xf8fafc, 0xe2e8f0, 0xdbeafe, 0xfef3c7, 0xe0e7ff, 0xf1f5f9];
    for (let bx = -MAP_HALF + GRID_STEP * 1.5; bx <= MAP_HALF - GRID_STEP * 1.5; bx += GRID_STEP) {
        if (Math.abs(bx - RIVER_X) < RIVER_WIDTH * 0.9) continue;
        for (let bz = -MAP_HALF + GRID_STEP * 1.5; bz <= MAP_HALF - GRID_STEP * 1.5; bz += GRID_STEP) {
            if (Math.abs(bz - HIGHWAY_Z) < 180) continue;

            const hash = Math.abs(Math.sin(bx * 12.9898 + bz * 78.233) * 43758.5453);
            const frac = hash - Math.floor(hash);

            // Fuel & Repair Service Stations
            if (frac < 0.08) {
                const isFuel = frac < 0.04;
                serviceZones.push({ x: bx, z: bz, type: isFuel ? 'fuel' : 'repair' });
                const pad = new THREE.Mesh(
                    new THREE.PlaneGeometry(180, 180),
                    new THREE.MeshBasicMaterial({ color: isFuel ? 0xf59e0b : 0x10b981 })
                );
                pad.rotation.x = -Math.PI / 2;
                pad.position.set(bx, 0.35, bz);
                scene.add(pad);

                const canopy = new THREE.Mesh(
                    new THREE.BoxGeometry(110, 8, 80),
                    new THREE.MeshLambertMaterial({ color: isFuel ? 0xd97706 : 0x059669 })
                );
                canopy.position.set(bx, 28, bz);
                scene.add(canopy);
                continue;
            }

            [
                { ox: -95, oz: -85, w: 145, d: 145, h: 110 + (frac * 270) },
                { ox: 95, oz: 85, w: 145, d: 145, h: 85 + (((frac * 7) % 1) * 220) }
            ].forEach((t, idx) => {
                const x = bx + t.ox;
                const z = bz + t.oz;
                const col = palette[(Math.floor(frac * 100) + idx) % palette.length];
                bldgConfigs.push({ x, z, w: t.w, d: t.d, h: t.h, color: col });

                const bObj = {
                    minX: x - t.w / 2,
                    maxX: x + t.w / 2,
                    minZ: z - t.d / 2,
                    maxZ: z + t.d / 2
                };
                buildings.push(bObj);

                const cellKey = `${Math.floor(bx / GRID_STEP)},${Math.floor(bz / GRID_STEP)}`;
                if (!spatialGrid.has(cellKey)) spatialGrid.set(cellKey, []);
                spatialGrid.get(cellKey).push(bObj);
            });
        }
    }

    facadeDayTex = createBuildingFacadeTexture(false);
    facadeNightTex = createBuildingFacadeTexture(true);
    const roofTex = createRooftopTexture();

    buildingWallMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: facadeDayTex });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: roofTex });
    const bldgMaterials = [
        buildingWallMat, buildingWallMat,
        roofMat, buildingWallMat,
        buildingWallMat, buildingWallMat
    ];

    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const bldgInst = new THREE.InstancedMesh(unitBox, bldgMaterials, bldgConfigs.length);
    const penthouseInst = new THREE.InstancedMesh(
        unitBox,
        new THREE.MeshLambertMaterial({ color: 0x475569 }),
        bldgConfigs.length
    );

    const colorObj = new THREE.Color();
    bldgConfigs.forEach((b, i) => {
        dummy.position.set(b.x, b.h / 2, b.z);
        dummy.scale.set(b.w, b.h, b.d);
        dummy.updateMatrix();
        bldgInst.setMatrixAt(i, dummy.matrix);
        colorObj.setHex(b.color);
        bldgInst.setColorAt(i, colorObj);

        const phH = 10 + (i % 4) * 4;
        dummy.position.set(b.x - b.w * 0.18, b.h + phH / 2, b.z - b.d * 0.18);
        dummy.scale.set(b.w * 0.36, phH, b.d * 0.36);
        dummy.updateMatrix();
        penthouseInst.setMatrixAt(i, dummy.matrix);
    });
    bldgInst.instanceMatrix.needsUpdate = true;
    if (bldgInst.instanceColor) bldgInst.instanceColor.needsUpdate = true;
    penthouseInst.instanceMatrix.needsUpdate = true;
    scene.add(bldgInst);
    scene.add(penthouseInst);

    // Build Grand Sea Link Bridge & Palm Resort Island
    buildSeaLinkBridge();
    buildSecondIsland();

    // Spawn Player Taxi
    playerCar = createCarMesh(0xfacc15, true);
    playerCar.x = 250;
    playerCar.z = 250;
    playerCar.mesh.position.set(playerCar.x, 0, playerCar.z);
    scene.add(playerCar.mesh);
    cars.push(playerCar);

    // Spawn AI Traffic Vehicles
    const trafficColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf8fafc, 0x64748b, 0xa855f7, 0xf97316];
    for (let i = 0; i < 48; i++) {
        const col = trafficColors[i % trafficColors.length];
        const aiCar = createCarMesh(col, false);
        const avenue = -3200 + (i % 13) * GRID_STEP;
        if (i % 2 === 0 && Math.abs(avenue - RIVER_X) > RIVER_WIDTH) {
            aiCar.aiAxis = 'z';
            aiCar.x = avenue + (i % 4 === 0 ? 22 : -22);
            aiCar.z = -3000 + Math.random() * 6000;
            aiCar.aiDir = i % 4 === 0 ? 1 : -1;
            aiCar.heading = aiCar.aiDir > 0 ? 0 : Math.PI;
        } else {
            aiCar.aiAxis = 'x';
            aiCar.z = avenue + (i % 4 === 1 ? 22 : -22);
            aiCar.x = -3000 + Math.random() * 6000;
            aiCar.aiDir = i % 4 === 1 ? 1 : -1;
            aiCar.heading = aiCar.aiDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        aiCar.speed = 34 + Math.random() * 18;
        aiCar.mesh.position.set(aiCar.x, 0, aiCar.z);
        aiCar.mesh.rotation.y = aiCar.heading;
        scene.add(aiCar.mesh);
        cars.push(aiCar);
    }

    // Spawn Sea Link & Island 2 Traffic Cars
    for (let i = 0; i < 14; i++) {
        const col = trafficColors[(i + 3) % trafficColors.length];
        const aiCar = createCarMesh(col, false);
        if (i < 6) {
            // Cruising along the Sea Link Bridge
            aiCar.aiAxis = 'x';
            aiCar.x = BRIDGE_START_X + 200 + Math.random() * (BRIDGE_END_X - BRIDGE_START_X - 400);
            aiCar.z = i % 2 === 0 ? BRIDGE_Z + 18 : BRIDGE_Z - 18;
            aiCar.aiDir = i % 2 === 0 ? 1 : -1;
            aiCar.heading = aiCar.aiDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
            // Cruising on Palm Resort Island
            aiCar.aiAxis = i % 2 === 0 ? 'x' : 'z';
            if (aiCar.aiAxis === 'x') {
                aiCar.z = (i % 4 === 0 ? 1000 : -1000) + (i % 2 === 0 ? 18 : -18);
                aiCar.x = 6900 + Math.random() * 2400;
                aiCar.aiDir = i % 2 === 0 ? 1 : -1;
                aiCar.heading = aiCar.aiDir > 0 ? Math.PI / 2 : -Math.PI / 2;
            } else {
                aiCar.x = (i % 4 === 2 ? 7200 : 9200) + (i % 2 === 0 ? 18 : -18);
                aiCar.z = -750 + Math.random() * 1500;
                aiCar.aiDir = i % 2 === 0 ? 1 : -1;
                aiCar.heading = aiCar.aiDir > 0 ? 0 : Math.PI;
            }
        }
        aiCar.speed = 38 + Math.random() * 16;
        aiCar.mesh.position.set(aiCar.x, 0, aiCar.z);
        aiCar.mesh.rotation.y = aiCar.heading;
        scene.add(aiCar.mesh);
        cars.push(aiCar);
    }

    // Spawn On-Foot Pedestrian Player Mesh
    player.mesh = createHumanMesh(0xfacc15, 0x1e293b);
    player.leftLeg = player.mesh.userData.leftLeg;
    player.rightLeg = player.mesh.userData.rightLeg;
    player.leftArm = player.mesh.userData.leftArm;
    player.rightArm = player.mesh.userData.rightArm;
    player.mesh.visible = false;
    scene.add(player.mesh);

    // Spawn Mission Beacon & Passenger
    const ringGeo = new THREE.RingGeometry(18, 26, 32);
    ringGeo.rotateX(-Math.PI / 2);
    mission.ringMesh = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    mission.ringMesh.position.y = 0.55;
    scene.add(mission.ringMesh);

    mission.beamMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(16, 16, 260, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    );
    mission.beamMesh.position.y = 130;
    scene.add(mission.beamMesh);

    mission.passengerMesh = createHumanMesh(0x38bdf8, 0x0f172a);
    scene.add(mission.passengerMesh);

    spawnNewPickup();
}

function createPalmTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.4, 22, 6),
        new THREE.MeshLambertMaterial({ color: 0x78350f })
    );
    trunk.position.y = 11;
    trunk.rotation.z = (Math.random() - 0.5) * 0.14;
    group.add(trunk);

    const frondMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(3.2, 14, 4), frondMat);
        frond.rotation.z = Math.PI / 2.7;
        frond.rotation.y = (i / 6) * Math.PI * 2;
        frond.position.set(0, 21.5, 0);
        group.add(frond);
    }
    return group;
}

function buildSeaLinkBridge() {
    const bridgeDeckMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const barrierMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const cableMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const towerMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

    const spanLen = BRIDGE_END_X - BRIDGE_START_X;
    const bridgeMidX = (BRIDGE_START_X + BRIDGE_END_X) / 2;

    // 1. Concrete Highway Bridge Deck
    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(spanLen + 100, 3.5, BRIDGE_WIDTH),
        bridgeDeckMat
    );
    deck.position.set(bridgeMidX, 1.8, BRIDGE_Z);
    scene.add(deck);

    // 2. Center Double Yellow Dashed Lines
    const dashesCount = Math.floor(spanLen / 45);
    const dashGeo = new THREE.PlaneGeometry(28, 2.5);
    dashGeo.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const dashInst = new THREE.InstancedMesh(dashGeo, dashMat, dashesCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < dashesCount; i++) {
        const dx = BRIDGE_START_X + 25 + i * 45;
        dummy.position.set(dx, 3.6, BRIDGE_Z);
        dummy.updateMatrix();
        dashInst.setMatrixAt(i, dummy.matrix);
    }
    dashInst.instanceMatrix.needsUpdate = true;
    scene.add(dashInst);

    // 3. Concrete Piers under Bridge into Ocean
    for (let px = BRIDGE_START_X + 200; px < BRIDGE_END_X - 100; px += 260) {
        const pier = new THREE.Mesh(
            new THREE.CylinderGeometry(8, 10, 16, 8),
            pierMat
        );
        pier.position.set(px, -4.5, BRIDGE_Z);
        scene.add(pier);
    }

    // 4. Yellow Safety Crash Barriers & Guardrails
    [-BRIDGE_WIDTH / 2 + 2, BRIDGE_WIDTH / 2 - 2].forEach(bz => {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(spanLen + 100, 4.2, 3),
            barrierMat
        );
        rail.position.set(bridgeMidX, 4.6, BRIDGE_Z + bz);
        scene.add(rail);
    });

    // 4b. Instanced Highway Streetlights along bridge rails
    const lightPolesX = [];
    for (let sx = BRIDGE_START_X + 100; sx < BRIDGE_END_X - 60; sx += 180) {
        lightPolesX.push(sx);
    }
    const poleGeo = new THREE.CylinderGeometry(0.35, 0.45, 14, 6);
    const lampGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const totalLamps = lightPolesX.length * 2;
    const poleInst = new THREE.InstancedMesh(poleGeo, pierMat, totalLamps);
    const lampInst = new THREE.InstancedMesh(lampGeo, lampMat, totalLamps);

    let lIdx = 0;
    [-BRIDGE_WIDTH / 2 + 2, BRIDGE_WIDTH / 2 - 2].forEach(bz => {
        lightPolesX.forEach(sx => {
            dummy.position.set(sx, 11, BRIDGE_Z + bz);
            dummy.scale.set(1, 1, 1);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            poleInst.setMatrixAt(lIdx, dummy.matrix);

            dummy.position.set(sx, 18, BRIDGE_Z + bz + (bz > 0 ? -2 : 2));
            dummy.updateMatrix();
            lampInst.setMatrixAt(lIdx, dummy.matrix);
            lIdx++;
        });
    });
    poleInst.instanceMatrix.needsUpdate = true;
    lampInst.instanceMatrix.needsUpdate = true;
    scene.add(poleInst);
    scene.add(lampInst);

    // 5. Bandra-Worli Style Cable-Stayed Pylons (Suspension Towers)
    const allCablePoints = [];
    [BRIDGE_START_X + 750, BRIDGE_START_X + 1600].forEach(tx => {
        // A-Frame Concrete Towers (Twin Towers)
        [-BRIDGE_WIDTH / 2 - 3, BRIDGE_WIDTH / 2 + 3].forEach(tz => {
            const tower = new THREE.Mesh(
                new THREE.BoxGeometry(14, 96, 9),
                towerMat
            );
            tower.position.set(tx, 48, BRIDGE_Z + tz);
            scene.add(tower);

            // Red beacon on top
            const beacon = new THREE.Mesh(
                new THREE.SphereGeometry(1.6, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xef4444 })
            );
            beacon.position.set(tx, 96.5, BRIDGE_Z + tz);
            scene.add(beacon);
        });

        // Cross-beam connecting tower tops
        const crossBeam = new THREE.Mesh(
            new THREE.BoxGeometry(10, 6, BRIDGE_WIDTH + 15),
            towerMat
        );
        crossBeam.position.set(tx, 86, BRIDGE_Z);
        scene.add(crossBeam);

        // Collect stay cable line points for single batched LineSegments
        for (let c = -14; c <= 14; c++) {
            if (c === 0) continue;
            const deckAttachX = tx + c * 32;
            if (deckAttachX < BRIDGE_START_X || deckAttachX > BRIDGE_END_X) continue;
            [-BRIDGE_WIDTH / 2 + 2, BRIDGE_WIDTH / 2 - 2].forEach(cz => {
                allCablePoints.push(
                    new THREE.Vector3(tx, 85, BRIDGE_Z + (cz > 0 ? BRIDGE_WIDTH / 2 : -BRIDGE_WIDTH / 2)),
                    new THREE.Vector3(deckAttachX, 4.0, BRIDGE_Z + cz)
                );
            });
        }
    });

    // Single batched draw call for all 112 bridge cables
    if (allCablePoints.length > 0) {
        const cablesGeo = new THREE.BufferGeometry().setFromPoints(allCablePoints);
        const cablesMesh = new THREE.LineSegments(cablesGeo, cableMat);
        scene.add(cablesMesh);
    }
}

function buildSecondIsland() {
    const dummy = new THREE.Object3D();

    // 1. Sandy Beach Shoreline Base
    const beach2 = new THREE.Mesh(
        new THREE.PlaneGeometry(ISLAND2_HALF_W * 2 + 400, ISLAND2_HALF_D * 2 + 400),
        new THREE.MeshLambertMaterial({ color: 0xfde68a })
    );
    beach2.rotation.x = -Math.PI / 2;
    beach2.position.set(ISLAND2_CENTER_X, -0.65, ISLAND2_CENTER_Z);
    scene.add(beach2);

    // 2. Vibrant Emerald Resort Ground
    const ground2 = new THREE.Mesh(
        new THREE.PlaneGeometry(ISLAND2_HALF_W * 2, ISLAND2_HALF_D * 2),
        new THREE.MeshLambertMaterial({ color: 0x10b981 })
    );
    ground2.rotation.x = -Math.PI / 2;
    ground2.position.set(ISLAND2_CENTER_X, 0.05, ISLAND2_CENTER_Z);
    scene.add(ground2);

    // 3. Resort Road Network
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    planeGeo.rotateX(-Math.PI / 2);

    const island2Roads = [
        // Central Grand Boulevard
        { x: ISLAND2_CENTER_X, z: 0, w: ISLAND2_HALF_W * 2, d: 90 },
        // North Avenue
        { x: ISLAND2_CENTER_X, z: 1000, w: ISLAND2_HALF_W * 1.7, d: 75 },
        // South Avenue
        { x: ISLAND2_CENTER_X, z: -1000, w: ISLAND2_HALF_W * 1.7, d: 75 },
        // West Coastal Cross Road
        { x: 7200, z: 0, w: 75, d: 2000 },
        // Central Cross Avenue
        { x: 8200, z: 0, w: 85, d: 2000 },
        // East Coastal Cross Road
        { x: 9200, z: 0, w: 75, d: 2000 }
    ];

    const rInst = new THREE.InstancedMesh(planeGeo, roadMat, island2Roads.length);
    island2Roads.forEach((r, idx) => {
        dummy.position.set(r.x, 0.22, r.z);
        dummy.scale.set(r.w, 1, r.d);
        dummy.updateMatrix();
        rInst.setMatrixAt(idx, dummy.matrix);
    });
    rInst.instanceMatrix.needsUpdate = true;
    scene.add(rInst);

    // 4. Batched Instanced Palm Trees along beaches & boulevards (reduces ~680 draw calls to 2)
    const palmPositions = [];
    for (let px = 6700; px <= 9700; px += 160) {
        palmPositions.push({ x: px, z: 1080 });
        palmPositions.push({ x: px, z: -1080 });
        palmPositions.push({ x: px, z: 1650 });
        palmPositions.push({ x: px, z: -1650 });
    }
    for (let pz = -1400; pz <= 1400; pz += 180) {
        palmPositions.push({ x: 9750, z: pz });
    }

    const trunkGeo = new THREE.CylinderGeometry(0.8, 1.4, 22, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const frondGeo = new THREE.ConeGeometry(3.2, 14, 4);
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPositions.length);
    const frondInst = new THREE.InstancedMesh(frondGeo, frondMat, palmPositions.length * 6);

    palmPositions.forEach((pos, idx) => {
        // Trunk instance
        dummy.position.set(pos.x, 11, pos.z);
        dummy.rotation.set(0, 0, (idx % 3 - 1) * 0.08);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(idx, dummy.matrix);

        // 6 Fronds per palm tree
        for (let f = 0; f < 6; f++) {
            const fIdx = idx * 6 + f;
            dummy.position.set(pos.x, 21.5, pos.z);
            dummy.rotation.set(0, 0, 0);
            dummy.rotateY((f / 6) * Math.PI * 2);
            dummy.rotateZ(Math.PI / 2.7);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            frondInst.setMatrixAt(fIdx, dummy.matrix);
        }
    });

    trunkInst.instanceMatrix.needsUpdate = true;
    frondInst.instanceMatrix.needsUpdate = true;
    scene.add(trunkInst);
    scene.add(frondInst);

    // 5. Taj Palm Resort & Casino Luxury Hotel Complex
    const resortX = 8200;
    const resortZ = 480;

    const hotelMain = new THREE.Mesh(
        new THREE.BoxGeometry(220, 160, 110),
        new THREE.MeshLambertMaterial({ color: 0x0284c7 })
    );
    hotelMain.position.set(resortX, 80, resortZ);
    scene.add(hotelMain);

    const hotelCrown = new THREE.Mesh(
        new THREE.BoxGeometry(180, 24, 80),
        new THREE.MeshLambertMaterial({ color: 0xf59e0b })
    );
    hotelCrown.position.set(resortX, 172, resortZ);
    scene.add(hotelCrown);

    // Illuminated Rooftop Neon Sign: "PALM RESORT"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.strokeStyle = '#f59e0b';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(4, 4, 504, 120);
    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 50px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('★ PALM RESORT ★', 256, 78);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 40),
        new THREE.MeshBasicMaterial({ map: signTex })
    );
    signMesh.position.set(resortX, 196, resortZ + 42);
    scene.add(signMesh);

    const hotelBldg = {
        minX: resortX - 115,
        maxX: resortX + 115,
        minZ: resortZ - 60,
        maxZ: resortZ + 60
    };
    buildings.push(hotelBldg);
    const cellK = `${Math.floor(resortX / GRID_STEP)},${Math.floor(resortZ / GRID_STEP)}`;
    if (!spatialGrid.has(cellK)) spatialGrid.set(cellK, []);
    spatialGrid.get(cellK).push(hotelBldg);

    // 6. Helipad with Glowing 'H'
    const heliX = 7600;
    const heliZ = 450;
    const heliPad = new THREE.Mesh(
        new THREE.CylinderGeometry(55, 55, 2.5, 24),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    heliPad.position.set(heliX, 1.25, heliZ);
    scene.add(heliPad);

    const heliCanvas = document.createElement('canvas');
    heliCanvas.width = 256;
    heliCanvas.height = 256;
    const hCtx = heliCanvas.getContext('2d');
    hCtx.fillStyle = '#334155';
    hCtx.fillRect(0, 0, 256, 256);
    hCtx.strokeStyle = '#ffffff';
    hCtx.lineWidth = 14;
    hCtx.beginPath();
    hCtx.arc(128, 128, 100, 0, Math.PI * 2);
    hCtx.stroke();
    hCtx.fillStyle = '#facc15';
    hCtx.font = '900 130px sans-serif';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'middle';
    hCtx.fillText('H', 128, 128);
    const heliTex = new THREE.CanvasTexture(heliCanvas);
    const heliDecal = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90),
        new THREE.MeshBasicMaterial({ map: heliTex })
    );
    heliDecal.rotation.x = -Math.PI / 2;
    heliDecal.position.set(heliX, 2.6, heliZ);
    scene.add(heliDecal);

    // 7. Marina Yacht Pier & Moored Yachts
    const pierX = 8200;
    const pierDeck = new THREE.Mesh(
        new THREE.BoxGeometry(60, 3, 550),
        new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    pierDeck.position.set(pierX, 1.5, -1350);
    scene.add(pierDeck);

    // 2 Luxury Yachts at the Pier
    [-1200, -1450].forEach((yz, yIdx) => {
        const ySide = yIdx % 2 === 0 ? 1 : -1;
        const yacht = new THREE.Group();
        const hull = new THREE.Mesh(
            new THREE.BoxGeometry(26, 9, 85),
            new THREE.MeshLambertMaterial({ color: 0xffffff })
        );
        hull.position.y = 2.5;
        yacht.add(hull);
        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(18, 8, 48),
            new THREE.MeshLambertMaterial({ color: 0x0284c7 })
        );
        cabin.position.set(0, 9.5, -6);
        yacht.add(cabin);

        yacht.position.set(pierX + ySide * 55, 0, yz);
        scene.add(yacht);
    });

    // 8. Resort Fuel & Repair Service Stations
    serviceZones.push({ x: 7200, z: -350, type: 'fuel' });
    const fPad = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 160),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    fPad.rotation.x = -Math.PI / 2;
    fPad.position.set(7200, 0.35, -350);
    scene.add(fPad);
    const fCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(100, 8, 70),
        new THREE.MeshLambertMaterial({ color: 0xd97706 })
    );
    fCanopy.position.set(7200, 28, -350);
    scene.add(fCanopy);

    serviceZones.push({ x: 9200, z: 350, type: 'repair' });
    const rPad = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 160),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    rPad.rotation.x = -Math.PI / 2;
    rPad.position.set(9200, 0.35, 350);
    scene.add(rPad);
    const rCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(100, 8, 70),
        new THREE.MeshLambertMaterial({ color: 0x059669 })
    );
    rCanopy.position.set(9200, 28, 350);
    scene.add(rCanopy);

    // 9. Additional Resort Towers (Luxury Suites & Casino)
    const resortTowers = [
        { x: 8800, z: 480, w: 120, d: 100, h: 140, col: 0xf8fafc },
        { x: 7600, z: -480, w: 110, d: 110, h: 125, col: 0xdbeafe },
        { x: 8800, z: -480, w: 120, d: 90, h: 150, col: 0xfef3c7 },
        { x: 9200, z: -480, w: 100, d: 100, h: 110, col: 0xe0e7ff }
    ];
    resortTowers.forEach(t => {
        const b = new THREE.Mesh(
            new THREE.BoxGeometry(t.w, t.h, t.d),
            new THREE.MeshLambertMaterial({ color: t.col })
        );
        b.position.set(t.x, t.h / 2, t.z);
        scene.add(b);

        const bBox = {
            minX: t.x - t.w / 2,
            maxX: t.x + t.w / 2,
            minZ: t.z - t.d / 2,
            maxZ: t.z + t.d / 2
        };
        buildings.push(bBox);
        const ck = `${Math.floor(t.x / GRID_STEP)},${Math.floor(t.z / GRID_STEP)}`;
        if (!spatialGrid.has(ck)) spatialGrid.set(ck, []);
        spatialGrid.get(ck).push(bBox);
    });
}

