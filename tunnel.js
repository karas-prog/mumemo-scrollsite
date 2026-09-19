import * as THREE from 'three';

const canvas = document.querySelector('#tunnel-canvas');
const progressBar = document.querySelector('#progress-bar');
const navDots = document.querySelectorAll('.nav-dot');
const actSections = document.querySelectorAll('.act');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05030a, 0.02);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 160);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05030a);
scene.add(camera);

const world = new THREE.Group();
scene.add(world);

const hemi = new THREE.HemisphereLight(0xa855f7, 0x06162f, 2.1);
scene.add(hemi);
const pulseLight = new THREE.PointLight(0x46e6ff, 6, 40, 2);
pulseLight.position.set(0, 0, 3);
scene.add(pulseLight);
const magentaLight = new THREE.PointLight(0xff4fa3, 4.5, 36, 2);
magentaLight.position.set(0, 0, -14);
scene.add(magentaLight);

const TUNNEL_RADIUS = 9.7;
const RING_COUNT = 42;
const RING_SPACING = 5.4;
const TUNNEL_LENGTH = RING_COUNT * RING_SPACING;
const TUNNEL_BEND_AMOUNT = 2.1;
const TUNNEL_BEND_FREQ = 0.05;

function tunnelBendOffset(z) {
  return {
    x: Math.sin(z * TUNNEL_BEND_FREQ) * TUNNEL_BEND_AMOUNT,
    y: Math.cos(z * TUNNEL_BEND_FREQ * 0.7) * TUNNEL_BEND_AMOUNT * 0.6,
  };
}

const tunnelRings = [];
const stars = [];

const HUES = [265, 185, 325, 40, 150].map((h) => h / 360);

function makeTunnel() {
  const geometry = new THREE.TorusGeometry(TUNNEL_RADIUS, 0.08, 8, 48);
  for (let i = 0; i < RING_COUNT; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x46e6ff,
      transparent: true,
      opacity: 0.22
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
  const geometry = new THREE.SphereGeometry(0.026, 5, 5);
  const material = new THREE.MeshBasicMaterial({ color: 0xd9f7ff, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 260; i += 1) {
    const star = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 13;
    star.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -Math.random() * TUNNEL_LENGTH);
    stars.push(star);
    world.add(star);
  }
}

makeTunnel();
makeStars();

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

function updateActiveSection() {
  let activeIndex = 0;
  let minDist = Infinity;
  const viewportCenter = window.scrollY + window.innerHeight / 2;
  actSections.forEach((section, i) => {
    const rect = section.getBoundingClientRect();
    const sectionCenter = window.scrollY + rect.top + rect.height / 2;
    const dist = Math.abs(viewportCenter - sectionCenter);
    if (dist < minDist) { minDist = dist; activeIndex = i; }
    const inView = rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25;
    const card = section.querySelector('.glass-card');
    if (card) card.classList.toggle('in-view', inView);
  });
  navDots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
  targetHue = HUES[activeIndex] ?? HUES[0];
}

window.addEventListener('scroll', () => {
  scrollProgress = getDocScrollProgress();
  progressBar.style.width = `${scrollProgress * 100}%`;
  updateActiveSection();
}, { passive: true });

window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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

  camera.position.x = bend.x * 0.6 + smoothMouseX * 0.6;
  camera.position.y = bend.y * 0.6 - smoothMouseY * 0.4;
  camera.position.z = cameraZ + 6;
  camera.lookAt(bend.x, bend.y, cameraZ - 20);

  for (const ring of tunnelRings) {
    const localZ = ring.userData.baseZ;
    const b = tunnelBendOffset(localZ);
    ring.position.x = b.x;
    ring.position.y = b.y;
    ring.rotation.z += dt * (0.18 + Math.sin(time * 0.0006 + ring.userData.phase) * 0.05);
    ring.scale.setScalar(1 + Math.sin(time * 0.0009 + ring.userData.phase) * 0.04);
    ring.material.color.setHSL(currentHue, 0.85, 0.6);
  }

  for (const star of stars) {
    star.material.opacity = 0.5 + Math.sin(time * 0.001 + star.position.x) * 0.2;
  }

  pulseLight.color.setHSL(currentHue, 0.9, 0.62);
  magentaLight.color.setHSL((currentHue + 0.12) % 1, 0.85, 0.55);
  pulseLight.position.z = cameraZ + 3;
  magentaLight.position.z = cameraZ - 10;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateActiveSection();
progressBar.style.width = `${getDocScrollProgress() * 100}%`;
requestAnimationFrame(animate);
