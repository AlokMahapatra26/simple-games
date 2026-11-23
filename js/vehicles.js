// ========================================================
// Mumbai Island Taxi Sim 3D - 3D Vehicles & Human Meshes
// ========================================================

// 1. Humanoid Driver / Pedestrian Mesh Builder
function createHumanMesh(shirtColor = 0xfacc15, pantsColor = 0x1e293b) {
    const group = new THREE.Group();

    // Torso
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 3.0, 1.2),
        new THREE.MeshLambertMaterial({ color: shirtColor })
    );
    torso.position.y = 4.6;
    group.add(torso);

    // Head with front face texture
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd99b66 });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x1e1b18 });
    const faceMat = new THREE.MeshLambertMaterial({ map: sharedDriverFaceTex });
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 1.75, 1.65),
        [skinMat, skinMat, hairMat, skinMat, faceMat, hairMat]
    );
    head.position.y = 7.1;
    group.add(head);

    // Left & Right Legs
    const legGeo = new THREE.BoxGeometry(0.95, 3.1, 1.0);
    const legMat = new THREE.MeshLambertMaterial({ color: pantsColor });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.6, 1.55, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.6, 1.55, 0);
    group.add(rightLeg);

    // Left & Right Arms
    const armGeo = new THREE.BoxGeometry(0.75, 2.7, 0.85);
    const armMat = new THREE.MeshLambertMaterial({ color: shirtColor });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-1.6, 4.6, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(1.6, 4.6, 0);
    group.add(rightArm);

    group.userData = { leftLeg, rightLeg, leftArm, rightArm };
    return group;
}

// 2. Sculpted Fastback Sedan / Taxi Mesh Builder
function createCarMesh(bodyColor, isTaxi = false) {
    const carGroup = new THREE.Group();

    // 1. Baked Contact Shadow under car
    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(14.5, 25.5),
        new THREE.MeshBasicMaterial({
            map: sharedContactShadowTex,
            transparent: true,
            depthWrite: false
        })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.25;
    carGroup.add(shadowPlane);

    // 2. Sculpted Fastback Sedan Silhouette (ExtrudeGeometry along X, centered)
    const shape = new THREE.Shape();
    shape.moveTo(-10.4, 1.5);
    shape.lineTo(-10.4, 3.8);  // Front bumper
    shape.lineTo(-9.7, 4.5);   // Hood front
    shape.lineTo(-5.0, 4.9);   // Windshield base
    shape.lineTo(-2.4, 7.6);   // Roof front
    shape.lineTo(3.4, 7.6);    // Roof rear
    shape.lineTo(7.4, 5.1);    // Fastback rear deck
    shape.lineTo(10.2, 4.7);   // Trunk lip
    shape.lineTo(10.5, 2.0);   // Rear bumper
    shape.lineTo(7.8, 1.5);
    shape.absarc(6.0, 1.5, 1.9, 0, Math.PI, false);  // Rear wheel arch
    shape.lineTo(-4.1, 1.5);
    shape.absarc(-6.0, 1.5, 1.9, 0, Math.PI, false); // Front wheel arch
    shape.lineTo(-10.4, 1.5);

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 7.4,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.45,
        bevelThickness: 0.55
    });
    extrudeGeo.center();
    // Rotate so -X becomes +Z (forward)
    extrudeGeo.rotateY(Math.PI / 2);

    // Normalize side UVs cleanly so taxi livery doesn't stretch
    const posAttr = extrudeGeo.attributes.position;
    const uvAttr = extrudeGeo.attributes.uv;
    for (let i = 0; i < posAttr.count; i++) {
        const z = posAttr.getZ(i);
        const y = posAttr.getY(i);
        const u = (z + 11.0) / 22.0;
        const v = (y + 3.5) / 7.5;
        uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;

    const bodyMat = new THREE.MeshPhysicalMaterial({
        color: isTaxi ? 0xffffff : bodyColor,
        map: isTaxi ? sharedTaxiSideTex : sharedTrafficSideTex,
        metalness: 0.25,
        roughness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        envMap: sharedEnvCube,
        envMapIntensity: 0.85
    });

    const bodyMesh = new THREE.Mesh(extrudeGeo, bodyMat);
    bodyMesh.position.y = 4.45;
    carGroup.add(bodyMesh);

    // 3. Front & Rear Fascia Face Plates
    const frontPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(7.8, 3.0),
        new THREE.MeshLambertMaterial({ map: sharedFrontFaceTex })
    );
    frontPlate.position.set(0, 3.1, 10.96);
    carGroup.add(frontPlate);

    const rearPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(7.8, 3.1),
        new THREE.MeshLambertMaterial({ map: sharedRearFaceTex })
    );
    rearPlate.rotation.y = Math.PI;
    rearPlate.position.set(0, 3.3, -10.96);
    carGroup.add(rearPlate);

    // 4. Glossy Glass Windows
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        emissive: 0x0284c7,
        emissiveIntensity: 0.08,
        metalness: 0.1,
        roughness: 0.08,
        transparent: true,
        opacity: 0.15,
        envMap: sharedEnvCube,
        envMapIntensity: 0.6,
        envMapIntensity: 1.4,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    // Front Windshield
    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 3.85), glassMat);
    frontGlass.rotation.order = 'YXZ';
    frontGlass.rotation.x = -0.82;
    frontGlass.position.set(0, 6.45, 3.95);
    carGroup.add(frontGlass);

    // Rear Back Window
    const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.65), glassMat);
    rearGlass.rotation.order = 'YXZ';
    rearGlass.rotation.y = Math.PI;
    rearGlass.rotation.x = -1.03;
    rearGlass.position.set(0, 6.52, -5.55);
    carGroup.add(rearGlass);

    // Left & Right Side Windows
    [-4.32, 4.32].forEach((sideX) => {
        const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 2.15), glassMat);
        sideWin.rotation.y = sideX > 0 ? Math.PI / 2 : -Math.PI / 2;
        sideWin.position.set(sideX, 6.32, -0.5);
        carGroup.add(sideWin);

        // Dark B-Pillar divider
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 2.25, 0.45),
            new THREE.MeshBasicMaterial({ color: 0x09090b })
        );
        pillar.position.set(sideX, 6.32, -0.35);
        carGroup.add(pillar);

        // Side Mirror
        const mirror = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.55, 0.65),
            new THREE.MeshLambertMaterial({ color: isTaxi ? 0xfacc15 : bodyColor })
        );
        mirror.position.set(sideX * 1.12, 5.25, 3.3);
        carGroup.add(mirror);
    });

    // 5. Glowing TAXI Roof Sign
    if (isTaxi) {
        const signMat = new THREE.MeshBasicMaterial({ map: sharedTaxiSignTex });
        const roofSign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 1.35), signMat);
        roofSign.position.set(0, 8.35, -0.2);
        carGroup.add(roofSign);
    }

    // 6. 4 Wheels with Alloy Rims & Front Steering Pivots
    const wheels = [];
    const frontPivots = [];
    const tireGeo = new THREE.CylinderGeometry(1.75, 1.75, 1.25, 18);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(1.05, 1.05, 1.3, 12);
    rimGeo.rotateZ(Math.PI / 2);

    const tireMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });

    const wheelPositions = [
        { x: -3.95, z: 6.0, front: true },
        { x: 3.95, z: 6.0, front: true },
        { x: -3.95, z: -6.0, front: false },
        { x: 3.95, z: -6.0, front: false }
    ];

    wheelPositions.forEach((wp) => {
        const pivot = new THREE.Group();
        pivot.position.set(wp.x, 1.75, wp.z);
        const wheelGrp = new THREE.Group();
        wheelGrp.add(new THREE.Mesh(tireGeo, tireMat));
        wheelGrp.add(new THREE.Mesh(rimGeo, rimMat));
        pivot.add(wheelGrp);
        carGroup.add(pivot);
        wheels.push(wheelGrp);
        if (wp.front) frontPivots.push(pivot);
    });

    // 7. Cockpit Interior (Dashboard, Scaled Steering Wheel, Mumbai Taxi Meter, Seats, Rearview Mirror)
    const interiorGroup = new THREE.Group();

    // Soft warm interior cabin dome light (illuminates dashboard and steering wheel)
    const cabinLight = new THREE.PointLight(0xfff7ed, 0.7, 12);
    cabinLight.position.set(0, 6.5, 1.5);
    interiorGroup.add(cabinLight);

    // Dashboard Console Base (Matte dark charcoal)
    const dashMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const dashMesh = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 1.0, 2.2),
        dashMat
    );
    dashMesh.position.set(0, 4.2, 3.6);
    interiorGroup.add(dashMesh);

    // Dashboard Top Lip
    const dashLip = new THREE.Mesh(
        new THREE.BoxGeometry(7.3, 0.2, 0.9),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    dashLip.position.set(0, 4.7, 3.8);
    interiorGroup.add(dashLip);

    // Instrument Cluster Hood (over steering column on the right side - RHD)
    const clusterHood = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.5, 1.1),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    clusterHood.position.set(1.5, 4.85, 3.5);
    interiorGroup.add(clusterHood);

    // Backlit Speedo / Tacho dial plate
    const dialPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.45),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    dialPlate.position.set(1.5, 4.75, 2.94);
    interiorGroup.add(dialPlate);

    // Iconic Mumbai Taxi Fare Meter (Mechanical / Digital Fare Box)
    const meterBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.5, 0.45),
        new THREE.MeshLambertMaterial({ color: 0xb45309 }) // Classic amber taxi meter box
    );
    meterBox.position.set(0.0, 4.95, 3.5);
    interiorGroup.add(meterBox);

    const meterScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.28),
        new THREE.MeshBasicMaterial({ color: 0x22c55e }) // Glowing green LED fare display
    );
    meterScreen.position.set(0.0, 4.95, 3.26);
    interiorGroup.add(meterScreen);

    // Center Console & Radio
    const radioMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 0.35),
        new THREE.MeshLambertMaterial({ color: 0x3f3f46 })
    );
    radioMesh.position.set(0.0, 4.1, 3.5);
    interiorGroup.add(radioMesh);

    // Windshield Wipers at base of windshield
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    [0.5, 2.2].forEach((wx) => {
        const wiper = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.07), wiperMat);
        wiper.position.set(wx, 5.25, 4.2);
        wiper.rotation.z = -0.15;
        wiper.rotation.x = -0.82;
        interiorGroup.add(wiper);
    });

    // Steering Column & Compact Rotating Steering Wheel
    const steerCol = new THREE.Group();
    steerCol.position.set(1.5, 4.45, 2.45);
    steerCol.rotation.x = -0.38; // tilted back towards driver

    // Column stalk
    const colShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.20, 1.1, 12),
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    colShaft.rotation.x = Math.PI / 2;
    colShaft.position.z = 0.45;
    steerCol.add(colShaft);

    // Indicator stalk
    const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8),
        new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    stalk.rotation.z = Math.PI / 2.3;
    stalk.position.set(-0.25, 0, 0.18);
    steerCol.add(stalk);

    // Dynamic Rotating Steering Wheel Group
    const steerWheel = new THREE.Group();

    // Outer Rim (Torus - cleanly proportioned)
    const steerRimMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.38,
        metalness: 0.15
    });
    const wheelRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.055, 12, 32),
        steerRimMat
    );
    steerWheel.add(wheelRim);

    // Center Hub
    const hubMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.20, 0.10, 16),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 })
    );
    hubMesh.rotation.x = Math.PI / 2;
    steerWheel.add(hubMesh);

    // Center Horn Emblem (Taxi Logo / Gold horn button)
    const hornButton = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 16),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    hornButton.position.z = 0.06;
    steerWheel.add(hornButton);

    // Metallic Spokes (3 Spokes: Left, Right, Bottom)
    const spokeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.85,
        roughness: 0.2
    });
    const spokeLR = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.08, 0.05), spokeMat);
    steerWheel.add(spokeLR);
    const spokeBottom = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.50, 0.05), spokeMat);
    spokeBottom.position.y = -0.26;
    steerWheel.add(spokeBottom);

    steerCol.add(steerWheel);
    interiorGroup.add(steerCol);

    // Rearview Mirror (mounted from windshield roof)
    const mirrorStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8),
        new THREE.MeshLambertMaterial({ color: 0x334155 })
    );
    mirrorStem.position.set(0, 7.35, 3.3);
    interiorGroup.add(mirrorStem);

    const interiorMirror = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.45, 0.18),
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    interiorMirror.position.set(0, 7.12, 3.3);
    const mirrorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.36),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    mirrorGlass.rotation.y = Math.PI;
    mirrorGlass.position.set(0, 0, -0.1);
    interiorMirror.add(mirrorGlass);
    interiorGroup.add(interiorMirror);

    // Front Seats
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x27272a });
    [-1.75, 1.75].forEach((sx) => {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 2.4), seatMat);
        cushion.position.set(sx, 3.4, 0.6);
        interiorGroup.add(cushion);

        const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.6), seatMat);
        backrest.position.set(sx, 4.8, -0.6);
        backrest.rotation.x = -0.12;
        interiorGroup.add(backrest);

        const headrest = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.4), seatMat);
        headrest.position.set(sx, 6.4, -0.8);
        interiorGroup.add(headrest);
    });

    carGroup.add(interiorGroup);

    return {
        mesh: carGroup,
        wheels,
        frontPivots,
        steeringWheel: steerWheel,
        interiorGroup,
        x: 0,
        z: 0,
        heading: 0,
        speed: 0,
        steerAngle: 0,
        isTaxi,
        aiDir: 1,
        aiAxis: 'z'
    };
}


