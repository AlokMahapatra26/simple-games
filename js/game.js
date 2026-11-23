// ========================================================
// Mumbai Island Taxi Sim 3D - Main Simulation Loop & Boot
// ========================================================

let currentGearText = 'P';

function showToast(msg) {
    const box = document.getElementById('toastBox');
    const txt = document.getElementById('toastText');
    if (!box || !txt) return;
    txt.textContent = msg;
    box.style.opacity = '1';
    clearTimeout(box._t);
    box._t = setTimeout(() => { box.style.opacity = '0'; }, 2400);
}

function spawnNewPickup() {
    const loc = pickRoadLocation(playerCar.x, playerCar.z);
    mission.state = 'pickup';
    mission.x = loc.x;
    mission.z = loc.z;
    if (mission.ringMesh) {
        mission.ringMesh.position.set(mission.x, 0.55, mission.z);
        mission.ringMesh.material.color.setHex(0x38bdf8);
    }
    if (mission.beamMesh) {
        mission.beamMesh.position.set(mission.x, 130, mission.z);
        mission.beamMesh.material.color.setHex(0x38bdf8);
    }
    if (mission.passengerMesh) {
        mission.passengerMesh.visible = true;
        mission.passengerMesh.position.set(mission.x + 12, 0, mission.z + 12);
    }

    const dot = document.getElementById('missionDot');
    const title = document.getElementById('missionTitle');
    const timer = document.getElementById('missionTimer');
    if (dot) dot.className = 'w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse';
    if (title) {
        title.textContent = 'Drive to Blue Pickup Zone';
        title.className = 'text-xs sm:text-sm font-extrabold tracking-wide text-sky-300 uppercase';
    }
    if (timer) timer.classList.add('hidden');
}

function startDropoff() {
    playPickupSFX();
    const loc = pickRoadLocation(playerCar.x, playerCar.z);
    const dist = Math.hypot(loc.x - playerCar.x, loc.z - playerCar.z);
    mission.state = 'dropoff';
    mission.x = loc.x;
    mission.z = loc.z;
    mission.timer = Math.max(50, Math.round(dist / 24));
    mission.payout = Math.max(35, Math.round(dist / 32));

    if (mission.ringMesh) {
        mission.ringMesh.position.set(mission.x, 0.55, mission.z);
        mission.ringMesh.material.color.setHex(0xf59e0b);
    }
    if (mission.beamMesh) {
        mission.beamMesh.position.set(mission.x, 130, mission.z);
        mission.beamMesh.material.color.setHex(0xf59e0b);
    }
    if (mission.passengerMesh) {
        mission.passengerMesh.visible = false;
    }

    const dot = document.getElementById('missionDot');
    const title = document.getElementById('missionTitle');
    const timer = document.getElementById('missionTimer');
    if (dot) dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
    if (title) {
        title.textContent = `Drop Off Passenger ($${mission.payout})`;
        title.className = 'text-xs sm:text-sm font-extrabold tracking-wide text-amber-300 uppercase';
    }
    if (timer) timer.classList.remove('hidden');
    showToast(`Passenger aboard! Payout: $${mission.payout}`);
}

function triggerGameOver(title, reason) {
    isGameOver = true;
    const tEl = document.getElementById('gameOverTitle');
    const rEl = document.getElementById('gameOverReason');
    const cEl = document.getElementById('finalCash');
    const fEl = document.getElementById('finalFares');
    const mEl = document.getElementById('gameOverModal');
    if (tEl) tEl.textContent = title;
    if (rEl) rEl.textContent = reason;
    if (cEl) cEl.textContent = `$${Math.floor(cash)}`;
    if (fEl) fEl.textContent = faresCompleted;
    if (mEl) mEl.classList.remove('hidden');
}

function updateTraffic(dt) {
    for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        if (c !== playerCar) {
            if (c.aiAxis === 'z') {
                c.z += c.speed * c.aiDir * dt;
                if (c.z > MAP_HALF - 200) { c.aiDir = -1; c.heading = Math.PI; }
                if (c.z < -MAP_HALF + 200) { c.aiDir = 1; c.heading = 0; }
            } else {
                c.x += c.speed * c.aiDir * dt;
                if (c.x > MAP_HALF - 200) { c.aiDir = -1; c.heading = -Math.PI / 2; }
                if (c.x < -MAP_HALF + 200) { c.aiDir = 1; c.heading = Math.PI / 2; }
            }
            c.mesh.position.set(c.x, 0, c.z);
            c.mesh.rotation.y = c.heading;

            // Car-to-car bump with player taxi (only when cruising)
            if (!inMainMenu && player.inCar && playerCar) {
                const dx = playerCar.x - c.x;
                const dz = playerCar.z - c.z;
                const dist = Math.hypot(dx, dz);
                if (dist > 0.1 && dist < 13.5) {
                    const push = (13.5 - dist) * 0.6;
                    playerCar.x += (dx / dist) * push;
                    playerCar.z += (dz / dist) * push;
                    playerCar.speed *= 0.72;
                    health = Math.max(0, health - 4.5);
                    playCrashSFX(0.7);
                }
            }
        }

        // Spin wheels
        const wheelSpin = (c.speed * dt) / 1.75;
        for (let w = 0; w < c.wheels.length; w++) {
            c.wheels[w].rotation.x += wheelSpin;
        }
        for (let p = 0; p < c.frontPivots.length; p++) {
            c.frontPivots[p].rotation.y = c.steerAngle || 0;
        }
        if (c.steeringWheel) {
            c.steeringWheel.rotation.z = -(c.steerAngle || 0) * 4.2;
        }
    }
}

function update(dt) {
    if (isGameOver) return;

    // Day / Night Cycle
    if (!manualNight) {
        timeOfDay = (timeOfDay + dt * 0.004) % 1;
    }
    const sunAngle = timeOfDay * Math.PI * 2;
    const sunFactor = Math.max(0, Math.sin(sunAngle));
    const isNight = sunFactor < 0.22;

    const skyCol = new THREE.Color().setHSL(0.56, 0.72, 0.12 + sunFactor * 0.56);
    scene.background.copy(skyCol);
    scene.fog.color.copy(skyCol);
    if (dirLight) dirLight.intensity = 0.22 + sunFactor * 0.85;
    if (ambientLight) ambientLight.intensity = 0.35 + sunFactor * 0.38;

    if (buildingWallMat && lastFacadeNightState !== isNight) {
        lastFacadeNightState = isNight;
        buildingWallMat.map = isNight ? facadeNightTex : facadeDayTex;
        buildingWallMat.needsUpdate = true;
    }

    if (inMainMenu) {
        updateEngineAudio(0, 0, false, false);
        updateTireScreechAudio(0, 0, false, false);
        updateTraffic(dt);

        if (playerCar) {
            const orbitTime = Date.now() * 0.0003;
            camera.position.set(
                playerCar.x + Math.cos(orbitTime) * 32,
                11.5,
                playerCar.z + Math.sin(orbitTime) * 32
            );
            camera.lookAt(playerCar.x, 4.5, playerCar.z);
        }
        return;
    }

    let displaySpeedKmh = 0;
    let gearText = 'P';

    if (player.inCar && playerCar) {
        camYawOffset = 0;

        const throttle = (keys['KeyW'] || keys['ArrowUp'] || touchState.gas) ? 1 : 0;
        const reverse = (keys['KeyS'] || keys['ArrowDown']) ? 1 : 0;
        const brake = (keys['Space'] || touchState.brake) ? 1 : 0;
        const steerInput = ((keys['KeyA'] || keys['ArrowLeft'] || touchState.left) ? 1 : 0) -
                           ((keys['KeyD'] || keys['ArrowRight'] || touchState.right) ? 1 : 0);
        const usingNitro = (keys['ShiftLeft'] || keys['ShiftRight'] || touchState.nitro) && nitro > 2 && throttle > 0;

        updateEngineAudio(playerCar.speed, throttle || reverse, usingNitro, true);
        updateTireScreechAudio(playerCar.speed, steerInput, brake, true);

        if (fuel <= 0) {
            triggerGameOver('Out of Fuel!', 'Your taxi ran out of fuel on the island.');
            return;
        }

        const maxSpeed = usingNitro ? 125 : 82;
        const accel = usingNitro ? 75 : 52;

        if (throttle) {
            playerCar.speed += accel * dt;
            fuel = Math.max(0, fuel - (usingNitro ? 0.35 : 0.12) * dt);
        } else if (reverse) {
            playerCar.speed -= 32 * dt;
        } else {
            // Smooth natural coasting
            playerCar.speed *= Math.pow(0.68, dt);
        }

        if (brake) {
            playerCar.speed *= Math.pow(0.04, dt);
        }

        if (usingNitro) {
            nitro = Math.max(0, nitro - 25 * dt);
        } else {
            nitro = Math.min(100, nitro + 12 * dt);
        }

        playerCar.speed = Math.max(-28, Math.min(maxSpeed, playerCar.speed));
        if (Math.abs(playerCar.speed) < 0.25 && !throttle && !reverse) playerCar.speed = 0;

        // Progressive, kinematic speed-sensitive steering
        // Wider lock at low speeds for sharp city corners, tighter & stabilized at high speeds
        const maxSteer = 0.48 / (1 + Math.abs(playerCar.speed) * 0.012);
        const steerSpeed = steerInput !== 0 ? 8.5 : 12.0;
        playerCar.steerAngle += (steerInput * maxSteer - playerCar.steerAngle) * Math.min(1, dt * steerSpeed);

        // Kinematic yaw rate integration with rotational momentum (eliminates turning choppiness)
        const dirSign = playerCar.speed >= 0 ? 1 : -1;
        const speedAuthority = Math.min(1.0, Math.max(0.12, Math.abs(playerCar.speed) / 18));
        const targetYawRate = playerCar.steerAngle * 2.85 * speedAuthority * dirSign;

        if (typeof playerCar.yawRate === 'undefined') playerCar.yawRate = 0;
        playerCar.yawRate += (targetYawRate - playerCar.yawRate) * Math.min(1, dt * 10);
        playerCar.heading += playerCar.yawRate * dt;

        // Position integration
        const nextX = playerCar.x + Math.sin(playerCar.heading) * playerCar.speed * dt;
        const nextZ = playerCar.z + Math.cos(playerCar.heading) * playerCar.speed * dt;

        // Building & Island Boundary Collisions
        const hitBldg = checkBuildingCollision(nextX, nextZ, 8.2);
        if (hitBldg || Math.abs(nextX) > MAP_HALF - 20 || Math.abs(nextZ) > MAP_HALF - 20) {
            const impact = Math.abs(playerCar.speed);
            playCrashSFX(Math.min(1.2, Math.max(0.3, impact / 25)));
            if (impact > 28) {
                health = Math.max(0, health - impact * 0.12);
                if (health <= 0) {
                    triggerGameOver('Taxi Wrecked!', 'Your cab took too much collision damage.');
                    return;
                }
            }
            playerCar.speed = -playerCar.speed * 0.28;
            playerCar.yawRate = 0;
        } else {
            playerCar.x = nextX;
            playerCar.z = nextZ;
        }

        // Realistic dynamic body roll (lean into turns and weight transfer)
        const targetRoll = -Math.max(-0.065, Math.min(0.065, (playerCar.yawRate * playerCar.speed) * 0.0035));
        if (typeof playerCar.roll === 'undefined') playerCar.roll = 0;
        playerCar.roll += (targetRoll - playerCar.roll) * Math.min(1, dt * 8);

        playerCar.mesh.position.set(playerCar.x, 0, playerCar.z);
        playerCar.mesh.rotation.set(0, playerCar.heading, playerCar.roll);

        displaySpeedKmh = Math.round(Math.abs(playerCar.speed) * 0.95);
        if (usingNitro) gearText = '⚡ BOOST';
        else if (playerCar.speed < -1) gearText = 'R';
        else if (displaySpeedKmh < 2) gearText = 'P';
        else gearText = 'D' + Math.min(5, Math.ceil(displaySpeedKmh / 14));

        // Service Zones (Fuel & Repair)
        for (let i = 0; i < serviceZones.length; i++) {
            const sz = serviceZones[i];
            if (Math.hypot(playerCar.x - sz.x, playerCar.z - sz.z) < 92) {
                if (sz.type === 'fuel' && fuel < 99 && cash >= 1) {
                    fuel = Math.min(100, fuel + 35 * dt);
                    cash = Math.max(0, cash - 4 * dt);
                } else if (sz.type === 'repair' && health < 99 && cash >= 1) {
                    health = Math.min(100, health + 35 * dt);
                    cash = Math.max(0, cash - 5 * dt);
                }
            }
        }
    } else {
        updateEngineAudio(0, 0, false, false);
        updateTireScreechAudio(0, 0, false, false);

        // GTA-STYLE ON-FOOT HUMAN MOVEMENT + JUMP
        const moveFwd = ((keys['KeyW'] || keys['ArrowUp'] || touchState.gas) ? 1 : 0) -
                        ((keys['KeyS'] || keys['ArrowDown']) ? 1 : 0);
        const moveSide = ((keys['KeyA'] || keys['ArrowLeft'] || touchState.left) ? 1 : 0) -
                         ((keys['KeyD'] || keys['ArrowRight'] || touchState.right) ? 1 : 0);
        const sprinting = keys['ShiftLeft'] || keys['ShiftRight'] || touchState.nitro;
        const moveSpeed = sprinting ? 48 : 26;

        const camLookAngle = player.heading + camYawOffset;
        const fwdX = Math.sin(camLookAngle);
        const fwdZ = Math.cos(camLookAngle);
        const rightX = Math.cos(camLookAngle);
        const rightZ = -Math.sin(camLookAngle);

        let wishX = fwdX * moveFwd + rightX * moveSide;
        let wishZ = fwdZ * moveFwd + rightZ * moveSide;
        const wishLen = Math.hypot(wishX, wishZ);

        if (wishLen > 0.01) {
            wishX /= wishLen;
            wishZ /= wishLen;
            player.vx += (wishX * moveSpeed - player.vx) * Math.min(1, dt * 14);
            player.vz += (wishZ * moveSpeed - player.vz) * Math.min(1, dt * 14);

            const targetYaw = Math.atan2(wishX, wishZ);
            let diff = targetYaw - player.heading;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            player.heading += diff * Math.min(1, dt * 14);
        } else {
            player.vx *= Math.pow(0.001, dt);
            player.vz *= Math.pow(0.001, dt);
        }

        // Jump & Gravity
        if (keys['Space'] && player.y <= 0.01) {
            player.vy = 26;
            playJumpSFX();
        }
        player.vy -= 68 * dt;
        player.y += player.vy * dt;
        if (player.y <= 0) {
            player.y = 0;
            player.vy = 0;
        }

        const nextPX = player.x + player.vx * dt;
        const nextPZ = player.z + player.vz * dt;
        if (!checkBuildingCollision(nextPX, player.z, 2.4) && Math.abs(nextPX) < MAP_HALF - 15) {
            player.x = nextPX;
        }
        if (!checkBuildingCollision(player.x, nextPZ, 2.4) && Math.abs(nextPZ) < MAP_HALF - 15) {
            player.z = nextPZ;
        }

        // Limb Swing Animation
        const horizSpeed = Math.hypot(player.vx, player.vz);
        if (player.y > 0.2) {
            player.leftLeg.rotation.x = -0.5;
            player.rightLeg.rotation.x = 0.45;
            player.leftArm.rotation.x = -0.8;
            player.rightArm.rotation.x = -0.8;
        } else if (horizSpeed > 1.5) {
            playStepSFX();
            player.walkCycle += horizSpeed * dt * 0.42;
            const swing = Math.sin(player.walkCycle) * 0.72;
            player.leftLeg.rotation.x = swing;
            player.rightLeg.rotation.x = -swing;
            player.leftArm.rotation.x = -swing * 0.85;
            player.rightArm.rotation.x = swing * 0.85;
        } else {
            player.leftLeg.rotation.x *= 0.8;
            player.rightLeg.rotation.x *= 0.8;
            player.leftArm.rotation.x *= 0.8;
            player.rightArm.rotation.x *= 0.8;
        }

        player.mesh.position.set(player.x, player.y, player.z);
        player.mesh.rotation.y = player.heading;

        displaySpeedKmh = Math.round(horizSpeed * 0.6);
        gearText = player.y > 0.2 ? 'JUMP' : (sprinting && horizSpeed > 2 ? 'RUN' : 'WALK');
    }
    currentGearText = gearText;

    // Update AI Traffic Cars & Wheels
    updateTraffic(dt);

    // Mission Progress
    const activeX = player.inCar ? playerCar.x : player.x;
    const activeZ = player.inCar ? playerCar.z : player.z;
    const distToMission = Math.hypot(activeX - mission.x, activeZ - mission.z);

    if (mission.ringMesh) mission.ringMesh.rotation.z += dt * 1.5;
    if (mission.passengerMesh && mission.passengerMesh.visible) {
        mission.passengerMesh.rotation.y = Math.atan2(activeX - mission.passengerMesh.position.x, activeZ - mission.passengerMesh.position.z);
    }

    if (mission.state === 'pickup') {
        if (player.inCar && distToMission < 30 && Math.abs(playerCar.speed) < 22) {
            startDropoff();
        }
    } else if (mission.state === 'dropoff') {
        mission.timer -= dt;
        const timerEl = document.getElementById('missionTimer');
        if (timerEl) timerEl.textContent = `${Math.max(0, Math.ceil(mission.timer))}s`;
        if (mission.timer <= 0) {
            showToast('Time expired! Passenger left.');
            spawnNewPickup();
        } else if (player.inCar && distToMission < 30 && Math.abs(playerCar.speed) < 24) {
            const tip = Math.round(mission.timer * 0.5);
            const total = mission.payout + tip;
            cash += total;
            faresCompleted += 1;
            nitro = Math.min(100, nitro + 45);
            playCashSFX();
            showToast(`Fare Complete! +$${mission.payout} +$${tip} Tip!`);
            spawnNewPickup();
        }
    }

    // Camera Tracking
    if (player.inCar && playerCar) {
        if (playerCar.steeringWheel) {
            playerCar.steeringWheel.rotation.z = -playerCar.steerAngle * 4.2;
        }

        // Exterior Third-Person Chase Camera (Smooth, Stable, Vibration-Free Following)
        if (playerCar.interiorGroup) playerCar.interiorGroup.visible = true;
        const camDist = (camMode === 0) ? 34 : 48;
        const camHeight = (camMode === 0) ? 13.5 : 17.5;

        const totalYaw = playerCar.heading + camYawOffset;

        // Smooth angular tracking for turning with zero translation jitter
        let yawDiff = totalYaw - camFollowYaw;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        camFollowYaw += yawDiff * Math.min(1, dt * 7.5);

        // Anchored rigidly to player position = ZERO distance breathing or vibration
        const camX = playerCar.x - Math.sin(camFollowYaw) * camDist;
        const camY = camHeight + camPitchOffset * 14;
        const camZ = playerCar.z - Math.cos(camFollowYaw) * camDist;
        camera.position.set(camX, camY, camZ);

        // Stable look-at target locked to vehicle center and forward direction
        const lookX = playerCar.x + Math.sin(camFollowYaw) * 14;
        const lookZ = playerCar.z + Math.cos(camFollowYaw) * 14;
        camera.lookAt(lookX, 5.0, lookZ);
    } else {
        if (playerCar && playerCar.interiorGroup) playerCar.interiorGroup.visible = true;
        // Free-Look Cursor Orbit Camera while on foot
        const orbitAngle = player.heading + camYawOffset;
        const camDist = 20;
        const camHeight = 9.5 + camPitchOffset * 14;
        camera.position.set(
            player.x - Math.sin(orbitAngle) * camDist,
            player.y + camHeight,
            player.z - Math.cos(orbitAngle) * camDist
        );
        camera.lookAt(player.x, player.y + 4.5, player.z);
    }

    // Update HUD & Gauges
    const cashEl = document.getElementById('cashDisplay');
    const faresEl = document.getElementById('faresDisplay');
    const healthTxt = document.getElementById('healthText');
    const healthBar = document.getElementById('healthBar');
    const fuelTxt = document.getElementById('fuelText');
    const fuelBar = document.getElementById('fuelBar');
    const nitroTxt = document.getElementById('nitroText');
    const nitroBar = document.getElementById('nitroBar');
    const speedVal = document.getElementById('speedometerValue');
    const speedGear = document.getElementById('speedometerGear');
    const speedArc = document.getElementById('speedometerArc');

    if (cashEl) cashEl.textContent = `$${Math.floor(cash)}`;
    if (faresEl) faresEl.textContent = faresCompleted;
    if (healthTxt) healthTxt.textContent = `${Math.ceil(health)}%`;
    if (healthBar) healthBar.style.width = `${health}%`;
    if (fuelTxt) fuelTxt.textContent = `${Math.ceil(fuel)}%`;
    if (fuelBar) fuelBar.style.width = `${fuel}%`;
    if (nitroTxt) nitroTxt.textContent = `${Math.ceil(nitro)}%`;
    if (nitroBar) nitroBar.style.width = `${nitro}%`;

    if (speedVal) speedVal.textContent = displaySpeedKmh;
    if (speedGear) speedGear.textContent = gearText;
    if (speedArc) {
        const arcMax = 163.36;
        const speedFrac = Math.min(1, displaySpeedKmh / 90);
        speedArc.style.strokeDashoffset = arcMax * (1 - speedFrac);
        speedArc.style.stroke = gearText === '⚡ BOOST' ? '#38bdf8' : (displaySpeedKmh > 55 ? '#f97316' : '#facc15');
    }
}

let lastTime = 0;
let frameCount = 0;
let fpsTimer = 0;

function animate(now) {
    requestAnimationFrame(animate);
    if (!lastTime) lastTime = now;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
        const fpsEl = document.getElementById('fpsCounter');
        if (fpsEl) fpsEl.textContent = `${Math.round(frameCount / fpsTimer)} FPS`;
        frameCount = 0;
        fpsTimer = 0;
    }

    update(dt);
    if (!inMainMenu) {
        drawMiniMap();
        if (fullMapOpen) {
            drawFullMap();
        }
    }
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.onload = function () {
    const boot = () => {
        init3D();
        setupControls();
        requestAnimationFrame(animate);
    };
    if (typeof THREE !== 'undefined') {
        boot();
    } else {
        const fallback = document.createElement('script');
        fallback.src = 'https://unpkg.com/three@0.128.0/build/three.min.js';
        fallback.onload = boot;
        document.head.appendChild(fallback);
    }
};

