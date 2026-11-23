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

    // 4. Grand Sea Link Bridge Deck
    ctx.fillStyle = '#475569';
    ctx.fillRect(BRIDGE_START_X, BRIDGE_Z - BRIDGE_WIDTH / 2, BRIDGE_END_X - BRIDGE_START_X, BRIDGE_WIDTH);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(BRIDGE_START_X, BRIDGE_Z - 2.5, BRIDGE_END_X - BRIDGE_START_X, 5);

    // 5. Palm Resort Island Land & Roads (Radar Minimap)
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(ISLAND2_CENTER_X - ISLAND2_HALF_W - 180, ISLAND2_CENTER_Z - ISLAND2_HALF_D - 180, (ISLAND2_HALF_W + 180) * 2, (ISLAND2_HALF_D + 180) * 2);
    ctx.fillStyle = '#065f46';
    ctx.fillRect(ISLAND2_CENTER_X - ISLAND2_HALF_W, ISLAND2_CENTER_Z - ISLAND2_HALF_D, ISLAND2_HALF_W * 2, ISLAND2_HALF_D * 2);

    ctx.fillStyle = '#334155';
    ctx.fillRect(ISLAND2_CENTER_X - ISLAND2_HALF_W, -45, ISLAND2_HALF_W * 2, 90);
    ctx.fillRect(ISLAND2_CENTER_X - ISLAND2_HALF_W * 0.85, 1000 - 37, ISLAND2_HALF_W * 1.7, 75);
    ctx.fillRect(ISLAND2_CENTER_X - ISLAND2_HALF_W * 0.85, -1000 - 37, ISLAND2_HALF_W * 1.7, 75);
    ctx.fillRect(7200 - 37, -1000, 75, 2000);
    ctx.fillRect(8200 - 42, -1000, 85, 2000);
    ctx.fillRect(9200 - 37, -1000, 75, 2000);

    // 6. Fuel & Repair Service Stations
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

    // Scale world across both Main City Island and Palm Resort Island
    const worldSpanX = 15800;
    const worldSpanZ = 9400;
    const mapScale = Math.min((w * 0.94) / worldSpanX, (h * 0.92) / worldSpanZ);
    const mapOffsetX = 2850;

    // Helper: World (X, Z) to Map (X, Y) where North (+Z) is UP
    const toMapX = (wx) => cx + (wx - mapOffsetX) * mapScale;
    const toMapY = (wz) => cy - wz * mapScale;

    ctx.clearRect(0, 0, w, h);

    // 1. Deep Ocean Background
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, w, h);

    // 2. MAIN ISLAND: Sandy Beach Perimeter & Landmass
    const mainBeachX = toMapX(-MAP_HALF - 210);
    const mainBeachY = toMapY(MAP_HALF + 210);
    const mainBeachW = (MAP_HALF * 2 + 420) * mapScale;
    const mainBeachH = (MAP_HALF * 2 + 420) * mapScale;
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(mainBeachX, mainBeachY, mainBeachW, mainBeachH);

    const mainCityX = toMapX(-MAP_HALF);
    const mainCityY = toMapY(MAP_HALF);
    const mainCityW = (MAP_HALF * 2) * mapScale;
    const mainCityH = (MAP_HALF * 2) * mapScale;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(mainCityX, mainCityY, mainCityW, mainCityH);

    // Main Island River Channel
    const riverLeft = toMapX(RIVER_X - RIVER_WIDTH / 2);
    const riverW = Math.max(2, RIVER_WIDTH * mapScale);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(riverLeft, mainCityY, riverW, mainCityH);

    // Main Island City Road Network
    const roadW = Math.max(2.5, ROAD_WIDTH * mapScale);
    ctx.fillStyle = '#334155';
    for (let pos = -MAP_HALF + GRID_STEP; pos <= MAP_HALF - GRID_STEP; pos += GRID_STEP) {
        if (Math.abs(pos - RIVER_X) > RIVER_WIDTH * 0.7) {
            ctx.fillRect(toMapX(pos) - roadW / 2, mainCityY, roadW, mainCityH);
        }
        ctx.fillRect(mainCityX, toMapY(pos) - roadW / 2, mainCityW, roadW);
    }

    // River Bridges
    ctx.fillStyle = '#64748b';
    for (let bz = -MAP_HALF + GRID_STEP; bz <= MAP_HALF - GRID_STEP; bz += GRID_STEP) {
        ctx.fillRect(riverLeft - 1, toMapY(bz) - roadW / 2, riverW + 2, roadW);
    }

    // Elevated Highway Overpass
    const hwY = toMapY(HIGHWAY_Z);
    ctx.fillStyle = '#475569';
    ctx.fillRect(mainCityX + mainCityW * 0.05, hwY - 2, mainCityW * 0.9, 4);

    // 3. GRAND SEA LINK SUSPENSION BRIDGE
    const bridgeStartX = toMapX(BRIDGE_START_X);
    const bridgeEndX = toMapX(BRIDGE_END_X);
    const bridgeY = toMapY(BRIDGE_Z);
    const bridgeW = Math.max(4, BRIDGE_WIDTH * mapScale);

    ctx.fillStyle = '#475569';
    ctx.fillRect(bridgeStartX, bridgeY - bridgeW / 2, bridgeEndX - bridgeStartX, bridgeW);

    // Yellow center divider line on bridge
    ctx.fillStyle = '#facc15';
    ctx.fillRect(bridgeStartX, bridgeY - 0.75, bridgeEndX - bridgeStartX, 1.5);

    // Bridge Suspension Towers
    [BRIDGE_START_X + 750, BRIDGE_START_X + 1600].forEach(tx => {
        const bx = toMapX(tx);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(bx - 3, bridgeY - bridgeW / 2 - 4, 6, bridgeW + 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx - 1.5, bridgeY - bridgeW / 2 - 6, 3, 3);
        ctx.fillRect(bx - 1.5, bridgeY + bridgeW / 2 + 3, 3, 3);
    });

    // 4. SECOND ISLAND (PALM RESORT & MARINA ISLAND)
    const is2BeachX = toMapX(ISLAND2_CENTER_X - ISLAND2_HALF_W - 200);
    const is2BeachY = toMapY(ISLAND2_CENTER_Z + ISLAND2_HALF_D + 200);
    const is2BeachW = (ISLAND2_HALF_W * 2 + 400) * mapScale;
    const is2BeachH = (ISLAND2_HALF_D * 2 + 400) * mapScale;
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(is2BeachX, is2BeachY, is2BeachW, is2BeachH);

    const is2GroundX = toMapX(ISLAND2_CENTER_X - ISLAND2_HALF_W);
    const is2GroundY = toMapY(ISLAND2_CENTER_Z + ISLAND2_HALF_D);
    const is2GroundW = (ISLAND2_HALF_W * 2) * mapScale;
    const is2GroundH = (ISLAND2_HALF_D * 2) * mapScale;
    ctx.fillStyle = '#065f46'; // Vibrant tropical resort green
    ctx.fillRect(is2GroundX, is2GroundY, is2GroundW, is2GroundH);

    // Island 2 Road Network
    ctx.fillStyle = '#334155';
    // Central Boulevard
    const is2CenterY = toMapY(0);
    ctx.fillRect(is2GroundX, is2CenterY - roadW / 2, is2GroundW, roadW);
    // North & South Coastal Avenues
    ctx.fillRect(toMapX(ISLAND2_CENTER_X - ISLAND2_HALF_W * 0.85), toMapY(1000) - roadW / 2, is2GroundW * 0.85, roadW);
    ctx.fillRect(toMapX(ISLAND2_CENTER_X - ISLAND2_HALF_W * 0.85), toMapY(-1000) - roadW / 2, is2GroundW * 0.85, roadW);
    // Cross Roads
    [7200, 8200, 9200].forEach(rx => {
        ctx.fillRect(toMapX(rx) - roadW / 2, toMapY(1000), roadW, Math.abs(toMapY(-1000) - toMapY(1000)));
    });

    // Marina Pier extending into ocean
    ctx.fillStyle = '#475569';
    ctx.fillRect(toMapX(8200) - 2.5, toMapY(-1000), 5, Math.abs(toMapY(-1550) - toMapY(-1000)));

    // Island Labels
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('MUMBAI CITY ISLAND', mainCityX + mainCityW / 2, mainCityY + 22);

    ctx.fillStyle = '#facc15';
    ctx.fillText('BANDRA-WORLI SEA LINK', (bridgeStartX + bridgeEndX) / 2, bridgeY - 8);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('PALM RESORT & MARINA ISLAND', is2GroundX + is2GroundW / 2, is2GroundY + 22);

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

