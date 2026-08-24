import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Application State
let scene, camera, renderer, clock;
let controls;
let groundMesh = null;
let obstacles = [];
let landmarks = [];
let playerStart = { x: 0, y: -38, z: 1.7 };
let playerVelocity = new THREE.Vector3();
let isGrounded = false;
let manifest = null;

const playerHeight = 1.7;
const playerRadius = 0.8;
const gravity = 25.0;
const walkSpeed = 6.0;
const sprintSpeed = 12.0;

const keysPressed = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false
};

// Debug helpers
let debugHelpersGroup;
let collisionDebugMode = false;

// UI Elements
const statX = document.getElementById('stat-x');
const statY = document.getElementById('stat-y');
const statZ = document.getElementById('stat-z');
const statHeading = document.getElementById('stat-heading');
const statNearest = document.getElementById('stat-nearest');
const statDist = document.getElementById('stat-dist');
const statInput = document.getElementById('stat-input');
const statPointer = document.getElementById('stat-pointer');
const btnReset = document.getElementById('btn-reset');
const btnDebug = document.getElementById('btn-debug');
const instructions = document.getElementById('instructions');

// Coordinate mapping: Blender (Z=up, Y=forward) <-> Three.js (Y=up, Z=backward)
function blenderToThree(pos) {
  return new THREE.Vector3(pos.x, pos.z, -pos.y);
}

function threeToBlender(pos) {
  return new THREE.Vector3(pos.x, -pos.z, pos.y);
}

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a141e);
  scene.fog = new THREE.FogExp2(0x0a141e, 0.015);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'XPLAY first-person world viewport');
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  clock = new THREE.Clock();

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  setupInput();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 150;
  const d = 60;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(120, 12, 0x00d2ff, 0x003344);
  gridHelper.position.y = -0.05;
  scene.add(gridHelper);

  debugHelpersGroup = new THREE.Group();
  debugHelpersGroup.visible = false;
  scene.add(debugHelpersGroup);

  try {
    await loadManifest();
    await loadGLB();
  } catch (error) {
    console.error('Error loading scene assets:', error);
  }

  resetPlayer();
  window.addEventListener('resize', onWindowResize);
  animate();
}

function setupInput() {
  const handledCodes = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    'ShiftLeft', 'ShiftRight'
  ]);

  window.addEventListener('keydown', (e) => {
    if (handledCodes.has(e.code)) e.preventDefault();
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp': keysPressed.w = true; break;
      case 'KeyA':
      case 'ArrowLeft': keysPressed.a = true; break;
      case 'KeyS':
      case 'ArrowDown': keysPressed.s = true; break;
      case 'KeyD':
      case 'ArrowRight': keysPressed.d = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': keysPressed.shift = true; break;
    }
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    if (handledCodes.has(e.code)) e.preventDefault();
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp': keysPressed.w = false; break;
      case 'KeyA':
      case 'ArrowLeft': keysPressed.a = false; break;
      case 'KeyS':
      case 'ArrowDown': keysPressed.s = false; break;
      case 'KeyD':
      case 'ArrowRight': keysPressed.d = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': keysPressed.shift = false; break;
    }
  }, { passive: false });

  window.addEventListener('blur', clearMovementKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearMovementKeys();
  });

  renderer.domElement.addEventListener('click', () => {
    renderer.domElement.focus({ preventScroll: true });
    if (!controls.isLocked) controls.lock();
  });

  controls.addEventListener('lock', () => {
    updatePointerStatus();
    instructions.innerHTML = 'Mouse captured. Press Esc to release.<br>WASD to walk. Shift to sprint.';
  });

  controls.addEventListener('unlock', () => {
    updatePointerStatus();
    instructions.innerHTML = 'Click world to capture mouse.<br>WASD to walk. Shift to sprint.<br>Keyboard movement also works unlocked.';
  });

  document.addEventListener('pointerlockchange', updatePointerStatus);
  document.addEventListener('pointerlockerror', () => {
    console.warn('Pointer lock request failed. Keyboard movement remains available.');
    updatePointerStatus();
  });

  btnReset.addEventListener('click', (e) => {
    e.stopPropagation();
    resetPlayer();
    renderer.domElement.focus({ preventScroll: true });
  });

  btnDebug.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCollisionDebug();
    renderer.domElement.focus({ preventScroll: true });
  });
}

function clearMovementKeys() {
  keysPressed.w = false;
  keysPressed.a = false;
  keysPressed.s = false;
  keysPressed.d = false;
  keysPressed.shift = false;
}

function updatePointerStatus() {
  if (statPointer) statPointer.textContent = controls?.isLocked ? 'LOCKED' : 'UNLOCKED';
}

async function loadManifest() {
  const response = await fetch('assets/XPLAY_world_test_manifest.json');
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  manifest = await response.json();
  console.log('Manifest loaded:', manifest);

  if (manifest.playerStart) playerStart = manifest.playerStart;
  if (manifest.landmarks) landmarks = manifest.landmarks;
}

function loadGLB() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load('assets/XPLAY_world_test.glb', (gltf) => {
      const glbScene = gltf.scene;
      scene.add(glbScene);
      glbScene.updateMatrixWorld(true);
      console.log('GLB Loaded successfully:', glbScene);

      glbScene.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.name === 'XPLAY_GROUND') {
          groundMesh = child;
          console.log('Ground mesh mapped:', child);
        } else if (
          child.name.startsWith('XPLAY_BUILDING_') ||
          child.name === 'XPLAY_BRIDGE' ||
          child.name === 'XPLAY_TOWER'
        ) {
          child.geometry.computeBoundingBox();
          const box = child.geometry.boundingBox.clone();
          child.updateMatrixWorld(true);
          box.applyMatrix4(child.matrixWorld);
          child.userData.boundingBox = box;
          obstacles.push(child);

          const helper = new THREE.Box3Helper(box, new THREE.Color(0xff3333));
          debugHelpersGroup.add(helper);
          console.log(`Obstacle registered: ${child.name}`, box);
        }
      });

      resolve();
    }, undefined, reject);
  });
}

function resetPlayer() {
  const threePos = blenderToThree(playerStart);
  controls.getObject().position.copy(threePos);
  playerVelocity.set(0, 0, 0);
  isGrounded = true;
  camera.rotation.set(0, 0, 0);
  console.log('Player reset to spawn:', threePos);
}

function toggleCollisionDebug() {
  collisionDebugMode = !collisionDebugMode;
  debugHelpersGroup.visible = collisionDebugMode;
  console.log('Collision debug toggled:', collisionDebugMode);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const deltaTime = Math.min(clock.getDelta(), 0.1);

  // Keyboard movement is intentionally independent of pointer-lock state.
  updateMovement(deltaTime);
  updateHUD();
  renderer.render(scene, camera);
}

function updateMovement(deltaTime) {
  const speed = keysPressed.shift ? sprintSpeed : walkSpeed;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1);
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  const moveDirection = new THREE.Vector3();
  if (keysPressed.w) moveDirection.add(forward);
  if (keysPressed.s) moveDirection.addScaledVector(forward, -1);
  if (keysPressed.d) moveDirection.add(right);
  if (keysPressed.a) moveDirection.addScaledVector(right, -1);
  if (moveDirection.lengthSq() > 0) moveDirection.normalize();

  playerVelocity.y -= gravity * deltaTime;
  const currentPos = controls.getObject().position;

  if (moveDirection.x !== 0) {
    const nextX = currentPos.x + moveDirection.x * speed * deltaTime;
    if (!checkObstacleCollision(nextX, currentPos.y, currentPos.z)) currentPos.x = nextX;
  }

  if (moveDirection.z !== 0) {
    const nextZ = currentPos.z + moveDirection.z * speed * deltaTime;
    if (!checkObstacleCollision(currentPos.x, currentPos.y, nextZ)) currentPos.z = nextZ;
  }

  currentPos.y += playerVelocity.y * deltaTime;

  let groundHeight = 0;
  if (groundMesh) {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(currentPos.x, currentPos.y + 10, currentPos.z),
      new THREE.Vector3(0, -1, 0)
    );
    const intersects = raycaster.intersectObject(groundMesh, true);
    if (intersects.length > 0) groundHeight = intersects[0].point.y;
  }

  const minHeight = groundHeight + playerHeight;
  if (currentPos.y <= minHeight) {
    currentPos.y = minHeight;
    playerVelocity.y = 0;
    isGrounded = true;
  } else {
    isGrounded = false;
  }
}

function checkObstacleCollision(x, y, z) {
  for (const obs of obstacles) {
    const box = obs.userData.boundingBox;
    if (!box) continue;

    if (
      x >= box.min.x - playerRadius && x <= box.max.x + playerRadius &&
      z >= box.min.z - playerRadius && z <= box.max.z + playerRadius &&
      y - playerHeight <= box.max.y && y >= box.min.y
    ) {
      return true;
    }
  }
  return false;
}

function updateHUD() {
  const currentPos = controls.getObject().position;
  const blenderPos = threeToBlender(currentPos);

  statX.textContent = blenderPos.x.toFixed(2);
  statY.textContent = blenderPos.y.toFixed(2);
  statZ.textContent = blenderPos.z.toFixed(2);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();
  let heading = Math.atan2(dir.x, -dir.z) * (180 / Math.PI);
  if (heading < 0) heading += 360;
  statHeading.textContent = Math.round(heading);

  let nearest = null;
  let minDist = Infinity;
  landmarks.forEach((lm) => {
    const dx = blenderPos.x - lm.x;
    const dy = blenderPos.y - lm.y;
    const dz = blenderPos.z - lm.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < minDist) {
      minDist = dist;
      nearest = lm;
    }
  });

  if (nearest) {
    statNearest.textContent = nearest.objectName;
    statDist.textContent = minDist.toFixed(2);
  } else {
    statNearest.textContent = 'None';
    statDist.textContent = '0.00';
  }

  if (statInput) {
    const active = [];
    if (keysPressed.w) active.push('W');
    if (keysPressed.a) active.push('A');
    if (keysPressed.s) active.push('S');
    if (keysPressed.d) active.push('D');
    if (keysPressed.shift) active.push('SHIFT');
    statInput.textContent = active.length ? active.join(' ') : 'NONE';
  }

  updatePointerStatus();
}

init();
