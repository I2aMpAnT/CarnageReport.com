// GLB Viewer - 3D Game Replay System
// Uses Three.js for rendering and loads telemetry data for playback

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ===== Configuration =====
const CONFIG = {
    // Map GLB files location
    mapsPath: 'maps/',

    // Telemetry files location
    telemetryPath: 'stats/',

    // Player marker settings
    playerMarkerSize: 0.5,
    playerMarkerHeight: 1.8,

    // Camera settings
    defaultCameraHeight: 50,
    followCameraDistance: 8,
    followCameraHeight: 4,

    // Playback settings
    defaultSpeed: 1,
    skipSeconds: 10,

    // Team colors
    teamColors: {
        '_game_team_blue': 0x0066ff,
        '_game_team_red': 0xff3333,
        'blue': 0x0066ff,
        'red': 0xff3333,
        'none': 0x00ff88,  // FFA - green
        'default': 0xffaa00  // Orange for unknown
    },

    // Color palette for FFA (if no team)
    ffaColors: [
        0x00ff88, 0xff6600, 0xaa00ff, 0xffff00,
        0x00ffff, 0xff00aa, 0x88ff00, 0xff8800
    ]
};

// ===== State =====
let scene, camera, renderer, controls;
let mapModel = null;
let playerMarkers = {};
let telemetryData = [];
let players = [];
let currentTimeMs = 0;
let totalDurationMs = 0;
let isPlaying = false;
let playbackSpeed = 1;
let lastFrameTime = 0;
let animationFrameId = null;
let followPlayer = null;
let viewMode = 'free'; // 'free', 'top', 'follow'

// URL parameters
let mapName = '';
let telemetryFile = '';
let gameInfo = {};

// ===== Initialization =====
async function init() {
    // Parse URL parameters
    parseUrlParams();

    // Setup Three.js scene
    setupScene();

    // Setup event listeners
    setupEventListeners();

    // Load map and telemetry
    await loadMapAndTelemetry();

    // Start render loop
    animate();
}

function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);

    mapName = params.get('map') || 'Midship';
    telemetryFile = params.get('telemetry') || '';

    // Game info for display
    gameInfo = {
        map: mapName,
        gameType: params.get('gametype') || '',
        date: params.get('date') || '',
        variant: params.get('variant') || ''
    };

    // Update UI with game info
    document.getElementById('mapName').textContent = mapName;
    document.getElementById('gameType').textContent = gameInfo.variant || gameInfo.gameType;
    document.getElementById('gameDate').textContent = gameInfo.date;
}

function setupScene() {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('glb-canvas');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    scene.fog = new THREE.Fog(0x0a0a12, 50, 200);

    // Camera
    camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, CONFIG.defaultCameraHeight, 0);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2;

    // Lighting
    setupLighting();

    // Grid helper for when no GLB is loaded
    const gridHelper = new THREE.GridHelper(100, 100, 0x00c8ff, 0x1a1a2e);
    gridHelper.name = 'gridHelper';
    scene.add(gridHelper);

    // Handle resize
    window.addEventListener('resize', onWindowResize);
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    // Hemisphere light for natural outdoor feel
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362e24, 0.6);
    scene.add(hemiLight);

    // Main directional light (sun)
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

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-50, 50, -50);
    scene.add(fillLight);
}

function setupEventListeners() {
    // Playback controls
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('skipBackBtn').addEventListener('click', () => skip(-CONFIG.skipSeconds));
    document.getElementById('skipForwardBtn').addEventListener('click', () => skip(CONFIG.skipSeconds));
    document.getElementById('playbackSpeed').addEventListener('change', (e) => {
        playbackSpeed = parseFloat(e.target.value);
    });

    // Timeline
    const timeline = document.getElementById('timeline');
    timeline.addEventListener('input', onTimelineInput);
    timeline.addEventListener('change', onTimelineChange);

    // View controls
    document.getElementById('topViewBtn').addEventListener('click', () => setViewMode('top'));
    document.getElementById('freeViewBtn').addEventListener('click', () => setViewMode('free'));
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

    // Keyboard shortcuts
    document.addEventListener('keydown', onKeyDown);
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
        // Load telemetry first (required)
        if (telemetryFile) {
            loadingText.textContent = 'Loading telemetry data...';
            loadingProgress.textContent = '0%';
            await loadTelemetry(telemetryFile);
            loadingProgress.textContent = '50%';
        } else {
            console.warn('No telemetry file specified');
        }

        // Try to load GLB map
        loadingText.textContent = 'Loading 3D map...';
        const glbPath = `${CONFIG.mapsPath}${mapName}.glb`;

        try {
            await loadGLB(glbPath, (progress) => {
                loadingProgress.textContent = `${Math.round(50 + progress * 50)}%`;
            });
        } catch (glbError) {
            console.warn('GLB not found, using fallback view:', glbError);
            showFallbackMessage();
        }

        // Initialize player markers
        createPlayerMarkers();

        // Hide loading, show content
        loadingOverlay.style.display = 'none';

        // Position camera based on telemetry bounds
        positionCameraToFit();

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

        // Setup Draco decoder for compressed GLBs
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            path,
            (gltf) => {
                mapModel = gltf.scene;

                // Enable shadows on all meshes
                mapModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Remove grid helper when GLB is loaded
                const gridHelper = scene.getObjectByName('gridHelper');
                if (gridHelper) {
                    scene.remove(gridHelper);
                }

                scene.add(mapModel);
                resolve(gltf);
            },
            (progress) => {
                if (progress.lengthComputable) {
                    onProgress(progress.loaded / progress.total);
                }
            },
            (error) => {
                reject(error);
            }
        );
    });
}

async function loadTelemetry(filename) {
    const response = await fetch(`${CONFIG.telemetryPath}${filename}`);
    if (!response.ok) {
        throw new Error(`Failed to load telemetry: ${response.statusText}`);
    }

    const csvText = await response.text();
    parseTelemetryCSV(csvText);
}

function parseTelemetryCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('Telemetry file is empty or invalid');
    }

    // Parse header
    const header = lines[0].replace(/^\uFEFF/, '').split(','); // Remove BOM if present
    const columnIndex = {};
    header.forEach((col, i) => {
        columnIndex[col.trim()] = i;
    });

    // Required columns
    const requiredCols = ['PlayerName', 'GameTimeMs', 'X', 'Y', 'Z'];
    for (const col of requiredCols) {
        if (columnIndex[col] === undefined) {
            throw new Error(`Missing required column: ${col}`);
        }
    }

    // Parse data rows
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
            currentWeapon: values[columnIndex['CurrentWeapon']] || 'Unknown'
        };

        telemetryData.push(row);
        playerSet.add(row.playerName);
        minTime = Math.min(minTime, row.gameTimeMs);
        maxTime = Math.max(maxTime, row.gameTimeMs);
    }

    // Sort by time
    telemetryData.sort((a, b) => a.gameTimeMs - b.gameTimeMs);

    // Extract unique players with their team info
    players = [];
    const playerTeams = {};
    telemetryData.forEach(row => {
        if (!playerTeams[row.playerName]) {
            playerTeams[row.playerName] = row.team;
        }
    });

    let ffaColorIndex = 0;
    playerSet.forEach((name, index) => {
        const team = playerTeams[name] || 'none';
        let color;

        if (team === 'none' || team === '') {
            color = CONFIG.ffaColors[ffaColorIndex % CONFIG.ffaColors.length];
            ffaColorIndex++;
        } else {
            color = CONFIG.teamColors[team] || CONFIG.teamColors.default;
        }

        players.push({
            name: name,
            team: team,
            color: color
        });
    });

    // Set total duration
    totalDurationMs = maxTime - minTime;
    currentTimeMs = minTime;

    // Update timeline
    document.getElementById('totalTime').textContent = formatTime(totalDurationMs);
    document.getElementById('timeline').max = totalDurationMs;

    // Update player legend and follow select
    updatePlayerLegend();
    updateFollowSelect();

    console.log(`Loaded ${telemetryData.length} telemetry points for ${players.length} players`);
    console.log(`Duration: ${formatTime(totalDurationMs)}`);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
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
function createPlayerMarkers() {
    // Clear existing markers
    Object.values(playerMarkers).forEach(marker => {
        scene.remove(marker.group);
    });
    playerMarkers = {};

    players.forEach(player => {
        const group = new THREE.Group();
        group.name = `player_${player.name}`;

        // Create player body (capsule-like shape)
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

        // Create head (sphere)
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

        // Direction indicator (arrow/cone)
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

        // Name label (using sprite)
        const labelCanvas = createLabelCanvas(player.name, player.color);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMaterial = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true,
            depthTest: false
        });
        const label = new THREE.Sprite(labelMaterial);
        label.scale.set(3, 0.75, 1);
        label.position.y = CONFIG.playerMarkerHeight + 0.5;
        group.add(label);

        // Glow effect (point light)
        const glow = new THREE.PointLight(player.color, 0.5, 3);
        glow.position.y = CONFIG.playerMarkerHeight * 0.5;
        group.add(glow);

        scene.add(group);

        playerMarkers[player.name] = {
            group: group,
            body: body,
            head: head,
            arrow: arrow,
            label: label,
            player: player
        };
    });
}

function createLabelCanvas(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 2;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.stroke();

    // Text
    ctx.font = 'bold 28px Overpass, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas;
}

function updatePlayerPositions() {
    // Find telemetry data points closest to current time for each player
    const playerPositions = {};

    // Binary search for starting index
    let startIdx = 0;
    for (let i = 0; i < telemetryData.length; i++) {
        if (telemetryData[i].gameTimeMs >= currentTimeMs) {
            startIdx = Math.max(0, i - players.length * 2);
            break;
        }
    }

    // Find closest position for each player
    for (let i = startIdx; i < telemetryData.length; i++) {
        const row = telemetryData[i];
        if (row.gameTimeMs > currentTimeMs + 200) break;

        if (!playerPositions[row.playerName] ||
            Math.abs(row.gameTimeMs - currentTimeMs) < Math.abs(playerPositions[row.playerName].gameTimeMs - currentTimeMs)) {
            playerPositions[row.playerName] = row;
        }
    }

    // Update marker positions
    const liveStatsBody = document.getElementById('live-stats-body');
    liveStatsBody.innerHTML = '';

    for (const player of players) {
        const marker = playerMarkers[player.name];
        if (!marker) continue;

        const pos = playerPositions[player.name];
        if (pos) {
            // Update position - Halo coordinates: X=forward, Y=left, Z=up
            // Three.js: X=right, Y=up, Z=forward
            marker.group.position.set(pos.x, pos.z, -pos.y);

            // Update rotation (facing direction)
            if (!isNaN(pos.facingYaw)) {
                marker.group.rotation.y = -pos.facingYaw;
            }

            // Update crouch state (lower the marker)
            if (pos.isCrouching) {
                marker.body.scale.y = 0.7;
                marker.head.position.y = CONFIG.playerMarkerHeight * 0.6;
            } else {
                marker.body.scale.y = 1;
                marker.head.position.y = CONFIG.playerMarkerHeight * 0.8;
            }

            // Update visibility
            marker.group.visible = true;

            // Update live stats table
            const state = pos.isCrouching ? 'Crouching' : (pos.isAirborne ? 'Airborne' : 'Standing');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span style="color: #${player.color.toString(16).padStart(6, '0')}">${player.name}</span></td>
                <td>${pos.currentWeapon}</td>
                <td>${state}</td>
            `;
            liveStatsBody.appendChild(row);
        } else {
            marker.group.visible = false;
        }
    }

    // Update camera if following
    if (viewMode === 'follow' && followPlayer) {
        const marker = playerMarkers[followPlayer];
        if (marker && marker.group.visible) {
            const targetPos = marker.group.position.clone();
            targetPos.y += CONFIG.followCameraHeight;

            // Get direction behind player
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

    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        lastFrameTime = performance.now();
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

function skip(seconds) {
    const skipMs = seconds * 1000;
    currentTimeMs = Math.max(0, Math.min(totalDurationMs, currentTimeMs + skipMs));
    updateTimeDisplay();
    updatePlayerPositions();
}

function onTimelineInput(e) {
    // Pause during scrub
    if (isPlaying) {
        togglePlayPause();
    }
    currentTimeMs = parseInt(e.target.value);
    updateTimeDisplay();
    updatePlayerPositions();
}

function onTimelineChange(e) {
    currentTimeMs = parseInt(e.target.value);
    updateTimeDisplay();
    updatePlayerPositions();
}

function updateTimeDisplay() {
    document.getElementById('currentTime').textContent = formatTime(currentTimeMs);
    document.getElementById('timeline').value = currentTimeMs;
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ===== View Modes =====
function setViewMode(mode) {
    viewMode = mode;

    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${mode}ViewBtn`)?.classList.add('active');

    const followSelect = document.getElementById('followPlayerSelect');
    followSelect.style.display = mode === 'follow' ? 'block' : 'none';

    if (mode === 'top') {
        // Top-down view
        controls.enabled = false;
        camera.position.set(0, CONFIG.defaultCameraHeight, 0);
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 0, -1);
    } else if (mode === 'free') {
        // Free camera
        controls.enabled = true;
        camera.up.set(0, 1, 0);
    } else if (mode === 'follow') {
        // Follow mode
        controls.enabled = true;
        camera.up.set(0, 1, 0);
    }
}

function positionCameraToFit() {
    if (telemetryData.length === 0) return;

    // Calculate bounds of all telemetry points
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

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);

    // Position camera above center, looking down
    camera.position.set(centerX, maxZ + maxRange * 0.8, -centerY);
    controls.target.set(centerX, centerZ, -centerY);
    controls.update();
}

// ===== UI Updates =====
function updatePlayerLegend() {
    const container = document.getElementById('player-list');
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
    select.innerHTML = '<option value="">Select Player...</option>';

    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.name;
        option.textContent = player.name;
        select.appendChild(option);
    });
}

function toggleStatsPanel() {
    const panel = document.getElementById('stats-panel');
    panel.classList.toggle('collapsed');
}

// ===== Keyboard Controls =====
function onKeyDown(e) {
    switch (e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'arrowleft':
            skip(-CONFIG.skipSeconds);
            break;
        case 'arrowright':
            skip(CONFIG.skipSeconds);
            break;
        case '1':
            setViewMode('top');
            break;
        case '2':
            setViewMode('free');
            break;
        case '3':
            setViewMode('follow');
            break;
        case 'f':
            toggleFullscreen();
            break;
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// ===== Animation Loop =====
function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    // Update playback
    if (isPlaying) {
        currentTimeMs += deltaTime * playbackSpeed;

        if (currentTimeMs >= totalDurationMs) {
            currentTimeMs = 0; // Loop
        }

        updateTimeDisplay();
        updatePlayerPositions();
    }

    // Update controls
    if (controls.enabled) {
        controls.update();
    }

    // Render
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
