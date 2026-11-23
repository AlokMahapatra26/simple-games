// ========================================================
// Mumbai Island Taxi Sim 3D - Procedural Web Audio Engine & SFX
// ========================================================

let audioCtx = null;
let masterGain = null;
let sharedNoiseBuffer = null;
let engineOsc1 = null;
let engineOsc2 = null;
let engineFilter = null;
let engineGain = null;
let nitroNoiseNode = null;
let nitroFilter = null;
let nitroGain = null;
let radioPlaying = false;
let radioTimer = null;
let radioStep = 0;
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
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function initEngineAudio() {
    if (!audioCtx || engineGain) return;
    try {
        // Continuous Engine Harmonics (Sawtooth + Sub-triangle)
        engineGain = audioCtx.createGain();
        engineGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

        engineFilter = audioCtx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.setValueAtTime(200, audioCtx.currentTime);
        engineFilter.Q.value = 2.0;

        engineOsc1 = audioCtx.createOscillator();
        engineOsc1.type = 'sawtooth';
        engineOsc1.frequency.setValueAtTime(36, audioCtx.currentTime);

        engineOsc2 = audioCtx.createOscillator();
        engineOsc2.type = 'triangle';
        engineOsc2.frequency.setValueAtTime(18, audioCtx.currentTime);

        engineOsc1.connect(engineFilter);
        engineOsc2.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(masterGain);

        engineOsc1.start();
        engineOsc2.start();

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
    } catch (err) {
        console.warn('Engine audio init error:', err);
    }
}

function updateEngineAudio(speed, throttle, usingNitro, inCar) {
    if (!audioCtx || !engineGain || !engineFilter) return;
    const now = audioCtx.currentTime;

    if (!inCar || isGameOver) {
        engineGain.gain.setTargetAtTime(0.0001, now, 0.08);
        if (nitroGain) nitroGain.gain.setTargetAtTime(0.0001, now, 0.08);
        return;
    }

    const absSpd = Math.abs(speed);
    const rpm = 800 + (throttle ? 900 : 0) + (absSpd * 38) + (usingNitro ? 1400 : 0);
    const fundamentalFreq = 34 + (rpm / 4500) * 88; // 34Hz idle up to ~122Hz
    engineOsc1.frequency.setTargetAtTime(fundamentalFreq, now, 0.05);
    engineOsc2.frequency.setTargetAtTime(fundamentalFreq * 0.5, now, 0.05);

    const filterCutoff = 160 + (throttle ? 400 : 0) + (absSpd * 6.5) + (usingNitro ? 500 : 0);
    engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.06);

    const engineVol = 0.18 + (throttle ? 0.20 : 0) + Math.min(0.16, absSpd / 120);
    engineGain.gain.setTargetAtTime(engineVol, now, 0.05);

    if (nitroGain) {
        const nitroVol = usingNitro ? 0.32 : 0.0001;
        nitroGain.gain.setTargetAtTime(nitroVol, now, 0.06);
    }
}

function playCrashSFX(intensity = 1) {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    if (now - lastCrashTime < 0.18) return;
    lastCrashTime = now;

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.26);
    const vol = Math.min(0.65, 0.2 + intensity * 0.32);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.32);

    if (sharedNoiseBuffer) {
        const crunch = audioCtx.createBufferSource();
        crunch.buffer = sharedNoiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, now);
        filter.Q.value = 1.2;
        const cGain = audioCtx.createGain();
        cGain.gain.setValueAtTime(vol * 0.75, now);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        crunch.connect(filter);
        filter.connect(cGain);
        cGain.connect(masterGain);
        crunch.start(now);
        crunch.stop(now + 0.24);
    }
}

function playHornSFX(start) {
    ensureAudio();
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    if (start) {
        if (hornGain) return;
        hornGain = audioCtx.createGain();
        hornGain.gain.setValueAtTime(0.24, now);
        hornGain.connect(masterGain);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2200;
        filter.connect(hornGain);

        hornOsc1 = audioCtx.createOscillator();
        hornOsc1.type = 'sawtooth';
        hornOsc1.frequency.setValueAtTime(349.23, now); // F4
        hornOsc1.connect(filter);
        hornOsc1.start();

        hornOsc2 = audioCtx.createOscillator();
        hornOsc2.type = 'sawtooth';
        hornOsc2.frequency.setValueAtTime(440.00, now); // A4
        hornOsc2.connect(filter);
        hornOsc2.start();
    } else {
        if (hornGain) {
            hornGain.gain.setTargetAtTime(0.001, now, 0.04);
            setTimeout(() => {
                try {
                    if (hornOsc1) { hornOsc1.stop(); hornOsc1.disconnect(); hornOsc1 = null; }
                    if (hornOsc2) { hornOsc2.stop(); hornOsc2.disconnect(); hornOsc2 = null; }
                    if (hornGain) { hornGain.disconnect(); hornGain = null; }
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

function toggleRadio() {
    ensureAudio();
    radioPlaying = !radioPlaying;
    const btn = document.getElementById('radioBtn');
    if (btn) btn.textContent = radioPlaying ? '[M] Radio: ON 🎵' : '[M] Radio: OFF';
    showToast(radioPlaying ? 'Radio ON: Lo-Fi Synth Station 🎵' : 'Radio OFF');

    if (radioPlaying) {
        if (radioTimer) clearInterval(radioTimer);
        const chords = [
            [261.63, 329.63, 392.00],
            [220.00, 261.63, 329.63],
            [174.61, 220.00, 261.63],
            [196.00, 246.94, 293.66]
        ];
        const bassNotes = [65.41, 55.00, 43.65, 49.00];
        const leadScale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

        radioTimer = setInterval(() => {
            if (!radioPlaying || !audioCtx || audioCtx.state !== 'running') return;
            const now = audioCtx.currentTime;
            const bar = Math.floor(radioStep / 8) % chords.length;
            const beat = radioStep % 8;

            // Bassline
            if (beat === 0 || beat === 3 || beat === 6) {
                const bOsc = audioCtx.createOscillator();
                const bGain = audioCtx.createGain();
                bOsc.type = 'triangle';
                bOsc.frequency.setValueAtTime(bassNotes[bar], now);
                bGain.gain.setValueAtTime(0.20, now);
                bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                bOsc.connect(bGain);
                bGain.connect(masterGain);
                bOsc.start(now);
                bOsc.stop(now + 0.38);
            }

            // Chords
            if (beat === 0 || beat === 4) {
                chords[bar].forEach(freq => {
                    const cOsc = audioCtx.createOscillator();
                    const cGain = audioCtx.createGain();
                    cOsc.type = 'sine';
                    cOsc.frequency.setValueAtTime(freq, now);
                    cGain.gain.setValueAtTime(0.08, now);
                    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                    cOsc.connect(cGain);
                    cGain.connect(masterGain);
                    cOsc.start(now);
                    cOsc.stop(now + 0.48);
                });
            }

            // Melody
            const melIdx = (radioStep * 3 + (radioStep % 5)) % leadScale.length;
            const mOsc = audioCtx.createOscillator();
            const mGain = audioCtx.createGain();
            mOsc.type = 'triangle';
            mOsc.frequency.setValueAtTime(leadScale[melIdx], now);
            mGain.gain.setValueAtTime(0.10, now);
            mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            mOsc.connect(mGain);
            mGain.connect(masterGain);
            mOsc.start(now);
            mOsc.stop(now + 0.2);

            // Hi-hat
            if (sharedNoiseBuffer) {
                const hat = audioCtx.createBufferSource();
                hat.buffer = sharedNoiseBuffer;
                const hFilter = audioCtx.createBiquadFilter();
                hFilter.type = 'highpass';
                hFilter.frequency.value = 7500;
                const hGain = audioCtx.createGain();
                hGain.gain.setValueAtTime(beat % 2 === 0 ? 0.06 : 0.03, now);
                hGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
                hat.connect(hFilter);
                hFilter.connect(hGain);
                hGain.connect(masterGain);
                hat.start(now);
                hat.stop(now + 0.05);
            }

            radioStep++;
        }, 160);
    } else {
        if (radioTimer) {
            clearInterval(radioTimer);
            radioTimer = null;
        }
    }
}

