// ========================================================
// Mumbai Island Taxi Sim 3D - Main Simulation Loop & Boot
// ========================================================

// ---- 2D Cockpit Overlay Drawing ----
let cockpitCvs = null;
let cockpitCtx = null;
let currentGearText = 'P';

function initCockpitOverlay() {
    cockpitCvs = document.getElementById('cockpitCanvas');
    if (!cockpitCvs) return;
    cockpitCtx = cockpitCvs.getContext('2d');
    resizeCockpitOverlay();
}

function resizeCockpitOverlay() {
    if (!cockpitCvs) return;
    cockpitCvs.width = window.innerWidth;
    cockpitCvs.height = window.innerHeight;
}

function drawCockpitOverlay(steerAngle, speedKmh, gearText, rpmFrac) {
    if (!cockpitCtx || !cockpitCvs) return;
    const ctx = cockpitCtx;
    const W = cockpitCvs.width;
    const H = cockpitCvs.height;
    ctx.clearRect(0, 0, W, H);

    const dashTop = H * 0.62;

    // 1. Car Hood / Bonnet (Seen through bottom of windshield, extending forward into road)
    // Drawn first so the dashboard base neatly covers its lower edge
    const hoodTop = dashTop - 34;
    const hoodL = W * 0.16;
    const hoodR = W * 0.84;
    const hoodGrad = ctx.createLinearGradient(0, hoodTop, 0, dashTop + 10);
    hoodGrad.addColorStop(0, '#f59e0b'); // Mumbai yellow
    hoodGrad.addColorStop(0.35, '#d97706');
    hoodGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = hoodGrad;
    ctx.beginPath();
    ctx.moveTo(hoodL, dashTop + 20);
    ctx.lineTo(W * 0.28, hoodTop + 8);
    ctx.quadraticCurveTo(W * 0.5, hoodTop - 4, W * 0.72, hoodTop + 8);
    ctx.lineTo(hoodR, dashTop + 20);
    ctx.closePath();
    ctx.fill();

    // Hood aerodynamic power bulge & center crease
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(W * 0.44, hoodTop + 2);
    ctx.lineTo(W * 0.56, hoodTop + 2);
    ctx.lineTo(W * 0.58, dashTop + 10);
    ctx.lineTo(W * 0.42, dashTop + 10);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(69, 26, 3, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, hoodTop);
    ctx.lineTo(W * 0.5, dashTop + 15);
    ctx.stroke();

    // Windshield bottom wiper / cowl trim line
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hoodL - 10, dashTop + 12);
    ctx.quadraticCurveTo(W * 0.5, dashTop - 12, hoodR + 10, dashTop + 12);
    ctx.stroke();

    // 2. Dashboard Base (Spans bottom 38% of screen)
    const dashGrad = ctx.createLinearGradient(0, dashTop - 25, 0, H);
    dashGrad.addColorStop(0, '#1e293b'); // Charcoal dark leather
    dashGrad.addColorStop(0.2, '#162032');
    dashGrad.addColorStop(0.6, '#0f172a');
    dashGrad.addColorStop(1, '#020617');
    ctx.fillStyle = dashGrad;
    ctx.beginPath();
    // Start at left window sill
    ctx.moveTo(0, dashTop + 22);
    // Arch upward over driver's instrument binnacle (W * 0.18 to W * 0.52)
    ctx.lineTo(W * 0.18, dashTop + 12);
    ctx.quadraticCurveTo(W * 0.35, dashTop - 28, W * 0.50, dashTop + 6);
    // Slope gently toward passenger side
    ctx.quadraticCurveTo(W * 0.75, dashTop + 12, W, dashTop + 24);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Dashboard leather stitching / bevel highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, dashTop + 20);
    ctx.lineTo(W * 0.18, dashTop + 10);
    ctx.quadraticCurveTo(W * 0.35, dashTop - 29, W * 0.50, dashTop + 4);
    ctx.quadraticCurveTo(W * 0.75, dashTop + 10, W, dashTop + 22);
    ctx.stroke();

    // Polished Walnut Wood / Brushed Bronze Trim Strip
    const trimGrad = ctx.createLinearGradient(0, dashTop + 22, 0, dashTop + 34);
    trimGrad.addColorStop(0, '#78350f');
    trimGrad.addColorStop(0.5, '#d97706');
    trimGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = trimGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.12, dashTop + 24);
    ctx.quadraticCurveTo(W * 0.55, dashTop + 18, W * 0.88, dashTop + 26);
    ctx.lineTo(W * 0.88, dashTop + 33);
    ctx.quadraticCurveTo(W * 0.55, dashTop + 25, W * 0.12, dashTop + 31);
    ctx.closePath();
    ctx.fill();

    // 3. Left A-Pillar (Frames windshield on left, like reference photo)
    const pillarGrad = ctx.createLinearGradient(0, 0, W * 0.15, 0);
    pillarGrad.addColorStop(0, '#94a3b8');
    pillarGrad.addColorStop(0.5, '#cbd5e1'); // Elegant interior beige/grey
    pillarGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = pillarGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.08, 0);
    ctx.lineTo(W * 0.16, dashTop + 15);
    ctx.lineTo(W * 0.10, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Inner shadow of left A-pillar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(W * 0.07, 0);
    ctx.lineTo(W * 0.08, 0);
    ctx.lineTo(W * 0.16, dashTop + 15);
    ctx.lineTo(W * 0.145, dashTop + 15);
    ctx.closePath();
    ctx.fill();

    // 4. Right A-Pillar (Frames windshield on right edge)
    const rPillarGrad = ctx.createLinearGradient(W * 0.88, 0, W, 0);
    rPillarGrad.addColorStop(0, '#64748b');
    rPillarGrad.addColorStop(0.6, '#cbd5e1');
    rPillarGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = rPillarGrad;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.94, 0);
    ctx.lineTo(W * 0.88, dashTop + 20);
    ctx.lineTo(W * 0.92, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // 5. Left Driver Side Mirror (Outside window)
    const mirrorX = W * 0.048;
    const mirrorY = H * 0.44;
    const mirrorW = W * 0.038;
    const mirrorH = H * 0.052;
    // Housing
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(mirrorX, mirrorY, mirrorW + 3, mirrorH + 3, -0.12, 0, Math.PI * 2);
    ctx.fill();
    // Glass reflection (road & sky horizon)
    const mGlassGrad = ctx.createLinearGradient(mirrorX, mirrorY - mirrorH, mirrorX, mirrorY + mirrorH);
    mGlassGrad.addColorStop(0, '#38bdf8');
    mGlassGrad.addColorStop(0.5, '#7dd3fc');
    mGlassGrad.addColorStop(0.52, '#334155');
    mGlassGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = mGlassGrad;
    ctx.beginPath();
    ctx.ellipse(mirrorX, mirrorY, mirrorW, mirrorH, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 6. Rearview Mirror (Center top of windshield)
    const rvmX = W * 0.50;
    const rvmY = H * 0.07;
    const rvmW = W * 0.09;
    const rvmH = H * 0.04;
    // Mirror mount stem
    ctx.fillStyle = '#09090b';
    ctx.fillRect(rvmX - 4, 0, 8, rvmY);
    // Mirror housing
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rvmX - rvmW, rvmY - rvmH * 0.5, rvmW * 2, rvmH, 8);
    else ctx.rect(rvmX - rvmW, rvmY - rvmH * 0.5, rvmW * 2, rvmH);
    ctx.fill();
    // Mirror glass (subtle reflection & rear view)
    const rvmGrad = ctx.createLinearGradient(0, rvmY - rvmH * 0.5, 0, rvmY + rvmH * 0.5);
    rvmGrad.addColorStop(0, '#0c2440');
    rvmGrad.addColorStop(0.5, '#1e293b');
    rvmGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = rvmGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rvmX - rvmW + 3, rvmY - rvmH * 0.5 + 3, (rvmW - 3) * 2, rvmH - 6, 5);
    else ctx.rect(rvmX - rvmW + 3, rvmY - rvmH * 0.5 + 3, (rvmW - 3) * 2, rvmH - 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 7. Center Console (Air Vents & Infotainment Display)
    const ccX = W * 0.54;
    const ccY = dashTop + 24;
    const ccW = W * 0.22;
    const ccH = H * 0.26;

    // Center console panel background
    ctx.fillStyle = '#0a0f1a';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ccX, ccY, ccW, ccH, 12);
    else ctx.rect(ccX, ccY, ccW, ccH);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dual AC Vents above screen
    const ventW = ccW * 0.38;
    const ventH = ccH * 0.20;
    const ventY = ccY + 8;
    [ccX + ccW * 0.08, ccX + ccW * 0.54].forEach(vx => {
        ctx.fillStyle = '#020617';
        ctx.fillRect(vx, ventY, ventW, ventH);
        for (let vy = ventY + 4; vy < ventY + ventH - 2; vy += 5) {
            ctx.fillStyle = '#475569';
            ctx.fillRect(vx + 2, vy, ventW - 4, 2);
        }
    });

    // Infotainment Touchscreen
    const scrX = ccX + ccW * 0.06;
    const scrY = ccY + ventH + 14;
    const scrW = ccW * 0.88;
    const scrH = ccH * 0.65;

    ctx.fillStyle = '#020617';
    ctx.fillRect(scrX, scrY, scrW, scrH);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.strokeRect(scrX, scrY, scrW, scrH);

    // Simulated GPS Map on Screen
    ctx.fillStyle = '#0c1a2e';
    ctx.fillRect(scrX + 2, scrY + 2, scrW - 4, scrH * 0.54);
    // GPS road grid lines
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(scrX + 6, scrY + scrH * 0.38);
    ctx.lineTo(scrX + scrW * 0.45, scrY + 8);
    ctx.lineTo(scrX + scrW * 0.85, scrY + 12);
    ctx.stroke();
    // Route cyan line
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(scrX + 12, scrY + scrH * 0.35);
    ctx.lineTo(scrX + scrW * 0.44, scrY + 11);
    ctx.lineTo(scrX + scrW * 0.82, scrY + 14);
    ctx.stroke();
    // GPS Taxi marker
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(scrX + scrW * 0.44, scrY + 11, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Radio station banner on screen
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.max(9, W * 0.0075 | 0)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('LO-FI 98.4 FM', scrX + 6, scrY + scrH * 0.72);

    // Digital Fare Meter readout on screen
    ctx.fillStyle = '#34d399'; // Emerald digital VFD green
    ctx.font = `900 ${Math.max(10, W * 0.0085 | 0)}px monospace`;
    ctx.fillText(`FARE: ₹${typeof cash !== 'undefined' ? cash : 120} • ${typeof faresCompleted !== 'undefined' ? faresCompleted : 0} PASS`, scrX + 6, scrY + scrH * 0.90);

    // 8. Driver Instrument Cluster (Directly aligned with steering wheel centerline: cx = W * 0.35)
    const clusterCx = W * 0.35;
    const clusterCy = H * 0.71;
    const clusterW = W * 0.25;
    const clusterH = H * 0.16;

    // Cluster binnacle dark plate
    ctx.fillStyle = '#050b14';
    ctx.beginPath();
    ctx.ellipse(clusterCx, clusterCy, clusterW * 0.52, clusterH * 0.90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle blue radial ambient backlight
    const glowGrad = ctx.createRadialGradient(clusterCx, clusterCy, 20, clusterCx, clusterCy, clusterW * 0.5);
    glowGrad.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
    glowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(clusterCx, clusterCy, clusterW * 0.50, clusterH * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Speedometer Gauge Arc (Center of cluster)
    const speedR = Math.min(clusterW * 0.38, clusterH * 0.78);
    const speedFrac = Math.min(1, Math.max(0, speedKmh / 140));

    // Dial background track
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(clusterCx, clusterCy, speedR, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.stroke();

    // Speed glowing filled arc
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(clusterCx, clusterCy, speedR, 0.75 * Math.PI, 0.75 * Math.PI + speedFrac * 1.5 * Math.PI);
    ctx.stroke();

    // Speedometer major ticks & numbers (0 to 140 km/h)
    for (let s = 0; s <= 140; s += 20) {
        const ang = 0.75 * Math.PI + (s / 140) * 1.5 * Math.PI;
        const x1 = clusterCx + Math.cos(ang) * (speedR - 7);
        const y1 = clusterCy + Math.sin(ang) * (speedR - 7);
        const x2 = clusterCx + Math.cos(ang) * speedR;
        const y2 = clusterCy + Math.sin(ang) * speedR;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const tx = clusterCx + Math.cos(ang) * (speedR - 16);
        const ty = clusterCy + Math.sin(ang) * (speedR - 16);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `bold ${Math.max(9, W * 0.008 | 0)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s, tx, ty);
    }

    // Speedometer Needle
    const needleAng = 0.75 * Math.PI + speedFrac * 1.5 * Math.PI;
    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(clusterCx, clusterCy);
    ctx.lineTo(clusterCx + Math.cos(needleAng) * (speedR - 5), clusterCy + Math.sin(needleAng) * (speedR - 5));
    ctx.stroke();
    ctx.restore();

    // Digital Speed Display in center
    ctx.fillStyle = '#38bdf8';
    ctx.font = `900 ${Math.max(18, W * 0.020 | 0)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(Math.round(speedKmh), clusterCx, clusterCy + speedR * 0.38);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold ${Math.max(8, W * 0.007 | 0)}px sans-serif`;
    ctx.fillText('KM/H', clusterCx, clusterCy + speedR * 0.58);

    // Left RPM Mini-Dial
    const rpmCx = clusterCx - speedR * 1.15;
    const rpmCy = clusterCy + 2;
    const rpmR = speedR * 0.48;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(rpmCx, rpmCy, rpmR, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.stroke();
    // RPM dynamic arc (with redline > 0.75)
    ctx.strokeStyle = rpmFrac > 0.75 ? '#ef4444' : '#0ea5e9';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(rpmCx, rpmCy, rpmR, 0.75 * Math.PI, 0.75 * Math.PI + Math.min(1, rpmFrac) * 1.5 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${Math.max(7, W * 0.006 | 0)}px sans-serif`;
    ctx.fillText('RPM', rpmCx, rpmCy + rpmR * 0.65);

    // Gear indicator badge (right side of speedo)
    const gearX = clusterCx + speedR * 1.12;
    const gearY = clusterCy;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(gearX, gearY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = (gearText && gearText.includes('BOOST')) ? '#38bdf8' : (gearText === 'R' ? '#ef4444' : '#facc15');
    ctx.font = `900 ${Math.max(10, W * 0.009 | 0)}px sans-serif`;
    ctx.fillText(gearText || 'P', gearX, gearY + 4);

    // 9. Interactive Luxury 4-Spoke Steering Wheel
    // Positioned so driver looks right through the top half of the rim at the dials
    const wheelCx = W * 0.35;
    const wheelCy = H * 0.95;
    const wheelR = Math.min(W, H) * 0.22;

    ctx.save();
    ctx.translate(wheelCx, wheelCy);
    ctx.rotate(-steerAngle * 2.2);

    // Outer Rim shadow & body
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = Math.max(14, wheelR * 0.13);
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // Leather textured highlight on rim
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = Math.max(10, wheelR * 0.09);
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // 12 o'clock Racing Stripe (Yellow alignment center-mark)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = Math.max(12, wheelR * 0.11);
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, -Math.PI / 2 - 0.06, -Math.PI / 2 + 0.06);
    ctx.stroke();

    // Brushed Aluminum Spokes (4 Spokes: Left, Right, Bottom-Left, Bottom-Right)
    const spokeMat = '#cbd5e1';
    ctx.strokeStyle = spokeMat;
    ctx.lineWidth = Math.max(6, wheelR * 0.065);

    // Left Horizontal Spoke
    ctx.beginPath();
    ctx.moveTo(-wheelR * 0.32, 0);
    ctx.lineTo(-wheelR + 4, 0);
    ctx.stroke();

    // Right Horizontal Spoke
    ctx.beginPath();
    ctx.moveTo(wheelR * 0.32, 0);
    ctx.lineTo(wheelR - 4, 0);
    ctx.stroke();

    // Lower-Left Angled Spoke
    ctx.beginPath();
    ctx.moveTo(-wheelR * 0.16, wheelR * 0.25);
    ctx.lineTo(-wheelR * 0.55, wheelR * 0.82);
    ctx.stroke();

    // Lower-Right Angled Spoke
    ctx.beginPath();
    ctx.moveTo(wheelR * 0.16, wheelR * 0.25);
    ctx.lineTo(wheelR * 0.55, wheelR * 0.82);
    ctx.stroke();

    // Spoke Thumb Control Modules (Buttons for cruise & audio)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-wheelR * 0.72, -wheelR * 0.09, wheelR * 0.26, wheelR * 0.18);
    ctx.fillRect(wheelR * 0.46, -wheelR * 0.09, wheelR * 0.26, wheelR * 0.18);

    // Button icon accents
    ctx.fillStyle = '#71717a';
    ctx.fillRect(-wheelR * 0.68, -wheelR * 0.05, wheelR * 0.08, 4);
    ctx.fillRect(-wheelR * 0.56, -wheelR * 0.05, wheelR * 0.08, 4);
    ctx.fillRect(wheelR * 0.50, -wheelR * 0.05, wheelR * 0.08, 4);
    ctx.fillRect(wheelR * 0.62, -wheelR * 0.05, wheelR * 0.08, 4);

    // Center Hub (Airbag module)
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.arc(0, 0, wheelR * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mumbai Island Taxi Horn Emblem (Amber & Silver shield)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, wheelR * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = `900 ${Math.max(7, wheelR * 0.065 | 0)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAXI', 0, 0);

    ctx.restore();

    // 10. Windshield Top Tint Bar (Soft blue gradient band at top)
    const tintGrad = ctx.createLinearGradient(0, 0, 0, H * 0.08);
    tintGrad.addColorStop(0, 'rgba(12, 24, 48, 0.65)');
    tintGrad.addColorStop(1, 'rgba(12, 24, 48, 0)');
    ctx.fillStyle = tintGrad;
    ctx.fillRect(W * 0.08, 0, W * 0.86, H * 0.08);
}
// ---- End Cockpit Overlay ----

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

        if (fuel <= 0) {
            triggerGameOver('Out of Fuel!', 'Your taxi ran out of fuel on the island.');
            return;
        }

        const maxSpeed = usingNitro ? 105 : 68;
        const accel = usingNitro ? 58 : 28;

        // Smooth progressive throttle & natural coasting
        if (throttle) {
            // Progressive torque curve: stronger pull at low speeds, smooth taper near max speed
            const speedRatio = Math.max(0, playerCar.speed / maxSpeed);
            const torqueMultiplier = Math.max(0.35, 1.0 - speedRatio * 0.55);
            playerCar.speed += accel * torqueMultiplier * dt;
            fuel = Math.max(0, fuel - (usingNitro ? 0.35 : 0.12) * dt);
        } else if (reverse) {
            // Smooth reverse acceleration (footbrake when moving forward, reverse when stopped)
            if (playerCar.speed > 0) {
                playerCar.speed = Math.max(0, playerCar.speed - 36 * dt);
            } else {
                playerCar.speed = Math.max(-24, playerCar.speed - 18 * dt);
            }
        } else {
            // Relaxing natural coasting (gentle rolling resistance instead of jerky instant drag)
            const coastDrag = 5.2; // ~5 km/h per second gradual deceleration
            if (playerCar.speed > 0) {
                playerCar.speed = Math.max(0, playerCar.speed - coastDrag * dt);
            } else if (playerCar.speed < 0) {
                playerCar.speed = Math.min(0, playerCar.speed + coastDrag * dt);
            }
        }

        // Spacebar Progressive Hydraulic Brake
        if (brake) {
            const brakePower = 44;
            if (playerCar.speed > 0) {
                playerCar.speed = Math.max(0, playerCar.speed - brakePower * dt);
            } else if (playerCar.speed < 0) {
                playerCar.speed = Math.min(0, playerCar.speed + brakePower * dt);
            }
        }

        if (usingNitro) {
            nitro = Math.max(0, nitro - 25 * dt);
        } else {
            nitro = Math.min(100, nitro + 12 * dt);
        }

        playerCar.speed = Math.max(-24, Math.min(maxSpeed, playerCar.speed));
        if (Math.abs(playerCar.speed) < 0.15 && !throttle && !reverse) playerCar.speed = 0;

        // --- Buttery-Smooth Speed-Sensitive Steering ---
        // 1. Smoothly interpolate steerAngle towards input target (no instant snap)
        const targetSteerAngle = steerInput * 0.48;
        const steerRate = (steerInput === 0) ? 9.0 : 6.5; // Centers slightly faster than turns
        playerCar.steerAngle += (targetSteerAngle - playerCar.steerAngle) * Math.min(1, dt * steerRate);

        // 2. Speed-scaled turn responsiveness (progressive turn authority based on actual forward motion)
        const absSpd = Math.abs(playerCar.speed);
        const speedTurnFactor = Math.min(1.0, Math.max(0.12, absSpd / 20.0));
        const dirSign = playerCar.speed >= -0.5 ? 1 : -1;

        // 3. Angular velocity smoothing with damping (eliminates discrete yaw jerking)
        const desiredYawRate = playerCar.steerAngle * 2.4 * speedTurnFactor * dirSign;
        playerCar.angularVel = playerCar.angularVel || 0;
        playerCar.angularVel += (desiredYawRate - playerCar.angularVel) * Math.min(1, dt * 14);
        playerCar.heading += playerCar.angularVel * dt;

        // 4. Subtle suspension dynamics (Squat on accel, dive on brake, roll on turns)
        playerCar.pitch = playerCar.pitch || 0;
        playerCar.roll = playerCar.roll || 0;
        const targetPitch = throttle ? -0.016 : (brake ? 0.022 : 0);
        const targetRoll = -playerCar.angularVel * 0.06;
        playerCar.pitch += (targetPitch - playerCar.pitch) * Math.min(1, dt * 8);
        playerCar.roll += (targetRoll - playerCar.roll) * Math.min(1, dt * 8);

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
            playerCar.speed = -playerCar.speed * 0.22;
            playerCar.angularVel = 0;
        } else {
            playerCar.x = nextX;
            playerCar.z = nextZ;
        }

        playerCar.mesh.position.set(playerCar.x, 0, playerCar.z);
        playerCar.mesh.rotation.set(playerCar.pitch, playerCar.heading, playerCar.roll, 'YXZ');

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

        if (camMode === 0) {
            // PRIMARY: Interior Cockpit View (Smooth Head-Tracking & Vibration Damping)
            if (playerCar.interiorGroup) playerCar.interiorGroup.visible = false;
            const driverOffsetX = -1.25;
            const driverOffsetY = 5.85;
            const driverOffsetZ = 3.65;

            const sinH = Math.sin(playerCar.heading);
            const cosH = Math.cos(playerCar.heading);

            // Driver eye position with subtle suspension heave
            const eyeX = playerCar.x + cosH * driverOffsetX + sinH * driverOffsetZ;
            const eyeY = driverOffsetY - (playerCar.pitch || 0) * 2.2;
            const eyeZ = playerCar.z - sinH * driverOffsetX + cosH * driverOffsetZ;

            // Look target: glances slightly into turns (subtle apex anticipation)
            const lookDist = 75;
            const lookAngle = playerCar.heading + camYawOffset + (playerCar.angularVel || 0) * 0.10;
            const targetX = eyeX + Math.sin(lookAngle) * lookDist;
            const targetY = eyeY - 0.2 + camPitchOffset * 20;
            const targetZ = eyeZ + Math.cos(lookAngle) * lookDist;

            const desiredEye = new THREE.Vector3(eyeX, eyeY, eyeZ);
            const desiredLook = new THREE.Vector3(targetX, targetY, targetZ);

            if (!camEyePos) camEyePos = desiredEye.clone();
            if (!camLookTarget) camLookTarget = desiredLook.clone();

            camEyePos.lerp(desiredEye, Math.min(1, dt * 28));
            camLookTarget.lerp(desiredLook, Math.min(1, dt * 18));

            camera.position.copy(camEyePos);
            camera.lookAt(camLookTarget);
        } else {
            // Chase Camera (Exterior Third-Person, Smooth Following on both pos and look target)
            if (playerCar.interiorGroup) playerCar.interiorGroup.visible = true;
            const camDist = 32;
            const camHeight = 13.5;
            const desiredChasePos = new THREE.Vector3(
                playerCar.x - Math.sin(playerCar.heading) * camDist,
                camHeight,
                playerCar.z - Math.cos(playerCar.heading) * camDist
            );
            const desiredChaseLook = new THREE.Vector3(
                playerCar.x + Math.sin(playerCar.heading) * 16,
                5.2,
                playerCar.z + Math.cos(playerCar.heading) * 16
            );

            if (!camEyePos) camEyePos = desiredChasePos.clone();
            if (!camLookTarget) camLookTarget = desiredChaseLook.clone();

            camEyePos.lerp(desiredChasePos, Math.min(1, dt * 7));
            camLookTarget.lerp(desiredChaseLook, Math.min(1, dt * 10));

            camera.position.copy(camEyePos);
            camera.lookAt(camLookTarget);
        }
    } else {
        if (playerCar && playerCar.interiorGroup) playerCar.interiorGroup.visible = true;
        // Free-Look Cursor Orbit Camera while on foot
        const orbitAngle = player.heading + camYawOffset;
        const camDist = 20;
        const camHeight = 9.5 + camPitchOffset * 14;
        const desiredFootPos = new THREE.Vector3(
            player.x - Math.sin(orbitAngle) * camDist,
            player.y + camHeight,
            player.z - Math.cos(orbitAngle) * camDist
        );
        const desiredFootLook = new THREE.Vector3(
            player.x + Math.sin(orbitAngle) * 10,
            player.y + 4.2,
            player.z + Math.cos(orbitAngle) * 10
        );

        if (!camEyePos) camEyePos = desiredFootPos.clone();
        if (!camLookTarget) camLookTarget = desiredFootLook.clone();

        camEyePos.lerp(desiredFootPos, Math.min(1, dt * 12));
        camLookTarget.lerp(desiredFootLook, Math.min(1, dt * 14));

        camera.position.copy(camEyePos);
        camera.lookAt(camLookTarget);
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
    // Draw 2D cockpit overlay after 3D render
    if (!inMainMenu && camMode === 0 && player.inCar && playerCar) {
        const usingNitro = (keys['ShiftLeft'] || keys['ShiftRight'] || touchState.nitro) && nitro > 2;
        const rpmFrac = Math.min(1, (800 + Math.abs(playerCar.speed) * 42 + (usingNitro ? 1600 : 0)) / 7200);
        drawCockpitOverlay(playerCar.steerAngle, Math.round(Math.abs(playerCar.speed) * 0.95), currentGearText, rpmFrac);
        if (cockpitCvs) cockpitCvs.style.display = 'block';
    } else {
        if (cockpitCvs) cockpitCvs.style.display = 'none';
    }
}

window.onload = function () {
    const boot = () => {
        init3D();
        initCockpitOverlay();
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

