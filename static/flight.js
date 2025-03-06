import * as THREE from 'three';

// --------------------
// Setup Scene, Camera, Renderer
// --------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --------------------
// Handle Window Resize for Fullscreen
// --------------------
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------
// Lighting
// --------------------
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

// --------------------
// Create the Aircraft (Simple Cube)
// --------------------
const planeGeometry = new THREE.BoxGeometry(1, 1, 1);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);

// The plane starts far away from the rings.
plane.position.set(0, 0, 500);
camera.position.set(0, 2, 510);

// --------------------
// Create Rings (Spaced 150ft apart)
// --------------------
const rings = [];
const numRings = 10;
const ringSpacing = 150; // 150ft apart
const ringMajorRadius = 8; // Major radius of the torus
const ringTubeRadius = 0.7; // Tube radius of the torus
// For collision/scoring:
const innerRadius = ringMajorRadius - ringTubeRadius; // Safe zone
const outerRadius = ringMajorRadius + ringTubeRadius; // Collision zone

const level1Altitude = 0;
const level2Altitude = 6;

for (let i = 0; i < numRings; i++) {
  const ringGeometry = new THREE.TorusGeometry(ringMajorRadius, ringTubeRadius, 16, 100);
  // Make the ring solid (no wireframe)
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: false });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  
  // Alternate altitude and position rings ahead (offset by 300ft)
  const altitude = i % 2 === 0 ? level1Altitude : level2Altitude;
  ring.position.set(0, altitude, -i * ringSpacing + 300);
  ring.checked = false; // Custom property to mark if processed
  scene.add(ring);
  rings.push(ring);
}

// --------------------
// Game Variables & Controller Setup
// --------------------
let gameStarted = false;
let crashed = false;
let score = 0;
const speed = 100 / 60; // 100ft/sec (per-frame movement)
let pitch = 0; // from controller input

let gamepadIndex = null;
window.addEventListener("gamepadconnected", (event) => {
  console.log("Gamepad connected:", event.gamepad);
  gamepadIndex = event.gamepad.index;
  // Start the game on controller button press if not started
  if (!gameStarted && !crashed) startGame();
});
window.addEventListener("gamepaddisconnected", () => {
  console.log("Gamepad disconnected");
  gamepadIndex = null;
});

// --------------------
// Update Gamepad Input (Right Stick Y controls pitch)
// --------------------
function updateGamepadInput() {
  if (gamepadIndex === null || crashed) return;
  const gamepad = navigator.getGamepads()[gamepadIndex];
  if (!gamepad) return;
  // Right Stick Y-Axis: adjust sensitivity as needed.
  pitch = gamepad.axes[3] * 0.2;
}

// --------------------
// Smooth Camera Follow
// --------------------
function updateCamera() {
  const targetPosition = new THREE.Vector3(
    plane.position.x,
    plane.position.y + 2,
    plane.position.z + 10
  );
  camera.position.lerp(targetPosition, 0.1);
  camera.lookAt(plane.position);
}

// --------------------
// Check Rings: Score or Crash (runs once per ring when passed)
// --------------------
function checkRings() {
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    // Only process if not already checked and the plane has passed the ring's z position.
    if (!ring.checked && plane.position.z < ring.position.z) {
      // Compute horizontal (XY) distance from ring center.
      const dx = plane.position.x - ring.position.x;
      const dy = plane.position.y - ring.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      ring.checked = true; // Mark as processed
      
      if (distance < innerRadius) {
        // Successful pass through the ring's hole.
        score += 1;
        document.getElementById("score").innerText = `Score: ${score}`;
        console.log(`Ring ${i} passed successfully. Score: ${score}`);
      } else if (distance >= innerRadius && distance <= outerRadius) {
        // Collision: plane touched the ring's edge.
        crashed = true;
        document.getElementById("crash-message").style.display = "block";
        console.log(`Crashed on ring ${i}`);
        return; // Exit early since the game is over.
      }
      // If distance > outerRadius, the ring is simply missed.
    }
  }
}

// --------------------
// Animation Loop
// --------------------
function animate() {
  if (!gameStarted || crashed) return;
  requestAnimationFrame(animate);
  updateGamepadInput();
  
  // Move the plane forward.
  plane.position.z -= speed;
  // Apply pitch control (vertical movement).
  plane.position.y -= pitch;
  
  updateCamera();
  checkRings();
  renderer.render(scene, camera);
}

// --------------------
// Game Start & Restart Functions
// --------------------
function startGame() {
  if (!gameStarted) {
    gameStarted = true;
    document.getElementById("start-message").style.display = "none";
    animate();
  }
}

function restartGame() {
  // Reset game variables.
  plane.position.set(0, 0, 500);
  crashed = false;
  gameStarted = false;
  score = 0;
  document.getElementById("score").innerText = `Score: ${score}`;
  // Reset rings for scoring.
  for (let i = 0; i < rings.length; i++) {
    rings[i].checked = false;
  }
  document.getElementById("crash-message").style.display = "none";
  document.getElementById("start-message").style.display = "block";
}

// --------------------
// Event Listeners for Starting and Restarting
// --------------------
window.addEventListener("keydown", (event) => {
  // If space bar is pressed at any time, restart the game.
  if (event.key === " " || event.code === "Space") {
    restartGame();
  } else if (!gameStarted && !crashed) {
    // If any other key is pressed and game hasn't started, start it.
    startGame();
  }
});
