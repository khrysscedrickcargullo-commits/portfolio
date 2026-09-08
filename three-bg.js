/* =========================================================
   three-bg.js — Hero background, built with Three.js r128
   (global THREE)

   Two completely separate scenes:
   - DARK  → "Vibranium Core": wireframe icosahedra, containment
             rings, and a starfield/constellation of particles.
   - LIGHT → "Quartz Shard Field": solid low-poly crystal shards
             drifting over a gently rippling wireframe terrain,
             lit with real lights. No orbs, no rings, no stars,
             no particles, no bubbles — a different material
             language entirely, built for a bright surface.

   The active scene is picked from the page's [data-theme]
   attribute and re-picked live on the custom "themechange"
   event dispatched by script.js.
   ========================================================= */

(function () {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas || typeof THREE === "undefined") return;

  const heroSection = document.getElementById("home");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = heroSection.clientWidth;
  let height = heroSection.clientHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  /* ---------- Shared pointer state (both scenes drift the camera with it) ---------- */
  const mouse = { x: 0, y: 0 };
  const targetRotation = { x: 0, y: 0 };

  function onPointerMove(e) {
    const rect = heroSection.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = ((clientY - rect.top) / rect.height) * 2 - 1;
    targetRotation.y = mouse.x * 0.4;
    targetRotation.x = mouse.y * 0.25;
  }
  window.addEventListener("mousemove", onPointerMove, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });

  /* =========================================================
     DARK SCENE — "Vibranium Core"
     (wireframe icosahedra + containment rings + particle field)
     ========================================================= */
  function buildDarkScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050a, 0.05);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 0, 26);

    const coreGeo = new THREE.IcosahedronGeometry(6.4, 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x9b30ff, wireframe: true, transparent: true, opacity: 0.85 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    const coreMidGeo = new THREE.IcosahedronGeometry(5.5, 1);
    const coreMidMat = new THREE.MeshBasicMaterial({ color: 0xb266ff, wireframe: true, transparent: true, opacity: 0.4 });
    const coreMid = new THREE.Mesh(coreMidGeo, coreMidMat);
    scene.add(coreMid);

    const coreInnerGeo = new THREE.IcosahedronGeometry(4.6, 0);
    const coreInnerMat = new THREE.MeshBasicMaterial({ color: 0xc77dff, wireframe: true, transparent: true, opacity: 0.6 });
    const coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
    scene.add(coreInner);

    const ringGroup = new THREE.Group();
    const ring1Geo = new THREE.TorusGeometry(9.5, 0.035, 8, 96);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0xc77dff, transparent: true, opacity: 0.55 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.4;
    ringGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(11.2, 0.03, 8, 96);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x9b30ff, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 1.7;
    ring2.rotation.y = Math.PI / 5;
    ringGroup.add(ring2);
    scene.add(ringGroup);

    const PARTICLE_COUNT = 1400;
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 10 + Math.random() * 34;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi) * 0.6 - 6;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xc77dff, size: 0.15, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const linePositions = [];
    const maxConnections = 340;
    const connectThresholdSq = 10.5;
    const neighborWindow = 26;
    let connCount = 0;
    for (let i = 0; i < PARTICLE_COUNT && connCount < maxConnections; i++) {
      for (let j = i + 1; j < Math.min(i + neighborWindow, PARTICLE_COUNT) && connCount < maxConnections; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < connectThresholdSq) {
          linePositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
          connCount++;
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9b30ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending });
    const constellation = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(constellation);

    const dustCount = 320;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 60;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 36;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    const emberCount = 40;
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = (Math.random() - 0.5) * 50;
      emberPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({ color: 0xe0b4ff, size: 0.32, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);

    const ambient = new THREE.AmbientLight(0x9b30ff, 0.6);
    scene.add(ambient);

    function update(t) {
      core.rotation.y = t * 0.12 + targetRotation.y;
      core.rotation.x = t * 0.06 + targetRotation.x;
      coreMid.rotation.y = -t * 0.15 + targetRotation.y * 0.6;
      coreMid.rotation.x = t * 0.1 + targetRotation.x * 0.6;
      coreInner.rotation.y = -t * 0.18;
      coreInner.rotation.x = t * 0.09;

      ringGroup.rotation.y = t * 0.05;
      ring1.rotation.z = t * 0.08;
      ring2.rotation.z = -t * 0.06;

      particles.rotation.y = t * 0.02;
      constellation.rotation.y = t * 0.02;
      dust.rotation.y = -t * 0.008;
      embers.rotation.y = t * 0.012;

      const pulse = 1 + Math.sin(t * 1.4) * 0.03;
      core.scale.set(pulse, pulse, pulse);
      const ringPulse = 1 + Math.sin(t * 1.1 + 1) * 0.04;
      ringGroup.scale.set(ringPulse, ringPulse, ringPulse);

      camera.position.x += (mouse.x * 2 - camera.position.x) * 0.02;
      camera.position.y += (-mouse.y * 1.2 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);
    }

    function onResize() {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    return { scene, camera, update, onResize };
  }

  /* =========================================================
     LIGHT SCENE — "Quartz Shard Field"
     Solid, faceted crystal shards (tetrahedra + slim prisms)
     tumbling slowly above a rippling wireframe terrain.
     Deliberately has no spheres, rings, or particle points —
     a completely different material language from the dark scene.
     ========================================================= */
  function buildLightScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf7f5fb, 18, 52);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 25);

    // ---- Lighting: soft ambient fill + a directional key light for facet shading ----
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(8, 12, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9b30ff, 0.45);
    rim.position.set(-10, -4, -6);
    scene.add(rim);

    // ---- Rippling wireframe terrain (a plane of flowing lines, not a particle field) ----
    const terrainWidth = 60;
    const terrainDepth = 40;
    const segX = 40;
    const segZ = 26;
    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segX, segZ);
    terrainGeo.rotateX(-Math.PI / 2.35);
    terrainGeo.translate(0, -6, -6);
    const basePositions = terrainGeo.attributes.position.array.slice();
    const terrainMat = new THREE.MeshBasicMaterial({
      color: 0x9b30ff, wireframe: true, transparent: true, opacity: 0.22,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrain);

    // ---- Floating crystal shards: angular, flat-shaded solids ----
    const shardPalette = [0xffffff, 0xf1e7ff, 0xd9b8ff, 0x9b30ff, 0x7a1fd6];
    const shardGroup = new THREE.Group();
    const shards = [];
    const SHARD_COUNT = 11;

    for (let i = 0; i < SHARD_COUNT; i++) {
      const isPrism = i % 3 === 0;
      let geo;
      if (isPrism) {
        const size = 0.5 + Math.random() * 0.6;
        geo = new THREE.BoxGeometry(size * 0.55, size * 2.4, size * 0.55);
      } else {
        const size = 0.9 + Math.random() * 0.9;
        geo = new THREE.TetrahedronGeometry(size, 0);
      }

      const color = shardPalette[Math.floor(Math.random() * shardPalette.length)];
      const mat = new THREE.MeshStandardMaterial({
        color, roughness: 0.32, metalness: 0.18, flatShading: true,
        transparent: true, opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 11 + 1,
        (Math.random() - 0.5) * 14 - 2
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      shardGroup.add(mesh);

      shards.push({
        mesh,
        rotSpeed: {
          x: (Math.random() - 0.5) * 0.25,
          y: (Math.random() - 0.5) * 0.25,
          z: (Math.random() - 0.5) * 0.15,
        },
        bobSpeed: 0.4 + Math.random() * 0.5,
        bobAmount: 0.5 + Math.random() * 0.6,
        bobOffset: Math.random() * Math.PI * 2,
        baseY: mesh.position.y,
      });
    }
    scene.add(shardGroup);

    function update(t) {
      // gently ripple the terrain's vertices
      const posAttr = terrain.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = basePositions[i];
        const z = basePositions[i + 2];
        arr[i + 1] = basePositions[i + 1] + Math.sin(x * 0.18 + t * 0.6) * 0.55 + Math.cos(z * 0.22 + t * 0.5) * 0.4;
      }
      posAttr.needsUpdate = true;
      terrain.rotation.z = Math.sin(t * 0.05) * 0.02;

      shards.forEach((s) => {
        s.mesh.rotation.x += s.rotSpeed.x * 0.01;
        s.mesh.rotation.y += s.rotSpeed.y * 0.01;
        s.mesh.rotation.z += s.rotSpeed.z * 0.01;
        s.mesh.position.y = s.baseY + Math.sin(t * s.bobSpeed + s.bobOffset) * s.bobAmount;
      });

      shardGroup.rotation.y = t * 0.015 + targetRotation.y * 0.4;

      camera.position.x += (mouse.x * 2.4 - camera.position.x) * 0.02;
      camera.position.y += (1.5 - mouse.y * 1.1 - camera.position.y) * 0.02;
      camera.lookAt(0, -1, -4);
    }

    function onResize() {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    return { scene, camera, update, onResize };
  }

  const dark = buildDarkScene();
  const light = buildLightScene();

  function onResize() {
    width = heroSection.clientWidth;
    height = heroSection.clientHeight;
    renderer.setSize(width, height);
    dark.onResize();
    light.onResize();
  }
  window.addEventListener("resize", onResize);

  function isLightTheme() {
    return document.documentElement.getAttribute("data-theme") === "light";
  }

  const clock = new THREE.Clock();

  function renderOnce() {
    const active = isLightTheme() ? light : dark;
    renderer.render(active.scene, active.camera);
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const active = isLightTheme() ? light : dark;
    active.update(t);
    renderer.render(active.scene, active.camera);
  }

  if (!reducedMotion) {
    animate();
  } else {
    renderOnce();
    // Still respond to theme changes even with motion reduced
    document.addEventListener("themechange", renderOnce);
  }

  // Redraw immediately on toggle even while the loop is running,
  // so switching themes never waits a frame to feel responsive.
  document.addEventListener("themechange", renderOnce);
})();