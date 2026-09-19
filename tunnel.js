import * as THREE from 'three';

const canvas = document.querySelector('#tunnel-canvas');
const progressBar = document.querySelector('#progress-bar');
const navDots = document.querySelectorAll('.nav-dot');
const actSections = document.querySelectorAll('.act');
const floatTexts = document.querySelectorAll('.float-text');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060213, 0.016);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x060213);
scene.add(camera);

const world = new THREE.Group();
scene.add(world);

const hemi = new THREE.HemisphereLight(0xb066ff, 0x120b2e, 3.2);
scene.add(hemi);
const pulseLight = new THREE.PointLight(0x5ef4ff, 9, 46, 2);
pulseLight.position.set(0, 0, 3);
scene.add(pulseLight);
const magentaLight = new THREE.PointLight(0xff5cc0, 7.5, 42, 2);
magentaLight.position.set(0, 0, -14);
scene.add(magentaLight);
const goldLight = new THREE.PointLight(0xffe14d, 4.5, 50, 2);
goldLight.position.set(0, 0, -30);
scene.add(goldLight);

const TUNNEL_RADIUS = 9.7;
const RING_COUNT = 46;
const RING_SPACING = 5.4;
const TUNNEL_LENGTH = RING_COUNT * RING_SPACING;
const TUNNEL_BEND_AMOUNT = 2.3;
const TUNNEL_BEND_FREQ = 0.05;

function tunnelBendOffset(z) {
  return {
    x: Math.sin(z * TUNNEL_BEND_FREQ) * TUNNEL_BEND_AMOUNT,
    y: Math.cos(z * TUNNEL_BEND_FREQ * 0.7) * TUNNEL_BEND_AMOUNT * 0.6,
  };
}

const tunnelRings = [];
const stars = [];
const sparks = [];

const HUES = [265, 185, 325, 40, 150].map((h) => h / 360);

function makeTunnel() {
  const geometry = new THREE.TorusGeometry(TUNNEL_RADIUS, 0.1, 8, 48);
  for (let i = 0; i < RING_COUNT; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x5ef4ff,
      transparent: true,
      opacity: 0.38
    });
    const ring = new THREE.Mesh(geometry, material);
    const z = -i * RING_SPACING;
    const bend = tunnelBendOffset(z);
    ring.position.set(bend.x, bend.y, z);
    ring.rotation.z = i * 0.28;
    ring.userData.phase = i * 0.73;
    ring.userData.baseZ = z;
    tunnelRings.push(ring);
    world.add(ring);
  }
}

function makeStars() {
  const geometry = new THREE.SphereGeometry(0.03, 5, 5);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 320; i += 1) {
    const star = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 14;
    star.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -Math.random() * TUNNEL_LENGTH);
    stars.push(star);
    world.add(star);
  }
}

function makeSparks() {
  const sparkColors = [0x5ef4ff, 0xff5cc0, 0xffe14d, 0xffffff];
  for (let i = 0; i < 160; i += 1) {
    const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
    const size = 0.02 + Math.random() * 0.05;
    const geometry = new THREE.SphereGeometry(size, 5, 5);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const spark = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * TUNNEL_RADIUS * 0.9;
    spark.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -Math.random() * TUNNEL_LENGTH);
    spark.userData.speed = 6 + Math.random() * 14;
    spark.userData.twinklePhase = Math.random() * 10;
    sparks.push(spark);
    world.add(spark);
  }
}

makeTunnel();
makeStars();
makeSparks();

let scrollProgress = 0;
let smoothProgress = 0;
let mouseX = 0;
let mouseY = 0;
let smoothMouseX = 0;
let smoothMouseY = 0;
let currentHue = HUES[0];
let targetHue = HUES[0];
let lastTime = performance.now();

function getDocScrollProgress() {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const max = doc.scrollHeight - window.innerHeight;
  return max > 0 ? scrollTop / max : 0;
}

function updateFloatTexts() {
  const viewportH = window.innerHeight;
  floatTexts.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const inView = center > viewportH * 0.06 && center < viewportH * 0.94;
    const passedUp = center <= viewportH * 0.06;
    el.classList.toggle('in-view', inView);
    el.classList.toggle('passed', passedUp && !inView);
  });
}

function updateActiveSection() {
  let activeIndex = 0;
  let minDist = Infinity;
  const viewportCenter = window.scrollY + window.innerHeight / 2;
  actSections.forEach((section, i) => {
    const rect = section.getBoundingClientRect();
    const sectionCenter = window.scrollY + rect.top + rect.height / 2;
    const dist = Math.abs(viewportCenter - sectionCenter);
    if (dist < minDist) { minDist = dist; activeIndex = i; }
  });
  navDots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
  targetHue = HUES[activeIndex] ?? HUES[0];
}

function onScroll() {
  scrollProgress = getDocScrollProgress();
  progressBar.style.width = `${scrollProgress * 100}%`;
  updateActiveSection();
  updateFloatTexts();
}

window.addEventListener('scroll', onScroll, { passive: true });

window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateFloatTexts();
});

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
  lastTime = time;

  smoothProgress = THREE.MathUtils.damp(smoothProgress, scrollProgress, 4, dt);
  smoothMouseX = THREE.MathUtils.damp(smoothMouseX, mouseX, 5, dt);
  smoothMouseY = THREE.MathUtils.damp(smoothMouseY, mouseY, 5, dt);
  currentHue = THREE.MathUtils.damp(currentHue, targetHue, 2.4, dt);

  const cameraZ = -smoothProgress * (TUNNEL_LENGTH - 20);
  const bend = tunnelBendOffset(cameraZ);

  camera.position.x = bend.x * 0.6 + smoothMouseX * 0.7;
  camera.position.y = bend.y * 0.6 - smoothMouseY * 0.5;
  camera.position.z = cameraZ + 6;
  camera.lookAt(bend.x, bend.y, cameraZ - 20);

  for (const ring of tunnelRings) {
    const localZ = ring.userData.baseZ;
    const b = tunnelBendOffset(localZ);
    ring.position.x = b.x;
    ring.position.y = b.y;
    ring.rotation.z += dt * (0.2 + Math.sin(time * 0.0006 + ring.userData.phase) * 0.06);
    ring.scale.setScalar(1 + Math.sin(time * 0.0009 + ring.userData.phase) * 0.05);
    ring.material.color.setHSL(currentHue, 0.95, 0.68);
  }

  for (const star of stars) {
    star.material.opacity = 0.55 + Math.sin(time * 0.0012 + star.position.x) * 0.35;
  }

  for (const spark of sparks) {
    spark.position.z += spark.userData.speed * dt;
    if (spark.position.z > cameraZ + 8) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * TUNNEL_RADIUS * 0.9;
      spark.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, cameraZ - TUNNEL_LENGTH * 0.8);
    }
    const twinkle = 0.55 + Math.sin(time * 0.006 + spark.userData.twinklePhase) * 0.45;
    spark.material.opacity = Math.max(0, twinkle);
    spark.scale.setScalar(0.8 + twinkle * 0.6);
  }

  pulseLight.color.setHSL(currentHue, 1, 0.66);
  magentaLight.color.setHSL((currentHue + 0.12) % 1, 0.95, 0.6);
  goldLight.color.setHSL((currentHue + 0.22) % 1, 0.9, 0.6);
  pulseLight.position.z = cameraZ + 3;
  magentaLight.position.z = cameraZ - 10;
  goldLight.position.z = cameraZ - 26;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateActiveSection();
updateFloatTexts();
progressBar.style.width = `${getDocScrollProgress() * 100}%`;
requestAnimationFrame(animate);
