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

function pickRoadLocation(minDistFromX, minDistFromZ) {
    for (let tries = 0; tries < 40; tries++) {
        const gx = -3200 + Math.floor(Math.random() * 13) * GRID_STEP;
        const gz = -3200 + Math.floor(Math.random() * 13) * GRID_STEP;
        if (Math.abs(gx - RIVER_X) < RIVER_WIDTH) continue;
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
    scene.fog = new THREE.Fog(0x7dd3fc, 900, 3200);

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 1, 4200);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
        new THREE.PlaneGeometry(16000, 16000),
        new THREE.MeshLambertMaterial({ color: 0x0284c7 })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -2.2;
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

