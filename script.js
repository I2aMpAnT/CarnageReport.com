// Initialize empty games data array
let gamesData = [];

// Global player ranks (randomly assigned once)
let playerRanks = {};

// Map images - local files from mapimages folder
const mapImages = {
    'Midship': 'mapimages/Midship.jpeg',
    'Lockout': 'mapimages/Lockout.jpeg',
    'Sanctuary': 'mapimages/Sanctuary.jpeg',
    'Warlock': 'mapimages/Warlock.jpeg',
    'Beaver Creek': 'mapimages/Beaver Creek.jpeg',
    'Ascension': 'mapimages/Ascension.jpeg',
    'Coagulation': 'mapimages/Coagulation.jpeg',
    'Zanzibar': 'mapimages/Zanzibar.jpeg',
    'Ivory Tower': 'mapimages/Ivory Tower.jpeg',
    'Burial Mounds': 'mapimages/Burial Mounds.jpeg',
    'Colossus': 'mapimages/Colossus.jpeg',
    'Headlong': 'mapimages/Headlong.jpeg',
    'Waterworks': 'mapimages/Waterworks.jpeg',
    'Foundation': 'mapimages/Foundation.jpeg',
    'Backwash': 'mapimages/Backwash.jpeg',
    'Containment': 'mapimages/Containment.png',
    'Desolation': 'mapimages/Desolation.jpeg',
    'District': 'mapimages/District.jpeg',
    'Elongation': 'mapimages/Elongation.jpeg',
    'Gemini': 'mapimages/Gemini.png',
    'Relic': 'mapimages/Relic.jpeg',
    'Terminal': 'mapimages/Terminal.png',
    'Tombstone': 'mapimages/Tombstone.jpeg',
    'Turf': 'mapimages/Turf.jpeg',
    'Uplift': 'mapimages/Uplift.jpeg'
};

// Default map image if not found
const defaultMapImage = 'mapimages/Midship.jpeg';

// Medal icons - Official Halo 2 medals only
// Using local cached images in assets/medals/
const medalIcons = {
    // Consecutive Kills (multi-kills within 4 seconds)
    'double_kill': 'assets/medals/Double Kill.png',
    'triple_kill': 'assets/medals/Triple Kill.png',
    'killtacular': 'assets/medals/Killtacular.png',
    'killing_frenzy': 'assets/medals/Kill Frenzy.png',
    'kill_frenzy': 'assets/medals/Kill Frenzy.png',
    'killtrocity': 'assets/medals/Killtrocity.png',
    'killamanjaro': 'assets/medals/Killimanjaro.png',
    'killimanjaro': 'assets/medals/Killimanjaro.png',

    // Sprees (kills without dying)
    'killing_spree': 'assets/medals/Killing Spree.png',
    'running_riot': 'assets/medals/Running Riot.png',
    'rampage': 'assets/medals/Rampage.png',
    'berserker': 'assets/medals/Berserker.png',
    'overkill': 'assets/medals/Overkill.png',

    // Special Kills
    'sniper_kill': 'assets/medals/Sniper Kill.png',
    'sniper': 'assets/medals/Sniper Kill.png',
    'grenade_stick': 'assets/medals/Stick It.png',
    'stick_it': 'assets/medals/Stick It.png',
    'stick': 'assets/medals/Stick It.png',
    'splatter': 'assets/medals/Roadkill.png',
    'roadkill': 'assets/medals/Roadkill.png',
    'hijack': 'assets/medals/Hijack.png',
    'carjacking': 'assets/medals/Hijack.png',
    'assassin': 'assets/medals/Assassin.png',
    'assassination': 'assets/medals/Assassin.png',
    'assassinate': 'assets/medals/Assassin.png',
    'beat_down': 'assets/medals/Bone Cracker.png',
    'beatdown': 'assets/medals/Bone Cracker.png',
    'bone_cracker': 'assets/medals/Bone Cracker.png',
    'bonecracker': 'assets/medals/Bone Cracker.png',
    'pummel': 'assets/medals/Bone Cracker.png',

    // Objectives
    'bomb_carrier_kill': 'assets/medals/Bomb Carrier Kill.png',
    'bomb_planted': 'assets/medals/Bomb Planted.png',
    'flag_carrier_kill': 'assets/medals/Flag Carrier Kill.png',
    'flag_captured': 'assets/medals/Flag Score.png',
    'flag_score': 'assets/medals/Flag Score.png',
    'flag_taken': 'assets/medals/Flag Taken.png',
    'flag_returned': 'assets/medals/Flag Returned.png'
};

// Weapon icons - Using local cached images in assets/weapons/
const weaponIcons = {
    // UNSC Weapons
    'battle rifle': 'assets/weapons/BattleRifle.png',
    'br': 'assets/weapons/BattleRifle.png',
    'magnum': 'assets/weapons/Magnum.png',
    'pistol': 'assets/weapons/Magnum.png',
    'shotgun': 'assets/weapons/Shotgun.png',
    'smg': 'assets/weapons/SmG.png',
    'sub machine gun': 'assets/weapons/SmG.png',
    'sniper rifle': 'assets/weapons/SniperRifle.png',
    'sniper': 'assets/weapons/SniperRifle.png',
    'rocket launcher': 'assets/weapons/RocketLauncher.png',
    'rockets': 'assets/weapons/RocketLauncher.png',
    'frag grenade': 'assets/weapons/H2-M9HEDPFragmentationGrenade.png',
    'grenade': 'assets/weapons/H2-M9HEDPFragmentationGrenade.png',
    'fragmentation grenade': 'assets/weapons/H2-M9HEDPFragmentationGrenade.png',

    // Covenant Weapons
    'plasma pistol': 'assets/weapons/PlasmaPistol.png',
    'plasma rifle': 'assets/weapons/PlasmaRifle.png',
    'brute plasma rifle': 'assets/weapons/BrutePlasmaRifle.png',
    'carbine': 'assets/weapons/Carbine.png',
    'covenant carbine': 'assets/weapons/Carbine.png',
    'needler': 'assets/weapons/Needler.png',
    'beam rifle': 'assets/weapons/BeamRifle.png',
    'particle beam rifle': 'assets/weapons/BeamRifle.png',
    'brute shot': 'assets/weapons/BruteShot.png',
    'energy sword': 'assets/weapons/EnergySword.png',
    'sword': 'assets/weapons/EnergySword.png',
    'fuel rod': 'assets/weapons/FuelRod.png',
    'fuel rod gun': 'assets/weapons/FuelRod.png',

    // Objective Items
    'flag': 'assets/weapons/Flag.png',
    'oddball': 'assets/weapons/OddBall.png',
    'ball': 'assets/weapons/OddBall.png',
    'assault bomb': 'assets/weapons/AssaultBomb.png',
    'bomb': 'assets/weapons/AssaultBomb.png',

    // Other
    'sentinel beam': 'assets/weapons/SentinelBeam.png',
    'melee': 'assets/weapons/Magnum.png'
};

// Helper function to get weapon icon
function getWeaponIcon(weaponName) {
    const key = weaponName.toLowerCase().trim();
    return weaponIcons[key] || null;
}

// Helper function to get medal icon path
function getMedalIcon(medalName) {
    // Convert medal name to key format (lowercase, spaces to underscores)
    const key = medalName.toLowerCase().replace(/\s+/g, '_');
    return medalIcons[key] || null;
}

// Helper function to format date/time consistently
function formatDateTime(startTime) {
    if (!startTime) return '';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Try to parse MM/DD/YYYY format first
    const dateMatch = startTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    // Also try ISO format (YYYY-MM-DDTHH:MM:SS)
    const isoMatch = startTime.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    const timeMatch = startTime.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
    
    if (dateMatch) {
        // MM/DD/YYYY format
        const month = parseInt(dateMatch[1]) - 1;
        const day = parseInt(dateMatch[2]);
        const monthName = months[month] || dateMatch[1];
        let result = `${monthName} ${day}`;
        
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minutes = timeMatch[2];
            const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : '';
            
            // Format time cleanly (drop :00 minutes, keep AM/PM)
            if (minutes === '00') {
                result += ` · ${hour}${ampm}`;
            } else {
                result += ` · ${hour}:${minutes}${ampm}`;
            }
        }
        return result + ' EST';
    } else if (isoMatch) {
        // ISO format: 2025-11-23T08:35:00-05:00
        const month = parseInt(isoMatch[2]) - 1;
        const day = parseInt(isoMatch[3]);
        let hour = parseInt(isoMatch[4]);
        const minutes = isoMatch[5];
        const monthName = months[month];
        
        // Convert to 12-hour format
        const ampm = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        
        let result = `${monthName} ${day}`;
        if (minutes === '00') {
            result += ` · ${hour}${ampm}`;
        } else {
            result += ` · ${hour}:${minutes}${ampm}`;
        }
        return result + ' EST';
    }
    
    return startTime;
}

// Format duration from M:SS to "Mmin SSsec"
function formatDuration(duration) {
    if (!duration) return '0min 0sec';
    
    // Parse the M:SS or MM:SS format
    const parts = duration.split(':');
    if (parts.length !== 2) return duration;
    
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return `${minutes}min ${seconds}sec`;
}

// Convert time string "M:SS" to total seconds
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.toString().split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return (minutes * 60) + seconds;
}

// Convert total seconds to "M:SS" format
function secondsToTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to check if team is valid (not none/null/empty)
function isValidTeam(team) {
    if (!team) return false;
    const t = team.toString().toLowerCase().trim();
    return t !== '' && t !== 'none' && t !== 'null' && t !== 'undefined';
}

// Generate random ranks for all players
function generatePlayerRanks() {
    const allPlayers = new Set();
    gamesData.forEach(game => {
        game.players.forEach(player => {
            allPlayers.add(player.name);
        });
    });
    
    const playerList = Array.from(allPlayers);
    const availableRanks = Array.from({length: 50}, (_, i) => i + 1);
    
    // Shuffle ranks
    for (let i = availableRanks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableRanks[i], availableRanks[j]] = [availableRanks[j], availableRanks[i]];
    }
    
    playerList.forEach((name, index) => {
        playerRanks[name] = availableRanks[index % availableRanks.length];
    });
}

// Get rank icon HTML for a player
function getPlayerRankIcon(playerName, size = 'small') {
    const rank = playerRanks[playerName] || 1;
    const sizeClass = size === 'small' ? 'rank-icon-small' : 'rank-icon';
    return `<img src="https://r2-cdn.insignia.live/h2-rank/${rank}.png" alt="Rank ${rank}" class="${sizeClass}" />`;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGamesData();
});

async function loadGamesData() {
    const loadingArea = document.getElementById('loadingArea');
    const statsArea = document.getElementById('statsArea');
    const mainHeader = document.getElementById('mainHeader');
    
    console.log('[DEBUG] Starting to load games data...');
    console.log('[DEBUG] Current URL:', window.location.href);
    console.log('[DEBUG] Protocol:', window.location.protocol);
    console.log('[DEBUG] Fetch URL: gameshistory.json');
    
    // Check if running from file:// protocol
    if (window.location.protocol === 'file:') {
        console.error('[ERROR] Running from file:// protocol - this will not work!');
        loadingArea.innerHTML = `
            <div class="loading-message" style="max-width: 600px; margin: 0 auto; line-height: 1.6;">
                [ CANNOT RUN FROM FILE SYSTEM ]<br>
                <span style="font-size: 14px; margin-top: 20px; display: block;">
                    You must serve this site via HTTP/HTTPS.<br><br>
                    Quick fix:<br>
                    1. Open terminal in this folder<br>
                    2. Run: <code style="background: rgba(0,217,255,0.1); padding: 2px 6px;">python -m http.server 8000</code><br>
                    3. Visit: <code style="background: rgba(0,217,255,0.1); padding: 2px 6px;">http://localhost:8000</code><br><br>
                    See README.md for more options.
                </span>
            </div>
        `;
        return;
    }
    
    try {
        console.log('[DEBUG] Attempting fetch...');
        const response = await fetch('gameshistory.json');
        
        console.log('[DEBUG] Response status:', response.status);
        console.log('[DEBUG] Response ok:', response.ok);
        console.log('[DEBUG] Response type:', response.type);
        console.log('[DEBUG] Response URL:', response.url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        console.log('[DEBUG] Parsing JSON...');
        const text = await response.text();
        console.log('[DEBUG] Response size:', text.length, 'bytes');
        
        gamesData = JSON.parse(text);
        
        console.log('[DEBUG] Games loaded successfully!');
        console.log('[DEBUG] Number of games:', gamesData.length);
        console.log('[DEBUG] First game:', gamesData[0]);
        
        // Generate random ranks for all players
        console.log('[DEBUG] Generating player ranks...');
        generatePlayerRanks();
        
        loadingArea.style.display = 'none';
        statsArea.style.display = 'block';
        mainHeader.classList.add('loaded');
        
        console.log('[DEBUG] Rendering games list...');
        renderGamesList();
        
        console.log('[DEBUG] Rendering leaderboard...');
        renderLeaderboard();
        
        console.log('[DEBUG] Initializing search...');
        initializeSearch();
        
        console.log('[DEBUG] All rendering complete!');
    } catch (error) {
        console.error('[ERROR] Failed to load games data:', error);
        console.error('[ERROR] Error name:', error.name);
        console.error('[ERROR] Error message:', error.message);
        console.error('[ERROR] Error stack:', error.stack);
        
        let errorMessage = error.message;
        let helpText = 'Check browser console (F12) for details';
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            helpText = 'File gameshistory.json not found. Make sure it\'s in the same directory as index.html';
        } else if (error.message.includes('Failed to fetch')) {
            helpText = 'Cannot load file. Are you running from file:// ? You need to use a web server (see README.md)';
        } else if (error.name === 'SyntaxError') {
            helpText = 'JSON file is corrupted or invalid';
        }
        
        loadingArea.innerHTML = `
            <div class="loading-message">
                [ ERROR LOADING GAME DATA ]<br>
                <span style="font-size: 14px; margin-top: 10px; display: block;">
                    ${errorMessage}<br><br>
                    ${helpText}
                </span>
            </div>
        `;
    }
}

function switchMainTab(tabName) {
    const allMainTabs = document.querySelectorAll('.main-tab-content');
    allMainTabs.forEach(tab => tab.style.display = 'none');
    
    const allMainBtns = document.querySelectorAll('.main-tab-btn');
    allMainBtns.forEach(btn => btn.classList.remove('active'));
    
    const selectedTab = document.getElementById('main-tab-' + tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    const selectedBtn = document.getElementById('btn-main-' + tabName);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

function renderGamesList() {
    console.log('[DEBUG] renderGamesList() called');
    const gamesList = document.getElementById('gamesList');
    
    if (!gamesList) {
        console.error('[ERROR] gamesList element not found!');
        return;
    }
    
    console.log('[DEBUG] gamesList element found');
    console.log('[DEBUG] gamesData length:', gamesData.length);
    
    if (gamesData.length === 0) {
        console.log('[DEBUG] No games data, showing message');
        gamesList.innerHTML = '<div class="loading-message">No games to display</div>';
        return;
    }
    
    gamesList.innerHTML = '';
    
    console.log('[DEBUG] Creating game items...');
    gamesData.forEach((game, index) => {
        const gameNumber = gamesData.length - index;
        console.log(`[DEBUG] Creating game ${gameNumber}:`, game.details);
        const gameItem = createGameItem(game, gameNumber);
        gamesList.appendChild(gameItem);
    });
    
    console.log('[DEBUG] All game items created');
    
    // Populate filter dropdowns
    populateMainFilters();
}

function createGameItem(game, gameNumber) {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-item';
    gameDiv.id = `game-${gameNumber}`;
    
    // Store the actual gamesData index for reliable game lookup
    // Use originalIndex if it exists (from profile games), otherwise find it
    const gameDataIndex = game.originalIndex !== undefined ? game.originalIndex : gamesData.indexOf(game);
    gameDiv.setAttribute('data-game-index', gameDataIndex);
    
    const details = game.details;
    const players = game.players;
    
    let displayGameType = details['Variant Name'] || details['Game Type'] || 'Unknown';
    let mapName = details['Map Name'] || 'Unknown Map';
    let duration = formatDuration(details['Duration'] || '0:00');
    let startTime = details['Start Time'] || '';
    
    // Format date/time for display using helper function
    const dateDisplay = formatDateTime(startTime);
    
    // Get map image for background
    const mapImage = mapImages[mapName] || defaultMapImage;
    
    // Calculate team scores for team games
    let teamScoreDisplay = '';
    const teams = {};
    const isOddball = displayGameType.toLowerCase().includes('oddball');
    
    players.forEach(player => {
        const team = player.team;
        if (isValidTeam(team)) {
            const teamKey = team.toString().trim();
            if (!teams[teamKey]) {
                teams[teamKey] = 0;
            }
            // For Oddball, sum time values; for other games, sum scores
            if (isOddball) {
                teams[teamKey] += timeToSeconds(player.score);
            } else {
                teams[teamKey] += parseInt(player.score) || 0;
            }
        }
    });
    
    // Determine winner
    let winnerClass = '';
    let scoreTagClass = '';
    
    if (Object.keys(teams).length > 1) {
        // Team game - find winning team (need at least 2 different teams)
        const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
        if (sortedTeams.length > 0 && sortedTeams[0][1] > 0) {
            const winningTeam = sortedTeams[0][0].toLowerCase();
            if (sortedTeams[0][1] > sortedTeams[1][1]) {
                winnerClass = `winner-${winningTeam}`;
                scoreTagClass = `score-tag-${winningTeam}`;
            }
            // If it's a tie, no winner highlighting
        }
        
        const teamScores = sortedTeams
            .map(([team, score]) => {
                const displayScore = isOddball ? secondsToTime(score) : score;
                return `${team}: ${displayScore}`;
            })
            .join(' - ');
        teamScoreDisplay = `<span class="game-meta-tag ${scoreTagClass}">${teamScores}</span>`;
    } else {
        // FFA game - find winner by highest score
        const sortedPlayers = [...players].sort((a, b) => (parseInt(b.score) || 0) - (parseInt(a.score) || 0));
        if (sortedPlayers.length > 0 && sortedPlayers[0]) {
            const winner = sortedPlayers[0];
            winnerClass = 'winner-ffa';
            scoreTagClass = 'score-tag-ffa';
            teamScoreDisplay = `<span class="game-meta-tag ${scoreTagClass}">${winner.name}</span>`;
        }
    }
    
    gameDiv.innerHTML = `
        <div class="game-header-bar ${winnerClass}" onclick="toggleGameDetails(${gameNumber})">
            <div class="game-header-left">
                <div class="game-number">${displayGameType}</div>
                <div class="game-info">
                    <span class="game-meta-tag game-num-tag">Game ${gameNumber}</span>
                    <span class="game-meta-tag">${mapName}</span>
                    ${teamScoreDisplay}
                </div>
            </div>
            <div class="game-header-right">
                ${dateDisplay ? `<span class="game-meta-tag date-tag">${dateDisplay}</span>` : ''}
                <div class="expand-icon">▶</div>
            </div>
        </div>
        <div class="game-details">
            <div class="game-details-content">
                <div id="game-content-${gameNumber}"></div>
            </div>
        </div>
    `;
    
    return gameDiv;
}

function toggleGameDetails(gameNumber) {
    const gameItem = document.getElementById(`game-${gameNumber}`);
    const gameContent = document.getElementById(`game-content-${gameNumber}`);
    
    if (!gameItem) return;
    
    const isExpanded = gameItem.classList.contains('expanded');
    
    if (isExpanded) {
        gameItem.classList.remove('expanded');
    } else {
        gameItem.classList.add('expanded');
        
        if (!gameContent.innerHTML) {
            // Get the stored game index from data attribute
            const gameIndex = parseInt(gameItem.getAttribute('data-game-index'));
            const game = gamesData[gameIndex];
            if (game) {
                gameContent.innerHTML = renderGameContent(game);
            }
        }
    }
}

function renderGameContent(game) {
    const mapName = game.details['Map Name'] || 'Unknown';
    const mapImage = mapImages[mapName] || defaultMapImage;
    const gameType = game.details['Variant Name'] || game.details['Game Type'] || 'Unknown';
    const duration = formatDuration(game.details['Duration'] || '0:00');
    const startTime = game.details['Start Time'] || '';
    
    // Format the start time
    const formattedTime = formatDateTime(startTime);
    
    // Calculate team scores
    let teamScoreHtml = '';
    const teams = {};
    let hasRealTeams = false;
    const isOddball = gameType.toLowerCase().includes('oddball');
    
    game.players.forEach(player => {
        const team = player.team;
        if (isValidTeam(team)) {
            hasRealTeams = true;
            const teamKey = team.toString().trim();
            if (!teams[teamKey]) {
                teams[teamKey] = 0;
            }
            // For Oddball, sum time values; for other games, sum scores
            if (isOddball) {
                teams[teamKey] += timeToSeconds(player.score);
            } else {
                teams[teamKey] += parseInt(player.score) || 0;
            }
        }
    });
    
    if (hasRealTeams && Object.keys(teams).length > 1) {
        // Team game - show team scores (need at least 2 teams)
        const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
        teamScoreHtml = '<div class="game-final-score">';
        sortedTeams.forEach(([team, score], index) => {
            const teamClass = team.toLowerCase();
            const isWinner = index === 0;
            const displayScore = isOddball ? secondsToTime(score) : score;
            teamScoreHtml += `<span class="final-score-team team-${teamClass}${isWinner ? ' winner' : ''}">${team}: ${displayScore}</span>`;
            if (index < sortedTeams.length - 1) {
                teamScoreHtml += '<span class="score-separator">vs</span>';
            }
        });
        teamScoreHtml += '</div>';
    } else {
        // FFA game - show winner
        const sortedPlayers = [...game.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        if (sortedPlayers.length > 0) {
            const winner = sortedPlayers[0];
            teamScoreHtml = '<div class="game-final-score ffa-winner">';
            teamScoreHtml += `<span class="winner-label">WINNER:</span> `;
            teamScoreHtml += `<span class="winner-name clickable-player" data-player="${winner.name}">${winner.name}</span>`;
            teamScoreHtml += `<span class="winner-score">${winner.kills || 0} kills</span>`;
            teamScoreHtml += '</div>';
        }
    }
    
    let html = '<div class="game-details-header">';
    html += `<div class="map-image-container">`;
    html += `<img src="${mapImage}" alt="${mapName}" class="map-image" onerror="this.src='${defaultMapImage}'">`;
    html += `<div class="map-overlay">`;
    html += `<div class="map-name">${mapName}</div>`;
    html += `</div>`;
    html += `</div>`;
    html += `<div class="game-info-panel">`;
    html += `<div class="game-type-title">${gameType}</div>`;
    html += `<div class="game-meta-info">`;
    html += `<span><i class="icon-clock"></i> ${duration}</span>`;
    html += `<span><i class="icon-calendar"></i> ${formattedTime}</span>`;
    html += `</div>`;
    html += teamScoreHtml;
    html += `</div>`;
    html += '</div>';
    
    html += '<div class="tab-navigation">';
    html += '<button class="tab-btn active" onclick="switchGameTab(this, \'scoreboard\')">Scoreboard</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'pvp\')">PVP</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'stats\')">Detailed Stats</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'accuracy\')">Accuracy</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'weapons\')">Weapons</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'medals\')">Medals</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'twitch\')">Twitch</button>';
    html += '</div>';
    
    html += '<div class="tab-content active">';
    html += renderScoreboard(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderPVP(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderDetailedStats(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderAccuracy(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderWeapons(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderMedals(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderTwitch(game);
    html += '</div>';
    
    return html;
}

function switchGameTab(btn, tabName) {
    const parent = btn.closest('.game-details-content');
    const tabs = parent.querySelectorAll('.tab-content');
    const buttons = parent.querySelectorAll('.tab-btn');
    
    buttons.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    const tabIndex = Array.from(buttons).indexOf(btn);
    tabs[tabIndex].classList.add('active');
}

function renderScoreboard(game) {
    const players = game.players;
    const details = game.details;
    const gameType = (details['Game Type'] || '').toLowerCase();
    const hasTeams = players.some(p => isValidTeam(p.team));
    
    // Sort players: Red team first, then Blue team
    const sortedPlayers = [...players];
    if (hasTeams) {
        sortedPlayers.sort((a, b) => {
            const teamOrder = { 'Red': 0, 'Blue': 1 };
            const teamA = teamOrder[a.team] !== undefined ? teamOrder[a.team] : 2;
            const teamB = teamOrder[b.team] !== undefined ? teamOrder[b.team] : 2;
            return teamA - teamB;
        });
    }
    
    let html = '<div class="scoreboard">';
    
    // Determine columns - removed Team column
    let columns = ['Player', 'Score', 'K', 'D', 'A', 'K/D'];
    
    // Build grid template - simplified without Team column
    let gridTemplate = '2fr 80px 50px 50px 50px 70px';
    
    // Header
    html += `<div class="scoreboard-header" style="grid-template-columns: ${gridTemplate}">`;
    columns.forEach(col => {
        html += `<div>${col}</div>`;
    });
    html += '</div>';
    
    // Rows
    sortedPlayers.forEach(player => {
        const teamAttr = isValidTeam(player.team) ? `data-team="${player.team}"` : '';
        html += `<div class="scoreboard-row" ${teamAttr} style="grid-template-columns: ${gridTemplate}">`;
        
        html += `<div class="sb-player clickable-player" data-player="${player.name}">`;
        html += getPlayerRankIcon(player.name, 'small');
        html += `<span class="player-name-text">${player.name}</span>`;
        html += `</div>`;
        
        html += `<div class="sb-score">${player.score || 0}</div>`;
        html += `<div class="sb-kills">${player.kills || 0}</div>`;
        html += `<div class="sb-deaths">${player.deaths || 0}</div>`;
        html += `<div class="sb-assists">${player.assists || 0}</div>`;
        html += `<div class="sb-kd">${calculateKD(player.kills, player.deaths)}</div>`;
        
        html += '</div>';
    });
    
    html += '</div>';
    return html;
}

function renderPVP(game) {
    const players = game.players;
    const hasTeams = players.some(p => isValidTeam(p.team));
    
    // Sort players by team (Red first) then by score
    const sortedPlayers = [...players].sort((a, b) => {
        if (hasTeams) {
            const teamOrder = { 'Red': 0, 'Blue': 1 };
            const teamA = teamOrder[a.team] !== undefined ? teamOrder[a.team] : 2;
            const teamB = teamOrder[b.team] !== undefined ? teamOrder[b.team] : 2;
            if (teamA !== teamB) return teamA - teamB;
        }
        return (b.score || 0) - (a.score || 0);
    });
    
    const playerNames = sortedPlayers.map(p => p.name);
    const numPlayers = playerNames.length;
    
    // Generate kill matrix - distribute each player's kills across opponents
    const killMatrix = {};
    
    sortedPlayers.forEach(killer => {
        killMatrix[killer.name] = {};
        const totalKills = killer.kills || 0;
        
        // Get valid targets (in team games, only enemies; in FFA, everyone else)
        let targets = sortedPlayers.filter(p => {
            if (p.name === killer.name) return false;
            if (hasTeams && isValidTeam(p.team) && isValidTeam(killer.team) && p.team === killer.team) return false;
            return true;
        });
        
        if (targets.length === 0 || totalKills === 0) {
            playerNames.forEach(name => {
                killMatrix[killer.name][name] = 0;
            });
            return;
        }
        
        // Distribute kills weighted by target's deaths
        const totalTargetDeaths = targets.reduce((sum, t) => sum + (t.deaths || 1), 0);
        let remainingKills = totalKills;
        
        targets.forEach((target, idx) => {
            const weight = (target.deaths || 1) / totalTargetDeaths;
            let kills;
            if (idx === targets.length - 1) {
                kills = remainingKills;
            } else {
                kills = Math.floor(totalKills * weight);
                const hash = (killer.name.charCodeAt(0) + target.name.charCodeAt(0)) % 3 - 1;
                kills = Math.max(0, kills + hash);
                kills = Math.min(kills, remainingKills);
            }
            remainingKills -= kills;
            killMatrix[killer.name][target.name] = kills;
        });
        
        // Set 0 for self and teammates
        playerNames.forEach(name => {
            if (!(name in killMatrix[killer.name])) {
                killMatrix[killer.name][name] = 0;
            }
        });
    });
    
    // Build the table
    let html = '<div class="pvp-matrix">';
    
    // Calculate column width based on number of players
    const colWidth = Math.max(70, Math.min(100, 700 / numPlayers));
    const gridCols = `180px repeat(${numPlayers}, ${colWidth}px)`;
    
    // Header row with player names as columns
    html += `<div class="pvp-header" style="display: grid; grid-template-columns: ${gridCols};">`;
    html += '<div class="pvp-corner">KILLER → VICTIM</div>';
    sortedPlayers.forEach(player => {
        const teamClass = isValidTeam(player.team) ? player.team.toLowerCase() : '';
        // Show abbreviated name consistently - first 7 chars or full name if shorter
        const displayName = player.name.length > 7 ? player.name.substring(0, 7) : player.name;
        html += `<div class="pvp-col-header ${teamClass} clickable-player" data-player="${player.name}" title="${player.name}">${displayName}</div>`;
    });
    html += '</div>';
    
    // Data rows
    sortedPlayers.forEach(killer => {
        const teamClass = isValidTeam(killer.team) ? killer.team.toLowerCase() : '';
        html += `<div class="pvp-row ${teamClass}" style="display: grid; grid-template-columns: ${gridCols};">`;
        
        // Row header (killer name)
        html += `<div class="pvp-row-header clickable-player" data-player="${killer.name}">`;
        html += getPlayerRankIcon(killer.name, 'small');
        html += `<span class="player-name-text">${killer.name}</span>`;
        html += `</div>`;
        
        // Kill counts for each victim
        sortedPlayers.forEach(victim => {
            const kills = killMatrix[killer.name][victim.name] || 0;
            const isSelf = killer.name === victim.name;
            const isTeammate = hasTeams && isValidTeam(killer.team) && isValidTeam(victim.team) && killer.team === victim.team && !isSelf;
            
            let cellClass = 'pvp-cell';
            if (isSelf) {
                cellClass += ' pvp-self';
            } else if (isTeammate) {
                cellClass += ' pvp-teammate';
            } else if (kills > 0) {
                if (kills >= 10) cellClass += ' pvp-hot';
                else if (kills >= 5) cellClass += ' pvp-warm';
                else cellClass += ' pvp-cool';
            }
            
            html += `<div class="${cellClass}">${isSelf ? '-' : kills}</div>`;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    
    // Legend
    html += '<div class="pvp-legend">';
    html += '<span class="pvp-legend-item"><span class="pvp-legend-box pvp-hot"></span> 10+ kills</span>';
    html += '<span class="pvp-legend-item"><span class="pvp-legend-box pvp-warm"></span> 5-9 kills</span>';
    html += '<span class="pvp-legend-item"><span class="pvp-legend-box pvp-cool"></span> 1-4 kills</span>';
    html += '</div>';
    
    return html;
}

// Helper to truncate player names for column headers
function truncateName(name, maxLen) {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen - 1) + '…';
}

function renderDetailedStats(game) {
    const stats = game.stats;
    const players = game.players;
    
    // Create player team map
    const playerTeams = {};
    players.forEach(p => {
        if (p.team && p.team !== 'none') {
            playerTeams[p.name] = p.team;
        }
    });
    
    // Sort stats by team (Red first, then Blue)
    const sortedStats = [...stats].sort((a, b) => {
        const teamOrder = { 'Red': 0, 'Blue': 1 };
        const teamA = teamOrder[playerTeams[a.Player]] !== undefined ? teamOrder[playerTeams[a.Player]] : 2;
        const teamB = teamOrder[playerTeams[b.Player]] !== undefined ? teamOrder[playerTeams[b.Player]] : 2;
        return teamA - teamB;
    });
    
    let html = '<div class="detailed-stats">';
    
    html += '<div class="stats-category">Combat Statistics</div>';
    html += '<table class="stats-table">';
    html += '<thead><tr>';
    html += '<th>Player</th><th>Kills</th><th>Assists</th><th>Deaths</th><th>Betrayals</th><th>Suicides</th><th>Best Spree</th><th>Time Alive</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    sortedStats.forEach(stat => {
        const team = playerTeams[stat.Player];
        const teamAttr = team ? `data-team="${team}"` : '';
        const timeAlive = formatTime(stat.total_time_alive || 0);
        
        html += `<tr ${teamAttr}>`;
        html += `<td><span class="player-with-rank">${getPlayerRankIcon(stat.Player, 'small')}<span>${stat.Player}</span></span></td>`;
        html += `<td>${stat.kills}</td>`;
        html += `<td>${stat.assists}</td>`;
        html += `<td>${stat.deaths}</td>`;
        html += `<td>${stat.betrayals}</td>`;
        html += `<td>${stat.suicides}</td>`;
        html += `<td>${stat.best_spree}</td>`;
        html += `<td>${timeAlive}</td>`;
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    // Add objective stats if they exist
    const hasObjectiveStats = sortedStats.some(s => 
        s.ctf_scores || s.assault_score || s.oddball_score || 
        s.koth_kills_as_king || s.territories_taken
    );
    
    if (hasObjectiveStats) {
        html += '<div class="stats-category">Objective Statistics</div>';
        html += '<table class="stats-table">';
        html += '<thead><tr><th>Player</th>';
        
        // Determine which columns to show
        const hasCTF = sortedStats.some(s => s.ctf_scores || s.ctf_flag_steals || s.ctf_flag_saves);
        const hasAssault = sortedStats.some(s => s.assault_score || s.assault_bomb_grabbed);
        const hasOddball = sortedStats.some(s => s.oddball_score || s.oddball_ball_kills);
        const hasKOTH = sortedStats.some(s => s.koth_kills_as_king || s.koth_kings_killed);
        const hasTerritories = sortedStats.some(s => s.territories_taken || s.territories_lost);
        
        if (hasCTF) {
            html += '<th>CTF Scores</th><th>Flag Steals</th><th>Flag Saves</th>';
        }
        if (hasAssault) {
            html += '<th>Assault Score</th><th>Bomb Grabs</th><th>Bomber Kills</th>';
        }
        if (hasOddball) {
            html += '<th>Oddball Time</th><th>Ball Kills</th><th>Carried Kills</th>';
        }
        if (hasKOTH) {
            html += '<th>Kills as King</th><th>Kings Killed</th>';
        }
        if (hasTerritories) {
            html += '<th>Territories Taken</th><th>Territories Lost</th>';
        }
        
        html += '</tr></thead><tbody>';
        
        sortedStats.forEach(stat => {
            const team = playerTeams[stat.Player];
            const teamAttr = team ? `data-team="${team}"` : '';
            
            html += `<tr ${teamAttr}><td><span class="player-with-rank">${getPlayerRankIcon(stat.Player, 'small')}<span>${stat.Player}</span></span></td>`;
            
            if (hasCTF) {
                html += `<td>${stat.ctf_scores || 0}</td>`;
                html += `<td>${stat.ctf_flag_steals || 0}</td>`;
                html += `<td>${stat.ctf_flag_saves || 0}</td>`;
            }
            if (hasAssault) {
                html += `<td>${stat.assault_score || 0}</td>`;
                html += `<td>${stat.assault_bomb_grabbed || 0}</td>`;
                html += `<td>${stat.assault_bomber_kills || 0}</td>`;
            }
            if (hasOddball) {
                const oddballTime = formatTime(stat.oddball_score || 0);
                html += `<td>${oddballTime}</td>`;
                html += `<td>${stat.oddball_ball_kills || 0}</td>`;
                html += `<td>${stat.oddball_carried_kills || 0}</td>`;
            }
            if (hasKOTH) {
                html += `<td>${stat.koth_kills_as_king || 0}</td>`;
                html += `<td>${stat.koth_kings_killed || 0}</td>`;
            }
            if (hasTerritories) {
                html += `<td>${stat.territories_taken || 0}</td>`;
                html += `<td>${stat.territories_lost || 0}</td>`;
            }
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
    }
    
    html += '</div>';
    return html;
}

function renderMedals(game) {
    const medals = game.medals;
    const players = game.players;
    
    const playerTeams = {};
    players.forEach(p => {
        if (p.team && p.team !== 'none') {
            playerTeams[p.name] = p.team;
        }
    });
    
    // Sort medals by team (Red first, then Blue)
    const sortedMedals = [...medals].sort((a, b) => {
        const teamOrder = { 'Red': 0, 'Blue': 1 };
        const teamA = teamOrder[playerTeams[a.player]] !== undefined ? teamOrder[playerTeams[a.player]] : 2;
        const teamB = teamOrder[playerTeams[b.player]] !== undefined ? teamOrder[playerTeams[b.player]] : 2;
        return teamA - teamB;
    });
    
    let html = '<div class="medals-scoreboard">';
    
    // Header
    html += '<div class="medals-header">';
    html += '<div class="medals-player-col">Player</div>';
    html += '<div class="medals-icons-col">Medals Earned</div>';
    html += '</div>';
    
    sortedMedals.forEach(playerMedals => {
        const team = playerTeams[playerMedals.player];
        const teamAttr = team ? `data-team="${team}"` : '';
        
        html += `<div class="medals-row" ${teamAttr}>`;
        html += `<div class="medals-player-col clickable-player" data-player="${playerMedals.player}">`;
        html += getPlayerRankIcon(playerMedals.player, 'small');
        html += `<span class="player-name-text">${playerMedals.player}</span>`;
        html += `</div>`;
        html += `<div class="medals-icons-col">`;
        
        // Get all medals for this player (excluding the 'player' key)
        let hasMedals = false;
        Object.entries(playerMedals).forEach(([medalKey, count]) => {
            if (medalKey === 'player' || count === 0) return;
            
            const iconPath = getMedalIcon(medalKey);
            const medalName = formatMedalName(medalKey);
            
            // Only display medals we have icons for (skip unknown medals)
            if (iconPath) {
                hasMedals = true;
                html += `<div class="medal-badge" title="${medalName}">`;
                html += `<img src="${iconPath}" alt="${medalName}" class="medal-icon">`;
                html += `<span class="medal-count">x${count}</span>`;
                html += `</div>`;
            }
        });
        
        if (!hasMedals) {
            html += `<span class="no-medals">No medals</span>`;
        }
        
        html += `</div>`;
        html += `</div>`;
    });
    
    html += '</div>';
    return html;
}

function renderAccuracy(game) {
    const weapons = game.weapons;
    const players = game.players;
    
    if (!weapons || weapons.length === 0) {
        return '<div class="no-data">No accuracy data available</div>';
    }
    
    const playerTeams = {};
    players.forEach(p => {
        if (p.team && p.team !== 'none' && p.team !== 'None') {
            playerTeams[p.name] = p.team;
        }
    });
    
    // Sort by team
    const sortedWeapons = [...weapons].sort((a, b) => {
        const teamOrder = { 'Red': 0, 'Blue': 1 };
        const teamA = teamOrder[playerTeams[a.Player]] !== undefined ? teamOrder[playerTeams[a.Player]] : 2;
        const teamB = teamOrder[playerTeams[b.Player]] !== undefined ? teamOrder[playerTeams[b.Player]] : 2;
        return teamA - teamB;
    });
    
    // Get all weapon columns
    const weaponCols = Object.keys(weapons[0] || {}).filter(k => k !== 'Player');
    
    let html = '<div class="accuracy-scoreboard">';
    
    // Header
    html += '<div class="accuracy-header">';
    html += '<div class="accuracy-player-col">PLAYER</div>';
    html += '<div class="accuracy-total-col">SHOTS HIT</div>';
    html += '<div class="accuracy-total-col">SHOTS FIRED</div>';
    html += '<div class="accuracy-total-col">HEADSHOTS</div>';
    html += '<div class="accuracy-total-col">ACCURACY</div>';
    html += '</div>';
    
    // Player rows
    sortedWeapons.forEach(weaponData => {
        const playerName = weaponData.Player;
        const team = playerTeams[playerName];
        const teamAttr = team ? `data-team="${team}"` : '';
        
        // Calculate total shots hit, fired, and headshots across all weapons
        let totalHit = 0;
        let totalFired = 0;
        let totalHeadshots = 0;
        
        weaponCols.forEach(col => {
            const colLower = col.toLowerCase();
            if (colLower.includes('headshot') || colLower.includes('head shot')) {
                totalHeadshots += parseInt(weaponData[col]) || 0;
            } else if (colLower.includes('hit')) {
                totalHit += parseInt(weaponData[col]) || 0;
            } else if (colLower.includes('fired')) {
                totalFired += parseInt(weaponData[col]) || 0;
            }
        });
        
        const accuracy = totalFired > 0 ? ((totalHit / totalFired) * 100).toFixed(1) : '0.0';
        const headshotPercent = totalHit > 0 ? ((totalHeadshots / totalHit) * 100).toFixed(0) : '0';
        
        html += `<div class="accuracy-row" ${teamAttr}>`;
        html += `<div class="accuracy-player-col clickable-player" data-player="${playerName}">`;
        html += getPlayerRankIcon(playerName, 'small');
        html += `<span class="player-name-text">${playerName}</span>`;
        html += `</div>`;
        html += `<div class="accuracy-total-col">${totalHit}</div>`;
        html += `<div class="accuracy-total-col">${totalFired}</div>`;
        html += `<div class="accuracy-total-col accuracy-headshots">${totalHeadshots} <span class="headshot-percent">(${headshotPercent}%)</span></div>`;
        html += `<div class="accuracy-total-col accuracy-percent">${accuracy}%</div>`;
        html += `</div>`;
    });
    
    html += '</div>';
    return html;
}

function renderWeapons(game) {
    const weapons = game.weapons;
    const players = game.players;
    
    if (!weapons || weapons.length === 0) {
        return '<div class="no-data">No weapon data available</div>';
    }
    
    const playerTeams = {};
    players.forEach(p => {
        if (p.team && p.team !== 'none' && p.team !== 'None') {
            playerTeams[p.name] = p.team;
        }
    });
    
    // Sort by team
    const sortedWeapons = [...weapons].sort((a, b) => {
        const teamOrder = { 'Red': 0, 'Blue': 1 };
        const teamA = teamOrder[playerTeams[a.Player]] !== undefined ? teamOrder[playerTeams[a.Player]] : 2;
        const teamB = teamOrder[playerTeams[b.Player]] !== undefined ? teamOrder[playerTeams[b.Player]] : 2;
        return teamA - teamB;
    });
    
    // Get all weapon columns with kills
    const weaponCols = Object.keys(weapons[0] || {}).filter(k => k !== 'Player');
    const killCols = weaponCols.filter(c => c.toLowerCase().includes('kills'));
    
    let html = '<div class="weapons-scoreboard">';
    
    // Header
    html += '<div class="weapons-header">';
    html += '<div class="weapons-player-col">PLAYER</div>';
    html += '<div class="weapons-kills-col">WEAPON KILLS</div>';
    html += '</div>';
    
    // Player rows
    sortedWeapons.forEach(weaponData => {
        const playerName = weaponData.Player;
        const team = playerTeams[playerName];
        const teamAttr = team ? `data-team="${team}"` : '';
        
        html += `<div class="weapons-row" ${teamAttr}>`;
        html += `<div class="weapons-player-col clickable-player" data-player="${playerName}">`;
        html += getPlayerRankIcon(playerName, 'small');
        html += `<span class="player-name-text">${playerName}</span>`;
        html += `</div>`;
        html += `<div class="weapons-kills-col">`;
        
        let hasKills = false;
        
        // Show kills for each weapon
        killCols.forEach(killCol => {
            const kills = parseInt(weaponData[killCol]) || 0;
            if (kills > 0) {
                hasKills = true;
                const weaponName = killCol.replace(/ kills/gi, '').trim();
                const iconUrl = getWeaponIcon(weaponName);
                
                html += `<div class="weapon-badge" title="${weaponName}">`;
                if (iconUrl) {
                    html += `<img src="${iconUrl}" alt="${weaponName}" class="weapon-icon">`;
                } else {
                    html += `<span class="weapon-placeholder">${weaponName.substring(0, 2).toUpperCase()}</span>`;
                }
                html += `<span class="weapon-count">x${kills}</span>`;
                html += `</div>`;
            }
        });
        
        if (!hasKills) {
            html += `<span class="no-kills">No kills</span>`;
        }
        
        html += `</div>`;
        html += `</div>`;
    });
    
    html += '</div>';
    return html;
}

function renderTwitch(game) {
    const players = game.players;
    const details = game.details;
    const gameTime = details['Start Time'] || 'Unknown';
    
    let html = '<div class="twitch-section">';
    
    html += '<div class="twitch-header">';
    html += '<div class="twitch-icon">📺</div>';
    html += '<h3>Twitch VODs & Clips</h3>';
    html += '<p class="twitch-subtitle">Linked content from players in this match</p>';
    html += '</div>';
    
    html += '<div class="twitch-info-box">';
    html += '<p>This feature will automatically search for Twitch VODs and clips from players who have linked their accounts.</p>';
    html += `<p class="game-time-info">Game played: <strong>${gameTime}</strong></p>`;
    html += '</div>';
    
    html += '<div class="twitch-players-grid">';
    
    players.forEach(player => {
        const team = player.team;
        const teamClass = isValidTeam(team) ? `team-${team.toLowerCase()}` : '';
        
        html += `<div class="twitch-player-card ${teamClass}">`;
        html += `<div class="twitch-player-header clickable-player" data-player="${player.name}">`;
        html += getPlayerRankIcon(player.name, 'small');
        html += `<span class="twitch-player-name">${player.name}</span>`;
        html += `</div>`;
        html += `<div class="twitch-player-status">`;
        html += `<span class="twitch-not-linked">Not linked</span>`;
        html += `</div>`;
        html += `<div class="twitch-player-actions">`;
        html += `<button class="twitch-link-btn" disabled>Link Twitch</button>`;
        html += `</div>`;
        html += `</div>`;
    });
    
    html += '</div>';
    
    html += '<div class="twitch-coming-soon">';
    html += '<p>🔗 Link your Twitch account to your Discord and gamertag to automatically display VODs and clips from your matches.</p>';
    html += '<p class="twitch-note">Coming soon: Automatic VOD timestamp matching based on game time.</p>';
    html += '</div>';
    
    html += '</div>';
    return html;
}

function renderLeaderboard() {
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    if (!leaderboardContainer) return;
    
    if (gamesData.length === 0) {
        leaderboardContainer.innerHTML = '<div class="loading-message">No leaderboard data available</div>';
        return;
    }
    
    const playerStats = {};
    
    gamesData.forEach(game => {
        game.players.forEach(player => {
            if (!playerStats[player.name]) {
                playerStats[player.name] = {
                    name: player.name,
                    games: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    wins: 0
                };
            }
            
            const stats = playerStats[player.name];
            stats.games++;
            stats.kills += player.kills || 0;
            stats.deaths += player.deaths || 0;
            stats.assists += player.assists || 0;
            
            if (player.place === '1st') {
                stats.wins++;
            }
        });
    });
    
    const players = Object.values(playerStats).map(p => {
        p.kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2);
        p.winrate = p.games > 0 ? ((p.wins / p.games) * 100).toFixed(1) : '0.0';
        p.rank = playerRanks[p.name] || 1;
        return p;
    });
    
    // Sort by rank descending (50 at top, 1 at bottom)
    players.sort((a, b) => b.rank - a.rank);
    
    let html = '<div class="leaderboard">';
    html += '<div class="leaderboard-header">';
    html += '<div>Rank</div>';
    html += '<div>Player</div>';
    html += '<div>Record</div>';
    html += '<div>K/D</div>';
    html += '</div>';
    
    players.forEach((player) => {
        const rankIconUrl = `https://r2-cdn.insignia.live/h2-rank/${player.rank}.png`;
        
        html += '<div class="leaderboard-row clickable-player" data-player="' + player.name + '">';
        html += `<div class="lb-rank"><img src="${rankIconUrl}" alt="Rank ${player.rank}" class="rank-icon" /></div>`;
        html += `<div class="lb-player">${player.name}</div>`;
        html += `<div class="lb-record">${player.wins}-${player.games - player.wins} (${player.winrate}%)</div>`;
        html += `<div class="lb-kd">${player.kd}</div>`;
        html += '</div>';
    });
    
    html += '</div>';
    leaderboardContainer.innerHTML = html;
}

function initializeSearch() {
    console.log('[SEARCH] Initializing search functionality...');
    
    const searchInput = document.getElementById('playerSearch');
    const searchResults = document.getElementById('searchResults');
    const searchInput2 = document.getElementById('playerSearch2');
    const searchResults2 = document.getElementById('searchResults2');
    
    if (!searchInput || !searchResults) {
        console.error('[SEARCH] Main search elements not found!');
        return;
    }
    
    console.log('[SEARCH] Main search elements found');
    console.log('[SEARCH] Games data available:', gamesData ? gamesData.length : 0);
    
    // Setup first search box
    setupSearchBox(searchInput, searchResults, 1);
    console.log('[SEARCH] Main search box initialized');
    
    // Setup second search box if it exists
    if (searchInput2 && searchResults2) {
        setupSearchBox(searchInput2, searchResults2, 2);
        console.log('[SEARCH] Secondary search box initialized');
    }
    
    // Setup PVP search boxes
    const pvpPlayer1 = document.getElementById('pvpPlayer1');
    const pvpResults1 = document.getElementById('pvpResults1');
    const pvpPlayer2 = document.getElementById('pvpPlayer2');
    const pvpResults2 = document.getElementById('pvpResults2');
    
    if (pvpPlayer1 && pvpResults1) {
        setupPvpSearchBox(pvpPlayer1, pvpResults1, 1);
        console.log('[SEARCH] PVP Player 1 search initialized');
    }
    if (pvpPlayer2 && pvpResults2) {
        setupPvpSearchBox(pvpPlayer2, pvpResults2, 2);
        console.log('[SEARCH] PVP Player 2 search initialized');
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
        if (searchInput2 && searchResults2 && !searchInput2.contains(e.target) && !searchResults2.contains(e.target)) {
            searchResults2.classList.remove('active');
        }
        if (pvpResults1 && pvpPlayer1 && !pvpPlayer1.contains(e.target) && !pvpResults1.contains(e.target)) {
            pvpResults1.classList.remove('active');
        }
        if (pvpResults2 && pvpPlayer2 && !pvpPlayer2.contains(e.target) && !pvpResults2.contains(e.target)) {
            pvpResults2.classList.remove('active');
        }
    });
    
    console.log('[SEARCH] Search initialization complete!');
}

function setupPvpSearchBox(inputElement, resultsElement, playerNum) {
    inputElement.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            resultsElement.classList.remove('active');
            return;
        }
        
        // Check if games data is loaded
        if (!gamesData || gamesData.length === 0) {
            resultsElement.innerHTML = '<div class="search-result-item">Loading game data...</div>';
            resultsElement.classList.add('active');
            return;
        }
        
        const results = [];
        const playerNames = new Set();
        
        gamesData.forEach(game => {
            game.players.forEach(player => {
                if (player.name.toLowerCase().includes(query)) {
                    playerNames.add(player.name);
                }
            });
        });
        
        playerNames.forEach(name => {
            const playerStats = calculatePlayerSearchStats(name);
            results.push({
                type: 'player',
                name: name,
                meta: `${playerStats.games} games · ${playerStats.kd} K/D`
            });
        });
        
        displayPvpSearchResults(results, resultsElement, playerNum);
    });
}

function displayPvpSearchResults(results, resultsElement, playerNum) {
    if (results.length === 0) {
        resultsElement.innerHTML = '<div class="search-result-item">No players found</div>';
        resultsElement.classList.add('active');
        return;
    }
    
    let html = '';
    results.slice(0, 10).forEach(result => {
        html += `<div class="search-result-item" onclick="selectPvpPlayer(${playerNum}, '${escapeHtml(result.name)}')">`;
        html += `<div class="search-result-name">${result.name}</div>`;
        html += `<div class="search-result-meta">${result.meta}</div>`;
        html += `</div>`;
    });
    
    resultsElement.innerHTML = html;
    resultsElement.classList.add('active');
}

function selectPvpPlayer(playerNum, playerName) {
    const inputElement = document.getElementById(`pvpPlayer${playerNum}`);
    const resultsElement = document.getElementById(`pvpResults${playerNum}`);
    
    inputElement.value = playerName;
    resultsElement.classList.remove('active');
    
    // Check if both players are selected
    const player1 = document.getElementById('pvpPlayer1').value.trim();
    const player2 = document.getElementById('pvpPlayer2').value.trim();
    
    if (player1 && player2 && player1 !== player2) {
        renderPvpComparison(player1, player2);
    }
}

function renderPvpComparison(player1Name, player2Name) {
    const container = document.getElementById('pvpComparisonContent');
    if (!container) return;
    
    const stats1 = calculatePlayerStats(player1Name);
    const stats2 = calculatePlayerStats(player2Name);
    const h2h = calculateHeadToHead(player1Name, player2Name);
    
    let html = '<div class="comparison-container">';
    
    // Header with player names
    html += '<div class="comparison-header">';
    html += `<div class="player-header">${getPlayerRankIcon(player1Name, 'normal')}<span class="player-header-name">${player1Name}</span></div>`;
    html += '<div class="pvp-vs">VS</div>';
    html += `<div class="player-header">${getPlayerRankIcon(player2Name, 'normal')}<span class="player-header-name">${player2Name}</span></div>`;
    html += '</div>';
    
    // Head to Head section
    if (h2h.gamesPlayed > 0) {
        html += '<div class="h2h-section">';
        html += `<div class="h2h-title">Head-to-Head: ${h2h.gamesPlayed} Games Together</div>`;
        html += '<div class="h2h-stats">';
        html += `<span class="h2h-stat">Kills when matched: ${h2h.player1Kills} vs ${h2h.player2Kills}</span>`;
        html += '</div>';
        html += '</div>';
    }
    
    // Comparison table
    html += renderComparisonStats(player1Name, stats1, player2Name, stats2, h2h);
    
    html += '</div>';
    container.innerHTML = html;
}

function setupSearchBox(inputElement, resultsElement, boxNumber) {
    inputElement.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        
        console.log('[SEARCH] Query:', query, 'Length:', query.length);
        
        if (query.length < 2) {
            resultsElement.classList.remove('active');
            return;
        }
        
        // Check if games data is loaded
        if (!gamesData || gamesData.length === 0) {
            resultsElement.innerHTML = '<div class="search-result-item">Loading game data...</div>';
            resultsElement.classList.add('active');
            console.warn('[SEARCH] Games data not yet loaded');
            return;
        }
        
        console.log('[SEARCH] Searching through', gamesData.length, 'games');
        
        const results = [];
        
        // Search for players
        const playerNames = new Set();
        gamesData.forEach(game => {
            game.players.forEach(player => {
                if (player.name.toLowerCase().includes(query)) {
                    playerNames.add(player.name);
                }
            });
        });
        
        playerNames.forEach(name => {
            const playerStats = calculatePlayerSearchStats(name);
            results.push({
                type: 'player',
                name: name,
                meta: `${playerStats.games} games · ${playerStats.wins}W-${playerStats.games - playerStats.wins}L · ${playerStats.kd} K/D`
            });
        });
        
        // For first search box, also search maps and gametypes
        if (boxNumber === 1) {
            // Search for maps
            const maps = new Set();
            gamesData.forEach(game => {
                const mapName = game.details['Map Name'];
                if (mapName && mapName.toLowerCase().includes(query)) {
                    maps.add(mapName);
                }
            });
            
            maps.forEach(map => {
                const mapGames = gamesData.filter(g => g.details['Map Name'] === map).length;
                results.push({
                    type: 'map',
                    name: map,
                    meta: `${mapGames} games played`
                });
            });
            
            // Search for game types
            const gameTypes = new Set();
            gamesData.forEach(game => {
                const variantName = game.details['Variant Name'];
                if (variantName && variantName.toLowerCase().includes(query)) {
                    gameTypes.add(variantName);
                }
            });

            gameTypes.forEach(type => {
                const typeGames = gamesData.filter(g => g.details['Variant Name'] === type).length;
                results.push({
                    type: 'gametype',
                    name: type,
                    meta: `${typeGames} games played`
                });
            });

            // Search for medals
            const matchedMedals = new Set();
            Object.keys(medalIcons).forEach(medalKey => {
                const displayName = formatMedalName(medalKey);
                if (medalKey.toLowerCase().includes(query) || displayName.toLowerCase().includes(query)) {
                    matchedMedals.add(medalKey);
                }
            });

            matchedMedals.forEach(medal => {
                // Count total of this medal across all games
                let totalCount = 0;
                gamesData.forEach(game => {
                    if (game.medals) {
                        game.medals.forEach(playerMedals => {
                            if (playerMedals[medal]) {
                                totalCount += parseInt(playerMedals[medal]) || 0;
                            }
                        });
                    }
                });
                if (totalCount > 0) {
                    results.push({
                        type: 'medal',
                        name: medal,
                        meta: `${totalCount} earned total`
                    });
                }
            });

            // Search for weapons
            const matchedWeapons = new Set();
            Object.keys(weaponIcons).forEach(weaponKey => {
                if (weaponKey.toLowerCase().includes(query)) {
                    matchedWeapons.add(weaponKey);
                }
            });

            matchedWeapons.forEach(weapon => {
                // Count total kills with this weapon across all games
                let totalKills = 0;
                gamesData.forEach(game => {
                    game.players.forEach(player => {
                        if (player.weapons) {
                            player.weapons.forEach(w => {
                                if (w.name && w.name.toLowerCase() === weapon.toLowerCase()) {
                                    totalKills += parseInt(w.kills) || 0;
                                }
                            });
                        }
                    });
                });
                if (totalKills > 0) {
                    results.push({
                        type: 'weapon',
                        name: weapon,
                        meta: `${totalKills} kills total`
                    });
                }
            });
        }
        
        displaySearchResults(results, resultsElement, boxNumber);
    });
}

function calculatePlayerSearchStats(playerName) {
    let games = 0, wins = 0, kills = 0, deaths = 0;
    
    gamesData.forEach(game => {
        const player = game.players.find(p => p.name === playerName);
        if (player) {
            games++;
            if (player.place === '1st') wins++;
            kills += player.kills || 0;
            deaths += player.deaths || 0;
        }
    });
    
    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
    return { games, wins, kd };
}

function displaySearchResults(results, resultsElement, boxNumber) {
    if (results.length === 0) {
        resultsElement.innerHTML = '<div class="search-result-item">No results found</div>';
        resultsElement.classList.add('active');
        return;
    }

    let html = '';
    results.slice(0, 10).forEach(result => {
        html += `<div class="search-result-item" onclick="handleSearchResultClick('${result.type}', '${escapeHtml(result.name)}', ${boxNumber})">`;

        // Add icon for medals and weapons
        if (result.type === 'medal') {
            const iconUrl = getMedalIcon(result.name);
            if (iconUrl) {
                html += `<img src="${iconUrl}" alt="${result.name}" class="search-result-icon">`;
            }
            html += `<div class="search-result-type">${result.type}</div>`;
            html += `<div class="search-result-name">${formatMedalName(result.name)}</div>`;
        } else if (result.type === 'weapon') {
            const iconUrl = weaponIcons[result.name.toLowerCase()];
            if (iconUrl) {
                html += `<img src="${iconUrl}" alt="${result.name}" class="search-result-icon">`;
            }
            html += `<div class="search-result-type">${result.type}</div>`;
            html += `<div class="search-result-name">${result.name.charAt(0).toUpperCase() + result.name.slice(1)}</div>`;
        } else {
            html += `<div class="search-result-type">${result.type}</div>`;
            html += `<div class="search-result-name">${result.name}</div>`;
        }
        html += `<div class="search-result-meta">${result.meta}</div>`;
        html += `</div>`;
    });

    resultsElement.innerHTML = html;
    resultsElement.classList.add('active');
}

function handleSearchResultClick(type, name, boxNumber) {
    const searchResults = boxNumber === 1 ? document.getElementById('searchResults') : document.getElementById('searchResults2');
    const searchInput = boxNumber === 1 ? document.getElementById('playerSearch') : document.getElementById('playerSearch2');

    searchResults.classList.remove('active');
    searchInput.value = type === 'medal' ? formatMedalName(name) : name;

    if (type === 'player') {
        // Check if both players are selected for comparison
        const player1 = document.getElementById('playerSearch').value.trim();
        const player2 = document.getElementById('playerSearch2')?.value.trim();

        if (player1 && player2 && player1 !== player2) {
            // Both players selected - open comparison modal
            openComparisonModal(player1, player2);
        } else {
            // Single player - open search results page
            openSearchResultsPage('player', name);
        }
    } else if (type === 'map') {
        openSearchResultsPage('map', name);
    } else if (type === 'gametype') {
        openSearchResultsPage('gametype', name);
    } else if (type === 'medal') {
        openSearchResultsPage('medal', name);
    } else if (type === 'weapon') {
        openSearchResultsPage('weapon', name);
    }
}

function openSearchResultsPage(type, name) {
    const searchResultsPage = document.getElementById('searchResultsPage');
    const searchResultsTitle = document.getElementById('searchResultsTitle');
    const searchResultsContent = document.getElementById('searchResultsContent');
    const statsArea = document.getElementById('statsArea');
    
    // Hide main stats area and show search results
    statsArea.style.display = 'none';
    searchResultsPage.style.display = 'block';
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    if (type === 'player') {
        searchResultsTitle.innerHTML = `${getPlayerRankIcon(name, 'small')} ${name}`;
        searchResultsContent.innerHTML = renderPlayerSearchResults(name);
    } else if (type === 'map') {
        const mapImage = mapImages[name] || defaultMapImage;
        searchResultsTitle.innerHTML = `<img src="${mapImage}" class="title-map-icon" alt="${name}"> ${name}`;
        searchResultsContent.innerHTML = renderMapSearchResults(name);
    } else if (type === 'gametype') {
        searchResultsTitle.innerHTML = `🎮 ${name}`;
        searchResultsContent.innerHTML = renderGametypeSearchResults(name);
    } else if (type === 'medal') {
        const medalIcon = getMedalIcon(name);
        const iconHtml = medalIcon ? `<img src="${medalIcon}" class="title-medal-icon" alt="${name}">` : '';
        searchResultsTitle.innerHTML = `${iconHtml} ${formatMedalName(name)}`;
        searchResultsContent.innerHTML = renderMedalSearchResults(name);
    } else if (type === 'weapon') {
        const weaponIcon = weaponIcons[name.toLowerCase()];
        const iconHtml = weaponIcon ? `<img src="${weaponIcon}" class="title-weapon-icon" alt="${name}">` : '';
        searchResultsTitle.innerHTML = `${iconHtml} ${name.charAt(0).toUpperCase() + name.slice(1)}`;
        searchResultsContent.innerHTML = renderWeaponSearchResults(name);
    }
}

function closeSearchResults() {
    const searchResultsPage = document.getElementById('searchResultsPage');
    const statsArea = document.getElementById('statsArea');
    
    searchResultsPage.style.display = 'none';
    statsArea.style.display = 'block';
    
    // Clear search inputs
    document.getElementById('playerSearch').value = '';
    const search2 = document.getElementById('playerSearch2');
    if (search2) search2.value = '';
}

function renderPlayerSearchResults(playerName) {
    const stats = calculatePlayerStats(playerName);
    const playerGames = gamesData.filter(game =>
        game.players.some(p => p.name === playerName)
    );

    // Store medal breakdown for modal
    window.currentSearchMedalBreakdown = stats.medalBreakdown;
    window.currentSearchContext = playerName;

    let html = '<div class="search-results-container">';

    // Player stats summary
    html += '<div class="player-stats-summary">';
    html += '<div class="stats-grid">';
    html += `<div class="stat-card"><div class="stat-label">Games</div><div class="stat-value">${stats.games}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Wins</div><div class="stat-value">${stats.wins}</div><div class="stat-sublabel">${stats.winrate}% Win Rate</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Kills</div><div class="stat-value">${stats.kills}</div><div class="stat-sublabel">${stats.kpg} per game</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Deaths</div><div class="stat-value">${stats.deaths}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showPlayersFacedBreakdown()"><div class="stat-label">K/D</div><div class="stat-value">${stats.kd}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${stats.assists}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchMedalBreakdown()"><div class="stat-label">Total Medals</div><div class="stat-value">${stats.totalMedals}</div></div>`;
    html += '</div>';
    html += '</div>';
    
    // Recent games header
    html += '<div class="section-header">Recent Games</div>';
    
    // Games list
    html += '<div class="search-games-list">';
    playerGames.forEach((game, index) => {
        html += renderSearchGameCard(game, gamesData.length - gamesData.indexOf(game), playerName);
    });
    html += '</div>';
    
    html += '</div>';
    return html;
}

function renderMapSearchResults(mapName) {
    const mapGames = gamesData.filter(game => game.details['Map Name'] === mapName);
    const mapImage = mapImages[mapName] || defaultMapImage;

    // Calculate map stats including medals and player kills
    let totalGames = mapGames.length;
    let gametypeCounts = {};
    let totalMedals = 0;
    let medalBreakdown = {};
    let playerStats = {};

    mapGames.forEach(game => {
        const gt = game.details['Variant Name'] || 'Unknown';
        gametypeCounts[gt] = (gametypeCounts[gt] || 0) + 1;

        // Count all medals in this game
        if (game.medals) {
            game.medals.forEach(playerMedals => {
                Object.entries(playerMedals).forEach(([medal, count]) => {
                    if (medal !== 'player') {
                        const medalCount = parseInt(count) || 0;
                        totalMedals += medalCount;
                        medalBreakdown[medal] = (medalBreakdown[medal] || 0) + medalCount;
                    }
                });
            });
        }

        // Count player kills/deaths
        game.players.forEach(player => {
            const name = player.name;
            if (!playerStats[name]) {
                playerStats[name] = { kills: 0, deaths: 0, games: 0 };
            }
            playerStats[name].kills += parseInt(player.kills) || 0;
            playerStats[name].deaths += parseInt(player.deaths) || 0;
            playerStats[name].games += 1;
        });
    });

    // Store for modals
    window.currentSearchMedalBreakdown = medalBreakdown;
    window.currentSearchContext = mapName;
    window.currentSearchPlayerStats = playerStats;

    // Calculate total kills
    const totalKills = Object.values(playerStats).reduce((sum, p) => sum + p.kills, 0);

    let html = '<div class="search-results-container">';

    // Map info header
    html += '<div class="map-info-header">';
    html += `<div class="map-large-image"><img src="${mapImage}" alt="${mapName}"></div>`;
    html += '<div class="map-stats">';
    html += `<div class="stat-card"><div class="stat-label">Total Games</div><div class="stat-value">${totalGames}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchKillsBreakdown()"><div class="stat-label">Total Kills</div><div class="stat-value">${totalKills}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchMedalBreakdown()"><div class="stat-label">Total Medals</div><div class="stat-value">${totalMedals}</div></div>`;
    html += '<div class="gametype-breakdown">';
    html += '<div class="stat-label">Game Types Played</div>';
    Object.entries(gametypeCounts).sort((a, b) => b[1] - a[1]).forEach(([gt, count]) => {
        html += `<div class="gametype-stat">${gt}: ${count}</div>`;
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Games header
    html += '<div class="section-header">All Games on ' + mapName + '</div>';
    
    // Games list
    html += '<div class="search-games-list">';
    mapGames.forEach((game, index) => {
        html += renderSearchGameCard(game, gamesData.length - gamesData.indexOf(game));
    });
    html += '</div>';
    
    html += '</div>';
    return html;
}

function renderGametypeSearchResults(gametypeName) {
    const gametypeGames = gamesData.filter(game => game.details['Variant Name'] === gametypeName);

    // Calculate gametype stats including medals and player kills
    let totalGames = gametypeGames.length;
    let mapCounts = {};
    let totalMedals = 0;
    let medalBreakdown = {};
    let playerStats = {};

    gametypeGames.forEach(game => {
        const map = game.details['Map Name'] || 'Unknown';
        mapCounts[map] = (mapCounts[map] || 0) + 1;

        // Count all medals in this game
        if (game.medals) {
            game.medals.forEach(playerMedals => {
                Object.entries(playerMedals).forEach(([medal, count]) => {
                    if (medal !== 'player') {
                        const medalCount = parseInt(count) || 0;
                        totalMedals += medalCount;
                        medalBreakdown[medal] = (medalBreakdown[medal] || 0) + medalCount;
                    }
                });
            });
        }

        // Count player kills/deaths
        game.players.forEach(player => {
            const name = player.name;
            if (!playerStats[name]) {
                playerStats[name] = { kills: 0, deaths: 0, games: 0 };
            }
            playerStats[name].kills += parseInt(player.kills) || 0;
            playerStats[name].deaths += parseInt(player.deaths) || 0;
            playerStats[name].games += 1;
        });
    });

    // Store for modals
    window.currentSearchMedalBreakdown = medalBreakdown;
    window.currentSearchContext = gametypeName;
    window.currentSearchPlayerStats = playerStats;

    // Calculate total kills
    const totalKills = Object.values(playerStats).reduce((sum, p) => sum + p.kills, 0);

    let html = '<div class="search-results-container">';

    // Gametype stats
    html += '<div class="gametype-info-header">';
    html += '<div class="gametype-stats">';
    html += `<div class="stat-card"><div class="stat-label">Total Games</div><div class="stat-value">${totalGames}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchKillsBreakdown()"><div class="stat-label">Total Kills</div><div class="stat-value">${totalKills}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchMedalBreakdown()"><div class="stat-label">Total Medals</div><div class="stat-value">${totalMedals}</div></div>`;
    html += '<div class="map-breakdown">';
    html += '<div class="stat-label">Maps Played</div>';
    Object.entries(mapCounts).sort((a, b) => b[1] - a[1]).forEach(([map, count]) => {
        const mapImg = mapImages[map] || defaultMapImage;
        html += `<div class="map-stat"><img src="${mapImg}" class="map-stat-icon">${map}: ${count}</div>`;
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Games header
    html += '<div class="section-header">All ' + gametypeName + ' Games</div>';
    
    // Games list
    html += '<div class="search-games-list">';
    gametypeGames.forEach((game, index) => {
        html += renderSearchGameCard(game, gamesData.length - gamesData.indexOf(game));
    });
    html += '</div>';
    
    html += '</div>';
    return html;
}

function renderMedalSearchResults(medalName) {
    // Find all games where this medal was earned
    const medalGames = [];
    let playerMedalCounts = {};
    let mapMedalCounts = {};
    let gametypeMedalCounts = {};
    let totalEarned = 0;

    gamesData.forEach(game => {
        if (game.medals) {
            let gameMedalCount = 0;
            const mapName = game.details['Map Name'] || 'Unknown';
            const gametype = game.details['Variant Name'] || 'Unknown';

            game.medals.forEach(playerMedals => {
                if (playerMedals[medalName]) {
                    const count = parseInt(playerMedals[medalName]) || 0;
                    gameMedalCount += count;
                    totalEarned += count;

                    const playerName = playerMedals.player;
                    if (!playerMedalCounts[playerName]) {
                        playerMedalCounts[playerName] = 0;
                    }
                    playerMedalCounts[playerName] += count;
                }
            });

            if (gameMedalCount > 0) {
                medalGames.push({ game, count: gameMedalCount });
                mapMedalCounts[mapName] = (mapMedalCounts[mapName] || 0) + gameMedalCount;
                gametypeMedalCounts[gametype] = (gametypeMedalCounts[gametype] || 0) + gameMedalCount;
            }
        }
    });

    // Store for modal
    window.currentSearchPlayerStats = Object.fromEntries(
        Object.entries(playerMedalCounts).map(([name, count]) => [name, { kills: count, deaths: 0, games: 0 }])
    );
    window.currentSearchContext = formatMedalName(medalName);

    const medalIcon = getMedalIcon(medalName);

    let html = '<div class="search-results-container">';

    // Medal info header
    html += '<div class="medal-info-header">';
    if (medalIcon) {
        html += `<div class="medal-large-image"><img src="${medalIcon}" alt="${medalName}"></div>`;
    }
    html += '<div class="medal-stats">';
    html += `<div class="stat-card"><div class="stat-label">Total Earned</div><div class="stat-value">${totalEarned}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Games With Medal</div><div class="stat-value">${medalGames.length}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Players</div><div class="stat-value">${Object.keys(playerMedalCounts).length}</div></div>`;
    html += '</div>';
    html += '</div>';

    // Breakdowns section
    html += '<div class="breakdowns-container">';

    // By Player
    html += '<div class="breakdown-section">';
    html += '<div class="section-header">By Player</div>';
    html += '<div class="breakdown-list">';
    Object.entries(playerMedalCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count], index) => {
        const rankIcon = getRankIcon(name);
        const pct = ((count / totalEarned) * 100).toFixed(1);
        html += `<div class="breakdown-item" onclick="openPlayerProfile('${name.replace(/'/g, "\\'")}')">`;
        html += `<span class="breakdown-rank">#${index + 1}</span>`;
        if (rankIcon) {
            html += `<img src="${rankIcon}" class="breakdown-icon" alt="rank">`;
        }
        html += `<span class="breakdown-name">${name}</span>`;
        html += `<span class="breakdown-count">${count} (${pct}%)</span>`;
        html += '</div>';
    });
    html += '</div></div>';

    // By Map
    html += '<div class="breakdown-section">';
    html += '<div class="section-header">By Map</div>';
    html += '<div class="breakdown-list">';
    Object.entries(mapMedalCounts).sort((a, b) => b[1] - a[1]).forEach(([map, count], index) => {
        const mapImg = mapImages[map] || defaultMapImage;
        const pct = ((count / totalEarned) * 100).toFixed(1);
        html += `<div class="breakdown-item" onclick="openSearchResultsPage('map', '${map.replace(/'/g, "\\'")}')">`;
        html += `<span class="breakdown-rank">#${index + 1}</span>`;
        html += `<img src="${mapImg}" class="breakdown-icon map-icon" alt="${map}">`;
        html += `<span class="breakdown-name">${map}</span>`;
        html += `<span class="breakdown-count">${count} (${pct}%)</span>`;
        html += '</div>';
    });
    html += '</div></div>';

    // By Gametype
    html += '<div class="breakdown-section">';
    html += '<div class="section-header">By Gametype</div>';
    html += '<div class="breakdown-list">';
    Object.entries(gametypeMedalCounts).sort((a, b) => b[1] - a[1]).forEach(([gt, count], index) => {
        const pct = ((count / totalEarned) * 100).toFixed(1);
        html += `<div class="breakdown-item" onclick="openSearchResultsPage('gametype', '${gt.replace(/'/g, "\\'")}')">`;
        html += `<span class="breakdown-rank">#${index + 1}</span>`;
        html += `<span class="breakdown-name">${gt}</span>`;
        html += `<span class="breakdown-count">${count} (${pct}%)</span>`;
        html += '</div>';
    });
    html += '</div></div>';

    html += '</div>'; // End breakdowns-container

    // Games header
    html += `<div class="section-header">Games with ${formatMedalName(medalName)} (${medalGames.length})</div>`;

    // Games list
    html += '<div class="search-games-list">';
    medalGames.forEach(({ game, count }) => {
        html += renderSearchGameCard(game, gamesData.length - gamesData.indexOf(game));
    });
    html += '</div>';

    html += '</div>';
    return html;
}

function renderWeaponSearchResults(weaponName) {
    // Find all games where this weapon was used
    const weaponGames = [];
    let playerWeaponStats = {};
    let mapWeaponKills = {};
    let gametypeWeaponKills = {};
    let totalKills = 0;

    gamesData.forEach(game => {
        let gameWeaponKills = 0;
        const mapName = game.details['Map Name'] || 'Unknown';
        const gametype = game.details['Variant Name'] || 'Unknown';

        game.players.forEach(player => {
            if (player.weapons) {
                player.weapons.forEach(w => {
                    if (w.name && w.name.toLowerCase() === weaponName.toLowerCase()) {
                        const kills = parseInt(w.kills) || 0;
                        gameWeaponKills += kills;
                        totalKills += kills;

                        if (!playerWeaponStats[player.name]) {
                            playerWeaponStats[player.name] = { kills: 0, games: 0 };
                        }
                        playerWeaponStats[player.name].kills += kills;
                        playerWeaponStats[player.name].games += 1;
                    }
                });
            }
        });

        if (gameWeaponKills > 0) {
            weaponGames.push({ game, kills: gameWeaponKills });
            mapWeaponKills[mapName] = (mapWeaponKills[mapName] || 0) + gameWeaponKills;
            gametypeWeaponKills[gametype] = (gametypeWeaponKills[gametype] || 0) + gameWeaponKills;
        }
    });

    // Store for modal
    window.currentSearchPlayerStats = Object.fromEntries(
        Object.entries(playerWeaponStats).map(([name, stats]) => [name, { kills: stats.kills, deaths: 0, games: stats.games }])
    );
    window.currentSearchContext = weaponName.charAt(0).toUpperCase() + weaponName.slice(1);

    const weaponIcon = weaponIcons[weaponName.toLowerCase()];

    let html = '<div class="search-results-container">';

    // Weapon info header
    html += '<div class="weapon-info-header">';
    if (weaponIcon) {
        html += `<div class="weapon-large-image"><img src="${weaponIcon}" alt="${weaponName}"></div>`;
    }
    html += '<div class="weapon-stats">';
    html += `<div class="stat-card"><div class="stat-label">Total Kills</div><div class="stat-value">${totalKills}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Games With Weapon</div><div class="stat-value">${weaponGames.length}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Players</div><div class="stat-value">${Object.keys(playerWeaponStats).length}</div></div>`;
    html += '</div>';
    html += '</div>';

    // Breakdowns section
    html += '<div class="breakdowns-container">';

    // By Player
    html += '<div class="breakdown-section">';
    html += '<div class="section-header">By Player</div>';
    html += '<div class="breakdown-list">';
    Object.entries(playerWeaponStats).sort((a, b) => b[1].kills - a[1].kills).forEach(([name, stats], index) => {
        const rankIcon = getRankIcon(name);
        const pct = ((stats.kills / totalKills) * 100).toFixed(1);
        html += `<div class="breakdown-item" onclick="openPlayerProfile('${name.replace(/'/g, "\\'")}')">`;
        html += `<span class="breakdown-rank">#${index + 1}</span>`;
        if (rankIcon) {
            html += `<img src="${rankIcon}" class="breakdown-icon" alt="rank">`;
        }
        html += `<span class="breakdown-name">${name}</span>`;
        html += `<span class="breakdown-count">${stats.kills} (${pct}%)</span>`;
        html += '</div>';
    });
    html += '</div></div>';

    // By Map
    html += '<div class="breakdown-section">';
    html += '<div class="section-header">By Map</div>';
    html += '<div class="breakdown-list">';
    Object.entries(mapWeaponKills).sort((a, b) => b[1] - a[1]).forEach(([map, kills], index) => {
        const mapImg = mapImages[map] || defaultMapImage;
        const pct = ((kills / totalKills) * 100).toFixed(1);
        html += `<div class="breakdown-item" onclick="openSearchResultsPage('map', '${map.replace(/'/g, "\\'")}')">`;
        html += `<span class="breakdown-rank">#${index + 1}</span>`;
        html += `<img src="${mapImg}" class="breakdown-icon map-icon" alt="${map}">`;
        html += `<span class="breakdown-name">${map}</span>`;
        html += `<span class="breakdown-count">${kills} (${pct}%)</span>`;
        html += '</div>';
    });
    html += '</div></div>';

    // By Gametype
    html += '<div class="breakdown-section">';
    html += '<div class="section-header">By Gametype</div>';
    html += '<div class="breakdown-list">';
    Object.entries(gametypeWeaponKills).sort((a, b) => b[1] - a[1]).forEach(([gt, kills], index) => {
        const pct = ((kills / totalKills) * 100).toFixed(1);
        html += `<div class="breakdown-item" onclick="openSearchResultsPage('gametype', '${gt.replace(/'/g, "\\'")}')">`;
        html += `<span class="breakdown-rank">#${index + 1}</span>`;
        html += `<span class="breakdown-name">${gt}</span>`;
        html += `<span class="breakdown-count">${kills} (${pct}%)</span>`;
        html += '</div>';
    });
    html += '</div></div>';

    html += '</div>'; // End breakdowns-container

    // Games header
    html += `<div class="section-header">Games with ${weaponName.charAt(0).toUpperCase() + weaponName.slice(1)} Kills (${weaponGames.length})</div>`;

    // Games list
    html += '<div class="search-games-list">';
    weaponGames.forEach(({ game, kills }) => {
        html += renderSearchGameCard(game, gamesData.length - gamesData.indexOf(game));
    });
    html += '</div>';

    html += '</div>';
    return html;
}

function showMedalLeadersBreakdown() {
    const playerStats = window.currentSearchPlayerStats || {};
    const context = window.currentSearchContext || 'Medal';

    // Sort by most earned (stored in kills field)
    const sortedPlayers = Object.entries(playerStats).sort((a, b) => b[1].kills - a[1].kills);
    const totalEarned = Object.values(playerStats).reduce((sum, p) => sum + p.kills, 0);

    let html = '<div class="weapon-breakdown-overlay" onclick="closeKillsBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${context} - All Earners</h2>`;
    html += `<button class="modal-close" onclick="closeKillsBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    sortedPlayers.forEach(([name, stats], index) => {
        const percentage = totalEarned > 0 ? ((stats.kills / totalEarned) * 100).toFixed(1) : '0.0';
        const rankIcon = getRankIcon(name);

        html += `<div class="weapon-breakdown-item player-faced-item" onclick="event.stopPropagation(); closeKillsBreakdown(); openPlayerProfile('${name.replace(/'/g, "\\'")}')">`;
        if (rankIcon) {
            html += `<img src="${rankIcon}" alt="rank" class="weapon-breakdown-icon player-faced-rank">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">#${index + 1}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${name}</div>`;
        html += `<div class="weapon-breakdown-stats">${stats.kills} earned (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div></div></div>';

    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function showWeaponLeadersBreakdown() {
    const playerStats = window.currentSearchPlayerStats || {};
    const context = window.currentSearchContext || 'Weapon';

    // Sort by most kills
    const sortedPlayers = Object.entries(playerStats).sort((a, b) => b[1].kills - a[1].kills);
    const totalKills = Object.values(playerStats).reduce((sum, p) => sum + p.kills, 0);

    let html = '<div class="weapon-breakdown-overlay" onclick="closeKillsBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${context} - All Users</h2>`;
    html += `<button class="modal-close" onclick="closeKillsBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    sortedPlayers.forEach(([name, stats], index) => {
        const percentage = totalKills > 0 ? ((stats.kills / totalKills) * 100).toFixed(1) : '0.0';
        const rankIcon = getRankIcon(name);

        html += `<div class="weapon-breakdown-item player-faced-item" onclick="event.stopPropagation(); closeKillsBreakdown(); openPlayerProfile('${name.replace(/'/g, "\\'")}')">`;
        if (rankIcon) {
            html += `<img src="${rankIcon}" alt="rank" class="weapon-breakdown-icon player-faced-rank">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">#${index + 1}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${name}</div>`;
        html += `<div class="weapon-breakdown-stats">${stats.kills} kills (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div></div></div>';

    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function renderSearchGameCard(game, gameNumber, highlightPlayer = null) {
    const details = game.details;
    const players = game.players;
    const mapName = details['Map Name'] || 'Unknown';
    const gameType = details['Variant Name'] || 'Unknown';
    const startTime = details['Start Time'] || '';

    // Calculate team scores
    let teamScoreHtml = '';
    const teams = {};
    const isOddball = gameType.toLowerCase().includes('oddball');

    players.forEach(player => {
        const team = player.team;
        if (team && team !== 'None' && team !== 'none' && team.toLowerCase() !== 'none') {
            if (!teams[team]) teams[team] = 0;
            if (isOddball) {
                teams[team] += timeToSeconds(player.score);
            } else {
                teams[team] += parseInt(player.score) || 0;
            }
        }
    });

    if (Object.keys(teams).length >= 2) {
        const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
        teamScoreHtml = '<span class="game-meta-tag score-tag">';
        sortedTeams.forEach(([team, score], index) => {
            const displayScore = isOddball ? secondsToTime(score) : score;
            teamScoreHtml += `<span class="team-score-${team.toLowerCase()}">${team}: ${displayScore}</span>`;
            if (index < sortedTeams.length - 1) teamScoreHtml += ' vs ';
        });
        teamScoreHtml += '</span>';
    }

    // Determine winner class
    let winnerClass = '';
    if (Object.keys(teams).length >= 2) {
        const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
        if (sortedTeams[0][1] > sortedTeams[1][1]) {
            winnerClass = `winner-${sortedTeams[0][0].toLowerCase()}`;
        }
    }

    const searchCardId = `search-game-${gameNumber}`;

    let html = `<div class="game-item" id="${searchCardId}">`;
    html += `<div class="game-header-bar ${winnerClass}" onclick="toggleSearchGameDetails('${searchCardId}', ${gameNumber})">`;
    html += '<div class="game-header-left">';
    html += `<div class="game-number">${gameType}</div>`;
    html += '<div class="game-info">';
    html += `<span class="game-meta-tag game-num-tag">Game ${gameNumber}</span>`;
    html += `<span class="game-meta-tag">${mapName}</span>`;
    html += teamScoreHtml;
    html += '</div>';
    html += '</div>';
    html += '<div class="game-header-right">';
    if (startTime) {
        html += `<span class="game-meta-tag date-tag">${formatDateTime(startTime)}</span>`;
    }
    html += '<div class="expand-icon">▶</div>';
    html += '</div>';
    html += '</div>';
    html += `<div class="game-details"><div class="game-details-content" id="${searchCardId}-content"></div></div>`;
    html += '</div>';
    return html;
}

function toggleSearchGameDetails(searchCardId, gameNumber) {
    const gameItem = document.getElementById(searchCardId);
    const gameContent = document.getElementById(`${searchCardId}-content`);

    if (!gameItem || !gameContent) return;

    const isExpanded = gameItem.classList.contains('expanded');

    if (isExpanded) {
        gameItem.classList.remove('expanded');
        gameContent.innerHTML = '';
    } else {
        // Find the game data
        const game = gamesData[gamesData.length - gameNumber];
        if (game) {
            gameItem.classList.add('expanded');
            gameContent.innerHTML = renderGameContent(game);
        }
    }
}

function scrollToGame(gameNumber) {
    closeSearchResults();
    setTimeout(() => {
        const gameElement = document.getElementById(`game-${gameNumber}`);
        if (gameElement) {
            gameElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Expand the game
            if (!gameElement.classList.contains('expanded')) {
                toggleGameDetails(gameNumber);
            }
            // Flash highlight
            gameElement.classList.add('highlight-flash');
            setTimeout(() => gameElement.classList.remove('highlight-flash'), 2000);
        }
    }, 100);
}

function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openPlayerModal(playerName) {
    const modal = document.getElementById('playerModal');
    const modalPlayerName = document.getElementById('modalPlayerName');
    const modalPlayerStats = document.getElementById('modalPlayerStats');
    
    if (!modal || !modalPlayerName || !modalPlayerStats) return;
    
    modalPlayerName.textContent = playerName;
    modalPlayerStats.innerHTML = '<div class="loading-message">Loading player stats...</div>';
    
    modal.classList.add('active');
    
    setTimeout(() => {
        const stats = calculatePlayerStats(playerName);
        modalPlayerStats.innerHTML = renderPlayerModalStats(stats);
    }, 100);
}

function calculatePlayerStats(playerName) {
    const stats = {
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        bestSpree: 0,
        totalDamage: 0,
        accuracy: 0,
        accuracyCount: 0,
        totalMedals: 0,
        medalBreakdown: {}
    };

    gamesData.forEach(game => {
        const player = game.players.find(p => p.name === playerName);
        if (player) {
            stats.games++;
            if (player.place === '1st') stats.wins++;
            stats.kills += player.kills || 0;
            stats.deaths += player.deaths || 0;
            stats.assists += player.assists || 0;

            if (player.accuracy) {
                stats.accuracy += player.accuracy;
                stats.accuracyCount++;
            }

            // Count medals from game.medals array
            if (game.medals) {
                const playerMedals = game.medals.find(m => m.player === playerName);
                if (playerMedals) {
                    Object.entries(playerMedals).forEach(([medal, count]) => {
                        if (medal !== 'player') {
                            const medalCount = parseInt(count) || 0;
                            stats.totalMedals += medalCount;
                            stats.medalBreakdown[medal] = (stats.medalBreakdown[medal] || 0) + medalCount;
                        }
                    });
                }
            }
        }

        const gameStat = game.stats ? game.stats.find(s => s.Player === playerName) : null;
        if (gameStat && gameStat.best_spree > stats.bestSpree) {
            stats.bestSpree = gameStat.best_spree;
        }
    });

    stats.kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
    stats.winrate = stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : '0.0';
    stats.avgAccuracy = stats.accuracyCount > 0 ? (stats.accuracy / stats.accuracyCount).toFixed(1) : '0.0';
    stats.kpg = stats.games > 0 ? (stats.kills / stats.games).toFixed(1) : '0.0';

    return stats;
}

function renderPlayerModalStats(stats) {
    let html = '<div class="stats-grid">';
    html += `<div class="stat-card"><div class="stat-label">Games Played</div><div class="stat-value">${stats.games}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Wins</div><div class="stat-value">${stats.wins}</div><div class="stat-sublabel">${stats.winrate}% Win Rate</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Total Kills</div><div class="stat-value">${stats.kills}</div><div class="stat-sublabel">${stats.kpg} per game</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Total Deaths</div><div class="stat-value">${stats.deaths}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">K/D Ratio</div><div class="stat-value">${stats.kd}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${stats.assists}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Best Spree</div><div class="stat-value">${stats.bestSpree}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Avg Accuracy</div><div class="stat-value">${stats.avgAccuracy}%</div></div>`;
    html += '</div>';
    return html;
}

function openComparisonModal(player1Name, player2Name) {
    const modal = document.getElementById('playerModal');
    const modalPlayerName = document.getElementById('modalPlayerName');
    const modalPlayerStats = document.getElementById('modalPlayerStats');
    
    if (!modal || !modalPlayerName || !modalPlayerStats) return;
    
    modalPlayerName.innerHTML = `${getPlayerRankIcon(player1Name, 'small')} ${player1Name} <span class="vs-text">VS</span> ${getPlayerRankIcon(player2Name, 'small')} ${player2Name}`;
    modalPlayerStats.innerHTML = '<div class="loading-message">Loading comparison...</div>';
    
    modal.classList.add('active');
    
    setTimeout(() => {
        const stats1 = calculatePlayerStats(player1Name);
        const stats2 = calculatePlayerStats(player2Name);
        const h2h = calculateHeadToHead(player1Name, player2Name);
        modalPlayerStats.innerHTML = renderComparisonStats(player1Name, stats1, player2Name, stats2, h2h);
    }, 100);
}

function calculateHeadToHead(player1, player2) {
    let gamesPlayed = 0;
    let player1Wins = 0;
    let player2Wins = 0;
    let player1Kills = 0;
    let player2Kills = 0;
    
    gamesData.forEach(game => {
        const p1 = game.players.find(p => p.name === player1);
        const p2 = game.players.find(p => p.name === player2);
        
        if (p1 && p2) {
            gamesPlayed++;
            
            // Check if on different teams
            if (p1.team !== p2.team && p1.team !== 'none' && p2.team !== 'none') {
                // Determine winner by team score or placement
                const p1Rank = parseInt(p1.place) || 99;
                const p2Rank = parseInt(p2.place) || 99;
                
                if (p1Rank < p2Rank) player1Wins++;
                else if (p2Rank < p1Rank) player2Wins++;
            }
            
            player1Kills += p1.kills || 0;
            player2Kills += p2.kills || 0;
        }
    });
    
    return {
        gamesPlayed,
        player1Wins,
        player2Wins,
        player1Kills,
        player2Kills
    };
}

function renderComparisonStats(p1Name, stats1, p2Name, stats2, h2h) {
    const getBetterClass = (val1, val2, higherBetter = true) => {
        if (val1 === val2) return ['', ''];
        if (higherBetter) {
            return val1 > val2 ? ['stat-better', 'stat-worse'] : ['stat-worse', 'stat-better'];
        }
        return val1 < val2 ? ['stat-better', 'stat-worse'] : ['stat-worse', 'stat-better'];
    };
    
    let html = '<div class="comparison-container">';
    
    // Head to Head section
    if (h2h.gamesPlayed > 0) {
        html += '<div class="h2h-section">';
        html += `<div class="h2h-title">Head-to-Head: ${h2h.gamesPlayed} Games Together</div>`;
        html += '<div class="h2h-stats">';
        html += `<span class="h2h-stat">Kills when matched: ${h2h.player1Kills} vs ${h2h.player2Kills}</span>`;
        html += '</div>';
        html += '</div>';
    }
    
    // Comparison table
    html += '<div class="comparison-table">';
    
    const comparisons = [
        { label: 'Games', v1: stats1.games, v2: stats2.games },
        { label: 'Wins', v1: stats1.wins, v2: stats2.wins },
        { label: 'Win Rate', v1: parseFloat(stats1.winrate), v2: parseFloat(stats2.winrate), suffix: '%' },
        { label: 'Total Kills', v1: stats1.kills, v2: stats2.kills },
        { label: 'Total Deaths', v1: stats1.deaths, v2: stats2.deaths, higherBetter: false },
        { label: 'K/D Ratio', v1: parseFloat(stats1.kd), v2: parseFloat(stats2.kd) },
        { label: 'Assists', v1: stats1.assists, v2: stats2.assists },
        { label: 'Best Spree', v1: stats1.bestSpree, v2: stats2.bestSpree },
        { label: 'Avg Accuracy', v1: parseFloat(stats1.avgAccuracy), v2: parseFloat(stats2.avgAccuracy), suffix: '%' }
    ];
    
    comparisons.forEach(comp => {
        const [class1, class2] = getBetterClass(comp.v1, comp.v2, comp.higherBetter !== false);
        const suffix = comp.suffix || '';
        
        html += '<div class="comparison-row">';
        html += `<div class="comparison-value ${class1}">${comp.v1}${suffix}</div>`;
        html += `<div class="comparison-label">${comp.label}</div>`;
        html += `<div class="comparison-value ${class2}">${comp.v2}${suffix}</div>`;
        html += '</div>';
    });
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

// Helper functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatMedalName(name) {
    return name.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function calculateKD(kills, deaths) {
    if (deaths === 0) return kills.toFixed(2);
    return (kills / deaths).toFixed(2);
}

function getPlaceClass(place) {
    const num = place.replace(/\D/g, '');
    return num + (num === '1' ? 'st' : num === '2' ? 'nd' : num === '3' ? 'rd' : 'th');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ==================== PLAYER PROFILE FUNCTIONS ====================

let currentProfilePlayer = null;
let currentProfileGames = [];
let currentWinLossFilter = 'all'; // Track current filter

function filterProfileByWinLoss(filterType) {
    currentWinLossFilter = filterType;
    
    // Remove active class from all stat cards
    document.querySelectorAll('.profile-stat-card').forEach(card => {
        card.classList.remove('stat-active');
    });
    
    let filteredGames = [...currentProfileGames];
    
    if (filterType === 'wins') {
        filteredGames = currentProfileGames.filter(game => {
            const player = game.playerData;
            const hasTeams = game.players.some(p => isValidTeam(p.team));
            const gameType = game.details['Variant Name'] || game.details['Game Type'] || '';
            const isOddball = gameType.toLowerCase().includes('oddball');
            
            if (hasTeams && isValidTeam(player.team)) {
                // Team game - check if player's team won
                const teams = {};
                game.players.forEach(p => {
                    if (isValidTeam(p.team)) {
                        if (isOddball) {
                            teams[p.team] = (teams[p.team] || 0) + timeToSeconds(p.score);
                        } else {
                            teams[p.team] = (teams[p.team] || 0) + (parseInt(p.score) || 0);
                        }
                    }
                });
                const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
                return sortedTeams[0] && sortedTeams[0][0] === player.team;
            } else {
                // FFA - check if player had highest score
                const maxScore = Math.max(...game.players.map(p => parseInt(p.score) || 0));
                return (parseInt(player.score) || 0) === maxScore;
            }
        });
        
        // Highlight wins card
        event.target.closest('.profile-stat-card').classList.add('stat-active');
    } else if (filterType === 'losses') {
        filteredGames = currentProfileGames.filter(game => {
            const player = game.playerData;
            const hasTeams = game.players.some(p => isValidTeam(p.team));
            const gameType = game.details['Variant Name'] || game.details['Game Type'] || '';
            const isOddball = gameType.toLowerCase().includes('oddball');
            
            if (hasTeams && isValidTeam(player.team)) {
                // Team game - check if player's team lost
                const teams = {};
                game.players.forEach(p => {
                    if (isValidTeam(p.team)) {
                        if (isOddball) {
                            teams[p.team] = (teams[p.team] || 0) + timeToSeconds(p.score);
                        } else {
                            teams[p.team] = (teams[p.team] || 0) + (parseInt(p.score) || 0);
                        }
                    }
                });
                const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
                return sortedTeams[0] && sortedTeams[0][0] !== player.team;
            } else {
                // FFA - check if player didn't have highest score
                const maxScore = Math.max(...game.players.map(p => parseInt(p.score) || 0));
                return (parseInt(player.score) || 0) !== maxScore;
            }
        });
        
        // Highlight losses card
        event.target.closest('.profile-stat-card').classList.add('stat-active');
    }
    
    // Apply any existing filters
    filterPlayerGames(filteredGames);
}

function showWeaponBreakdown() {
    if (!currentProfilePlayer) return;
    
    // Calculate weapon stats for the player
    const weaponStats = {};
    
    currentProfileGames.forEach(game => {
        const weaponData = game.weapons?.find(w => w.Player === currentProfilePlayer);
        if (weaponData) {
            Object.keys(weaponData).forEach(key => {
                if (key !== 'Player' && key.toLowerCase().includes('kills')) {
                    const weaponName = key.replace(/ kills/gi, '').trim();
                    const kills = parseInt(weaponData[key]) || 0;
                    if (kills > 0) {
                        weaponStats[weaponName] = (weaponStats[weaponName] || 0) + kills;
                    }
                }
            });
        }
    });
    
    // Sort by most kills
    const sortedWeapons = Object.entries(weaponStats).sort((a, b) => b[1] - a[1]);
    
    // Create modal or overlay to show weapon breakdown
    let html = '<div class="weapon-breakdown-overlay" onclick="closeWeaponBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${currentProfilePlayer} - Weapon Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeWeaponBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';
    
    sortedWeapons.forEach(([weapon, kills]) => {
        const iconUrl = getWeaponIcon(weapon);
        const percentage = ((kills / Object.values(weaponStats).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
        
        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${weapon.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${weapon}</div>`;
        html += `<div class="weapon-breakdown-stats">${kills} kills (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function closeWeaponBreakdown() {
    const overlay = document.querySelector('.weapon-breakdown-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showMedalBreakdown() {
    if (!currentProfilePlayer) return;

    // Calculate medal stats for the player from game.medals array
    const medalStats = {};

    currentProfileGames.forEach(game => {
        if (game.medals) {
            const playerMedals = game.medals.find(m => m.player === currentProfilePlayer);
            if (playerMedals) {
                Object.entries(playerMedals).forEach(([medal, count]) => {
                    if (medal !== 'player') {
                        const medalCount = parseInt(count) || 0;
                        if (medalCount > 0) {
                            medalStats[medal] = (medalStats[medal] || 0) + medalCount;
                        }
                    }
                });
            }
        }
    });
    
    // Sort by most earned
    const sortedMedals = Object.entries(medalStats).sort((a, b) => b[1] - a[1]);

    // Create modal to show medal breakdown
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${currentProfilePlayer} - Medal Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (sortedMedals.length === 0) {
        html += '<div class="no-data">No medal data available</div>';
    }

    sortedMedals.forEach(([medal, count]) => {
        const iconUrl = getMedalIcon(medal);
        const percentage = ((count / Object.values(medalStats).reduce((a, b) => a + b, 0)) * 100).toFixed(1);

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${medal}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${medal.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatMedalName(medal)}</div>`;
        html += `<div class="weapon-breakdown-stats">${count} medals (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function closeMedalBreakdown() {
    const overlay = document.querySelector('.weapon-breakdown-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showPlayersFacedBreakdown() {
    const playerName = window.currentSearchContext;
    if (!playerName) return;

    // Calculate players faced with estimated kills
    const playersFaced = {};
    const playerGames = gamesData.filter(game =>
        game.players.some(p => p.name === playerName)
    );

    playerGames.forEach(game => {
        const thisPlayer = game.players.find(p => p.name === playerName);
        if (!thisPlayer) return;

        const hasTeams = game.players.some(p => p.team && p.team !== 'none' && p.team !== 'None');

        // Get valid targets for this game
        const targets = game.players.filter(p => {
            if (p.name === playerName) return false;
            if (hasTeams && thisPlayer.team && p.team &&
                thisPlayer.team !== 'none' && thisPlayer.team !== 'None' &&
                p.team !== 'none' && p.team !== 'None' &&
                thisPlayer.team === p.team) return false;
            return true;
        });

        game.players.forEach(p => {
            if (p.name !== playerName) {
                if (!playersFaced[p.name]) {
                    playersFaced[p.name] = {
                        games: 0,
                        asTeammate: 0,
                        asOpponent: 0,
                        estimatedKills: 0,
                        estimatedDeaths: 0
                    };
                }
                playersFaced[p.name].games++;

                // Check if teammate or opponent
                const isTeammate = hasTeams && thisPlayer.team && p.team &&
                    thisPlayer.team !== 'none' && thisPlayer.team !== 'None' &&
                    p.team !== 'none' && p.team !== 'None' &&
                    thisPlayer.team === p.team;

                if (isTeammate) {
                    playersFaced[p.name].asTeammate++;
                } else {
                    playersFaced[p.name].asOpponent++;

                    // Estimate kills against this opponent (weighted by their deaths)
                    if (targets.length > 0 && thisPlayer.kills > 0) {
                        const totalTargetDeaths = targets.reduce((sum, t) => sum + (t.deaths || 1), 0);
                        const weight = (p.deaths || 1) / totalTargetDeaths;
                        playersFaced[p.name].estimatedKills += Math.round(thisPlayer.kills * weight);
                    }

                    // Estimate deaths from this opponent (weighted by their kills)
                    const enemyTargets = game.players.filter(ep => {
                        if (ep.name === p.name) return false;
                        if (hasTeams && p.team && ep.team &&
                            p.team !== 'none' && p.team !== 'None' &&
                            ep.team !== 'none' && ep.team !== 'None' &&
                            p.team === ep.team) return false;
                        return true;
                    });
                    if (enemyTargets.length > 0 && p.kills > 0) {
                        const totalEnemyTargetDeaths = enemyTargets.reduce((sum, t) => sum + (t.deaths || 1), 0);
                        const deathWeight = (thisPlayer.deaths || 1) / totalEnemyTargetDeaths;
                        playersFaced[p.name].estimatedDeaths += Math.round(p.kills * deathWeight);
                    }
                }
            }
        });
    });

    // Sort by estimated kills (most killed first)
    const sortedPlayers = Object.entries(playersFaced).sort((a, b) => b[1].estimatedKills - a[1].estimatedKills);

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${playerName} - Players Faced</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (sortedPlayers.length === 0) {
        html += '<div class="no-data">No player data available</div>';
    }

    sortedPlayers.forEach(([name, data]) => {
        const kd = data.estimatedDeaths > 0 ? (data.estimatedKills / data.estimatedDeaths).toFixed(2) : data.estimatedKills.toFixed(2);
        html += `<div class="weapon-breakdown-item player-faced-item">`;
        html += `<div class="player-faced-rank">${getPlayerRankIcon(name, 'small')}</div>`;
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name clickable-player" data-player="${name}" onclick="event.stopPropagation(); closeMedalBreakdown(); openSearchResultsPage('player', '${name}')">${name}</div>`;
        if (data.asOpponent > 0) {
            html += `<div class="weapon-breakdown-stats pvp-stats">`;
            html += `<span class="pvp-kills">${data.estimatedKills} kills</span>`;
            html += `<span class="pvp-deaths">${data.estimatedDeaths} deaths</span>`;
            html += `<span class="pvp-kd">${kd} K/D</span>`;
            html += `</div>`;
        }
        html += `<div class="weapon-breakdown-stats">${data.games} games`;
        if (data.asTeammate > 0 && data.asOpponent > 0) {
            html += ` (${data.asOpponent} vs, ${data.asTeammate} with)`;
        } else if (data.asTeammate > 0) {
            html += ` (teammate only)`;
        }
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function showSearchMedalBreakdown() {
    const medalBreakdown = window.currentSearchMedalBreakdown || {};
    const context = window.currentSearchContext || 'Unknown';

    // Sort by most earned
    const sortedMedals = Object.entries(medalBreakdown).sort((a, b) => b[1] - a[1]);
    const totalMedals = Object.values(medalBreakdown).reduce((a, b) => a + b, 0);

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${context} - Medal Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (sortedMedals.length === 0) {
        html += '<div class="no-data">No medal data available</div>';
    }

    sortedMedals.forEach(([medal, count]) => {
        const iconUrl = getMedalIcon(medal);
        const percentage = totalMedals > 0 ? ((count / totalMedals) * 100).toFixed(1) : '0.0';

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${medal}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${medal.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatMedalName(medal)}</div>`;
        html += `<div class="weapon-breakdown-stats">${count} medals (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function showSearchKillsBreakdown() {
    const playerStats = window.currentSearchPlayerStats || {};
    const context = window.currentSearchContext || 'Unknown';

    // Sort by most kills
    const sortedPlayers = Object.entries(playerStats).sort((a, b) => b[1].kills - a[1].kills);
    const totalKills = Object.values(playerStats).reduce((sum, p) => sum + p.kills, 0);

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeKillsBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${context} - Kill Leaders</h2>`;
    html += `<button class="modal-close" onclick="closeKillsBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (sortedPlayers.length === 0) {
        html += '<div class="no-data">No player data available</div>';
    }

    sortedPlayers.forEach(([name, stats], index) => {
        const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
        const percentage = totalKills > 0 ? ((stats.kills / totalKills) * 100).toFixed(1) : '0.0';
        const rankIcon = getRankIcon(name);

        html += `<div class="weapon-breakdown-item player-faced-item" onclick="event.stopPropagation(); closeKillsBreakdown(); openPlayerProfile('${name.replace(/'/g, "\\'")}')">`;
        if (rankIcon) {
            html += `<img src="${rankIcon}" alt="rank" class="weapon-breakdown-icon player-faced-rank">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">#${index + 1}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${name}</div>`;
        html += `<div class="weapon-breakdown-stats pvp-stats">`;
        html += `<span class="pvp-kills">${stats.kills} kills</span>`;
        html += `<span class="pvp-deaths">${stats.deaths} deaths</span>`;
        html += `<span class="pvp-kd">${kd} K/D</span>`;
        html += `</div>`;
        html += `<div class="weapon-breakdown-stats">${stats.games} games (${percentage}% of kills)</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function closeKillsBreakdown() {
    const overlay = document.querySelector('.weapon-breakdown-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// ==================== PLAYER PROFILE FUNCTIONS ====================

function openPlayerProfile(playerName) {
    currentProfilePlayer = playerName;
    currentWinLossFilter = 'all'; // Reset filter
    
    // Hide other sections
    document.getElementById('statsArea').style.display = 'none';
    document.getElementById('searchResultsPage').style.display = 'none';
    document.getElementById('playerProfilePage').style.display = 'block';
    
    // Set player name and rank
    document.getElementById('profilePlayerName').textContent = playerName;
    document.getElementById('profileRankIcon').innerHTML = getPlayerRankIcon(playerName, 'large');
    
    // Calculate overall stats
    const stats = calculatePlayerOverallStats(playerName);
    renderProfileStats(stats);
    
    // Get player's games
    currentProfileGames = getPlayerGames(playerName);
    
    // Populate filter dropdowns
    populateProfileFilters();
    
    // Render games list
    renderProfileGames(currentProfileGames);
}

function closePlayerProfile() {
    document.getElementById('playerProfilePage').style.display = 'none';
    document.getElementById('statsArea').style.display = 'block';
    currentProfilePlayer = null;
    currentProfileGames = [];
}

function calculatePlayerOverallStats(playerName) {
    let games = 0, wins = 0, kills = 0, deaths = 0, assists = 0, totalScore = 0, totalMedals = 0;
    
    gamesData.forEach(game => {
        const player = game.players.find(p => p.name === playerName);
        if (player) {
            games++;
            kills += player.kills || 0;
            deaths += player.deaths || 0;
            assists += player.assists || 0;
            totalScore += parseInt(player.score) || 0;
            
            // Count total medals from game.medals array
            if (game.medals) {
                const playerMedals = game.medals.find(m => m.player === playerName);
                if (playerMedals) {
                    Object.entries(playerMedals).forEach(([key, count]) => {
                        if (key !== 'player') {
                            totalMedals += parseInt(count) || 0;
                        }
                    });
                }
            }
            
            // Check if player won
            const hasTeams = game.players.some(p => isValidTeam(p.team));
            const gameType = game.details['Variant Name'] || game.details['Game Type'] || '';
            const isOddball = gameType.toLowerCase().includes('oddball');
            
            if (hasTeams && isValidTeam(player.team)) {
                const teams = {};
                game.players.forEach(p => {
                    if (isValidTeam(p.team)) {
                        if (isOddball) {
                            teams[p.team] = (teams[p.team] || 0) + timeToSeconds(p.score);
                        } else {
                            teams[p.team] = (teams[p.team] || 0) + (parseInt(p.score) || 0);
                        }
                    }
                });
                const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
                if (sortedTeams[0] && sortedTeams[0][0] === player.team) wins++;
            } else {
                // FFA - check if highest score
                const maxScore = Math.max(...game.players.map(p => parseInt(p.score) || 0));
                if ((parseInt(player.score) || 0) === maxScore) wins++;
            }
        }
    });
    
    return {
        games,
        wins,
        losses: games - wins,
        winRate: games > 0 ? ((wins / games) * 100).toFixed(1) : 0,
        kills,
        deaths,
        assists,
        kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
        kpg: games > 0 ? (kills / games).toFixed(1) : 0,
        dpg: games > 0 ? (deaths / games).toFixed(1) : 0,
        totalScore,
        avgScore: games > 0 ? Math.round(totalScore / games) : 0,
        totalMedals
    };
}

function renderProfileStats(stats) {
    const container = document.getElementById('profileOverallStats');
    container.innerHTML = `
        <div class="profile-stat-card" onclick="filterProfileByWinLoss('all')">
            <div class="stat-value">${stats.games}</div>
            <div class="stat-label">Games</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="filterProfileByWinLoss('wins')">
            <div class="stat-value">${stats.wins}</div>
            <div class="stat-label">Wins</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="filterProfileByWinLoss('losses')">
            <div class="stat-value">${stats.losses}</div>
            <div class="stat-label">Losses</div>
        </div>
        <div class="profile-stat-card">
            <div class="stat-value">${stats.winRate}%</div>
            <div class="stat-label">Win Rate</div>
        </div>
        <div class="profile-stat-card highlight">
            <div class="stat-value">${stats.kd}</div>
            <div class="stat-label">K/D Ratio</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="showWeaponBreakdown()">
            <div class="stat-value">${stats.kills}</div>
            <div class="stat-label">Total Kills</div>
        </div>
        <div class="profile-stat-card">
            <div class="stat-value">${stats.deaths}</div>
            <div class="stat-label">Total Deaths</div>
        </div>
        <div class="profile-stat-card">
            <div class="stat-value">${stats.kpg}</div>
            <div class="stat-label">Kills/Game</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="showMedalBreakdown()">
            <div class="stat-value">${stats.totalMedals}</div>
            <div class="stat-label">Total Medals</div>
        </div>
    `;
}

function getPlayerGames(playerName) {
    return gamesData.filter(game => 
        game.players.some(p => p.name === playerName)
    ).map((game, idx) => ({
        ...game,
        originalIndex: gamesData.indexOf(game),
        playerData: game.players.find(p => p.name === playerName)
    }));
}

function populateProfileFilters() {
    const maps = new Map();
    const gametypes = new Map();
    
    currentProfileGames.forEach(game => {
        const mapName = game.details['Map Name'];
        const gameType = game.details['Variant Name'] || game.details['Game Type'];
        if (mapName) {
            maps.set(mapName, (maps.get(mapName) || 0) + 1);
        }
        if (gameType) {
            gametypes.set(gameType, (gametypes.get(gameType) || 0) + 1);
        }
    });
    
    // Sort by name and store with counts
    profileAvailableMaps = [...maps.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    profileAvailableGametypes = [...gametypes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    
    // Reset filter values
    profileCurrentMapFilter = '';
    profileCurrentGametypeFilter = '';
    
    const mapInput = document.getElementById('profileFilterMapInput');
    const typeInput = document.getElementById('profileFilterGametypeInput');
    if (mapInput) {
        mapInput.value = '';
        mapInput.classList.remove('has-value');
    }
    if (typeInput) {
        typeInput.value = '';
        typeInput.classList.remove('has-value');
    }
}

function sortPlayerGames() {
    const sortBy = document.getElementById('profileSortBy')?.value || 'date-desc';
    let games = [...currentProfileGames];
    
    switch(sortBy) {
        case 'date-desc':
            games.sort((a, b) => new Date(b.details['Start Time'] || 0) - new Date(a.details['Start Time'] || 0));
            break;
        case 'date-asc':
            games.sort((a, b) => new Date(a.details['Start Time'] || 0) - new Date(b.details['Start Time'] || 0));
            break;
        case 'map':
            games.sort((a, b) => (a.details['Map Name'] || '').localeCompare(b.details['Map Name'] || ''));
            break;
        case 'gametype':
            games.sort((a, b) => (a.details['Variant Name'] || '').localeCompare(b.details['Variant Name'] || ''));
            break;
        case 'score':
            games.sort((a, b) => (b.playerData?.score || 0) - (a.playerData?.score || 0));
            break;
        case 'kills':
            games.sort((a, b) => (b.playerData?.kills || 0) - (a.playerData?.kills || 0));
            break;
    }
    
    filterPlayerGames(games);
}

function filterPlayerGames(preFilteredGames = null) {
    let games = preFilteredGames || [...currentProfileGames];
    
    // Apply win/loss filter if not 'all'
    if (currentWinLossFilter !== 'all' && !preFilteredGames) {
        if (currentWinLossFilter === 'wins') {
            games = games.filter(game => {
                const player = game.playerData;
                const hasTeams = game.players.some(p => isValidTeam(p.team));
                const gameType = game.details['Variant Name'] || game.details['Game Type'] || '';
                const isOddball = gameType.toLowerCase().includes('oddball');
                
                if (hasTeams && isValidTeam(player.team)) {
                    const teams = {};
                    game.players.forEach(p => {
                        if (isValidTeam(p.team)) {
                            if (isOddball) {
                                teams[p.team] = (teams[p.team] || 0) + timeToSeconds(p.score);
                            } else {
                                teams[p.team] = (teams[p.team] || 0) + (parseInt(p.score) || 0);
                            }
                        }
                    });
                    const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
                    return sortedTeams[0] && sortedTeams[0][0] === player.team;
                } else {
                    const maxScore = Math.max(...game.players.map(p => parseInt(p.score) || 0));
                    return (parseInt(player.score) || 0) === maxScore;
                }
            });
        } else if (currentWinLossFilter === 'losses') {
            games = games.filter(game => {
                const player = game.playerData;
                const hasTeams = game.players.some(p => isValidTeam(p.team));
                const gameType = game.details['Variant Name'] || game.details['Game Type'] || '';
                const isOddball = gameType.toLowerCase().includes('oddball');
                
                if (hasTeams && isValidTeam(player.team)) {
                    const teams = {};
                    game.players.forEach(p => {
                        if (isValidTeam(p.team)) {
                            if (isOddball) {
                                teams[p.team] = (teams[p.team] || 0) + timeToSeconds(p.score);
                            } else {
                                teams[p.team] = (teams[p.team] || 0) + (parseInt(p.score) || 0);
                            }
                        }
                    });
                    const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
                    return sortedTeams[0] && sortedTeams[0][0] !== player.team;
                } else {
                    const maxScore = Math.max(...game.players.map(p => parseInt(p.score) || 0));
                    return (parseInt(player.score) || 0) !== maxScore;
                }
            });
        }
    }
    
    if (profileCurrentMapFilter) {
        games = games.filter(g => g.details['Map Name'] === profileCurrentMapFilter);
    }
    if (profileCurrentGametypeFilter) {
        games = games.filter(g => (g.details['Variant Name'] || g.details['Game Type']) === profileCurrentGametypeFilter);
    }
    
    renderProfileGames(games);
}

function renderProfileGames(games) {
    const container = document.getElementById('profileGamesList');
    container.innerHTML = '';
    
    games.forEach((game, idx) => {
        const gameNumber = game.originalIndex + 1;
        const gameDiv = createGameItem(game, gameNumber);
        container.appendChild(gameDiv);
    });
    
    if (games.length === 0) {
        container.innerHTML = '<div class="no-games">No games found matching filters</div>';
    }
}

// ==================== MAIN PAGE SORTING FUNCTIONS ====================

// Store available maps and gametypes globally
let availableMaps = [];
let availableGametypes = [];
let currentMapFilter = '';
let currentGametypeFilter = '';

// Profile page filters
let profileAvailableMaps = [];
let profileAvailableGametypes = [];
let profileCurrentMapFilter = '';
let profileCurrentGametypeFilter = '';

function populateMainFilters() {
    const maps = new Map();
    const gametypes = new Map();
    
    gamesData.forEach(game => {
        const mapName = game.details['Map Name'];
        const gameType = game.details['Variant Name'] || game.details['Game Type'];
        if (mapName) {
            maps.set(mapName, (maps.get(mapName) || 0) + 1);
        }
        if (gameType) {
            gametypes.set(gameType, (gametypes.get(gameType) || 0) + 1);
        }
    });
    
    // Sort by name and store with counts
    availableMaps = [...maps.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    availableGametypes = [...gametypes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function showFilterDropdown(type) {
    const dropdown = document.getElementById(`filter${capitalize(type)}Dropdown`);
    if (!dropdown) return;
    
    // Close other dropdowns first
    document.querySelectorAll('.filter-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });
    
    // Populate and show dropdown
    filterDropdownOptions(type);
    dropdown.classList.add('active');
}

function filterDropdownOptions(type) {
    let dropdown, input, items, currentFilter;
    
    if (type === 'map') {
        dropdown = document.getElementById('filterMapDropdown');
        input = document.getElementById('filterMapInput');
        items = availableMaps;
        currentFilter = currentMapFilter;
    } else if (type === 'gametype') {
        dropdown = document.getElementById('filterGametypeDropdown');
        input = document.getElementById('filterGametypeInput');
        items = availableGametypes;
        currentFilter = currentGametypeFilter;
    } else if (type === 'profileMap') {
        dropdown = document.getElementById('profileFilterMapDropdown');
        input = document.getElementById('profileFilterMapInput');
        items = profileAvailableMaps;
        currentFilter = profileCurrentMapFilter;
    } else if (type === 'profileGametype') {
        dropdown = document.getElementById('profileFilterGametypeDropdown');
        input = document.getElementById('profileFilterGametypeInput');
        items = profileAvailableGametypes;
        currentFilter = profileCurrentGametypeFilter;
    }
    
    if (!dropdown || !input) return;
    
    const searchTerm = input.value.toLowerCase();
    
    // Filter items based on search
    const filtered = items.filter(([name]) => 
        name.toLowerCase().includes(searchTerm)
    );
    
    // Build dropdown HTML
    let html = '';
    
    // Add "All" option
    const allLabel = type.includes('map') ? 'All Maps' : 'All Game Types';
    html += `<div class="filter-dropdown-item clear-option${!currentFilter ? ' selected' : ''}" onclick="selectFilter('${type}', '')">${allLabel}</div>`;
    
    // Add filtered items
    filtered.forEach(([name, count]) => {
        const isSelected = name === currentFilter;
        html += `<div class="filter-dropdown-item${isSelected ? ' selected' : ''}" onclick="selectFilter('${type}', '${escapeHtml(name)}')">
            <span>${name}</span>
            <span class="game-count">${count} games</span>
        </div>`;
    });
    
    if (filtered.length === 0) {
        html += '<div class="filter-dropdown-item" style="color: var(--text-secondary); pointer-events: none;">No matches found</div>';
    }
    
    dropdown.innerHTML = html;
}

function selectFilter(type, value) {
    let input, dropdown;
    
    if (type === 'map') {
        input = document.getElementById('filterMapInput');
        dropdown = document.getElementById('filterMapDropdown');
        currentMapFilter = value;
        if (input) {
            input.value = value;
            input.classList.toggle('has-value', !!value);
        }
    } else if (type === 'gametype') {
        input = document.getElementById('filterGametypeInput');
        dropdown = document.getElementById('filterGametypeDropdown');
        currentGametypeFilter = value;
        if (input) {
            input.value = value;
            input.classList.toggle('has-value', !!value);
        }
    } else if (type === 'profileMap') {
        input = document.getElementById('profileFilterMapInput');
        dropdown = document.getElementById('profileFilterMapDropdown');
        profileCurrentMapFilter = value;
        if (input) {
            input.value = value;
            input.classList.toggle('has-value', !!value);
        }
    } else if (type === 'profileGametype') {
        input = document.getElementById('profileFilterGametypeInput');
        dropdown = document.getElementById('profileFilterGametypeDropdown');
        profileCurrentGametypeFilter = value;
        if (input) {
            input.value = value;
            input.classList.toggle('has-value', !!value);
        }
    }
    
    // Close dropdown
    if (dropdown) dropdown.classList.remove('active');
    
    // Apply filters
    if (type === 'map' || type === 'gametype') {
        sortGames();
    } else {
        sortPlayerGames();
    }
}

function capitalize(str) {
    if (str === 'profileMap') return 'ProfileMap';
    if (str === 'profileGametype') return 'ProfileGametype';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function clearAllFilters() {
    currentMapFilter = '';
    currentGametypeFilter = '';
    
    const mapInput = document.getElementById('filterMapInput');
    const typeInput = document.getElementById('filterGametypeInput');
    const sortBy = document.getElementById('sortBy');
    
    if (mapInput) {
        mapInput.value = '';
        mapInput.classList.remove('has-value');
    }
    if (typeInput) {
        typeInput.value = '';
        typeInput.classList.remove('has-value');
    }
    if (sortBy) {
        sortBy.value = 'date-desc';
    }
    
    renderFilteredGames(gamesData);
}

function clearProfileFilters() {
    profileCurrentMapFilter = '';
    profileCurrentGametypeFilter = '';
    currentWinLossFilter = 'all'; // Reset win/loss filter
    
    // Remove active state from stat cards
    document.querySelectorAll('.profile-stat-card').forEach(card => {
        card.classList.remove('stat-active');
    });
    
    const mapInput = document.getElementById('profileFilterMapInput');
    const typeInput = document.getElementById('profileFilterGametypeInput');
    const sortBy = document.getElementById('profileSortBy');
    
    if (mapInput) {
        mapInput.value = '';
        mapInput.classList.remove('has-value');
    }
    if (typeInput) {
        typeInput.value = '';
        typeInput.classList.remove('has-value');
    }
    if (sortBy) {
        sortBy.value = 'date-desc';
    }
    
    filterPlayerGames();
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.filter-search-box')) {
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('active'));
    }
});

function sortGames() {
    const sortBy = document.getElementById('sortBy')?.value || 'date-desc';
    let games = [...gamesData];
    
    switch(sortBy) {
        case 'date-desc':
            games.sort((a, b) => new Date(b.details['Start Time'] || 0) - new Date(a.details['Start Time'] || 0));
            break;
        case 'date-asc':
            games.sort((a, b) => new Date(a.details['Start Time'] || 0) - new Date(b.details['Start Time'] || 0));
            break;
        case 'map':
            games.sort((a, b) => (a.details['Map Name'] || '').localeCompare(b.details['Map Name'] || ''));
            break;
        case 'gametype':
            games.sort((a, b) => (a.details['Variant Name'] || '').localeCompare(b.details['Variant Name'] || ''));
            break;
    }
    
    filterGames(games);
}

function filterGames(preFilteredGames = null) {
    let games = preFilteredGames || [...gamesData];
    
    if (currentMapFilter) {
        games = games.filter(g => g.details['Map Name'] === currentMapFilter);
    }
    if (currentGametypeFilter) {
        games = games.filter(g => (g.details['Variant Name'] || g.details['Game Type']) === currentGametypeFilter);
    }
    
    renderFilteredGames(games);
}

function renderFilteredGames(games) {
    const container = document.getElementById('gamesList');
    container.innerHTML = '';
    
    games.forEach((game, idx) => {
        const originalIndex = gamesData.indexOf(game);
        const gameNumber = originalIndex + 1;
        const gameDiv = createGameItem(game, gameNumber);
        container.appendChild(gameDiv);
    });
    
    if (games.length === 0) {
        container.innerHTML = '<div class="no-games">No games found matching filters</div>';
    }
}

// ==================== CLICKABLE PLAYER EVENT DELEGATION ====================

document.addEventListener('click', function(e) {
    // Handle clickable player elements
    const clickablePlayer = e.target.closest('.clickable-player');
    if (clickablePlayer) {
        const playerName = clickablePlayer.dataset.player;
        if (playerName) {
            e.preventDefault();
            e.stopPropagation();
            openPlayerProfile(playerName);
        }
    }
    
    // Handle modal close
    const modal = document.getElementById('playerModal');
    if (modal && e.target === modal) {
        closePlayerModal();
    }
});
