// GLB Viewer - 3D Game Replay System
// Uses Three.js for rendering and loads telemetry data for playback

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ===== Configuration =====
const CONFIG = {
    mapsPath: '/maps3D/',
    telemetryPath: '/stats/theater/',
    playerMarkerSize: 0.5,
    playerMarkerHeight: 1.8,
    defaultCameraHeight: 50,
    followCameraDistance: 8,
    followCameraHeight: 4,
    defaultSpeed: 1,
    skipSeconds: 5,

    // Movement settings (reduced for better control)
    moveSpeed: 15,
    sprintMultiplier: 2.5,
    lookSensitivity: 0.002,

    // Gamepad settings
    gamepadDeadzone: 0.15,
    gamepadLookSensitivity: 0.05,
    gamepadMoveSpeed: 20,

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

// Map name to GLB filename mapping
// GLB files available: ascension, backwash, beavercreek, burial_mounds, coagulation,
// colossus, containment, cyclotron, deltatap, derelict, dune, elongation, foundation,
// gemini, headlong, highplains, highplains2, lockout, midship, triplicate, turf, warlock, waterworks, zanzibar
const MAP_NAME_TO_GLB = {
    'midship': 'midship',
    'lockout': 'lockout',
    'warlock': 'warlock',
    'sanctuary': 'deltatap',
    'beaver creek': 'beavercreek',
    'ascension': 'ascension',
    'coagulation': 'coagulation',
    'zanzibar': 'zanzibar',
    'burial mounds': 'burial_mounds',
    'colossus': 'colossus',
    'headlong': 'headlong',
    'waterworks': 'waterworks',
    'foundation': 'foundation',
    'backwash': 'backwash',
    'containment': 'containment',
    'elongation': 'elongation',
    'gemini': 'gemini',
    'turf': 'turf',
    'desolation': 'derelict',
    'relic': 'dune',
    'terminal': 'highplains',
    'ivory tower': 'cyclotron'
};

function mapNameToGlbFilename(mapName) {
    const normalized = mapName.toLowerCase().trim();
    return MAP_NAME_TO_GLB[normalized] || normalized.replace(/\s+/g, '_');
}

// ===== State =====
let scene, camera, renderer, controls;
let mapModel = null;
let helmetModel = null;  // Master Chief helmet template
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
let previousViewMode = 'free';  // For RS click toggle back

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

// Scoreboard state
let scoreboardVisible = false;
let playerStats = {}; // Track kills/deaths per player
let scoreboardSortColumn = 'score'; // 'kills', 'deaths', 'score'
let scoreboardSortAscending = false; // false = descending (highest first)

// Killfeed state
let killfeedVisible = true;
let killEntries = [];

// Controls panel state
let controlsCollapsed = false;
let showKeyboardControls = true; // true = keyboard, false = controller

// Selected player index for cycling
let selectedPlayerIndex = 0;

// Rotation calibration offsets (radians)
let rotationOffsetX = 0;
let rotationOffsetY = Math.PI;  // Start with 180° offset
let rotationOffsetZ = 0;

// Player trails
let showTrails = false;
let playerTrails = {};  // name -> array of positions
const TRAIL_MAX_POINTS = 500;  // Max trail points per player

// Player name visibility (default off)
let showPlayerNames = false;

// Track last known positions for dead player handling
let lastKnownPositions = {};

// Dynamic speed multiplier (from RT or Z key)
let dynamicSpeedMultiplier = 1;

// ===== Initialization =====
async function init() {
    await parseUrlParams();
    setupScene();
    setupEventListeners();
    setupGamepad();
    await loadMapAndTelemetry();
    animate();
}

// Helper to parse datetime strings (same logic as script.js)
function parseGameDateTime(dateStr) {
    if (!dateStr) return null;
    try {
        let year, month, day, hours = 0, minutes = 0;
        // ISO format with T: 2025-12-09T07:45:00
        const isoTMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})/);
        if (isoTMatch) {
            [, year, month, day, hours, minutes] = isoTMatch.map(v => parseInt(v) || 0);
        }
        // ISO format with space: 2025-12-09 07:45:00
        if (!year) {
            const isoSpaceMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
            if (isoSpaceMatch) {
                [, year, month, day, hours, minutes] = isoSpaceMatch.map(v => parseInt(v) || 0);
            }
        }
        // US format: 12/9/2025 7:45
        if (!year) {
            const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
            if (usMatch) {
                [, month, day, year, hours, minutes] = usMatch.map(v => parseInt(v) || 0);
            }
        }
        if (year) {
            return new Date(year, month - 1, day, hours, minutes);
        }
    } catch (e) {}
    return null;
}

// Load games data from playlist files (mirrors script.js loading)
async function loadGamesData() {
    const games = [];
    try {
        // Fetch playlists config
        const playlistsResponse = await fetch('/playlists.json');
        if (!playlistsResponse.ok) return games;
        const playlistsConfig = await playlistsResponse.json();

        // Load matches from each playlist
        for (const playlist of playlistsConfig.playlists || []) {
            try {
                const matchesResponse = await fetch(`/${playlist.matches_file}`);
                if (matchesResponse.ok) {
                    const matchesData = await matchesResponse.json();
                    for (const match of matchesData.matches || []) {
                        games.push({
                            map: match.map,
                            gametype: match.gametype,
                            timestamp: match.timestamp,
                            source_file: match.source_file,
                            playlist: playlist.name
                        });
                    }
                }
            } catch (e) {
                console.warn(`Failed to load ${playlist.matches_file}:`, e);
            }
        }

        // Sort chronologically (oldest first = game #1)
        games.sort((a, b) => {
            const timeA = parseGameDateTime(a.timestamp) || new Date(0);
            const timeB = parseGameDateTime(b.timestamp) || new Date(0);
            return timeA - timeB;
        });
    } catch (e) {
        console.error('Failed to load playlists:', e);
    }
    return games;
}

async function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // Support path-based URL: /theater/{gameNumber}
    const pathMatch = window.location.pathname.match(/\/theater\/(\d+)/);
    if (pathMatch) {
        const gameNumber = parseInt(pathMatch[1]);
        // Load games data from playlist files
        try {
            const games = await loadGamesData();
            if (gameNumber >= 1 && gameNumber <= games.length) {
                const game = games[gameNumber - 1]; // 1-indexed for users
                // Derive telemetry filename from source_file
                if (game.source_file) {
                    telemetryFile = game.source_file.replace('.xlsx', '_theater.csv');
                }
                mapName = game.map || 'Unknown';
                gameInfo = {
                    map: mapName,
                    gameType: game.gametype || '',
                    date: game.timestamp || '',
                    variant: game.gametype || ''
                };
            } else {
                console.error(`Game #${gameNumber} not found (${games.length} games available)`);
            }
        } catch (e) {
            console.error('Failed to load games:', e);
        }
    } else {
        telemetryFile = params.get('telemetry') || '';
        mapName = params.get('map') || 'Midship';
        gameInfo = {
            map: mapName,
            gameType: params.get('gametype') || '',
            date: params.get('date') || '',
            variant: params.get('variant') || ''
        };
    }

    document.getElementById('mapName').textContent = mapName;
    document.getElementById('gameType').textContent = gameInfo.variant || gameInfo.gameType;
    document.getElementById('gameDate').textContent = gameInfo.date;
}

function setupScene() {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('glb-canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    scene.fog = new THREE.Fog(0x0a0a12, 50, 200);

    camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, CONFIG.defaultCameraHeight, 0);
    camera.up.set(0, 1, 0); // Y-up (standard)
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
    // Strong ambient light for base visibility (especially interiors)
    const ambientLight = new THREE.AmbientLight(0x606070, 1.2);
    scene.add(ambientLight);

    // Hemisphere light for natural sky/ground gradient
    const hemiLight = new THREE.HemisphereLight(0xaaccff, 0x444422, 0.8);
    scene.add(hemiLight);

    // Main directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
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

    // Fill lights from multiple angles to illuminate interiors
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight1.position.set(-50, 30, -50);
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight2.position.set(50, 30, -50);
    scene.add(fillLight2);

    const fillLight3 = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight3.position.set(-50, 30, 50);
    scene.add(fillLight3);

    // Bottom fill light to reduce harsh shadows in enclosed spaces
    const bottomFill = new THREE.DirectionalLight(0x8888aa, 0.3);
    bottomFill.position.set(0, -50, 0);
    scene.add(bottomFill);
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

    // View controls - single cycling button
    document.getElementById('viewModeBtn')?.addEventListener('click', () => cycleViewMode());
    document.getElementById('followPlayerSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            followPlayer = e.target.value;
            selectedPlayerIndex = players.findIndex(p => p.name === e.target.value);
            setViewMode('follow');
        }
    });

    // Controls panel toggle
    document.getElementById('controlsCollapseBtn')?.addEventListener('click', toggleControlsPanel);
    document.getElementById('inputToggleBtn')?.addEventListener('click', toggleInputType);

    // Rotation calibration sliders
    setupCalibrationPanel();

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

    // LT for dynamic sprint (pressure sensitive)
    const ltValue = gamepad.buttons[6]?.value || 0;
    // Map LT pressure: 0 = 1x, full press = sprintMultiplier (2.5x)
    const sprintModifier = 1 + (ltValue * (CONFIG.sprintMultiplier - 1));

    // Movement (left stick) - only in free mode
    if (viewMode === 'free' && (leftX !== 0 || leftY !== 0)) {
        const speed = CONFIG.gamepadMoveSpeed * deltaTime * sprintModifier;
        const direction = new THREE.Vector3();

        // Get camera forward direction (where it's looking)
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);

        // Get right vector (perpendicular to forward and up)
        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();

        // Left stick: forward/back and strafe
        direction.addScaledVector(forward, -leftY); // Forward/back
        direction.addScaledVector(right, leftX);    // Strafe left/right

        camera.position.addScaledVector(direction, speed);
    }

    // Look (right stick) - only in free mode
    if (viewMode === 'free' && (rightX !== 0 || rightY !== 0)) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);

        euler.y -= rightX * CONFIG.gamepadLookSensitivity; // Yaw (left/right)
        euler.x -= rightY * CONFIG.gamepadLookSensitivity; // Pitch (up/down)
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

        camera.quaternion.setFromEuler(euler);
    }

    // LB/RB for player cycling
    if (gamepad.buttons[4]?.pressed && !gamepad.buttons[4]._lastState) { // LB - previous player
        cyclePlayer(-1);
    }
    gamepad.buttons[4]._lastState = gamepad.buttons[4]?.pressed;

    if (gamepad.buttons[5]?.pressed && !gamepad.buttons[5]._lastState) { // RB - next player
        cyclePlayer(1);
    }
    gamepad.buttons[5]._lastState = gamepad.buttons[5]?.pressed;

    // Play/Pause (A button) - only on press, not hold
    if (gamepad.buttons[0]?.pressed && !gamepad.buttons[0]._lastState) {
        togglePlayPause();
    }
    gamepad.buttons[0]._lastState = gamepad.buttons[0]?.pressed;

    // DPad Up - increase speed
    if (gamepad.buttons[12]?.pressed && !gamepad.buttons[12]._lastState) {
        changeSpeed(1);
    }
    gamepad.buttons[12]._lastState = gamepad.buttons[12]?.pressed;

    // DPad Down - toggle killfeed
    if (gamepad.buttons[13]?.pressed && !gamepad.buttons[13]._lastState) {
        toggleKillfeed();
    }
    gamepad.buttons[13]._lastState = gamepad.buttons[13]?.pressed;

    // DPad Left/Right for timeline skip (10 seconds)
    if (gamepad.buttons[14]?.pressed && !gamepad.buttons[14]._lastState) { // DPad Left - skip back
        skip(-10);
    }
    gamepad.buttons[14]._lastState = gamepad.buttons[14]?.pressed;

    if (gamepad.buttons[15]?.pressed && !gamepad.buttons[15]._lastState) { // DPad Right - skip forward
        skip(10);
    }
    gamepad.buttons[15]._lastState = gamepad.buttons[15]?.pressed;

    // X button (2) for player names toggle
    if (gamepad.buttons[2]?.pressed && !gamepad.buttons[2]._lastState) {
        togglePlayerNames();
    }
    gamepad.buttons[2]._lastState = gamepad.buttons[2]?.pressed;

    // B button (1) for trails toggle
    if (gamepad.buttons[1]?.pressed && !gamepad.buttons[1]._lastState) {
        toggleTrails();
    }
    gamepad.buttons[1]._lastState = gamepad.buttons[1]?.pressed;

    // View mode (Y button cycles views)
    if (gamepad.buttons[3]?.pressed && !gamepad.buttons[3]._lastState) {
        cycleViewMode();
    }
    gamepad.buttons[3]._lastState = gamepad.buttons[3]?.pressed;

    // Back button (button 8) toggles scoreboard
    if (gamepad.buttons[8]?.pressed && !gamepad.buttons[8]._lastState) {
        toggleScoreboard();
    }
    gamepad.buttons[8]._lastState = gamepad.buttons[8]?.pressed;

    // Right stick click (RS = button 11) - toggle top-down view
    if (gamepad.buttons[11]?.pressed && !gamepad.buttons[11]._lastState) {
        toggleTopDown();
    }
    gamepad.buttons[11]._lastState = gamepad.buttons[11]?.pressed;

    // RT for dynamic playback speed (light press = slower, full press = faster)
    const rtValue = gamepad.buttons[7]?.value || 0;
    if (rtValue > 0.1) {
        // Map RT pressure to speed multiplier: 0.1-1.0 -> 1.5x to 8x
        const dynamicSpeed = 1 + (rtValue * 7); // 1.5x at light press, 8x at full press
        dynamicSpeedMultiplier = dynamicSpeed;
    } else {
        dynamicSpeedMultiplier = 1;
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
    const modes = ['free', 'follow', 'orbit', 'top'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setViewMode(modes[nextIndex]);
}

function toggleTopDown() {
    if (viewMode === 'top') {
        // Return to previous view mode
        setViewMode(previousViewMode !== 'top' ? previousViewMode : 'free');
    } else {
        // Save current mode and switch to top-down
        previousViewMode = viewMode;
        setViewMode('top');
    }
}

// Cycle through players
function cyclePlayer(direction) {
    if (players.length === 0) return;

    selectedPlayerIndex = (selectedPlayerIndex + direction + players.length) % players.length;
    const player = players[selectedPlayerIndex];
    followPlayer = player.name;

    // Update the follow select dropdown
    const select = document.getElementById('followPlayerSelect');
    if (select) {
        select.value = player.name;
    }

    // Show notification
    showPlayerSelectNotification(player.name);

    // If in follow mode, stay in follow mode. Otherwise switch to follow.
    if (viewMode !== 'free') {
        setViewMode('follow');
    }
}

function showPlayerSelectNotification(playerName) {
    // Remove existing notification
    const existing = document.querySelector('.player-select-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'player-select-notification';
    notification.textContent = playerName;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 1500);
}

// Toggle controls panel collapse
function toggleControlsPanel() {
    controlsCollapsed = !controlsCollapsed;
    const hint = document.getElementById('controls-hint');
    if (hint) {
        hint.classList.toggle('collapsed', controlsCollapsed);
    }
}

// Toggle between keyboard and controller hints
function toggleInputType() {
    showKeyboardControls = !showKeyboardControls;
    const keyboardDiv = document.getElementById('keyboardControls');
    const controllerDiv = document.getElementById('controllerControls');
    const inputText = document.getElementById('inputTypeText');

    if (keyboardDiv && controllerDiv) {
        keyboardDiv.style.display = showKeyboardControls ? 'block' : 'none';
        controllerDiv.style.display = showKeyboardControls ? 'none' : 'block';
    }
    if (inputText) {
        inputText.textContent = showKeyboardControls ? 'Keyboard' : 'Controller';
    }
}

// Setup rotation calibration panel
function setupCalibrationPanel() {
    const rotXSlider = document.getElementById('rotationX');
    const rotYSlider = document.getElementById('rotationY');
    const rotZSlider = document.getElementById('rotationZ');
    const rotXValue = document.getElementById('rotXValue');
    const rotYValue = document.getElementById('rotYValue');
    const rotZValue = document.getElementById('rotZValue');
    const resetBtn = document.getElementById('resetRotation');
    const toggleBtn = document.getElementById('calibrationToggle');
    const content = document.getElementById('calibrationContent');

    if (rotXSlider) {
        rotXSlider.addEventListener('input', (e) => {
            const deg = parseInt(e.target.value);
            rotationOffsetX = deg * Math.PI / 180;
            if (rotXValue) rotXValue.textContent = `${deg}°`;
            updatePlayerPositions();
        });
    }

    if (rotYSlider) {
        rotYSlider.addEventListener('input', (e) => {
            const deg = parseInt(e.target.value);
            rotationOffsetY = deg * Math.PI / 180;
            if (rotYValue) rotYValue.textContent = `${deg}°`;
            updatePlayerPositions();
        });
    }

    if (rotZSlider) {
        rotZSlider.addEventListener('input', (e) => {
            const deg = parseInt(e.target.value);
            rotationOffsetZ = deg * Math.PI / 180;
            if (rotZValue) rotZValue.textContent = `${deg}°`;
            updatePlayerPositions();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            rotationOffsetX = 0;
            rotationOffsetY = Math.PI;
            rotationOffsetZ = 0;
            if (rotXSlider) rotXSlider.value = 0;
            if (rotYSlider) rotYSlider.value = 180;
            if (rotZSlider) rotZSlider.value = 0;
            if (rotXValue) rotXValue.textContent = '0°';
            if (rotYValue) rotYValue.textContent = '180°';
            if (rotZValue) rotZValue.textContent = '0°';
            updatePlayerPositions();
            showGamepadNotification('Rotation Reset');
        });
    }

    if (toggleBtn && content) {
        toggleBtn.addEventListener('click', () => {
            content.classList.toggle('collapsed');
            toggleBtn.textContent = content.classList.contains('collapsed') ? '+' : '−';
        });
    }
}

// Toggle player names visibility on waypoints
function togglePlayerNames() {
    showPlayerNames = !showPlayerNames;
    // Recreate player markers to update waypoint canvases
    recreateWaypoints();
    showGamepadNotification(showPlayerNames ? 'Names: ON' : 'Names: OFF');
}

// Recreate waypoints with current name visibility setting
async function recreateWaypoints() {
    // Load all emblems first
    const emblemImages = {};
    await Promise.all(players.map(async player => {
        if (player.emblemUrl) {
            emblemImages[player.name] = await loadEmblemImage(player.emblemUrl);
        }
    }));

    players.forEach(player => {
        const marker = playerMarkers[player.name];
        if (!marker) return;

        // Get team color for name display
        const teamColor = player.team.includes('red') || player.team === '_game_team_red' ? 0xff3333 :
                          player.team.includes('blue') || player.team === '_game_team_blue' ? 0x3399ff : player.color;

        // Create new waypoint canvas
        const emblemImage = emblemImages[player.name];
        const waypointCanvas = createWaypointCanvas(player.name, player.color, emblemImage, teamColor);
        const labelTexture = new THREE.CanvasTexture(waypointCanvas);

        // Update the sprite material
        if (marker.label && marker.label.material) {
            marker.label.material.map.dispose();
            marker.label.material.map = labelTexture;
            marker.label.material.needsUpdate = true;
        }
    });
}

function showGamepadNotification(message) {
    // Remove any existing notifications first to prevent stacking
    document.querySelectorAll('.gamepad-notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'gamepad-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
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
        case 'BracketLeft': // [ key - previous player (like LB)
            e.preventDefault();
            cyclePlayer(-1);
            break;
        case 'BracketRight': // ] key - next player (like RB)
            e.preventDefault();
            cyclePlayer(1);
            break;
        case 'Comma': // < key - skip back
            e.preventDefault();
            skip(-CONFIG.skipSeconds);
            break;
        case 'Period': // > key - skip forward
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
        case 'ArrowLeft':
            e.preventDefault();
            cyclePlayer(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            cyclePlayer(1);
            break;
        case 'KeyY':
            cycleViewMode();
            break;
        case 'Digit1':
            setViewMode('free');
            break;
        case 'Digit2':
            setViewMode('follow');
            break;
        case 'Digit3':
            setViewMode('orbit');
            break;
        case 'Digit4':
            setViewMode('top');
            break;
        case 'KeyT':
            toggleTopDown();
            break;
        case 'Tab':
            e.preventDefault();
            toggleScoreboard();
            break;
        case 'KeyK':
            toggleKillfeed();
            break;
        case 'KeyP':
            togglePlayerNames();
            break;
        case 'KeyL':
            toggleTrails();
            break;
        case 'KeyZ':
            // Z key for speed boost - handled in animation loop via keys state
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

    // Standard FPS look: yaw around Y, pitch around X
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);

    euler.y -= movementX * CONFIG.lookSensitivity; // Yaw (left/right)
    euler.x -= movementY * CONFIG.lookSensitivity; // Pitch (up/down)

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

    // Get camera forward direction (where it's looking)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    // Get right vector (perpendicular to forward and up)
    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // WASD: forward/back in look direction, strafe left/right
    if (keys['KeyW']) direction.add(forward);
    if (keys['KeyS']) direction.sub(forward);
    if (keys['KeyA']) direction.sub(right);
    if (keys['KeyD']) direction.add(right);

    // Vertical movement (Y-up)
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

// Load Master Chief helmet model for player markers
async function loadHelmetModel() {
    return new Promise((resolve) => {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            '/maps3D/MasterChief.glb',
            (gltf) => {
                helmetModel = gltf.scene;
                // Center the model if needed
                const box = new THREE.Box3().setFromObject(helmetModel);
                const center = box.getCenter(new THREE.Vector3());
                helmetModel.position.sub(center);
                console.log('Master Chief helmet model loaded');
                resolve();
            },
            undefined,
            (error) => {
                console.warn('Failed to load MasterChief.glb, using fallback markers:', error);
                helmetModel = null;
                resolve();
            }
        );
    });
}

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

        // Load helmet model for player markers
        loadingText.textContent = 'Loading player models...';
        await loadHelmetModel();

        await createPlayerMarkers();
        loadingOverlay.style.display = 'none';
        positionCameraToFit();

        // Set initial view mode
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
        // Generate emblem URL - use relative path if on same domain, otherwise use emblem server
        // Note: For HTTPS pages, emblem server must also be HTTPS or use a proxy
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

    // Detect FFA: more than 2 unique teams means FFA (use white helmets)
    const uniqueTeams = new Set(players.map(p => p.team).filter(t => t && t !== 'none' && t !== ''));
    const isFFA = uniqueTeams.size > 2 || uniqueTeams.size === 0;

    players.forEach(player => {
        const group = new THREE.Group();
        group.name = `player_${player.name}`;

        // Helmet container for pitch rotation
        const helmetPivot = new THREE.Group();
        let helmet = null;

        // Determine helmet color: white for FFA, red/blue for teams
        let helmetColor;
        if (isFFA) {
            helmetColor = 0xffffff; // White for FFA
        } else if (player.team.includes('red') || player.team === '_game_team_red') {
            helmetColor = 0xff3333; // Red team
        } else if (player.team.includes('blue') || player.team === '_game_team_blue') {
            helmetColor = 0x3399ff; // Blue team
        } else {
            helmetColor = 0xffffff; // Default white
        }

        if (helmetModel) {
            // Clone the helmet model
            helmet = helmetModel.clone();

            // Apply team color to all meshes in the helmet
            helmet.traverse((child) => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.color.setHex(helmetColor);
                    child.material.emissive = new THREE.Color(helmetColor);
                    child.material.emissiveIntensity = 0.15;
                    child.castShadow = true;
                }
            });

            // Scale helmet to appropriate size (adjust based on model)
            helmet.scale.set(0.8, 0.8, 0.8);
            helmetPivot.add(helmet);
        } else {
            // Fallback: sphere head if helmet not loaded
            const headGeometry = new THREE.SphereGeometry(CONFIG.playerMarkerSize * 0.4, 16, 16);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: helmetColor,
                metalness: 0.5,
                roughness: 0.5,
                emissive: helmetColor,
                emissiveIntensity: 0.15
            });
            helmet = new THREE.Mesh(headGeometry, headMaterial);
            helmet.castShadow = true;
            helmetPivot.add(helmet);
        }

        // Position helmet at head height
        helmetPivot.position.y = CONFIG.playerMarkerHeight * 0.8;
        group.add(helmetPivot);

        // Use waypoint canvas with emblem if available
        const emblemImage = emblemImages[player.name];
        // Get team color for name display
        const teamColor = player.team.includes('red') || player.team === '_game_team_red' ? 0xff3333 :
                          player.team.includes('blue') || player.team === '_game_team_blue' ? 0x3399ff : player.color;
        const waypointCanvas = createWaypointCanvas(player.name, player.color, emblemImage, teamColor);
        const labelTexture = new THREE.CanvasTexture(waypointCanvas);
        const labelMaterial = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true,
            depthTest: false
        });
        const label = new THREE.Sprite(labelMaterial);
        label.scale.set(2.5, 3.5, 1);
        label.position.y = CONFIG.playerMarkerHeight + 2.5;
        group.add(label);

        const glow = new THREE.PointLight(helmetColor, 0.5, 3);
        glow.position.y = CONFIG.playerMarkerHeight * 0.5;
        group.add(glow);

        scene.add(group);

        // Create trail line for this player
        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(TRAIL_MAX_POINTS * 3);
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeometry.setDrawRange(0, 0);
        const trailMaterial = new THREE.LineBasicMaterial({
            color: helmetColor,
            transparent: true,
            opacity: 0.6
        });
        const trailLine = new THREE.Line(trailGeometry, trailMaterial);
        trailLine.visible = showTrails;
        scene.add(trailLine);

        // Initialize trail array for this player
        playerTrails[player.name] = [];

        playerMarkers[player.name] = { group, helmet, helmetPivot, label, player, emblemImage, helmetColor, trailLine };
    });
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

// Create a Halo-style waypoint canvas with emblem box, name (if enabled), and arrow
function createWaypointCanvas(text, color, emblemImage = null, teamColor = null) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = showPlayerNames ? 180 : 120; // Smaller if no name
    const ctx = canvas.getContext('2d');

    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
    const teamColorHex = teamColor ? `#${teamColor.toString(16).padStart(6, '0')}` : colorHex;

    // Emblem box dimensions
    const boxSize = 64;
    const boxX = (canvas.width - boxSize) / 2;
    const boxY = 10;

    // Draw emblem box background (white border like Halo 2)
    ctx.fillStyle = 'rgba(40, 40, 50, 0.95)';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // Draw emblem if available
    if (emblemImage && emblemImage.complete) {
        ctx.drawImage(emblemImage, boxX + 4, boxY + 4, boxSize - 8, boxSize - 8);
    } else {
        // Draw player initial as fallback
        ctx.font = 'bold 32px Orbitron, sans-serif';
        ctx.fillStyle = colorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.charAt(0).toUpperCase(), canvas.width / 2, boxY + boxSize / 2);
    }

    let arrowY;
    if (showPlayerNames) {
        // Draw player name below box (in team color)
        const nameY = boxY + boxSize + 8;
        ctx.font = 'bold 14px Overpass, sans-serif';
        ctx.fillStyle = teamColorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(text.substring(0, 12), canvas.width / 2, nameY);
        ctx.shadowBlur = 0;
        arrowY = nameY + 20;
    } else {
        arrowY = boxY + boxSize + 8;
    }

    // Draw blue waypoint arrow
    const arrowSize = 12;
    ctx.fillStyle = '#00aaff';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, arrowY + arrowSize);  // Bottom point
    ctx.lineTo(canvas.width / 2 - arrowSize / 2, arrowY);  // Top left
    ctx.lineTo(canvas.width / 2 + arrowSize / 2, arrowY);  // Top right
    ctx.closePath();
    ctx.fill();

    return canvas;
}

// Load emblem image async
function loadEmblemImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// Update waypoint appearance based on death state
function updateWaypointDeathState(marker) {
    if (!marker || !marker.label) return;

    const wasDead = marker._wasDead || false;
    const isDead = marker.isDead || false;

    // Only update if state changed
    if (wasDead !== isDead) {
        marker._wasDead = isDead;

        if (isDead) {
            // Create death waypoint (X instead of emblem)
            const deathCanvas = createDeathWaypointCanvas();
            const deathTexture = new THREE.CanvasTexture(deathCanvas);
            marker.label.material.map.dispose();
            marker.label.material.map = deathTexture;
            marker.label.material.needsUpdate = true;
            marker.label.scale.set(2.0, 2.5, 1); // Smaller for death marker
        } else if (marker.player) {
            // Restore normal waypoint
            const player = marker.player;
            const teamColor = player.team.includes('red') || player.team === '_game_team_red' ? 0xff3333 :
                              player.team.includes('blue') || player.team === '_game_team_blue' ? 0x3399ff : player.color;
            const waypointCanvas = createWaypointCanvas(player.name, player.color, marker.emblemImage, teamColor);
            const labelTexture = new THREE.CanvasTexture(waypointCanvas);
            marker.label.material.map.dispose();
            marker.label.material.map = labelTexture;
            marker.label.material.needsUpdate = true;
            marker.label.scale.set(2.5, showPlayerNames ? 3.5 : 2.4, 1);
        }
    }
}

// Create a death waypoint canvas with X
function createDeathWaypointCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    // Box with X
    const boxSize = 64;
    const boxX = (canvas.width - boxSize) / 2;
    const boxY = 5;

    // Dark background
    ctx.fillStyle = 'rgba(60, 20, 20, 0.9)';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);

    // Red border
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // Big red X
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    const padding = 12;
    ctx.beginPath();
    ctx.moveTo(boxX + padding, boxY + padding);
    ctx.lineTo(boxX + boxSize - padding, boxY + boxSize - padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(boxX + boxSize - padding, boxY + padding);
    ctx.lineTo(boxX + padding, boxY + boxSize - padding);
    ctx.stroke();

    return canvas;
}

// Helper to interpolate between two values
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Helper to interpolate angles (handles wraparound)
function lerpAngle(a, b, t) {
    let diff = b - a;
    // Normalize to -PI to PI
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
}

function updatePlayerPositions() {
    // Build interpolated positions for each player
    const playerInterpolated = {};

    for (const player of players) {
        let before = null;
        let after = null;

        // Find the two telemetry entries bracketing currentTimeMs for this player
        for (let i = 0; i < telemetryData.length; i++) {
            const row = telemetryData[i];
            if (row.playerName !== player.name) continue;

            if (row.gameTimeMs <= currentTimeMs) {
                before = row;
            } else if (!after) {
                after = row;
                break; // Found both, stop searching
            }
        }

        if (before && after && after.gameTimeMs !== before.gameTimeMs) {
            // Interpolate between before and after
            const t = (currentTimeMs - before.gameTimeMs) / (after.gameTimeMs - before.gameTimeMs);
            const clampedT = Math.max(0, Math.min(1, t));

            playerInterpolated[player.name] = {
                x: lerp(before.x, after.x, clampedT),
                y: lerp(before.y, after.y, clampedT),
                z: lerp(before.z, after.z, clampedT),
                facingYaw: lerpAngle(before.facingYaw || 0, after.facingYaw || 0, clampedT),
                facingPitch: lerp(before.facingPitch || 0, after.facingPitch || 0, clampedT),
                isCrouching: before.isCrouching,
                gameTimeMs: currentTimeMs
            };
        } else if (before) {
            // Only have a before point, use it directly
            playerInterpolated[player.name] = before;
        } else if (after) {
            // Only have an after point, use it
            playerInterpolated[player.name] = after;
        }
    }

    for (const player of players) {
        const marker = playerMarkers[player.name];
        if (!marker) continue;

        const pos = playerInterpolated[player.name];

        // Check if position is valid (not at origin which indicates dead/respawning)
        const isValidPosition = pos && (Math.abs(pos.x) > 0.1 || Math.abs(pos.y) > 0.1 || Math.abs(pos.z) > 0.1);

        if (isValidPosition) {
            // Store last known valid position
            lastKnownPositions[player.name] = {
                x: pos.x, y: pos.y, z: pos.z,
                facingYaw: pos.facingYaw,
                facingPitch: pos.facingPitch,
                isCrouching: pos.isCrouching
            };

            // Convert from Halo coords (Z-up) to Three.js (Y-up): X stays, Z becomes Y, Y becomes -Z
            const threePos = { x: pos.x, y: pos.z, z: -pos.y };
            marker.group.position.set(threePos.x, threePos.y, threePos.z);
            // Apply facing direction (yaw) to the group with calibration offsets
            if (!isNaN(pos.facingYaw)) {
                marker.group.rotation.set(rotationOffsetX, pos.facingYaw + rotationOffsetY, rotationOffsetZ);
            }

            // Update trail
            if (showTrails && marker.trailLine) {
                const trail = playerTrails[player.name];
                const lastTrailPos = trail.length > 0 ? trail[trail.length - 1] : null;
                // Only add point if moved enough distance
                if (!lastTrailPos ||
                    Math.abs(threePos.x - lastTrailPos.x) > 0.1 ||
                    Math.abs(threePos.y - lastTrailPos.y) > 0.1 ||
                    Math.abs(threePos.z - lastTrailPos.z) > 0.1) {
                    trail.push({ x: threePos.x, y: threePos.y, z: threePos.z });
                    if (trail.length > TRAIL_MAX_POINTS) trail.shift();
                    updateTrailGeometry(marker.trailLine, trail);
                }
            }

            // Apply pitch to the helmet pivot (looking up/down)
            if (marker.helmetPivot && !isNaN(pos.facingPitch)) {
                marker.helmetPivot.rotation.x = -pos.facingPitch; // Negative for proper direction
            }

            // Handle crouch - lower helmet position
            if (marker.helmetPivot) {
                if (pos.isCrouching) {
                    marker.helmetPivot.position.y = CONFIG.playerMarkerHeight * 0.5; // Lower when crouching
                } else {
                    marker.helmetPivot.position.y = CONFIG.playerMarkerHeight * 0.8; // Normal height
                }
            }

            marker.group.visible = true;
            marker.isDead = false;

            // Show helmet
            if (marker.helmet) marker.helmet.visible = true;

        } else if (lastKnownPositions[player.name]) {
            // Player is dead - keep at last known position
            const lastPos = lastKnownPositions[player.name];
            marker.group.position.set(lastPos.x, lastPos.z, -lastPos.y);
            if (!isNaN(lastPos.facingYaw)) {
                marker.group.rotation.set(rotationOffsetX, lastPos.facingYaw + rotationOffsetY, rotationOffsetZ);
            }

            marker.group.visible = true;
            marker.isDead = true;

            // Hide helmet when dead
            if (marker.helmet) marker.helmet.visible = false;

        } else {
            // No position data ever - hide completely
            marker.group.visible = false;
            marker.isDead = false;
        }

        // Update waypoint appearance based on death state
        updateWaypointDeathState(marker);
    }

    // Follow camera (Y-up)
    if (viewMode === 'follow' && followPlayer) {
        const marker = playerMarkers[followPlayer];
        if (marker && marker.group.visible) {
            const targetPos = marker.group.position.clone();
            targetPos.y += CONFIG.followCameraHeight; // Y-up

            const offset = new THREE.Vector3(0, 0, CONFIG.followCameraDistance); // Behind in Z
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), marker.group.rotation.y);

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

    // Update the view mode button text
    const viewModeText = document.getElementById('viewModeText');
    const viewModeBtn = document.getElementById('viewModeBtn');
    if (viewModeText) {
        const modeNames = { free: 'Free', follow: 'Follow', orbit: 'Orbit', top: 'Top' };
        viewModeText.textContent = modeNames[mode] || mode;
    }
    if (viewModeBtn) {
        viewModeBtn.classList.add('active');
    }

    const followSelect = document.getElementById('followPlayerSelect');
    followSelect.style.display = mode === 'follow' ? 'block' : 'none';

    // Standard Y-up
    camera.up.set(0, 1, 0);

    if (mode === 'top') {
        controls.enabled = false;
        camera.position.set(0, CONFIG.defaultCameraHeight, 0);
        camera.lookAt(0, 0, 0);
    } else if (mode === 'free') {
        controls.enabled = false;
    } else if (mode === 'orbit') {
        controls.enabled = true;
    } else if (mode === 'follow') {
        controls.enabled = true;
        // Auto-select first player if none selected
        if (!followPlayer && players.length > 0) {
            followPlayer = players[0].name;
            selectedPlayerIndex = 0;
            const select = document.getElementById('followPlayerSelect');
            if (select) select.value = followPlayer;
        }
    }
}

function positionCameraToFit() {
    if (telemetryData.length === 0 || players.length === 0) return;

    // Get initial positions for all players (first occurrence of each)
    const initialPositions = {};
    for (const row of telemetryData) {
        if (!initialPositions[row.playerName]) {
            initialPositions[row.playerName] = { x: row.x, y: row.y, z: row.z };
        }
        // Stop once we have all players
        if (Object.keys(initialPositions).length >= players.length) break;
    }

    // Calculate average position of all players at game start
    let avgX = 0, avgY = 0, avgZ = 0;
    const positions = Object.values(initialPositions);
    positions.forEach(pos => {
        avgX += pos.x;
        avgY += pos.y;
        avgZ += pos.z;
    });
    avgX /= positions.length;
    avgY /= positions.length;
    avgZ /= positions.length;

    // Convert Halo coords (Z-up) to Three.js (Y-up)
    // Start camera above average player position, looking down at slight angle
    const camX = avgX;
    const camY = avgZ + 15;  // Above players (Halo Z -> Three.js Y)
    const camZ = -avgY + 10; // Behind players (Halo Y -> Three.js -Z)

    camera.position.set(camX, camY, camZ);
    controls.target.set(avgX, avgZ, -avgY);
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

        const color = document.createElement('div');
        color.className = 'player-color';
        color.style.backgroundColor = `#${player.color.toString(16).padStart(6, '0')}`;

        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = player.name;

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

        item.appendChild(color);
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
        option.value = player.name;
        option.textContent = player.name;
        select.appendChild(option);
    });
}

// ===== Player Trails =====
function updateTrailGeometry(trailLine, trail) {
    const positions = trailLine.geometry.attributes.position.array;
    for (let i = 0; i < trail.length; i++) {
        positions[i * 3] = trail[i].x;
        positions[i * 3 + 1] = trail[i].y;
        positions[i * 3 + 2] = trail[i].z;
    }
    trailLine.geometry.attributes.position.needsUpdate = true;
    trailLine.geometry.setDrawRange(0, trail.length);
}

function toggleTrails() {
    showTrails = !showTrails;
    // Update trail visibility for all players
    Object.values(playerMarkers).forEach(marker => {
        if (marker.trailLine) {
            marker.trailLine.visible = showTrails;
        }
    });
    // Clear trails when turning off
    if (!showTrails) {
        Object.keys(playerTrails).forEach(name => {
            playerTrails[name] = [];
            const marker = playerMarkers[name];
            if (marker && marker.trailLine) {
                marker.trailLine.geometry.setDrawRange(0, 0);
            }
        });
    }
    showGamepadNotification(`Trails: ${showTrails ? 'ON' : 'OFF'}`);
}

// ===== Scoreboard =====
function toggleScoreboard() {
    scoreboardVisible = !scoreboardVisible;
    const scoreboard = document.getElementById('scoreboard');
    if (scoreboard) {
        scoreboard.style.display = scoreboardVisible ? 'flex' : 'none';
        if (scoreboardVisible) {
            updateScoreboard();
        }
    }
}

function updateScoreboard() {
    const redContainer = document.getElementById('red-team-players');
    const blueContainer = document.getElementById('blue-team-players');
    if (!redContainer || !blueContainer) return;

    const redPlayers = [];
    const bluePlayers = [];

    players.forEach(player => {
        const stats = playerStats[player.name] || { kills: 0, deaths: 0, score: 0 };
        const marker = playerMarkers[player.name];
        const isDead = marker && !marker.group.visible;

        const playerData = {
            name: player.name,
            emblemUrl: player.emblemUrl,
            kills: stats.kills,
            deaths: stats.deaths,
            score: stats.score,
            weapon: stats.weapon || 'Unknown',
            isDead: isDead
        };

        if (player.team.includes('red') || player.team === '_game_team_red') {
            redPlayers.push(playerData);
        } else if (player.team.includes('blue') || player.team === '_game_team_blue') {
            bluePlayers.push(playerData);
        }
    });

    // Sort by selected column
    const sortFn = (a, b) => {
        const aVal = a[scoreboardSortColumn] || 0;
        const bVal = b[scoreboardSortColumn] || 0;
        return scoreboardSortAscending ? aVal - bVal : bVal - aVal;
    };
    redPlayers.sort(sortFn);
    bluePlayers.sort(sortFn);

    // Calculate team totals
    const redScore = redPlayers.reduce((sum, p) => sum + p.score, 0);
    const blueScore = bluePlayers.reduce((sum, p) => sum + p.score, 0);

    document.getElementById('red-team-score').textContent = redScore;
    document.getElementById('blue-team-score').textContent = blueScore;

    // Render sortable header and players
    const headerHtml = renderScoreboardHeader();
    redContainer.innerHTML = headerHtml + redPlayers.map(p => renderScoreboardPlayer(p)).join('');
    blueContainer.innerHTML = headerHtml + bluePlayers.map(p => renderScoreboardPlayer(p)).join('');

    // Add click handlers to headers
    document.querySelectorAll('.scoreboard-sort').forEach(el => {
        el.onclick = () => sortScoreboard(el.dataset.sort);
    });
}

function renderScoreboardHeader() {
    const arrow = (col) => {
        if (scoreboardSortColumn !== col) return '';
        return scoreboardSortAscending ? ' ▲' : ' ▼';
    };
    return `
        <div class="scoreboard-header-row">
            <span class="header-spacer"></span>
            <span class="header-name">Player</span>
            <div class="header-stats">
                <span class="scoreboard-sort" data-sort="kills">K${arrow('kills')}</span>
                <span class="scoreboard-sort" data-sort="deaths">D${arrow('deaths')}</span>
            </div>
        </div>
    `;
}

function sortScoreboard(column) {
    if (scoreboardSortColumn === column) {
        // Toggle direction
        scoreboardSortAscending = !scoreboardSortAscending;
    } else {
        scoreboardSortColumn = column;
        scoreboardSortAscending = false; // Default to descending
    }
    updateScoreboard();
}

function renderScoreboardPlayer(player) {
    const emblemHtml = player.isDead
        ? '<div class="player-emblem dead-emblem"><span class="dead-x">X</span></div>'
        : `<div class="player-emblem"><img src="${player.emblemUrl}" alt="" onerror="this.parentElement.innerHTML='?'"></div>`;

    return `
        <div class="scoreboard-player ${player.isDead ? 'dead' : ''}">
            ${emblemHtml}
            <span class="player-name">${player.name}</span>
            <div class="player-stats">
                <span>K${player.kills}</span>
                <span>D${player.deaths}</span>
            </div>
        </div>
    `;
}

// ===== Killfeed =====
function toggleKillfeed() {
    killfeedVisible = !killfeedVisible;
    const killfeed = document.getElementById('killfeed');
    if (killfeed) {
        killfeed.classList.toggle('hidden', !killfeedVisible);
    }
}

function addKillEntry(killerName, victimName, weapon) {
    if (!killfeedVisible) return;

    const killfeed = document.getElementById('killfeed');
    if (!killfeed) return;

    // Find players to get team colors
    const killer = players.find(p => p.name === killerName);
    const victim = players.find(p => p.name === victimName);

    const killerIsBlue = killer && (killer.team.includes('blue') || killer.team === '_game_team_blue');
    const victimIsBlue = victim && (victim.team.includes('blue') || victim.team === '_game_team_blue');

    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.innerHTML = `
        <span class="killer ${killerIsBlue ? 'blue' : ''}">${killerName}</span>
        <span class="weapon-icon"><img src="weapons/${weapon.toLowerCase().replace(/\s+/g, '_')}.png" alt="${weapon}" onerror="this.parentElement.textContent='[${weapon}]'"></span>
        <span class="victim ${victimIsBlue ? 'blue' : ''}">${victimName}</span>
    `;

    // Insert at top
    killfeed.insertBefore(entry, killfeed.firstChild);

    // Remove after animation completes
    setTimeout(() => {
        if (entry.parentElement) {
            entry.remove();
        }
    }, 3000);

    // Limit entries
    while (killfeed.children.length > 6) {
        killfeed.removeChild(killfeed.lastChild);
    }
}


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

    // Check Z key for keyboard speed boost
    if (keys['KeyZ']) {
        dynamicSpeedMultiplier = 4; // 4x speed when Z held
    } else if (dynamicSpeedMultiplier > 1 && !keys['KeyZ']) {
        // Only reset if it was set by keyboard (gamepad handles its own reset)
        const gamepad = navigator.getGamepads()[gamepadIndex];
        const rtValue = gamepad?.buttons[7]?.value || 0;
        if (rtValue <= 0.1) {
            dynamicSpeedMultiplier = 1;
        }
    }

    // Update playback with dynamic speed multiplier
    if (isPlaying || dynamicSpeedMultiplier > 1) {
        const effectiveSpeed = playbackSpeed * dynamicSpeedMultiplier;
        currentTimeMs += deltaTime * 1000 * effectiveSpeed;

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

// ===== Initialize =====
init();
