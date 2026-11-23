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

        const exitCarText = document.getElementById('exitCarText');
        if (exitCarText) exitCarText.textContent = 'Enter Car';
        const mobileExitText = document.getElementById('mobileExitText');
        if (mobileExitText) mobileExitText.textContent = 'Enter Car';
        const btnGasText = document.getElementById('btnGasText');
        if (btnGasText) btnGasText.textContent = 'FWD';
        const btnReverseText = document.getElementById('btnReverseText');
        if (btnReverseText) btnReverseText.textContent = 'BACK';
        const btnBrakeText = document.getElementById('btnBrakeText');
        if (btnBrakeText) btnBrakeText.textContent = 'JUMP';
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
            const exitCarText = document.getElementById('exitCarText');
            if (exitCarText) exitCarText.textContent = 'Step Out';
            const mobileExitText = document.getElementById('mobileExitText');
            if (mobileExitText) mobileExitText.textContent = 'Step Out';
            const btnGasText = document.getElementById('btnGasText');
            if (btnGasText) btnGasText.textContent = 'GAS';
            const btnReverseText = document.getElementById('btnReverseText');
            if (btnReverseText) btnReverseText.textContent = 'REV';
            const btnBrakeText = document.getElementById('btnBrakeText');
            if (btnBrakeText) btnBrakeText.textContent = 'BRAKE';
            showToast(playerCar.isTaxi ? 'Back in your Taxi!' : 'Hijacked Traffic Sedan!');
        } else {
            showToast('Walk closer to a car and press [E]');
        }
    }
}

function cycleCameraView() {
    camMode = (camMode + 1) % 3;
    camYawOffset = 0;
    if (playerCar) camFollowYaw = playerCar.heading;
    camEyePos = null;
    camLookTarget = null;
    const views = [
        'Close Action Chase View 🎥',
        'Standard Chase View 🎥',
        'Wide Cinematic Chase View 🎥'
    ];
    showToast(views[camMode]);
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
        if (inMainMenu && (e.code === 'Space' || e.code === 'Enter')) {
            startGame();
            return;
        }
        if (e.code === 'KeyH' && !keys['KeyH']) {
            playHornSFX(true);
        }
        keys[e.code] = true;
        if (e.code === 'KeyE' || e.code === 'KeyF') toggleEnterExitCar();
        if (e.code === 'KeyC') {
            cycleCameraView();
        }
        if (e.code === 'KeyM' || e.code === 'Tab') {
            toggleFullMap();
        }
        if (e.code === 'Escape') {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal && !settingsModal.classList.contains('hidden')) {
                settingsModal.classList.add('hidden');
                return;
            }
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
        const startText = document.getElementById('startBtnText');
        if (startText) startText.textContent = 'Resume Cruising';
        else {
            const startBtn = document.getElementById('startGameBtn');
            if (startBtn) startBtn.textContent = '▶ Resume Cruising';
        }
    });

    const mainMenuMapBtn = document.getElementById('mainMenuMapBtn');
    if (mainMenuMapBtn) mainMenuMapBtn.addEventListener('click', toggleFullMap);

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
    const updateVol = (val) => {
        const v = Math.max(0, Math.min(100, val));
        if (volSlider) volSlider.value = v;
        if (volVal) volVal.textContent = `${v}%`;
        if (masterGain && audioCtx) {
            masterGain.gain.setValueAtTime((v / 100) * 0.6, audioCtx.currentTime);
        }
    };

    if (volSlider && volVal) {
        volSlider.addEventListener('input', (e) => {
            updateVol(parseInt(e.target.value, 10));
        });
    }

    const volMuteBtn = document.getElementById('volMuteBtn');
    if (volMuteBtn) volMuteBtn.addEventListener('click', () => { updateVol(0); showToast('Audio Muted (0%)'); });
    const volHalfBtn = document.getElementById('volHalfBtn');
    if (volHalfBtn) volHalfBtn.addEventListener('click', () => { updateVol(50); showToast('Volume 50%'); });
    const volDefaultBtn = document.getElementById('volDefaultBtn');
    if (volDefaultBtn) volDefaultBtn.addEventListener('click', () => { updateVol(70); showToast('Volume 70% (Default)'); });
    const volMaxBtn = document.getElementById('volMaxBtn');
    if (volMaxBtn) volMaxBtn.addEventListener('click', () => { updateVol(100); showToast('Volume Max (100%)'); });

    const setMorningBtn = document.getElementById('setMorningBtn');
    const setSunsetBtn = document.getElementById('setSunsetBtn');
    const setNightBtn = document.getElementById('setNightBtn');

    const markAtmosphereActive = (activeBtn) => {
        [setMorningBtn, setSunsetBtn, setNightBtn].forEach(b => {
            if (b) b.classList.remove('active');
        });
        if (activeBtn) activeBtn.classList.add('active');
    };

    if (setMorningBtn) setMorningBtn.addEventListener('click', () => {
        manualNight = false;
        timeOfDay = 0.28;
        markAtmosphereActive(setMorningBtn);
        showToast('Atmosphere: Morning Sunlight ☀️');
    });

    if (setSunsetBtn) setSunsetBtn.addEventListener('click', () => {
        manualNight = true;
        timeOfDay = 0.49;
        markAtmosphereActive(setSunsetBtn);
        showToast('Atmosphere: Golden Sunset Hour 🌅');
    });

    if (setNightBtn) setNightBtn.addEventListener('click', () => {
        manualNight = true;
        timeOfDay = 0.85;
        markAtmosphereActive(setNightBtn);
        showToast('Atmosphere: Calm Midnight 🌙');
    });

    let isPerfMode = true;
    const perfModeToggle = document.getElementById('perfModeToggle');
    if (perfModeToggle) {
        perfModeToggle.addEventListener('click', () => {
            isPerfMode = !isPerfMode;
            if (typeof renderer !== 'undefined' && renderer) {
                const ratio = isPerfMode ? 1.0 : Math.min(window.devicePixelRatio || 1, 2);
                renderer.setPixelRatio(ratio);
                perfModeToggle.innerHTML = isPerfMode 
                    ? `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>⚡ 60 FPS Smooth</span>`
                    : `<svg class="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>✨ Ultra Retina</span>`;
                perfModeToggle.className = isPerfMode 
                    ? 'px-3.5 py-1.5 rounded-xl glass-hud border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-bold text-xs hover:bg-emerald-500/25 transition flex items-center gap-1.5'
                    : 'px-3.5 py-1.5 rounded-xl glass-hud border border-amber-500/30 bg-amber-500/15 text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition flex items-center gap-1.5';
                showToast(isPerfMode ? 'Graphics: 60 FPS Smooth Mode ⚡' : 'Graphics: Ultra Retina Mode ✨');
            }
        });
    }

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
    if (camBtn) camBtn.addEventListener('click', cycleCameraView);

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
            const exitCarText = document.getElementById('exitCarText');
            if (exitCarText) exitCarText.textContent = 'Step Out';
            const mobileExitText = document.getElementById('mobileExitText');
            if (mobileExitText) mobileExitText.textContent = 'Step Out';
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

    // Mobile Touch Hold Controls (Dual-Thumb Ergonomics & Multi-Touch)
    const bindHold = (id, prop) => {
        const el = document.getElementById(id);
        if (!el) return;
        const start = (e) => {
            if (e && e.cancelable) e.preventDefault();
            touchState[prop] = true;
            ensureAudio();
        };
        const end = (e) => {
            if (e && e.cancelable) e.preventDefault();
            touchState[prop] = false;
        };
        el.addEventListener('touchstart', start, { passive: false });
        el.addEventListener('touchend', end, { passive: false });
        el.addEventListener('touchcancel', end, { passive: false });
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', end);
        el.addEventListener('mouseleave', end);
    };

    bindHold('btnLeft', 'left');
    bindHold('btnRight', 'right');
    bindHold('btnGas', 'gas');
    bindHold('btnReverse', 'reverse');
    bindHold('btnBrake', 'brake');
    bindHold('btnNitro', 'nitro');

    // Mobile Contextual Quick Action Buttons
    const mobileHornBtn = document.getElementById('mobileHornBtn');
    if (mobileHornBtn) {
        mobileHornBtn.addEventListener('touchstart', (e) => { e.preventDefault(); ensureAudio(); playHornSFX(true); });
        mobileHornBtn.addEventListener('touchend', (e) => { e.preventDefault(); playHornSFX(false); });
        mobileHornBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); playHornSFX(false); });
        mobileHornBtn.addEventListener('mousedown', () => { ensureAudio(); playHornSFX(true); });
        mobileHornBtn.addEventListener('mouseup', () => playHornSFX(false));
        mobileHornBtn.addEventListener('mouseleave', () => playHornSFX(false));
    }

    const mobileCamBtn = document.getElementById('mobileCamBtn');
    if (mobileCamBtn) {
        mobileCamBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cycleCameraView();
        });
    }

    const mobileRadioBtn = document.getElementById('mobileRadioBtn');
    if (mobileRadioBtn) {
        mobileRadioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            ensureAudio();
            toggleRadio();
        });
    }

    const mobileMapBtn = document.getElementById('mobileMapBtn');
    if (mobileMapBtn) {
        mobileMapBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFullMap();
        });
    }

    const mobileExitBtn = document.getElementById('mobileExitBtn');
    if (mobileExitBtn) {
        mobileExitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleEnterExitCar();
        });
    }

    window.addEventListener('resize', () => {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

