// GLB Viewer - 3D Game Replay System
// Uses Three.js for rendering and loads telemetry data for playback

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ===== Configuration =====
const CONFIG = {
    mapsPath: 'maps3D/',
    telemetryPath: 'stats/',
    playerMarkerSize: 0.5,
    playerMarkerHeight: 1.8,
    defaultCameraHeight: 50,
    followCameraDistance: 8,
    followCameraHeight: 4,
    defaultSpeed: 1,
    skipSeconds: 5,

    // Movement settings
    moveSpeed: 30,
    sprintMultiplier: 2.5,
    lookSensitivity: 0.002,

    // Gamepad settings
    gamepadDeadzone: 0.15,
    gamepadLookSensitivity: 0.05,
    gamepadMoveSpeed: 40,

    teamColors: {
        '_game_team_blue': 0x0066ff,
        '_game_team_red': 0xff3333,
        'blue': 0x0066ff,
        'red': 0xff3333,
        'none': 0x00ff88,
        'default': 0xffaa00
    },
    ffaColors: [
        0x00ff88, 0xff6600, 0xaa00ff, 0xffff00,
        0x00ffff, 0xff00aa, 0x88ff00, 0xff8800
    ]
};

// Weapon icons mapping
const WEAPON_ICONS = {
    'battle rifle': 'assets/weapons/BattleRifle.png',
    'br': 'assets/weapons/BattleRifle.png',
    'magnum': 'assets/weapons/Magnum.png',
    'pistol': 'assets/weapons/Magnum.png',
    'shotgun': 'assets/weapons/Shotgun.png',
    'smg': 'assets/weapons/SmG.png',
    'sniper rifle': 'assets/weapons/SniperRifle.png',
    'rocket launcher': 'assets/weapons/RocketLauncher.png',
    'rockets': 'assets/weapons/RocketLauncher.png',
    'plasma pistol': 'assets/weapons/PlasmaPistol.png',
    'plasma rifle': 'assets/weapons/PlasmaRifle.png',
    'brute plasma rifle': 'assets/weapons/BrutePlasmaRifle.png',
    'carbine': 'assets/weapons/Carbine.png',
    'needler': 'assets/weapons/Needler.png',
    'beam rifle': 'assets/weapons/BeamRifle.png',
    'brute shot': 'assets/weapons/BruteShot.png',
    'energy sword': 'assets/weapons/EnergySword.png',
    'sword': 'assets/weapons/EnergySword.png',
    'fuel rod': 'assets/weapons/FuelRod.png',
    'flag': 'assets/weapons/Flag.png',
    'oddball': 'assets/weapons/OddBall.png',
    'ball': 'assets/weapons/OddBall.png',
    'bomb': 'assets/weapons/AssaultBomb.png',
    'frag grenade': 'assets/weapons/FragGrenadeHUD.png',
    'plasma grenade': 'assets/weapons/PlasmaGrenadeHUD.png',
    'sentinel beam': 'assets/weapons/SentinelBeam.png',
    'melee': 'assets/weapons/MeleeKill.png'
};

function getWeaponIcon(weaponName) {
    if (!weaponName) return null;
    const key = weaponName.toLowerCase().trim();
    return WEAPON_ICONS[key] || null;
}

// Map name to GLB filename mapping
const MAP_NAME_TO_GLB = {
    'ascension': 'ascension',
    'beaver creek': 'beavercreek',
    'burial mounds': 'burial_mounds',
    'coagulation': 'coagulation',
    'colossus': 'colossus',
    'headlong': 'headlong',
    'ivory tower': 'cyclotron',
    'lockout': 'lockout',
    'midship': 'midship',
    'waterworks': 'waterworks',
    'zanzibar': 'zanzibar',
    'foundation': 'foundation',
    'containment': 'containment',
    'warlock': 'warlock',
    'sanctuary': 'deltatap',
    'turf': 'turf',
    'backwash': 'backwash',
    'elongation': 'elongation',
    'gemini': 'gemini',
    'relic': 'dune',
    'terminal': 'triplicate',
    'district': 'street_sweeper',
    'uplift': 'needle',
    'example': 'example',
    'desolation': 'derelict',
    'tombstone': 'highplains'
};

function mapNameToGlbFilename(mapName) {
    const normalized = mapName.toLowerCase().trim();
    return MAP_NAME_TO_GLB[normalized] || normalized.replace(/\s+/g, '_');
}

// ===== State =====
let scene, camera, renderer, controls;
let mapModel = null;
let playerMarkers = {};
let telemetryData = [];
let players = [];
let currentTimeMs = 0;
let startTimeMs = 0;
let totalDurationMs = 0;
let isPlaying = false;
let playbackSpeed = 1;
let lastFrameTime = 0;
let animationFrameId = null;
let followPlayer = null;
let viewMode = 'free';

// Input state
const keys = {};
let mouseDown = false;
let pointerLocked = false;

// Gamepad state
let gamepadIndex = null;
let gamepadConnected = false;

// URL parameters
let mapName = '';
let telemetryFile = '';
let gameInfo = {};

// Timeline dragging
let isDraggingTimeline = false;
let wasPlayingBeforeDrag = false;

// Death heatmap
let deathPositions = [];
let showDeathHeatmap = true;

// Map center for camera positioning
let mapCenter = { x: 0, y: 0, z: 0 };
let mapSize = 50;

// Player display name mappings (from main site)
let playerDisplayNames = {};

// ===== Initialization =====
async function init() {
    parseUrlParams();
    setupScene();
    setupEventListeners();
    setupGamepad();
    await loadMapAndTelemetry();
    animate();
}

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    mapName = params.get('map') || 'Midship';
    telemetryFile = params.get('telemetry') || '';
    gameInfo = {
        map: mapName,
        gameType: params.get('gametype') || '',
        date: params.get('date') || ''
    };

    // Parse player display name mappings
    const playersParam = params.get('players');
    if (playersParam) {
        try {
            playerDisplayNames = JSON.parse(playersParam);
        } catch (e) {
            console.warn('Failed to parse player names:', e);
        }
    }

    document.getElementById('mapName').textContent = mapName;
    document.getElementById('gameType').textContent = gameInfo.gameType;
    document.getElementById('gameDate').textContent = gameInfo.date;
}

// Get display name for a player (uses mapping or falls back to in-game name)
function getPlayerDisplayName(inGameName) {
    return playerDisplayNames[inGameName] || inGameName;
}

function setupScene() {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('glb-canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    scene.fog = new THREE.Fog(0x0a0a12, 50, 200);

    camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, CONFIG.defaultCameraHeight, 0);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // OrbitControls for orbit mode
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    controls.enabled = false; // Start with WASD mode

    setupLighting();

    const gridHelper = new THREE.GridHelper(100, 100, 0x00c8ff, 0x1a1a2e);
    gridHelper.name = 'gridHelper';
    scene.add(gridHelper);

    window.addEventListener('resize', onWindowResize);
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362e24, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-50, 50, -50);
    scene.add(fillLight);
}

function setupEventListeners() {
    // Playback buttons
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('skipBackBtn').addEventListener('click', () => skip(-CONFIG.skipSeconds));
    document.getElementById('skipForwardBtn').addEventListener('click', () => skip(CONFIG.skipSeconds));
    document.getElementById('playbackSpeed').addEventListener('change', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        updateSpeedDisplay();
    });

    // Timeline - enhanced media player style
    const timeline = document.getElementById('timeline');
    const timelineContainer = document.querySelector('.timeline-wrapper');

    timeline.addEventListener('mousedown', onTimelineMouseDown);
    timeline.addEventListener('input', onTimelineInput);
    timeline.addEventListener('change', onTimelineChange);

    // Click anywhere on timeline track to seek
    timelineContainer.addEventListener('click', onTimelineClick);

    // View controls
    document.getElementById('topViewBtn').addEventListener('click', () => setViewMode('top'));
    document.getElementById('freeViewBtn').addEventListener('click', () => setViewMode('free'));
    document.getElementById('orbitViewBtn')?.addEventListener('click', () => setViewMode('orbit'));
    document.getElementById('followBtn').addEventListener('click', () => {
        const select = document.getElementById('followPlayerSelect');
        select.style.display = select.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('followPlayerSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            followPlayer = e.target.value;
            setViewMode('follow');
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse controls for free look
    const canvas = document.getElementById('glb-canvas');
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Pointer lock
    document.addEventListener('pointerlockchange', onPointerLockChange);
}

// ===== Gamepad Support =====
function setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad.id);
        gamepadIndex = e.gamepad.index;
        gamepadConnected = true;
        showGamepadNotification('Controller connected');
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('Gamepad disconnected');
        if (e.gamepad.index === gamepadIndex) {
            gamepadIndex = null;
            gamepadConnected = false;
        }
    });
}

function pollGamepad() {
    if (!gamepadConnected || gamepadIndex === null) return null;

    const gamepads = navigator.getGamepads();
    return gamepads[gamepadIndex];
}

function applyDeadzone(value) {
    if (Math.abs(value) < CONFIG.gamepadDeadzone) return 0;
    const sign = value > 0 ? 1 : -1;
    return sign * (Math.abs(value) - CONFIG.gamepadDeadzone) / (1 - CONFIG.gamepadDeadzone);
}

function handleGamepadInput(deltaTime) {
    const gamepad = pollGamepad();
    if (!gamepad) return;

    // Standard gamepad mapping:
    // Left stick: axes[0] (X), axes[1] (Y) - Movement
    // Right stick: axes[2] (X), axes[3] (Y) - Look
    // Buttons: A(0), B(1), X(2), Y(3), LB(4), RB(5), LT(6), RT(7),
    //          Back(8), Start(9), LS(10), RS(11), DPad Up(12), Down(13), Left(14), Right(15)

    const leftX = applyDeadzone(gamepad.axes[0] || 0);
    const leftY = applyDeadzone(gamepad.axes[1] || 0);
    const rightX = applyDeadzone(gamepad.axes[2] || 0);
    const rightY = applyDeadzone(gamepad.axes[3] || 0);

    // Movement (left stick) - works in free and top modes
    if ((leftX !== 0 || leftY !== 0)) {
        const speed = CONFIG.gamepadMoveSpeed * deltaTime;

        if (viewMode === 'free') {
            const direction = new THREE.Vector3();
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, camera.up).normalize();

            direction.addScaledVector(right, leftX);
            direction.addScaledVector(forward, -leftY);

            camera.position.addScaledVector(direction, speed);
        } else if (viewMode === 'top') {
            // Pan camera in X/Z plane for top-down view
            camera.position.x += leftX * speed;
            camera.position.z += leftY * speed;
            controls.target.x += leftX * speed;
            controls.target.z += leftY * speed;
        } else if (viewMode === 'orbit') {
            // Move orbit target
            controls.target.x += leftX * speed * 0.5;
            controls.target.z += leftY * speed * 0.5;
        }
    }

    // Look (right stick) - free: look around, orbit: rotate around, top: zoom
    if (rightX !== 0 || rightY !== 0) {
        if (viewMode === 'free') {
            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(camera.quaternion);

            euler.y -= rightX * CONFIG.gamepadLookSensitivity;
            euler.x -= rightY * CONFIG.gamepadLookSensitivity;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

            camera.quaternion.setFromEuler(euler);
        } else if (viewMode === 'orbit') {
            // Rotate orbit camera
            const rotateSpeed = 0.03;
            controls.rotateLeft(rightX * rotateSpeed);
            controls.rotateUp(rightY * rotateSpeed);
        } else if (viewMode === 'top') {
            // Zoom with right stick Y in top-down view
            const zoomSpeed = 2;
            camera.position.y = Math.max(20, Math.min(300, camera.position.y + rightY * zoomSpeed));
        }
    }

    // Timeline control (bumpers LB/RB)
    if (gamepad.buttons[4]?.pressed) { // LB - skip back
        skip(-CONFIG.skipSeconds * deltaTime * 2);
    }
    if (gamepad.buttons[5]?.pressed) { // RB - skip forward
        skip(CONFIG.skipSeconds * deltaTime * 2);
    }

    // Play/Pause (A button) - only on press, not hold
    if (gamepad.buttons[0]?.pressed && !gamepad.buttons[0]._lastState) {
        togglePlayPause();
    }
    gamepad.buttons[0]._lastState = gamepad.buttons[0]?.pressed;

    // Speed control (DPad Up/Down)
    if (gamepad.buttons[12]?.pressed && !gamepad.buttons[12]._lastState) {
        changeSpeed(1); // Increase speed
    }
    if (gamepad.buttons[13]?.pressed && !gamepad.buttons[13]._lastState) {
        changeSpeed(-1); // Decrease speed
    }
    gamepad.buttons[12]._lastState = gamepad.buttons[12]?.pressed;
    gamepad.buttons[13]._lastState = gamepad.buttons[13]?.pressed;

    // View mode (Y button cycles views)
    if (gamepad.buttons[3]?.pressed && !gamepad.buttons[3]._lastState) {
        cycleViewMode();
    }
    gamepad.buttons[3]._lastState = gamepad.buttons[3]?.pressed;

    // Triggers for fine timeline scrubbing
    const lt = gamepad.buttons[6]?.value || 0;
    const rt = gamepad.buttons[7]?.value || 0;
    if (lt > 0.1 || rt > 0.1) {
        const scrubAmount = (rt - lt) * 100 * deltaTime;
        currentTimeMs = Math.max(startTimeMs, Math.min(startTimeMs + totalDurationMs, currentTimeMs + scrubAmount));
        updateTimeDisplay();
        updatePlayerPositions();
    }
}

function changeSpeed(direction) {
    const speeds = [0.25, 0.5, 1, 2, 4, 8];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const newIndex = Math.max(0, Math.min(speeds.length - 1, currentIndex + direction));
    playbackSpeed = speeds[newIndex];
    document.getElementById('playbackSpeed').value = playbackSpeed;
    updateSpeedDisplay();
}

function cycleViewMode() {
    const modes = ['free', 'top', 'orbit', 'follow'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
}

function showGamepadNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'gamepad-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function updateSpeedDisplay() {
    const btn = document.getElementById('playbackSpeed');
    if (btn) btn.value = playbackSpeed;
}

// ===== Keyboard Controls =====
function onKeyDown(e) {
    keys[e.code] = true;

    // Don't handle shortcuts if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            skip(-CONFIG.skipSeconds);
            break;
        case 'ArrowRight':
            e.preventDefault();
            skip(CONFIG.skipSeconds);
            break;
        case 'ArrowUp':
            e.preventDefault();
            changeSpeed(1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            changeSpeed(-1);
            break;
        case 'Digit1':
            setViewMode('top');
            break;
        case 'Digit2':
            setViewMode('free');
            break;
        case 'Digit3':
            setViewMode('orbit');
            break;
        case 'Digit4':
            setViewMode('follow');
            break;
        case 'KeyF':
            toggleFullscreen();
            break;
        case 'KeyM':
            // Toggle mute (future audio support)
            break;
        case 'Home':
            currentTimeMs = startTimeMs;
            updateTimeDisplay();
            updatePlayerPositions();
            break;
        case 'End':
            currentTimeMs = startTimeMs + totalDurationMs;
            updateTimeDisplay();
            updatePlayerPositions();
            break;
        case 'Escape':
            if (pointerLocked) {
                document.exitPointerLock();
            }
            break;
    }
}

function onKeyUp(e) {
    keys[e.code] = false;
}

// ===== Mouse Controls =====
function onMouseDown(e) {
    if (e.button === 2 || e.button === 0) { // Right or left click
        mouseDown = true;
    }
}

function onMouseUp(e) {
    mouseDown = false;
}

function onMouseMove(e) {
    if (viewMode !== 'free') return;

    // Only look when pointer is locked or right mouse is held
    if (!pointerLocked && !mouseDown) return;

    const movementX = e.movementX || 0;
    const movementY = e.movementY || 0;

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);

    euler.y -= movementX * CONFIG.lookSensitivity;
    euler.x -= movementY * CONFIG.lookSensitivity;

    // Clamp vertical look
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

    camera.quaternion.setFromEuler(euler);
}

function onCanvasClick(e) {
    // Double-click to toggle pointer lock in free mode
    if (viewMode === 'free' && e.detail === 2) {
        const canvas = document.getElementById('glb-canvas');
        canvas.requestPointerLock();
    }
}

function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === document.getElementById('glb-canvas');
}

// ===== WASD Movement =====
function handleKeyboardMovement(deltaTime) {
    if (viewMode !== 'free') return;

    const speed = CONFIG.moveSpeed * deltaTime * (keys['ShiftLeft'] || keys['ShiftRight'] ? CONFIG.sprintMultiplier : 1);

    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // WASD movement
    if (keys['KeyW'] || keys['ArrowUp']) direction.add(forward);
    if (keys['KeyS'] || keys['ArrowDown']) direction.sub(forward);
    if (keys['KeyA']) direction.sub(right);
    if (keys['KeyD']) direction.add(right);

    // Vertical movement
    if (keys['KeyQ'] || keys['PageDown']) direction.y -= 1;
    if (keys['KeyE'] || keys['PageUp']) direction.y += 1;

    if (direction.length() > 0) {
        direction.normalize();
        camera.position.addScaledVector(direction, speed);
    }
}

// ===== Timeline Controls =====
function onTimelineMouseDown(e) {
    isDraggingTimeline = true;
    wasPlayingBeforeDrag = isPlaying;
    if (isPlaying) {
        togglePlayPause();
    }
}

function onTimelineInput(e) {
    const value = parseInt(e.target.value);
    currentTimeMs = startTimeMs + value;
    updateTimeDisplay();
    updatePlayerPositions();
}

function onTimelineChange(e) {
    isDraggingTimeline = false;
    const value = parseInt(e.target.value);
    currentTimeMs = startTimeMs + value;
    updateTimeDisplay();
    updatePlayerPositions();

    // Resume playing if it was playing before
    if (wasPlayingBeforeDrag && !isPlaying) {
        togglePlayPause();
    }
}

function onTimelineClick(e) {
    const timeline = document.getElementById('timeline');
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * totalDurationMs;

    currentTimeMs = startTimeMs + Math.max(0, Math.min(totalDurationMs, newTime));
    timeline.value = currentTimeMs - startTimeMs;
    updateTimeDisplay();
    updatePlayerPositions();
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ===== Loading =====
async function loadMapAndTelemetry() {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.querySelector('.loading-text');
    const loadingProgress = document.getElementById('loading-progress');
    const errorOverlay = document.getElementById('error-overlay');

    try {
        if (telemetryFile) {
            loadingText.textContent = 'Loading telemetry data...';
            loadingProgress.textContent = '0%';
            await loadTelemetry(telemetryFile);
            loadingProgress.textContent = '50%';
        } else {
            console.warn('No telemetry file specified');
        }

        loadingText.textContent = 'Loading 3D map...';
        // Convert map name to GLB filename format (lowercase, no spaces, underscores for some)
        const glbFilename = mapNameToGlbFilename(mapName);
        const glbPath = `${CONFIG.mapsPath}${glbFilename}.glb`;

        try {
            await loadGLB(glbPath, (progress) => {
                loadingProgress.textContent = `${Math.round(50 + progress * 50)}%`;
            });
        } catch (glbError) {
            console.warn('GLB not found, using fallback view:', glbError);
            showFallbackMessage();
        }

        await createPlayerMarkers();
        createDeathHeatmap();
        loadingOverlay.style.display = 'none';
        positionCameraToFit();

        // Set initial view mode to free look
        setViewMode('free');

    } catch (error) {
        console.error('Error loading:', error);
        loadingOverlay.style.display = 'none';
        errorOverlay.style.display = 'flex';
        document.getElementById('error-text').textContent = error.message;
    }
}

async function loadGLB(path, onProgress) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            path,
            (gltf) => {
                mapModel = gltf.scene;

                // Rotate map from Z-up to Y-up coordinate system
                // GLB files from Halo/Blender may use Z-up
                mapModel.rotation.x = -Math.PI / 2;

                mapModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                const gridHelper = scene.getObjectByName('gridHelper');
                if (gridHelper) scene.remove(gridHelper);

                scene.add(mapModel);
                resolve(gltf);
            },
            (progress) => {
                if (progress.lengthComputable) onProgress(progress.loaded / progress.total);
            },
            reject
        );
    });
}

async function loadTelemetry(filename) {
    const response = await fetch(`${CONFIG.telemetryPath}${filename}`);
    if (!response.ok) throw new Error(`Failed to load telemetry: ${response.statusText}`);
    parseTelemetryCSV(await response.text());
}

function parseTelemetryCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('Telemetry file is empty or invalid');

    const header = lines[0].replace(/^\uFEFF/, '').split(',');
    const columnIndex = {};
    header.forEach((col, i) => { columnIndex[col.trim()] = i; });

    const requiredCols = ['PlayerName', 'GameTimeMs', 'X', 'Y', 'Z'];
    for (const col of requiredCols) {
        if (columnIndex[col] === undefined) throw new Error(`Missing required column: ${col}`);
    }

    telemetryData = [];
    const playerSet = new Set();
    let minTime = Infinity, maxTime = 0;

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < header.length) continue;

        const row = {
            playerName: values[columnIndex['PlayerName']],
            team: values[columnIndex['Team']] || 'none',
            gameTimeMs: parseInt(values[columnIndex['GameTimeMs']]) || 0,
            x: parseFloat(values[columnIndex['X']]) || 0,
            y: parseFloat(values[columnIndex['Y']]) || 0,
            z: parseFloat(values[columnIndex['Z']]) || 0,
            facingYaw: parseFloat(values[columnIndex['FacingYaw']]) || 0,
            facingPitch: parseFloat(values[columnIndex['FacingPitch']]) || 0,
            isCrouching: values[columnIndex['IsCrouching']] === 'True',
            isAirborne: values[columnIndex['IsAirborne']] === 'True',
            isDead: values[columnIndex['IsDead']] === 'True',
            currentWeapon: values[columnIndex['CurrentWeapon']] || 'Unknown',
            // Emblem data
            emblemForeground: parseInt(values[columnIndex['EmblemForeground']]) || 0,
            emblemBackground: parseInt(values[columnIndex['EmblemBackground']]) || 0,
            primaryColor: parseInt(values[columnIndex['PrimaryColor']]) || 0,
            secondaryColor: parseInt(values[columnIndex['SecondaryColor']]) || 0,
            tertiaryColor: parseInt(values[columnIndex['TertiaryColor']]) || 0,
            quaternaryColor: parseInt(values[columnIndex['QuaternaryColor']]) || 0
        };

        telemetryData.push(row);
        playerSet.add(row.playerName);
        minTime = Math.min(minTime, row.gameTimeMs);
        maxTime = Math.max(maxTime, row.gameTimeMs);
    }

    telemetryData.sort((a, b) => a.gameTimeMs - b.gameTimeMs);

    players = [];
    const playerTeams = {};
    telemetryData.forEach(row => {
        if (!playerTeams[row.playerName]) playerTeams[row.playerName] = row.team;
    });

    // Extract player emblems from first occurrence
    const playerEmblemData = {};
    telemetryData.forEach(row => {
        if (!playerEmblemData[row.playerName]) {
            playerEmblemData[row.playerName] = {
                emblemForeground: row.emblemForeground,
                emblemBackground: row.emblemBackground,
                primaryColor: row.primaryColor,
                secondaryColor: row.secondaryColor,
                tertiaryColor: row.tertiaryColor,
                quaternaryColor: row.quaternaryColor
            };
        }
    });

    // Extract death positions (when a player transitions from alive to dead)
    deathPositions = [];
    const playerLastAliveState = {};
    telemetryData.forEach(row => {
        const wasAlive = playerLastAliveState[row.playerName] !== undefined && !playerLastAliveState[row.playerName];
        const isNowDead = row.isDead;

        // Detect death transition (was alive, now dead)
        if (playerLastAliveState[row.playerName] === false && isNowDead) {
            deathPositions.push({
                playerName: row.playerName,
                team: row.team,
                x: row.x,
                y: row.y,
                z: row.z,
                gameTimeMs: row.gameTimeMs
            });
        }
        playerLastAliveState[row.playerName] = isNowDead;
    });
    console.log(`Found ${deathPositions.length} deaths in telemetry`);

    let ffaColorIndex = 0;
    playerSet.forEach((name) => {
        const team = playerTeams[name] || 'none';
        let color;
        if (team === 'none' || team === '') {
            color = CONFIG.ffaColors[ffaColorIndex++ % CONFIG.ffaColors.length];
        } else {
            color = CONFIG.teamColors[team] || CONFIG.teamColors.default;
        }
        const emblem = playerEmblemData[name] || {};
        // Generate emblem URL using local emblem service (proxied through nginx for HTTPS)
        const emblemUrl = `/emblems/P${emblem.primaryColor || 0}-S${emblem.secondaryColor || 0}-EP${emblem.tertiaryColor || 0}-ES${emblem.quaternaryColor || 0}-EF${emblem.emblemForeground || 0}-EB${emblem.emblemBackground || 0}-ET0.png`;
        players.push({ name, team, color, emblem, emblemUrl });
    });

    startTimeMs = minTime;
    totalDurationMs = maxTime - minTime;
    currentTimeMs = minTime;

    document.getElementById('totalTime').textContent = formatTime(totalDurationMs);
    document.getElementById('timeline').max = totalDurationMs;
    document.getElementById('timeline').value = 0;

    updatePlayerLegend();
    updateFollowSelect();

    console.log(`Loaded ${telemetryData.length} telemetry points for ${players.length} players`);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function showFallbackMessage() {
    const container = document.getElementById('canvas-container');
    const message = document.createElement('div');
    message.className = 'no-glb-message';
    message.innerHTML = `
        <h2>No 3D Map Available</h2>
        <p>The GLB file for <strong>${mapName}</strong> hasn't been added yet.</p>
        <p>To add it, place the GLB file at:</p>
        <code>maps/${mapName}.glb</code>
        <p>Player positions will still be displayed on the grid.</p>
    `;
    container.appendChild(message);
}

// ===== Player Markers =====
async function createPlayerMarkers() {
    Object.values(playerMarkers).forEach(marker => scene.remove(marker.group));
    playerMarkers = {};

    // Load all emblems first
    const emblemImages = {};
    await Promise.all(players.map(async player => {
        if (player.emblemUrl) {
            emblemImages[player.name] = await loadEmblemImage(player.emblemUrl);
        }
    }));

    players.forEach(player => {
        const group = new THREE.Group();
        group.name = `player_${player.name}`;

        const bodyGeometry = new THREE.CylinderGeometry(
            CONFIG.playerMarkerSize * 0.4,
            CONFIG.playerMarkerSize * 0.5,
            CONFIG.playerMarkerHeight * 0.7,
            16
        );
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: player.color,
            metalness: 0.3,
            roughness: 0.7,
            emissive: player.color,
            emissiveIntensity: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = CONFIG.playerMarkerHeight * 0.35;
        body.castShadow = true;
        group.add(body);

        const headGeometry = new THREE.SphereGeometry(CONFIG.playerMarkerSize * 0.35, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: player.color,
            metalness: 0.3,
            roughness: 0.7,
            emissive: player.color,
            emissiveIntensity: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = CONFIG.playerMarkerHeight * 0.8;
        head.castShadow = true;
        group.add(head);

        const arrowGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
        const arrowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.x = Math.PI / 2;
        arrow.position.set(0, CONFIG.playerMarkerHeight * 0.5, CONFIG.playerMarkerSize * 0.6);
        group.add(arrow);

        // Use waypoint canvas with emblem if available
        const emblemImage = emblemImages[player.name];
        const displayName = getPlayerDisplayName(player.name);
        const waypointCanvas = createWaypointCanvas(displayName, player.color, emblemImage);
        const labelTexture = new THREE.CanvasTexture(waypointCanvas);
        const labelMaterial = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true,
            depthTest: false
        });
        const label = new THREE.Sprite(labelMaterial);
        label.scale.set(2.5, 3.125, 1); // Aspect ratio 128:160
        label.position.y = CONFIG.playerMarkerHeight + 2;
        group.add(label);

        const glow = new THREE.PointLight(player.color, 0.5, 3);
        glow.position.y = CONFIG.playerMarkerHeight * 0.5;
        group.add(glow);

        scene.add(group);
        playerMarkers[player.name] = { group, body, head, arrow, label, player, emblemImage };
    });
}

// ===== Death Heatmap =====
let heatmapMesh = null;

function createDeathHeatmap() {
    // Clear existing heatmap
    if (heatmapMesh) {
        scene.remove(heatmapMesh);
        if (heatmapMesh.geometry) heatmapMesh.geometry.dispose();
        if (heatmapMesh.material) {
            if (heatmapMesh.material.map) heatmapMesh.material.map.dispose();
            heatmapMesh.material.dispose();
        }
        heatmapMesh = null;
    }

    if (!showDeathHeatmap || deathPositions.length === 0) return;

    // Calculate bounds from death positions (in Halo coords)
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    deathPositions.forEach(death => {
        minX = Math.min(minX, death.x);
        maxX = Math.max(maxX, death.x);
        minY = Math.min(minY, death.y);
        maxY = Math.max(maxY, death.y);
    });

    // Add padding
    const padding = 15;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Create heatmap canvas
    const resolution = 512;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');

    // Clear with transparent
    ctx.clearRect(0, 0, resolution, resolution);

    // Draw gaussian blobs for each death (accumulate intensity)
    const radius = resolution * 0.1; // Blob radius
    deathPositions.forEach(death => {
        // Convert to canvas coordinates
        const canvasX = ((death.x - minX) / width) * resolution;
        const canvasY = ((death.y - minY) / height) * resolution;

        // Draw radial gradient (gaussian-like blob)
        const gradient = ctx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Get the intensity data and apply color gradient
    const imageData = ctx.getImageData(0, 0, resolution, resolution);
    const data = imageData.data;

    // Apply heatmap color gradient based on intensity
    for (let i = 0; i < data.length; i += 4) {
        const intensity = data[i + 3] / 255; // Use alpha as intensity

        if (intensity > 0.02) {
            // Color gradient: blue -> cyan -> green -> yellow -> red
            const color = getHeatmapColor(Math.min(1, intensity * 2));
            data[i] = color.r;
            data[i + 1] = color.g;
            data[i + 2] = color.b;
            data[i + 3] = Math.min(220, intensity * 500); // Boost visibility
        } else {
            data[i + 3] = 0; // Fully transparent for very low intensity
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Create Three.js texture and plane
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending
    });

    heatmapMesh = new THREE.Mesh(planeGeometry, planeMaterial);

    // Position the plane (convert Halo coords to Three.js)
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    heatmapMesh.position.set(centerX, 0.3, -centerY); // Slightly above ground
    heatmapMesh.rotation.x = -Math.PI / 2; // Lay flat
    heatmapMesh.rotation.z = Math.PI; // Correct orientation

    scene.add(heatmapMesh);
    console.log(`Created heatmap with ${deathPositions.length} death positions`);
}

function getHeatmapColor(intensity) {
    // Color stops: blue (cold) -> cyan -> green -> yellow -> red (hot)
    const stops = [
        { pos: 0, r: 0, g: 0, b: 255 },       // Blue
        { pos: 0.25, r: 0, g: 255, b: 255 },  // Cyan
        { pos: 0.5, r: 0, g: 255, b: 0 },     // Green
        { pos: 0.75, r: 255, g: 255, b: 0 },  // Yellow
        { pos: 1, r: 255, g: 0, b: 0 }        // Red
    ];

    // Clamp and find color stops
    intensity = Math.max(0, Math.min(1, intensity));

    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (intensity >= stops[i].pos && intensity <= stops[i + 1].pos) {
            lower = stops[i];
            upper = stops[i + 1];
            break;
        }
    }

    // Interpolate between color stops
    const range = upper.pos - lower.pos;
    const t = range > 0 ? (intensity - lower.pos) / range : 0;

    return {
        r: Math.round(lower.r + (upper.r - lower.r) * t),
        g: Math.round(lower.g + (upper.g - lower.g) * t),
        b: Math.round(lower.b + (upper.b - lower.b) * t)
    };
}

function toggleDeathHeatmap() {
    showDeathHeatmap = !showDeathHeatmap;
    createDeathHeatmap();
    const btn = document.getElementById('heatmapBtn');
    if (btn) {
        btn.textContent = showDeathHeatmap ? 'Hide Deaths' : 'Show Deaths';
        btn.classList.toggle('active', showDeathHeatmap);
    }
}

function createLabelCanvas(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.fill();

    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 2;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.stroke();

    ctx.font = 'bold 28px Overpass, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas;
}

// Create a Halo-style waypoint canvas with emblem and arrow
function createWaypointCanvas(text, color, emblemImage = null) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
    const waypointBlue = '#00aaff';

    // Draw waypoint arrow pointing down
    const arrowY = 130;
    const arrowSize = 20;
    ctx.fillStyle = waypointBlue;
    ctx.beginPath();
    ctx.moveTo(64, arrowY + arrowSize);  // Bottom point
    ctx.lineTo(64 - arrowSize / 2, arrowY);  // Top left
    ctx.lineTo(64 + arrowSize / 2, arrowY);  // Top right
    ctx.closePath();
    ctx.fill();

    // Draw emblem box background
    const boxX = 14;
    const boxY = 10;
    const boxSize = 100;

    // Outer glow
    ctx.shadowColor = waypointBlue;
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(0, 40, 80, 0.9)';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = waypointBlue;
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // Inner border
    ctx.strokeStyle = 'rgba(0, 170, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 4, boxY + 4, boxSize - 8, boxSize - 8);

    // Draw emblem if available
    if (emblemImage && emblemImage.complete) {
        ctx.drawImage(emblemImage, boxX + 10, boxY + 10, boxSize - 20, boxSize - 20);
    } else {
        // Draw player initial as fallback
        ctx.font = 'bold 50px Orbitron, sans-serif';
        ctx.fillStyle = colorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.charAt(0).toUpperCase(), 64, 60);
    }

    // Draw player name below box
    ctx.font = 'bold 14px Overpass, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text.substring(0, 12), 64, boxY + boxSize + 4);

    return canvas;
}

// Load emblem image async
function loadEmblemImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            console.log('Emblem loaded:', url);
            resolve(img);
        };
        img.onerror = (e) => {
            console.warn('Emblem failed to load:', url, e);
            resolve(null);
        };
        img.src = url;
    });
}

function updatePlayerPositions() {
    const playerPositions = {};
    let startIdx = 0;

    for (let i = 0; i < telemetryData.length; i++) {
        if (telemetryData[i].gameTimeMs >= currentTimeMs) {
            startIdx = Math.max(0, i - players.length * 2);
            break;
        }
    }

    for (let i = startIdx; i < telemetryData.length; i++) {
        const row = telemetryData[i];
        if (row.gameTimeMs > currentTimeMs + 200) break;

        if (!playerPositions[row.playerName] ||
            Math.abs(row.gameTimeMs - currentTimeMs) < Math.abs(playerPositions[row.playerName].gameTimeMs - currentTimeMs)) {
            playerPositions[row.playerName] = row;
        }
    }

    const liveStatsBody = document.getElementById('live-stats-body');
    if (liveStatsBody) liveStatsBody.innerHTML = '';

    for (const player of players) {
        const marker = playerMarkers[player.name];
        if (!marker) continue;

        const pos = playerPositions[player.name];
        if (pos) {
            marker.group.position.set(pos.x, pos.z, -pos.y);
            if (!isNaN(pos.facingYaw)) marker.group.rotation.y = -pos.facingYaw;

            if (pos.isCrouching) {
                marker.body.scale.y = 0.7;
                marker.head.position.y = CONFIG.playerMarkerHeight * 0.6;
            } else {
                marker.body.scale.y = 1;
                marker.head.position.y = CONFIG.playerMarkerHeight * 0.8;
            }

            marker.group.visible = true;

            if (liveStatsBody) {
                const weaponIcon = getWeaponIcon(pos.currentWeapon);
                const weaponDisplay = weaponIcon
                    ? `<img src="${weaponIcon}" alt="${pos.currentWeapon}" class="weapon-icon" style="height: 20px; width: auto; filter: brightness(0) invert(1);">`
                    : pos.currentWeapon || '';
                const row = document.createElement('tr');
                const displayName = getPlayerDisplayName(player.name);
                row.innerHTML = `
                    <td><span style="color: #${player.color.toString(16).padStart(6, '0')}">${displayName}</span></td>
                    <td>${weaponDisplay}</td>
                `;
                liveStatsBody.appendChild(row);
            }
        } else {
            marker.group.visible = false;
        }
    }

    // Follow camera
    if (viewMode === 'follow' && followPlayer) {
        const marker = playerMarkers[followPlayer];
        if (marker && marker.group.visible) {
            const targetPos = marker.group.position.clone();
            targetPos.y += CONFIG.followCameraHeight;

            const offset = new THREE.Vector3(0, 0, CONFIG.followCameraDistance);
            offset.applyQuaternion(marker.group.quaternion);

            camera.position.lerp(targetPos.clone().add(offset), 0.1);
            controls.target.lerp(marker.group.position, 0.1);
        }
    }
}

// ===== Playback =====
function togglePlayPause() {
    isPlaying = !isPlaying;

    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const playPauseBtn = document.getElementById('playPauseBtn');

    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playPauseBtn.classList.add('playing');
        lastFrameTime = performance.now();
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playPauseBtn.classList.remove('playing');
    }
}

function skip(seconds) {
    const skipMs = seconds * 1000;
    currentTimeMs = Math.max(startTimeMs, Math.min(startTimeMs + totalDurationMs, currentTimeMs + skipMs));
    updateTimeDisplay();
    updatePlayerPositions();
}

function updateTimeDisplay() {
    const elapsed = currentTimeMs - startTimeMs;
    document.getElementById('currentTime').textContent = formatTime(elapsed);
    document.getElementById('timeline').value = elapsed;

    // Update progress bar visual
    const progress = (elapsed / totalDurationMs) * 100;
    document.getElementById('timeline').style.setProperty('--progress', `${progress}%`);
}

function formatTime(ms) {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ===== View Modes =====
function setViewMode(mode) {
    viewMode = mode;

    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${mode}ViewBtn`)?.classList.add('active');

    const followSelect = document.getElementById('followPlayerSelect');
    followSelect.style.display = mode === 'follow' ? 'block' : 'none';

    // Update controls hint
    updateControlsHint();

    if (mode === 'top') {
        controls.enabled = false;
        const cameraHeight = mapSize * 1.2;
        camera.position.set(mapCenter.x, mapCenter.y + cameraHeight, mapCenter.z);
        camera.lookAt(mapCenter.x, mapCenter.y, mapCenter.z);
        camera.up.set(0, 0, -1); // Orient so "forward" in game is "up" on screen
    } else if (mode === 'free') {
        controls.enabled = false;
        camera.up.set(0, 1, 0);
        // Position camera at first player's position if available
        if (telemetryData.length > 0) {
            const firstPos = telemetryData[0];
            // Convert Halo coords to Three.js: X stays, Z becomes Y (height), -Y becomes Z
            const eyeHeight = 2;
            camera.position.set(firstPos.x, firstPos.z + eyeHeight, -firstPos.y);
            camera.lookAt(mapCenter.x, mapCenter.y + eyeHeight, mapCenter.z);
        } else {
            camera.position.set(mapCenter.x, mapCenter.y + 2, mapCenter.z + 10);
            camera.lookAt(mapCenter.x, mapCenter.y, mapCenter.z);
        }
    } else if (mode === 'orbit') {
        controls.enabled = true;
        camera.up.set(0, 1, 0);
        controls.target.set(mapCenter.x, mapCenter.y, mapCenter.z);
    } else if (mode === 'follow') {
        controls.enabled = true;
        camera.up.set(0, 1, 0);
    }
}

function positionCameraToFit() {
    if (telemetryData.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    telemetryData.forEach(row => {
        minX = Math.min(minX, row.x);
        maxX = Math.max(maxX, row.x);
        minY = Math.min(minY, row.y);
        maxY = Math.max(maxY, row.y);
        minZ = Math.min(minZ, row.z);
        maxZ = Math.max(maxZ, row.z);
    });

    // Calculate center of player activity (in Halo coords: X=forward, Y=left, Z=up)
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const maxRange = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    // Store map center for view switching (convert to Three.js coords)
    // Halo: X=forward, Y=left, Z=up -> Three.js: X=right, Y=up, Z=forward
    mapCenter = { x: centerX, y: centerZ, z: -centerY };
    mapSize = Math.max(maxRange, 30); // Minimum size of 30 units

    // Set up top-down view centered on player activity
    const cameraHeight = mapSize * 1.2; // Height based on play area size
    camera.position.set(mapCenter.x, mapCenter.y + cameraHeight, mapCenter.z);
    camera.lookAt(mapCenter.x, mapCenter.y, mapCenter.z);
    camera.up.set(0, 0, -1); // Orient so "forward" in game is "up" on screen

    controls.target.set(mapCenter.x, mapCenter.y, mapCenter.z);
    controls.update();
}

// ===== UI Updates =====
function updatePlayerLegend() {
    const container = document.getElementById('player-list');
    if (!container) return;
    container.innerHTML = '';

    players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.onclick = () => {
            followPlayer = player.name;
            setViewMode('follow');
        };

        // Emblem image instead of color box
        const emblem = document.createElement('img');
        emblem.className = 'player-emblem';
        emblem.src = player.emblemUrl;
        emblem.alt = player.name;
        emblem.style.width = '32px';
        emblem.style.height = '32px';
        emblem.style.borderRadius = '4px';
        emblem.style.marginRight = '8px';
        emblem.onerror = () => {
            // Fallback to color box if emblem fails to load
            emblem.style.display = 'none';
            const colorBox = document.createElement('div');
            colorBox.className = 'player-color';
            colorBox.style.backgroundColor = `#${player.color.toString(16).padStart(6, '0')}`;
            item.insertBefore(colorBox, item.firstChild);
        };

        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = getPlayerDisplayName(player.name);

        const team = document.createElement('span');
        team.className = 'player-team';
        if (player.team.includes('blue')) {
            team.classList.add('blue');
            team.textContent = 'Blue';
        } else if (player.team.includes('red')) {
            team.classList.add('red');
            team.textContent = 'Red';
        } else {
            team.classList.add('ffa');
            team.textContent = 'FFA';
        }

        item.appendChild(emblem);
        item.appendChild(name);
        item.appendChild(team);
        container.appendChild(item);
    });
}

function updateFollowSelect() {
    const select = document.getElementById('followPlayerSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select Player...</option>';

    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.name; // Keep raw name for internal use
        option.textContent = getPlayerDisplayName(player.name);
        select.appendChild(option);
    });
}

function updateControlsHint() {
    const hint = document.getElementById('controls-hint');
    if (!hint) return;

    if (viewMode === 'free') {
        hint.innerHTML = `
            <div><kbd>WASD</kbd> Move</div>
            <div><kbd>Q</kbd><kbd>E</kbd> Up/Down</div>
            <div><kbd>Shift</kbd> Sprint</div>
            <div><kbd>Mouse</kbd> Look</div>
            <div><kbd>Space</kbd> Play/Pause</div>
        `;
    } else {
        hint.innerHTML = `
            <div><kbd>Space</kbd> Play/Pause</div>
            <div><kbd>←</kbd><kbd>→</kbd> Skip 5s</div>
            <div><kbd>↑</kbd><kbd>↓</kbd> Speed</div>
        `;
    }
}

window.toggleStatsPanel = function() {
    const panel = document.getElementById('stats-panel');
    if (panel) panel.classList.toggle('collapsed');
};

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Browser fullscreen (fills browser window, hides header/controls)
let isBrowserFullscreen = false;

function toggleBrowserFullscreen() {
    isBrowserFullscreen = !isBrowserFullscreen;
    const container = document.querySelector('.viewer-container');
    const header = document.querySelector('.viewer-header');
    const controls = document.querySelector('.playback-controls');
    const expandIcon = document.getElementById('expandIcon');
    const compressIcon = document.getElementById('compressIcon');

    if (isBrowserFullscreen) {
        container.classList.add('browser-fullscreen');
        header.style.display = 'none';
        controls.classList.add('fullscreen-mode');
        expandIcon.style.display = 'none';
        compressIcon.style.display = 'block';
    } else {
        container.classList.remove('browser-fullscreen');
        header.style.display = 'flex';
        controls.classList.remove('fullscreen-mode');
        expandIcon.style.display = 'block';
        compressIcon.style.display = 'none';
    }

    // Trigger resize to update canvas
    onWindowResize();
}

// Add fullscreen button listener
document.getElementById('fullscreenBtn')?.addEventListener('click', toggleBrowserFullscreen);

// ===== Animation Loop =====
function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = currentTime;

    // Handle keyboard movement
    handleKeyboardMovement(deltaTime);

    // Handle gamepad input
    handleGamepadInput(deltaTime);

    // Update playback
    if (isPlaying) {
        currentTimeMs += deltaTime * 1000 * playbackSpeed;

        if (currentTimeMs >= startTimeMs + totalDurationMs) {
            currentTimeMs = startTimeMs; // Loop
        }

        updateTimeDisplay();
        updatePlayerPositions();
    }

    // Update orbit controls
    if (controls.enabled) {
        controls.update();
    }

    renderer.render(scene, camera);
}

// ===== Retry Load =====
window.retryLoad = async function() {
    document.getElementById('error-overlay').style.display = 'none';
    document.getElementById('loading-overlay').style.display = 'flex';
    await loadMapAndTelemetry();
};

// ===== Death Heatmap Toggle =====
window.toggleDeathHeatmap = toggleDeathHeatmap;

// ===== Initialize =====
init();
