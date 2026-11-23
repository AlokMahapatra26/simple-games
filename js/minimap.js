// ========================================================
// Mumbai Island Taxi Sim 3D - Rotating Circular Radar Minimap
// ========================================================

function drawMiniMap() {
    const canvas = document.getElementById('minimapCanvas');
    if (!canvas || !playerCar) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = cx - 2;
    const scale = 0.042;

    const px = player.inCar ? playerCar.x : player.x;
    const pz = player.inCar ? playerCar.z : player.z;
    const pHead = player.inCar ? playerCar.heading : (player.heading + camYawOffset);

    ctx.clearRect(0, 0, w, h);

    // Circular clipping region
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Background terrain color
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Draw World Elements with Player-Centric Heading Transformation
    // Forward in world (+Z when heading=0) maps to -Y (UP on canvas).
    // Right in world (+X when heading=0) maps to +X (RIGHT on canvas).
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-pHead);
    ctx.scale(scale, -scale);
    ctx.translate(-px, -pz);

    // 1. River channel
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(RIVER_X - RIVER_WIDTH / 2, -MAP_HALF, RIVER_WIDTH, MAP_HALF * 2);

    // 2. City Road Network
    ctx.fillStyle = '#334155';
    for (let pos = -MAP_HALF + GRID_STEP; pos <= MAP_HALF - GRID_STEP; pos += GRID_STEP) {
        if (Math.abs(pos - RIVER_X) > RIVER_WIDTH * 0.7) {
            ctx.fillRect(pos - ROAD_WIDTH / 2, -MAP_HALF, ROAD_WIDTH, MAP_HALF * 2);
        }
        ctx.fillRect(-MAP_HALF, pos - ROAD_WIDTH / 2, MAP_HALF * 2, ROAD_WIDTH);
    }

    // 3. Bridges over the river
    ctx.fillStyle = '#475569';
    for (let bz = -MAP_HALF + GRID_STEP; bz <= MAP_HALF - GRID_STEP; bz += GRID_STEP) {
        ctx.fillRect(RIVER_X - RIVER_WIDTH / 2 - 25, bz - ROAD_WIDTH / 2, RIVER_WIDTH + 50, ROAD_WIDTH);
    }

    // 4. Fuel & Repair Service Stations
    for (let i = 0; i < serviceZones.length; i++) {
        const sz = serviceZones[i];
        ctx.fillStyle = sz.type === 'fuel' ? '#f59e0b' : '#10b981';
        ctx.fillRect(sz.x - 85, sz.z - 85, 170, 170);
    }

    ctx.restore();

    // Range rings for radar feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Mission Objective Beacon with Clamping to Radar Edge
    const dx = mission.x - px;
    const dz = mission.z - pz;
    const lx = scale * (dx * Math.cos(pHead) - dz * Math.sin(pHead));
    const ly = -scale * (dx * Math.sin(pHead) + dz * Math.cos(pHead));

    const dist = Math.hypot(lx, ly);
    const maxR = radius - 8;

    let targetX = cx + lx;
    let targetY = cy + ly;
    const isEdge = dist > maxR;

    if (isEdge) {
        const angle = Math.atan2(ly, lx);
        targetX = cx + Math.cos(angle) * maxR;
        targetY = cy + Math.sin(angle) * maxR;
    }

    const beaconColor = mission.state === 'pickup' ? '#38bdf8' : '#f59e0b';

    if (isEdge) {
        ctx.strokeStyle = beaconColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 6.5, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = beaconColor;
    ctx.beginPath();
    ctx.arc(targetX, targetY, isEdge ? 4 : 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. North Indicator on Radar Rim (Red "N")
    const northAngle = Math.atan2(-Math.cos(pHead), -Math.sin(pHead));
    const nx = cx + Math.cos(northAngle) * (radius - 8);
    const ny = cy + Math.sin(northAngle) * (radius - 8);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    // 7. Player Arrow in Center (Always points straight UP where you are driving)
    ctx.save();
    ctx.translate(cx, cy);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7.5);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7.5);
    ctx.closePath();
    ctx.fill();

    // Yellow arrow
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6.5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Outer ring border
    ctx.restore(); // Restore clip
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
}

// ==========================================
// FULL SATELLITE ISLAND GPS MAP
// ==========================================
function toggleFullMap() {
    fullMapOpen = !fullMapOpen;
    const modal = document.getElementById('mapModal');
    if (!modal) return;
    if (fullMapOpen) {
        modal.classList.remove('hidden');
        drawFullMap();
    } else {
        modal.classList.add('hidden');
    }
}

function drawFullMap() {
    const canvas = document.getElementById('fullMapCanvas');
    if (!canvas || !playerCar) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const px = player.inCar ? playerCar.x : player.x;
    const pz = player.inCar ? playerCar.z : player.z;
    const pHead = player.inCar ? playerCar.heading : player.heading;

    // Scale whole island (MAP_HALF * 2 = 8400 units) to fit into canvas with padding
    const worldSpan = MAP_HALF * 2 + 800; // 9200 units
    const mapScale = (w * 0.94) / worldSpan;

    // Helper: World (X, Z) to Map (X, Y) where North (+Z) is UP
    const toMapX = (wx) => cx + wx * mapScale;
    const toMapY = (wz) => cy - wz * mapScale;

    ctx.clearRect(0, 0, w, h);

    // 1. Deep Ocean Background
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, w, h);

    // 2. Sandy Beach Perimeter
    const beachHalf = (MAP_HALF + 210) * mapScale;
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(cx - beachHalf, cy - beachHalf, beachHalf * 2, beachHalf * 2);

    // 3. City Ground Landmass
    const cityHalf = MAP_HALF * mapScale;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - cityHalf, cy - cityHalf, cityHalf * 2, cityHalf * 2);

    // 4. Central River Channel
    const riverLeft = toMapX(RIVER_X - RIVER_WIDTH / 2);
    const riverW = RIVER_WIDTH * mapScale;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(riverLeft, cy - cityHalf, riverW, cityHalf * 2);

    // 5. City Road Network
    const roadW = Math.max(3.5, ROAD_WIDTH * mapScale);
    ctx.fillStyle = '#334155';

    for (let pos = -MAP_HALF + GRID_STEP; pos <= MAP_HALF - GRID_STEP; pos += GRID_STEP) {
        // N-S Avenues
        if (Math.abs(pos - RIVER_X) > RIVER_WIDTH * 0.7) {
            ctx.fillRect(toMapX(pos) - roadW / 2, cy - cityHalf, roadW, cityHalf * 2);
        }
        // E-W Avenues
        ctx.fillRect(cx - cityHalf, toMapY(pos) - roadW / 2, cityHalf * 2, roadW);
    }

    // 6. River Bridges
    ctx.fillStyle = '#64748b';
    for (let bz = -MAP_HALF + GRID_STEP; bz <= MAP_HALF - GRID_STEP; bz += GRID_STEP) {
        ctx.fillRect(riverLeft - 2, toMapY(bz) - roadW / 2, riverW + 4, roadW);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(riverLeft - 2, toMapY(bz) - roadW / 2, riverW + 4, 1);
        ctx.fillRect(riverLeft - 2, toMapY(bz) + roadW / 2 - 1, riverW + 4, 1);
        ctx.fillStyle = '#64748b';
    }

    // 7. Elevated Highway Overpass
    const hwY = toMapY(HIGHWAY_Z);
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - cityHalf * 0.9, hwY - 2.5, cityHalf * 1.8, 5);

    // 8. Fuel & Repair Service Stations
    for (let i = 0; i < serviceZones.length; i++) {
        const sz = serviceZones[i];
        const sx = toMapX(sz.x);
        const sy = toMapY(sz.z);
        const isFuel = sz.type === 'fuel';
        ctx.fillStyle = isFuel ? '#f59e0b' : '#10b981';
        ctx.fillRect(sx - 4.5, sy - 4.5, 9, 9);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - 4.5, sy - 4.5, 9, 9);
    }

    // 9. Mission Objective Marker with Pulsing Ring
    const mx = toMapX(mission.x);
    const my = toMapY(mission.z);
    const isPickup = mission.state === 'pickup';
    const objColor = isPickup ? '#38bdf8' : '#f59e0b';

    const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.5; // 0..1
    ctx.strokeStyle = objColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 8 + pulse * 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = objColor;
    ctx.beginPath();
    ctx.arc(mx, my, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Objective Label
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(isPickup ? 'PICKUP' : `DROPOFF ($${mission.payout})`, mx, my - 12);

    // 10. Player Vehicle Marker & Direction Pointer
    const plX = toMapX(px);
    const plY = toMapY(pz);

    // Player halo pulse
    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.beginPath();
    ctx.arc(plX, plY, 11 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    // Player arrow rotated by heading (in full map, North is UP, so heading=0 is UP)
    ctx.save();
    ctx.translate(plX, plY);
    ctx.rotate(pHead);

    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7.5);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Player Label
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', plX, plY + 16);

    // 11. Update HUD details on the modal
    const coordsEl = document.getElementById('mapCoordsText');
    if (coordsEl) coordsEl.textContent = `X: ${Math.round(px)}, Z: ${Math.round(pz)}`;
    const distEl = document.getElementById('mapDistBadge');
    if (distEl) {
        const dist = Math.round(Math.hypot(mission.x - px, mission.z - pz));
        distEl.textContent = `Target: ${dist}m (${isPickup ? 'Pickup' : 'Dropoff'})`;
    }
}

