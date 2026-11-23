// ========================================================
// Mumbai Island Taxi Sim 3D - Procedural Web Audio Engine & SFX
// ========================================================

let audioCtx = null;
let masterGain = null;
let sharedNoiseBuffer = null;

// Real Recorded Vehicle Audio Buffers & Nodes
let realAudioBuffers = {};
let realEngineNode = null;
let realEngineGain = null;
let realSkidNode = null;
let realSkidGain = null;
let realHornNode = null;
let realHornGain = null;

// Nitro SFX
let nitroNoiseNode = null;
let nitroFilter = null;
let nitroGain = null;

// Bollywood Radio System
let radioPlaying = false;
let radioTimer = null;
let radioStep = 0;
let radioStationIndex = 0;
let liveRadioAudio = null;
let tanpuraOsc1 = null;
let tanpuraOsc2 = null;
let tanpuraGain = null;

const BOLLYWOOD_STATIONS = [
    {
        name: 'OFF',
        label: '[R] Radio: OFF',
        settingsLabel: 'Radio: OFF',
        toast: 'Radio turned OFF',
        type: 'off'
    },
    {
        name: '90s Hits',
        label: '[R] 📻 90s Bollywood',
        settingsLabel: '📻 90s Bollywood Hits',
        toast: '📻 DesiZone: 90s Bollywood Nostalgia 🎶',
        type: 'stream',
        url: 'https://www.desizoneradio.com/relay3'
    },
    {
        name: '2000s Hits',
        label: '[R] 📻 Bollywood 2000s',
        settingsLabel: '📻 Bollywood 2000s',
        toast: '📻 Bollywood 2000s Golden Hits 🎶',
        type: 'stream',
        url: 'https://drive.uber.radio/uber/bollywood2000s/icecast.audio'
    },
    {
        name: 'Mirchi Hits',
        label: '[R] 📻 Mirchi Top Hits',
        settingsLabel: '📻 Mirchi Top Hits',
        toast: '📻 Bollywood 2010s & Superhits 🎶',
        type: 'stream',
        url: 'https://drive.uber.radio/uber/bollywood2010s/icecast.audio'
    },
    {
        name: 'Desi Sitar',
        label: '[R] 🪕 Desi Rhythms',
        settingsLabel: '🪕 Sitar & Tabla Melodies',
        toast: '🪕 Mumbai Taxi: Bollywood Sitar & Tabla Beats 🎵',
        type: 'synth'
    }
];
let hornOsc1 = null;
let hornOsc2 = null;
let hornGain = null;
let lastCrashTime = 0;
let lastStepTime = 0;

function createNoiseBuffer(ctx, duration = 2) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function loadRealAudioBuffers() {
    if (typeof REAL_AUDIO_DATA === 'undefined' || !audioCtx) return;
    for (const [key, b64] of Object.entries(REAL_AUDIO_DATA)) {
        if (realAudioBuffers[key]) continue;
        try {
            const ab = base64ToArrayBuffer(b64);
            audioCtx.decodeAudioData(ab, (decoded) => {
                realAudioBuffers[key] = decoded;
                if (key === 'engine' && !realEngineNode) {
                    startRealEngine();
                }
                if (key === 'skid' && !realSkidNode) {
                    startRealSkid();
                }
            }, (err) => console.warn('Real audio decode failed for ' + key, err));
        } catch (e) {
            console.warn('Real audio load error:', e);
        }
    }
}

function startRealEngine() {
    if (!audioCtx || !realAudioBuffers.engine || realEngineNode) return;
    try {
        realEngineGain = audioCtx.createGain();
        realEngineGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        realEngineGain.connect(masterGain);

        realEngineNode = audioCtx.createBufferSource();
        realEngineNode.buffer = realAudioBuffers.engine;
        realEngineNode.loop = true;
        realEngineNode.playbackRate.setValueAtTime(0.72, audioCtx.currentTime);
        realEngineNode.connect(realEngineGain);
        realEngineNode.start();
    } catch (e) {
        console.warn('startRealEngine error:', e);
    }
}

function startRealSkid() {
    if (!audioCtx || !realAudioBuffers.skid || realSkidNode) return;
    try {
        realSkidGain = audioCtx.createGain();
        realSkidGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        realSkidGain.connect(masterGain);

        realSkidNode = audioCtx.createBufferSource();
        realSkidNode.buffer = realAudioBuffers.skid;
        realSkidNode.loop = true;
        realSkidNode.playbackRate.setValueAtTime(1.0, audioCtx.currentTime);
        realSkidNode.connect(realSkidGain);
        realSkidNode.start();
    } catch (e) {
        console.warn('startRealSkid error:', e);
    }
}

function ensureAudio() {
    if (!audioCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioClass) return null;
        audioCtx = new AudioClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.45, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
        sharedNoiseBuffer = createNoiseBuffer(audioCtx, 2);
        initEngineAudio();
        loadRealAudioBuffers();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function initEngineAudio() {
    if (!audioCtx || nitroGain) return;
    try {
        // Continuous Nitro Whoosh (Filter-modulated noise)
        nitroGain = audioCtx.createGain();
        nitroGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);

        nitroFilter = audioCtx.createBiquadFilter();
        nitroFilter.type = 'bandpass';
        nitroFilter.frequency.setValueAtTime(1400, audioCtx.currentTime);
        nitroFilter.Q.value = 1.8;

        nitroNoiseNode = audioCtx.createBufferSource();
        nitroNoiseNode.buffer = sharedNoiseBuffer;
        nitroNoiseNode.loop = true;

        nitroNoiseNode.connect(nitroFilter);
        nitroFilter.connect(nitroGain);
        nitroGain.connect(masterGain);

        nitroNoiseNode.start();

        // Load real vehicle recorded audio buffers
        loadRealAudioBuffers();
    } catch (err) {
        console.warn('Engine audio init error:', err);
    }
}

function updateEngineAudio(speed, throttle, usingNitro, inCar) {
    if (!audioCtx) return;
    if (!realEngineNode && realAudioBuffers.engine) {
        startRealEngine();
    }
    const now = audioCtx.currentTime;

    if (!inCar || isGameOver || !realEngineGain || !realEngineNode) {
        if (realEngineGain) realEngineGain.gain.setTargetAtTime(0.0001, now, 0.08);
        if (nitroGain) nitroGain.gain.setTargetAtTime(0.0001, now, 0.08);
        return;
    }

    const absSpd = Math.abs(speed);
    const speedRatio = Math.min(1.0, absSpd / 95);

    // Real recorded car engine pitch modulation:
    // Warm idle rumble at 0.70x pitch -> accelerates smoothly to 1.65x pitch (nitro: 2.05x)
    const targetPitch = 0.70 + (throttle ? 0.20 : 0.0) + (speedRatio * 0.80) + (usingNitro ? 0.35 : 0.0);
    realEngineNode.playbackRate.setTargetAtTime(Math.max(0.5, Math.min(2.4, targetPitch)), now, 0.06);

    // Real engine volume scaling
    const targetVol = 0.28 + (throttle ? 0.22 : 0.0) + (speedRatio * 0.22) + (usingNitro ? 0.18 : 0.0);
    realEngineGain.gain.setTargetAtTime(targetVol, now, 0.06);

    if (nitroGain) {
        const nitroVol = usingNitro ? 0.28 : 0.0001;
        nitroGain.gain.setTargetAtTime(nitroVol, now, 0.06);
    }
}

function updateTireScreechAudio(speed, steerInput, isBraking, inCar) {
    if (!audioCtx) return;
    if (!realSkidNode && realAudioBuffers.skid) {
        startRealSkid();
    }
    const now = audioCtx.currentTime;

    if (!inCar || isGameOver || !realSkidGain || !realSkidNode) {
        if (realSkidGain) realSkidGain.gain.setTargetAtTime(0.0001, now, 0.05);
        return;
    }

    const absSpd = Math.abs(speed);
    const turnSlip = Math.abs(steerInput) * Math.min(1.0, Math.max(0, (absSpd - 12) / 32));
    const brakeSlip = (isBraking && absSpd > 18) ? Math.min(1.0, (absSpd - 18) / 28) * 0.85 : 0;
    const totalSlip = Math.min(1.0, Math.max(turnSlip, brakeSlip));

    if (totalSlip > 0.08) {
        // Pitch variation based on drift slip intensity
        const targetPitch = 0.85 + totalSlip * 0.40 + Math.min(0.25, absSpd * 0.003);
        realSkidNode.playbackRate.setTargetAtTime(targetPitch, now, 0.04);

        // Real tire screech friction volume
        const targetVol = Math.min(0.42, totalSlip * 0.45);
        realSkidGain.gain.setTargetAtTime(targetVol, now, 0.03);
    } else {
        realSkidGain.gain.setTargetAtTime(0.0001, now, 0.06);
    }
}

function playCrashSFX(intensity = 1) {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    if (now - lastCrashTime < 0.18) return;
    lastCrashTime = now;

    if (realAudioBuffers.impact) {
        try {
            const crashSource = audioCtx.createBufferSource();
            crashSource.buffer = realAudioBuffers.impact;
            const cGain = audioCtx.createGain();
            cGain.gain.setValueAtTime(Math.min(0.75, 0.35 + intensity * 0.35), now);
            crashSource.connect(cGain);
            cGain.connect(masterGain);
            crashSource.start(now);
            return;
        } catch (e) {
            console.warn('Crash buffer play error:', e);
        }
    }
}

function playHornSFX(start) {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;

    if (start) {
        if (realHornNode) return;
        if (realAudioBuffers.horn) {
            try {
                realHornGain = audioCtx.createGain();
                realHornGain.gain.setValueAtTime(0.42, now);
                realHornGain.connect(masterGain);

                realHornNode = audioCtx.createBufferSource();
                realHornNode.buffer = realAudioBuffers.horn;
                realHornNode.loop = true;
                realHornNode.connect(realHornGain);
                realHornNode.start(now);
            } catch (e) {
                console.warn('Real horn play error:', e);
            }
        }
    } else {
        if (realHornGain) {
            realHornGain.gain.setTargetAtTime(0.0001, now, 0.05);
            setTimeout(() => {
                try {
                    if (realHornNode) { realHornNode.stop(); realHornNode.disconnect(); realHornNode = null; }
                    if (realHornGain) { realHornGain.disconnect(); realHornGain = null; }
                } catch (e) {}
            }, 60);
        }
    }
}

function playHornBeep() {
    playHornSFX(true);
    setTimeout(() => playHornSFX(false), 240);
}

function playPickupSFX() {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.22, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.3);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.32);
    });
}

function playCashSFX() {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    const freqs = [987.77, 1318.51, 1567.98, 2093.00, 2637.02];
    freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        g.gain.setValueAtTime(0.18, now + idx * 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.28);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
    });
}

function playJumpSFX() {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.16);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
}

function playStepSFX() {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    if (now - lastStepTime < 0.28) return;
    lastStepTime = now;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
}

function updateRadioUI() {
    const station = BOLLYWOOD_STATIONS[radioStationIndex];
    const radioBtn = document.getElementById('radioBtn');
    if (radioBtn) {
        radioBtn.textContent = station.label;
        if (station.type !== 'off') {
            radioBtn.classList.add('ring-2', 'ring-pink-400');
        } else {
            radioBtn.classList.remove('ring-2', 'ring-pink-400');
        }
    }
    const settingsRadioToggle = document.getElementById('settingsRadioToggle');
    if (settingsRadioToggle) {
        settingsRadioToggle.textContent = station.settingsLabel;
        if (station.type !== 'off') {
            settingsRadioToggle.classList.add('ring-2', 'ring-pink-400');
        } else {
            settingsRadioToggle.classList.remove('ring-2', 'ring-pink-400');
        }
    }
}

function stopRadioAudio() {
    if (radioTimer) {
        clearInterval(radioTimer);
        radioTimer = null;
    }
    if (tanpuraOsc1) {
        try { tanpuraOsc1.stop(); tanpuraOsc1.disconnect(); } catch (e) {}
        tanpuraOsc1 = null;
    }
    if (tanpuraOsc2) {
        try { tanpuraOsc2.stop(); tanpuraOsc2.disconnect(); } catch (e) {}
        tanpuraOsc2 = null;
    }
    if (tanpuraGain) {
        try { tanpuraGain.disconnect(); } catch (e) {}
        tanpuraGain = null;
    }
    if (liveRadioAudio) {
        try {
            liveRadioAudio.pause();
            liveRadioAudio.src = '';
        } catch (e) {}
    }
}

function startBollywoodSynth() {
    ensureAudio();
    if (!audioCtx) return;

    // Tanpura Drone in D (Root 146.83 Hz + Fifth 220 Hz)
    try {
        tanpuraGain = audioCtx.createGain();
        tanpuraGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        tanpuraGain.connect(masterGain);

        tanpuraOsc1 = audioCtx.createOscillator();
        tanpuraOsc1.type = 'sawtooth';
        tanpuraOsc1.frequency.setValueAtTime(146.83, audioCtx.currentTime); // D3

        tanpuraOsc2 = audioCtx.createOscillator();
        tanpuraOsc2.type = 'sine';
        tanpuraOsc2.frequency.setValueAtTime(220.00, audioCtx.currentTime); // A3

        const tanpuraFilter = audioCtx.createBiquadFilter();
        tanpuraFilter.type = 'lowpass';
        tanpuraFilter.frequency.setValueAtTime(450, audioCtx.currentTime);

        tanpuraOsc1.connect(tanpuraFilter);
        tanpuraOsc2.connect(tanpuraFilter);
        tanpuraFilter.connect(tanpuraGain);

        tanpuraOsc1.start();
        tanpuraOsc2.start();
    } catch (e) {
        console.warn('Tanpura init err:', e);
    }

    // Iconic Bollywood Melodies transcribed for synthesized Sitar / Bansuri:
    // Motif 1: Kal Ho Naa Ho (Har Ghadi Badal Rahi Hai)
    // Motif 2: Chura Liya Hai Tumne Jo Dil Ko
    // Motif 3: Tum Hi Ho / Kabhi Kabhi Mere Dil Mein
    const KHN = [
        293.66, 293.66, 329.63, 369.99, 440.00, 369.99, 329.63, 293.66, // D4 D4 E4 F#4 A4 F#4 E4 D4
        329.63, 369.99, 440.00, 493.88, 440.00, 369.99, 329.63, 293.66  // E4 F#4 A4 B4 A4 F#4 E4 D4
    ];
    const CHURA_LIYA = [
        440.00, 493.88, 523.25, 587.33, 523.25, 493.88, 440.00, 392.00, // A4 B4 C5 D5 C5 B4 A4 G4
        440.00, 440.00, 493.88, 523.25, 440.00, 392.00, 349.23, 440.00  // A4 A4 B4 C5 A4 G4 F4 A4
    ];
    const TUM_HI_HO = [
        293.66, 349.23, 392.00, 440.00, 466.16, 440.00, 392.00, 349.23, // D4 F4 G4 A4 Bb4 A4 G4 F4
        329.63, 349.23, 392.00, 440.00, 392.00, 349.23, 329.63, 293.66  // E4 F4 G4 A4 G4 F4 E4 D4
    ];
    const playlist = [KHN, CHURA_LIYA, TUM_HI_HO];

    radioStep = 0;
    radioTimer = setInterval(() => {
        if (!radioPlaying || !audioCtx || audioCtx.state !== 'running') return;
        const now = audioCtx.currentTime;

        const currentSongIndex = Math.floor(radioStep / 32) % playlist.length;
        const currentSong = playlist[currentSongIndex];
        const stepInSong = radioStep % 16;
        const beat = radioStep % 8;

        // 1. TABLA BEAT (Keharwa style 8-beat loop: Dha Dhin Dhin Dha | Dha Tin Tin Ta)
        // Bayan (Deep Bass Dagga drum with downward pitch bend)
        if (beat === 0 || beat === 3 || beat === 4 || beat === 6) {
            const bOsc = audioCtx.createOscillator();
            const bGain = audioCtx.createGain();
            bOsc.type = 'sine';
            bOsc.frequency.setValueAtTime(105, now);
            bOsc.frequency.exponentialRampToValueAtTime(58, now + 0.18); // Classic tabla bayam mod bend
            bGain.gain.setValueAtTime(0.24, now);
            bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            bOsc.connect(bGain);
            bGain.connect(masterGain);
            bOsc.start(now);
            bOsc.stop(now + 0.24);
        }

        // Dayan (High ringing wood tabla rim / Na / Tin)
        if (beat === 1 || beat === 2 || beat === 5 || beat === 7) {
            const dOsc = audioCtx.createOscillator();
            const dGain = audioCtx.createGain();
            dOsc.type = 'triangle';
            dOsc.frequency.setValueAtTime(440, now);
            dGain.gain.setValueAtTime(0.12, now);
            dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            dOsc.connect(dGain);
            dGain.connect(masterGain);
            dOsc.start(now);
            dOsc.stop(now + 0.15);
        }

        // Shaker / Ghungroo metallic sizzle
        if (sharedNoiseBuffer && (beat % 2 === 1)) {
            const sh = audioCtx.createBufferSource();
            sh.buffer = sharedNoiseBuffer;
            const shFilter = audioCtx.createBiquadFilter();
            shFilter.type = 'highpass';
            shFilter.frequency.value = 6500;
            const shGain = audioCtx.createGain();
            shGain.gain.setValueAtTime(0.035, now);
            shGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            sh.connect(shFilter);
            shFilter.connect(shGain);
            shGain.connect(masterGain);
            sh.start(now);
            sh.stop(now + 0.06);
        }

        // 2. SITAR LEAD MELODY
        const freq = currentSong[stepInSong];
        if (freq) {
            const sOsc = audioCtx.createOscillator();
            const sFilter = audioCtx.createBiquadFilter();
            const sGain = audioCtx.createGain();

            sOsc.type = 'sawtooth';
            // Sitar meend (pitch slide emulation)
            sOsc.frequency.setValueAtTime(freq * 0.97, now);
            sOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);

            sFilter.type = 'bandpass';
            sFilter.frequency.setValueAtTime(freq * 2.2, now);
            sFilter.Q.value = 3.5;

            sGain.gain.setValueAtTime(0.14, now);
            sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            sOsc.connect(sFilter);
            sFilter.connect(sGain);
            sGain.connect(masterGain);

            sOsc.start(now);
            sOsc.stop(now + 0.30);
        }

        radioStep++;
    }, 240); // 125 BPM Bollywood tempo
}

function playStation(index) {
    radioStationIndex = (index + BOLLYWOOD_STATIONS.length) % BOLLYWOOD_STATIONS.length;
    stopRadioAudio();
    const station = BOLLYWOOD_STATIONS[radioStationIndex];
    updateRadioUI();

    if (station.type === 'off') {
        radioPlaying = false;
        showToast(station.toast);
        return;
    }

    radioPlaying = true;
    showToast(station.toast);

    if (station.type === 'stream') {
        try {
            if (!liveRadioAudio) {
                liveRadioAudio = new Audio();
                liveRadioAudio.crossOrigin = 'anonymous';
                liveRadioAudio.preload = 'none';
            }
            liveRadioAudio.src = station.url;
            liveRadioAudio.volume = 0.55;

            liveRadioAudio.onerror = (e) => {
                console.warn('Live radio stream dropped or unreachable, falling back to Desi Sitar Radio:', e);
                showToast('Stream connecting issue. Auto-switching to Desi Sitar Radio 🪕');
                playStation(4); // Switch to Desi Sitar Synth station
            };

            const playPromise = liveRadioAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Audio stream autoplay blocked or connection failed:', err);
                    playStation(4); // Fallback cleanly
                });
            }
        } catch (err) {
            console.warn('Live radio stream setup error:', err);
            playStation(4);
        }
    } else if (station.type === 'synth') {
        startBollywoodSynth();
    }
}

function toggleRadio() {
    ensureAudio();
    const nextIndex = (radioStationIndex + 1) % BOLLYWOOD_STATIONS.length;
    playStation(nextIndex);
}

