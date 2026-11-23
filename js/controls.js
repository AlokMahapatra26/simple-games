// ========================================================
// Mumbai Island Taxi Sim 3D - Controls & Input Management
// ========================================================

function toggleEnterExitCar() {
    if (document.activeElement) document.activeElement.blur();
    if (isGameOver) return;

    if (player.inCar) {
        // Step out of driver door
        const doorOffset = 9.5;
        const exitX = playerCar.x - Math.cos(playerCar.heading) * doorOffset;
        const exitZ = playerCar.z + Math.sin(playerCar.heading) * doorOffset;

        player.inCar = false;
        player.x = exitX;
        player.y = 0;
        player.z = exitZ;
        player.vx = 0;
        player.vy = 0;
        player.vz = 0;
        player.heading = playerCar.heading;
        camYawOffset = 0;
        camPitchOffset = 0.22;

        player.mesh.position.set(player.x, 0, player.z);
        player.mesh.rotation.y = player.heading;
        player.mesh.visible = true;

        const exitBtn = document.getElementById('exitCarBtn');
        if (exitBtn) exitBtn.textContent = '[E] Enter Car';
        showToast('On Foot: WASD Move • Cursor Look • Space Jump • E Enter');
    } else {
        // Find nearest vehicle within 26 units
        let nearest = null;
        let bestDist = 26;
        for (let i = 0; i < cars.length; i++) {
            const d = Math.hypot(cars[i].x - player.x, cars[i].z - player.z);
            if (d < bestDist) {
                bestDist = d;
                nearest = cars[i];
            }
        }
        if (nearest) {
            playerCar = nearest;
            player.inCar = true;
            player.mesh.visible = false;
            camYawOffset = 0;
            camPitchOffset = 0.16;
            camFollowYaw = playerCar.heading;
            const exitBtn = document.getElementById('exitCarBtn');
            if (exitBtn) exitBtn.textContent = '[E] Step Out';
            showToast(playerCar.isTaxi ? 'Back in your Taxi!' : 'Hijacked Traffic Sedan!');
        } else {
            showToast('Walk closer to a car and press [E]');
        }
    }
}

function setupControls() {
    // Unlock Web Audio on first user interaction
    const unlockAudio = () => ensureAudio();
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('mousedown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('pointerdown', unlockAudio, { passive: true });

    window.addEventListener('keydown', (e) => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
            e.preventDefault();
        }
        if (e.code === 'KeyH' && !keys['KeyH']) {
            playHornSFX(true);
        }
        keys[e.code] = true;
        if (e.code === 'KeyE' || e.code === 'KeyF') toggleEnterExitCar();
        if (e.code === 'KeyC') {
            camMode = (camMode + 1) % 2;
            camYawOffset = 0;
            camEyePos = null;
            camLookTarget = null;
            showToast(camMode === 0 ? 'Standard Chase View' : 'Wide Cinematic Chase View');
        }
        if (e.code === 'KeyM' || e.code === 'Tab') {
            toggleFullMap();
        }
        if (e.code === 'Escape') {
            if (fullMapOpen) {
                toggleFullMap();
            } else if (!inMainMenu) {
                const exitModal = document.getElementById('exitModal');
                if (exitModal) {
                    if (exitModal.classList.contains('hidden')) {
                        exitModal.classList.remove('hidden');
                    } else {
                        exitModal.classList.add('hidden');
                    }
                }
            }
        }
        if (e.code === 'KeyR') toggleRadio();
        if (e.code === 'KeyT') {
            manualNight = !manualNight;
            timeOfDay = manualNight ? 0.85 : 0.28;
            showToast(manualNight ? 'Night Mode' : 'Daylight Mode');
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyH') {
            playHornSFX(false);
        }
        keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
        Object.keys(keys).forEach((k) => { keys[k] = false; });
        playHornSFX(false);
    });

    // Cursor Free-Look ONLY when on foot (human)
    let lastMouseX = null;
    let lastMouseY = null;
    window.addEventListener('mousemove', (e) => {
        if (player.inCar) {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            return;
        }
        if (lastMouseX !== null) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            camYawOffset -= dx * 0.0065;
            camPitchOffset = Math.max(-0.1, Math.min(0.75, camPitchOffset + dy * 0.004));
        }
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    // Touch look drag on canvas when on foot
    const gameCanvas = document.getElementById('gameCanvas');
    let touchLookId = null;
    let lastTouchX = 0;
    let lastTouchY = 0;
    if (gameCanvas) {
        gameCanvas.addEventListener('touchstart', (e) => {
            if (!player.inCar && e.touches.length > 0) {
                touchLookId = e.touches[0].identifier;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            }
        }, { passive: true });

        gameCanvas.addEventListener('touchmove', (e) => {
            if (player.inCar || touchLookId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchLookId) {
                    camYawOffset -= (t.clientX - lastTouchX) * 0.008;
                    camPitchOffset = Math.max(-0.1, Math.min(0.75, camPitchOffset + (t.clientY - lastTouchY) * 0.005));
                    lastTouchX = t.clientX;
                    lastTouchY = t.clientY;
                }
            }
        }, { passive: true });
    }

    // Main Menu & Modal Controls
    const startGame = () => {
        inMainMenu = false;
        camEyePos = null;
        camLookTarget = null;
        const menuEl = document.getElementById('mainMenuOverlay');
        const hudEl = document.getElementById('inGameHud');
        if (menuEl) menuEl.classList.add('hidden');
        if (hudEl) hudEl.classList.remove('hidden');
        ensureAudio();
        showToast('Cruising mode started! Enjoy the island.');
    };

    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) startGameBtn.addEventListener('click', startGame);

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.remove('hidden');
    });

    const closeSettings = () => {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('hidden');
    };
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', closeSettings);

    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) exitBtn.addEventListener('click', () => {
        const modal = document.getElementById('exitModal');
        if (modal) modal.classList.remove('hidden');
    });

    const resumeDriveBtn = document.getElementById('resumeDriveBtn');
    if (resumeDriveBtn) resumeDriveBtn.addEventListener('click', () => {
        const exitModal = document.getElementById('exitModal');
        if (exitModal) exitModal.classList.add('hidden');
        startGame();
    });

    const returnMenuBtn = document.getElementById('returnMenuBtn');
    if (returnMenuBtn) returnMenuBtn.addEventListener('click', () => {
        inMainMenu = true;
        const exitModal = document.getElementById('exitModal');
        if (exitModal) exitModal.classList.add('hidden');
        const menuEl = document.getElementById('mainMenuOverlay');
        const hudEl = document.getElementById('inGameHud');
        if (menuEl) menuEl.classList.remove('hidden');
        if (hudEl) hudEl.classList.add('hidden');
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) startBtn.textContent = '▶ Resume Cruising';
    });

    const pauseGameBtn = document.getElementById('pauseGameBtn');
    if (pauseGameBtn) {
        pauseGameBtn.addEventListener('click', () => {
            const exitModal = document.getElementById('exitModal');
            if (exitModal) exitModal.classList.remove('hidden');
        });
    }

    const closeTabBtn = document.getElementById('closeTabBtn');
    if (closeTabBtn) {
        closeTabBtn.addEventListener('click', () => {
            showToast('You can safely close this browser tab anytime!');
            try { window.close(); } catch (err) {}
        });
    }

    // Settings Sliders & Atmosphere Toggles
    const volSlider = document.getElementById('volumeSlider');
    const volVal = document.getElementById('volumeValue');
    if (volSlider && volVal) {
        volSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            volVal.textContent = `${val}%`;
            if (masterGain && audioCtx) {
                masterGain.gain.setValueAtTime((val / 100) * 0.6, audioCtx.currentTime);
            }
        });
    }

    const setMorningBtn = document.getElementById('setMorningBtn');
    if (setMorningBtn) setMorningBtn.addEventListener('click', () => {
        manualNight = false;
        timeOfDay = 0.28;
        showToast('Morning Sunlight ☀️');
    });

    const setSunsetBtn = document.getElementById('setSunsetBtn');
    if (setSunsetBtn) setSunsetBtn.addEventListener('click', () => {
        manualNight = true;
        timeOfDay = 0.49;
        showToast('Golden Sunset Hour 🌅');
    });

    const setNightBtn = document.getElementById('setNightBtn');
    if (setNightBtn) setNightBtn.addEventListener('click', () => {
        manualNight = true;
        timeOfDay = 0.85;
        showToast('Calm Midnight 🌙');
    });

    const settingsRadioToggle = document.getElementById('settingsRadioToggle');
    if (settingsRadioToggle) {
        settingsRadioToggle.addEventListener('click', () => {
            toggleRadio();
        });
    }

    // HUD Buttons
    const exitCarBtn = document.getElementById('exitCarBtn');
    if (exitCarBtn) exitCarBtn.addEventListener('click', toggleEnterExitCar);

    const mapBtn = document.getElementById('mapBtn');
    if (mapBtn) mapBtn.addEventListener('click', toggleFullMap);

    const closeMapBtn = document.getElementById('closeMapBtn');
    if (closeMapBtn) closeMapBtn.addEventListener('click', toggleFullMap);

    const minimapContainer = document.getElementById('minimapContainer');
    if (minimapContainer) minimapContainer.addEventListener('click', toggleFullMap);

    const mapModal = document.getElementById('mapModal');
    if (mapModal) {
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) toggleFullMap();
        });
    }

    const camBtn = document.getElementById('camBtn');
    if (camBtn) camBtn.addEventListener('click', () => {
        camMode = (camMode + 1) % 2;
        camYawOffset = 0;
        if (playerCar) camFollowYaw = playerCar.heading;
        camEyePos = null;
        camLookTarget = null;
        showToast(camMode === 0 ? 'Standard Chase View' : 'Wide Cinematic Chase View');
    });

    const hornBtn = document.getElementById('hornBtn');
    if (hornBtn) {
        hornBtn.addEventListener('mousedown', () => playHornSFX(true));
        hornBtn.addEventListener('mouseup', () => playHornSFX(false));
        hornBtn.addEventListener('mouseleave', () => playHornSFX(false));
        hornBtn.addEventListener('touchstart', (e) => { e.preventDefault(); playHornSFX(true); });
        hornBtn.addEventListener('touchend', (e) => { e.preventDefault(); playHornSFX(false); });
    }

    const radioBtn = document.getElementById('radioBtn');
    if (radioBtn) radioBtn.addEventListener('click', toggleRadio);

    const timeBtn = document.getElementById('timeBtn');
    if (timeBtn) timeBtn.addEventListener('click', () => {
        manualNight = !manualNight;
        timeOfDay = manualNight ? 0.85 : 0.28;
    });

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', () => {
        health = 100;
        fuel = 100;
        nitro = 100;
        playerCar.speed = 0;
        playerCar.x = 250;
        playerCar.z = 250;
        playerCar.heading = 0;
        playerCar.steerAngle = 0;
        playerCar.yawRate = 0;
        playerCar.roll = 0;
        playerCar.mesh.position.set(250, 0, 250);
        playerCar.mesh.rotation.set(0, 0, 0);
        if (!player.inCar) {
            player.inCar = true;
            player.mesh.visible = false;
            if (exitCarBtn) exitCarBtn.textContent = '[E] Step Out';
        }
        player.x = 250;
        player.z = 250;
        player.y = 0;
        player.vx = 0;
        player.vy = 0;
        player.vz = 0;
        isGameOver = false;
        document.getElementById('gameOverModal').classList.add('hidden');
    });

    // Mobile Touch Hold Buttons
    const bindHold = (id, prop) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); touchState[prop] = true; });
        el.addEventListener('touchend', (e) => { e.preventDefault(); touchState[prop] = false; });
        el.addEventListener('mousedown', () => { touchState[prop] = true; });
        el.addEventListener('mouseup', () => { touchState[prop] = false; });
    };
    bindHold('btnLeft', 'left');
    bindHold('btnRight', 'right');
    bindHold('btnGas', 'gas');
    bindHold('btnBrake', 'brake');
    bindHold('btnNitro', 'nitro');

    window.addEventListener('resize', () => {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

