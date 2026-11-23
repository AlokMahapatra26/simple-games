// ========================================================
// Mumbai Island Taxi Sim 3D - Procedural Canvas Texture Generators
// ========================================================

function createEnvCubeTexture() {
    const faces = [];
    for (let i = 0; i < 6; i++) {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 64);
        if (i === 2) {
            grad.addColorStop(0, '#38bdf8');
            grad.addColorStop(1, '#bae6fd');
        } else if (i === 3) {
            grad.addColorStop(0, '#1e293b');
            grad.addColorStop(1, '#0f172a');
        } else {
            grad.addColorStop(0, '#38bdf8');
            grad.addColorStop(0.55, '#e0f2fe');
            grad.addColorStop(0.56, '#334155');
            grad.addColorStop(1, '#1e293b');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        faces.push(c);
    }
    const cube = new THREE.CubeTexture(faces);
    cube.needsUpdate = true;
    return cube;
}

function createContactShadowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.72)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.38)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

function createCarSideTexture(isTaxi) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = isTaxi ? '#facc15' : '#ffffff';
    ctx.fillRect(0, 0, 512, 256);

    // Lower rocker skirt
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 218, 512, 38);

    // Door shutlines & handles
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(150, 92, 108, 122);
    ctx.strokeRect(262, 92, 104, 122);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(225, 118, 22, 8);
    ctx.fillRect(334, 118, 22, 8);

    if (isTaxi) {
        // Iconic Mumbai/NYC checkered taxi beltline
        const sq = 16;
        for (let x = 48; x < 464; x += sq) {
            const idx = Math.floor(x / sq);
            ctx.fillStyle = idx % 2 === 0 ? '#09090b' : '#ffffff';
            ctx.fillRect(x, 146, sq, sq);
            ctx.fillStyle = idx % 2 === 1 ? '#09090b' : '#ffffff';
            ctx.fillRect(x, 162, sq, sq);
        }
        // Bold TAXI door badge
        ctx.fillStyle = '#09090b';
        ctx.fillRect(195, 182, 122, 30);
        ctx.fillStyle = '#facc15';
        ctx.font = '900 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TAXI', 256, 205);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
}

function createFrontFasciaTexture(isTaxi) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');

    ctx.fillStyle = isTaxi ? '#facc15' : '#e2e8f0';
    ctx.fillRect(0, 0, 256, 128);

    // Grille
    ctx.fillStyle = '#09090b';
    ctx.fillRect(72, 34, 112, 48);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(72, 34, 112, 48);

    ctx.fillStyle = '#334155';
    for (let y = 42; y < 78; y += 8) {
        ctx.fillRect(78, y, 100, 3);
    }

    // Projector headlights
    [14, 190].forEach((hx) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(hx, 30, 52, 30);
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(hx + 26, 45, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(hx + 2, 56, 48, 4);
    });

    // Bumper & License plate
    ctx.fillStyle = '#18181b';
    ctx.fillRect(24, 92, 208, 28);
    ctx.fillStyle = isTaxi ? '#facc15' : '#f8fafc';
    ctx.fillRect(92, 95, 72, 20);
    ctx.fillStyle = '#09090b';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MH 01 TX 26', 128, 109);

    return new THREE.CanvasTexture(c);
}

function createRearFasciaTexture(isTaxi) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');

    ctx.fillStyle = isTaxi ? '#facc15' : '#e2e8f0';
    ctx.fillRect(0, 0, 256, 128);

    // Wrap-around LED taillights
    [12, 186].forEach((tx) => {
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(tx, 26, 58, 28);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(tx + 4, 30, 50, 12);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(tx + 12, 44, 34, 6);
    });

    // Trunk recess & License plate
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(88, 34, 80, 32);
    ctx.fillStyle = isTaxi ? '#facc15' : '#f8fafc';
    ctx.fillRect(94, 40, 68, 20);
    ctx.fillStyle = '#09090b';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MH 01 TX 26', 128, 54);

    // Rear diffuser
    ctx.fillStyle = '#18181b';
    ctx.fillRect(16, 88, 224, 32);

    return new THREE.CanvasTexture(c);
}

function createTaxiSignTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 58);
    ctx.fillStyle = '#09090b';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 128, 46);
    return new THREE.CanvasTexture(c);
}

function createHumanFaceTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d99b66';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(0, 0, 128, 26);
    ctx.fillRect(0, 0, 16, 68);
    ctx.fillRect(112, 0, 16, 68);
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(34, 44, 20, 5);
    ctx.fillRect(74, 44, 20, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(36, 52, 16, 9);
    ctx.fillRect(76, 52, 16, 9);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(41, 53, 7, 7);
    ctx.fillRect(81, 53, 7, 7);
    ctx.fillStyle = '#b97a45';
    ctx.fillRect(60, 58, 8, 18);
    ctx.fillStyle = '#292524';
    ctx.fillRect(48, 82, 32, 6);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(52, 92, 24, 5);
    return new THREE.CanvasTexture(c);
}

function createBuildingFacadeTexture(isNight = false) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d');

    // Cladding base
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 512);

    // Pilasters
    ctx.fillStyle = '#94a3b8';
    for (let x = 0; x <= 256; x += 64) {
        ctx.fillRect(x - 4, 0, 8, 512);
    }

    // Windows
    const cols = 4;
    const rows = 12;
    const padX = 12;
    const padY = 8;
    const cellW = 256 / cols;
    const cellH = (512 - 64) / rows;

    for (let r = 0; r < rows; r++) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, r * cellH, 256, 6);

        for (let col = 0; col < cols; col++) {
            const wx = col * cellW + padX;
            const wy = r * cellH + padY + 2;
            const ww = cellW - padX * 2;
            const wh = cellH - padY * 1.5;

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

            const hash = Math.abs(Math.sin(r * 19.31 + col * 47.17) * 9137.3);
            const lit = (hash - Math.floor(hash)) > 0.42;

            if (isNight) {
                ctx.fillStyle = lit ? '#fef08a' : '#0f172a';
            } else {
                const glassGrad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
                glassGrad.addColorStop(0, '#38bdf8');
                glassGrad.addColorStop(0.5, '#0284c7');
                glassGrad.addColorStop(1, '#1e293b');
                ctx.fillStyle = glassGrad;
            }
            ctx.fillRect(wx, wy, ww, wh);

            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(wx + 2, wy + 2, ww * 0.35, wh - 4);
            ctx.fillStyle = '#334155';
            ctx.fillRect(wx + ww * 0.5 - 1, wy, 2, wh);
        }
    }

    // Storefront lobby
    const lobbyY = 512 - 64;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, lobbyY, 256, 64);

    for (let col = 0; col < 4; col++) {
        const sx = col * 64 + 8;
        ctx.fillStyle = isNight ? '#fde047' : '#bae6fd';
        ctx.fillRect(sx, lobbyY + 18, 48, 38);
        ctx.fillStyle = col % 2 === 0 ? '#dc2626' : '#0284c7';
        ctx.fillRect(sx - 2, lobbyY + 8, 52, 10);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
}

function createRooftopTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = '#475569';
    ctx.fillRect(22, 24, 38, 30);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(86, 82, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('H', 86, 89);
    return new THREE.CanvasTexture(c);
}


