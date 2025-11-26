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

// Medal icons - local files from h2icons folder (25 medals)
const medalIcons = {
    // Kill streaks (within 4 seconds)
    'double_kill': 'h2icons/Double Kill.png',
    'triple_kill': 'h2icons/Triple Kill.png',
    'killtacular': 'h2icons/Killtacular.png',
    'kill_frenzy': 'h2icons/Kill Frenzy.png',
    'killtrocity': 'h2icons/Killtrocity.png',
    'killamanjaro': 'h2icons/Killamanjaro.png',
    
    // Spree medals (kills without dying)
    'killing_spree': 'h2icons/Killing Spree.png',
    'running_riot': 'h2icons/Running Riot.png',
    'rampage': 'h2icons/Rampage.png',
    'berserker': 'h2icons/Berserker.png',
    'overkill': 'h2icons/Overkill.png',
    
    // Special kills
    'assassin': 'h2icons/Assassin.png',
    'assassinate': 'h2icons/Assassin.png',
    'bonecracker': 'h2icons/Bonecracker.png',
    'sniper_kill': 'h2icons/Sniper Kill.png',
    'stick_it': 'h2icons/Stick It.png',
    'stick': 'h2icons/Stick It.png',
    'roadkill': 'h2icons/Roadkill.png',
    'splatter': 'h2icons/Roadkill.png',
    'carjacking': 'h2icons/Carjacking.png',
    
    // Flag objectives
    'flag_taken': 'h2icons/Flag Taken.png',
    'flag_captured': 'h2icons/Flag Captured.png',
    'flag_returned': 'h2icons/Flag Returned.png',
    'flag_carrier_kill': 'h2icons/Flag Carrier Kill.png',
    
    // Bomb objectives
    'bomb_planted': 'h2icons/Bomb Planted.png',
    'bomb_taken': 'h2icons/Bomb Taken.png',
    'bomb_returned': 'h2icons/Bomb Returned.png',
    'bomb_carrier_kill': 'h2icons/Bomb Carrier Kill.png'
};

// Helper function to get medal icon path
function getMedalIcon(medalName) {
    // Convert medal name to key format (lowercase, spaces to underscores)
    const key = medalName.toLowerCase().replace(/\s+/g, '_');
    return medalIcons[key] || null;
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
}

function createGameItem(game, gameNumber) {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-item';
    gameDiv.id = `game-${gameNumber}`;
    
    const details = game.details;
    const players = game.players;
    
    let displayGameType = details['Variant Name'] || details['Game Type'] || 'Unknown';
    let mapName = details['Map Name'] || 'Unknown Map';
    let duration = details['Duration'] || '0:00';
    
    // Get map image for background
    const mapImage = mapImages[mapName] || defaultMapImage;
    
    // Calculate team scores for team games
    let teamScoreDisplay = '';
    const teams = {};
    players.forEach(player => {
        const team = player.team;
        if (team && team !== 'None') {
            if (!teams[team]) {
                teams[team] = 0;
            }
            teams[team] += parseInt(player.score) || 0;
        }
    });
    
    // If there are teams, show the scores
    if (Object.keys(teams).length > 0) {
        const teamScores = Object.entries(teams)
            .sort((a, b) => b[1] - a[1]) // Sort by score descending
            .map(([team, score]) => `${team}: ${score}`)
            .join(' - ');
        teamScoreDisplay = `<span class="game-meta-tag">${teamScores}</span>`;
    }
    
    gameDiv.innerHTML = `
        <div class="game-header-bar" onclick="toggleGameDetails(${gameNumber})" style="--map-bg: url('${mapImage}')">
            <div class="game-header-left">
                <div class="game-number">${displayGameType}</div>
                <div class="game-info">
                    <span class="game-meta-tag">${mapName}</span>
                    <span class="game-meta-tag">${duration}</span>
                    ${teamScoreDisplay}
                </div>
            </div>
            <div class="expand-icon">▶</div>
        </div>
        <div class="game-details">
            <div class="game-details-content">
                <div class="game-date">${details['Start Time'] || 'Unknown Date'}</div>
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
            const gameIndex = gamesData.length - gameNumber;
            const game = gamesData[gameIndex];
            gameContent.innerHTML = renderGameContent(game);
        }
    }
}

function renderGameContent(game) {
    const mapName = game.details['Map Name'] || 'Unknown';
    const mapImage = mapImages[mapName] || defaultMapImage;
    const gameType = game.details['Variant Name'] || game.details['Game Type'] || 'Unknown';
    const duration = game.details['Duration'] || '0:00';
    const startTime = game.details['Start Time'] || '';
    
    // Calculate team scores
    let teamScoreHtml = '';
    const teams = {};
    game.players.forEach(player => {
        const team = player.team;
        if (team && team !== 'None') {
            if (!teams[team]) {
                teams[team] = 0;
            }
            teams[team] += parseInt(player.score) || 0;
        }
    });
    
    if (Object.keys(teams).length > 0) {
        const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
        teamScoreHtml = '<div class="game-final-score">';
        sortedTeams.forEach(([team, score], index) => {
            const teamClass = team.toLowerCase();
            teamScoreHtml += `<span class="final-score-team team-${teamClass}">${team}: ${score}</span>`;
            if (index < sortedTeams.length - 1) {
                teamScoreHtml += '<span class="score-separator">vs</span>';
            }
        });
        teamScoreHtml += '</div>';
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
    html += `<span><i class="icon-calendar"></i> ${startTime}</span>`;
    html += `</div>`;
    html += teamScoreHtml;
    html += `</div>`;
    html += '</div>';
    
    html += '<div class="tab-navigation">';
    html += '<button class="tab-btn active" onclick="switchGameTab(this, \'scoreboard\')">Scoreboard</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'stats\')">Detailed Stats</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'medals\')">Medals</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'weapons\')">Weapons</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'twitch\')">Twitch</button>';
    html += '</div>';
    
    html += '<div class="tab-content active">';
    html += renderScoreboard(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderDetailedStats(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderMedals(game);
    html += '</div>';
    
    html += '<div class="tab-content">';
    html += renderWeapons(game);
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
    const hasTeams = players.some(p => p.team && p.team !== 'none');
    
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
        const teamAttr = player.team && player.team !== 'none' ? `data-team="${player.team}"` : '';
        html += `<div class="scoreboard-row" ${teamAttr} style="grid-template-columns: ${gridTemplate}">`;
        
        html += `<div class="sb-player">`;
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
    
    let html = '<div class="medals-display">';
    
    sortedMedals.forEach(playerMedals => {
        const team = playerTeams[playerMedals.player];
        const teamClass = team ? `team-${team.toLowerCase()}` : '';
        
        html += `<div class="player-medals-row ${teamClass}">`;
        html += `<div class="player-medals-name">`;
        html += getPlayerRankIcon(playerMedals.player, 'small');
        html += `<span>${playerMedals.player}</span>`;
        html += `</div>`;
        html += `<div class="player-medals-icons">`;
        
        // Get all medals for this player (excluding the 'player' key)
        Object.entries(playerMedals).forEach(([medalKey, count]) => {
            if (medalKey === 'player' || count === 0) return;
            
            const iconPath = getMedalIcon(medalKey);
            const medalName = formatMedalName(medalKey);
            
            if (iconPath) {
                html += `<div class="medal-item" title="${medalName}">`;
                html += `<img src="${iconPath}" alt="${medalName}" class="medal-icon">`;
                if (count > 1) {
                    html += `<span class="medal-count">x${count}</span>`;
                }
                html += `</div>`;
            } else {
                // Fallback if no icon found - show text
                html += `<div class="medal-item medal-text" title="${medalName}">`;
                html += `<span class="medal-name-fallback">${medalName}</span>`;
                if (count > 1) {
                    html += `<span class="medal-count">x${count}</span>`;
                }
                html += `</div>`;
            }
        });
        
        html += `</div>`;
        html += `</div>`;
    });
    
    html += '</div>';
    return html;
}

function renderWeapons(game) {
    const weapons = game.weapons;
    const players = game.players;
    
    const playerTeams = {};
    players.forEach(p => {
        if (p.team && p.team !== 'none') {
            playerTeams[p.name] = p.team;
        }
    });
    
    // Sort weapons by team (Red first, then Blue)
    const sortedWeapons = [...weapons].sort((a, b) => {
        const teamOrder = { 'Red': 0, 'Blue': 1 };
        const teamA = teamOrder[playerTeams[a.Player]] !== undefined ? teamOrder[playerTeams[a.Player]] : 2;
        const teamB = teamOrder[playerTeams[b.Player]] !== undefined ? teamOrder[playerTeams[b.Player]] : 2;
        return teamA - teamB;
    });
    
    // Get all weapon columns
    const weaponCols = Object.keys(weapons[0] || {}).filter(k => k !== 'Player');
    
    // Group by weapon type
    const weaponTypes = new Set();
    weaponCols.forEach(col => {
        const weaponName = col.replace(/ (kills|shots fired|shots hit)/gi, '').trim();
        weaponTypes.add(weaponName);
    });
    
    let html = '<div class="detailed-stats">';
    
    Array.from(weaponTypes).forEach(weaponName => {
        const killsCol = weaponCols.find(c => c.includes(weaponName) && c.includes('kills'));
        const firedCol = weaponCols.find(c => c.includes(weaponName) && c.includes('fired'));
        const hitCol = weaponCols.find(c => c.includes(weaponName) && c.includes('hit'));
        
        if (killsCol) {
            html += `<div class="stats-category">${weaponName}</div>`;
            html += '<table class="stats-table">';
            html += '<thead><tr>';
            html += '<th>Player</th><th>Kills</th>';
            if (firedCol) html += '<th>Shots Fired</th>';
            if (hitCol) html += '<th>Shots Hit</th>';
            if (firedCol && hitCol) html += '<th>Accuracy</th>';
            html += '</tr></thead>';
            html += '<tbody>';
            
            sortedWeapons.forEach(weapon => {
                const team = playerTeams[weapon.Player];
                const teamAttr = team ? `data-team="${team}"` : '';
                
                const kills = weapon[killsCol] || 0;
                const fired = weapon[firedCol] || 0;
                const hit = weapon[hitCol] || 0;
                const accuracy = fired > 0 ? ((hit / fired) * 100).toFixed(1) : '0.0';
                
                html += `<tr ${teamAttr}>`;
                html += `<td><span class="player-with-rank">${getPlayerRankIcon(weapon.Player, 'small')}<span>${weapon.Player}</span></span></td>`;
                html += `<td>${kills}</td>`;
                if (firedCol) html += `<td>${fired}</td>`;
                if (hitCol) html += `<td>${hit}</td>`;
                if (firedCol && hitCol) html += `<td>${accuracy}%</td>`;
                html += `</tr>`;
            });
            
            html += '</tbody></table>';
        }
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
        const teamClass = team && team !== 'none' ? `team-${team.toLowerCase()}` : '';
        
        html += `<div class="twitch-player-card ${teamClass}">`;
        html += `<div class="twitch-player-header">`;
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
        
        html += '<div class="leaderboard-row" onclick="openPlayerModal(\'' + player.name + '\')">';
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
    const searchInput = document.getElementById('playerSearch');
    const searchResults = document.getElementById('searchResults');
    const searchInput2 = document.getElementById('playerSearch2');
    const searchResults2 = document.getElementById('searchResults2');
    
    if (!searchInput || !searchResults) return;
    
    // Setup first search box
    setupSearchBox(searchInput, searchResults, 1);
    
    // Setup second search box if it exists
    if (searchInput2 && searchResults2) {
        setupSearchBox(searchInput2, searchResults2, 2);
    }
    
    // Setup PVP search boxes
    const pvpPlayer1 = document.getElementById('pvpPlayer1');
    const pvpResults1 = document.getElementById('pvpResults1');
    const pvpPlayer2 = document.getElementById('pvpPlayer2');
    const pvpResults2 = document.getElementById('pvpResults2');
    
    if (pvpPlayer1 && pvpResults1) {
        setupPvpSearchBox(pvpPlayer1, pvpResults1, 1);
    }
    if (pvpPlayer2 && pvpResults2) {
        setupPvpSearchBox(pvpPlayer2, pvpResults2, 2);
    }
    
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
}

function setupPvpSearchBox(inputElement, resultsElement, playerNum) {
    inputElement.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            resultsElement.classList.remove('active');
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
        
        if (query.length < 2) {
            resultsElement.classList.remove('active');
            return;
        }
        
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
        html += `<div class="search-result-type">${result.type}</div>`;
        html += `<div class="search-result-name">${result.name}</div>`;
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
    searchInput.value = name;
    
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
    
    let html = '<div class="search-results-container">';
    
    // Player stats summary
    html += '<div class="player-stats-summary">';
    html += '<div class="stats-grid">';
    html += `<div class="stat-card"><div class="stat-label">Games</div><div class="stat-value">${stats.games}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Wins</div><div class="stat-value">${stats.wins}</div><div class="stat-sublabel">${stats.winrate}% Win Rate</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Kills</div><div class="stat-value">${stats.kills}</div><div class="stat-sublabel">${stats.kpg} per game</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Deaths</div><div class="stat-value">${stats.deaths}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">K/D</div><div class="stat-value">${stats.kd}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${stats.assists}</div></div>`;
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
    
    // Calculate map stats
    let totalGames = mapGames.length;
    let gametypeCounts = {};
    mapGames.forEach(game => {
        const gt = game.details['Variant Name'] || 'Unknown';
        gametypeCounts[gt] = (gametypeCounts[gt] || 0) + 1;
    });
    
    let html = '<div class="search-results-container">';
    
    // Map info header
    html += '<div class="map-info-header">';
    html += `<div class="map-large-image"><img src="${mapImage}" alt="${mapName}"></div>`;
    html += '<div class="map-stats">';
    html += `<div class="stat-card"><div class="stat-label">Total Games</div><div class="stat-value">${totalGames}</div></div>`;
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
    
    // Calculate gametype stats
    let totalGames = gametypeGames.length;
    let mapCounts = {};
    gametypeGames.forEach(game => {
        const map = game.details['Map Name'] || 'Unknown';
        mapCounts[map] = (mapCounts[map] || 0) + 1;
    });
    
    let html = '<div class="search-results-container">';
    
    // Gametype stats
    html += '<div class="gametype-info-header">';
    html += '<div class="gametype-stats">';
    html += `<div class="stat-card"><div class="stat-label">Total Games</div><div class="stat-value">${totalGames}</div></div>`;
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

function renderSearchGameCard(game, gameNumber, highlightPlayer = null) {
    const details = game.details;
    const players = game.players;
    const mapName = details['Map Name'] || 'Unknown';
    const mapImage = mapImages[mapName] || defaultMapImage;
    const gameType = details['Variant Name'] || 'Unknown';
    const duration = details['Duration'] || '0:00';
    const startTime = details['Start Time'] || '';
    
    // Calculate team scores
    let teamScoreHtml = '';
    const teams = {};
    players.forEach(player => {
        const team = player.team;
        if (team && team !== 'None') {
            if (!teams[team]) teams[team] = 0;
            teams[team] += parseInt(player.score) || 0;
        }
    });
    
    if (Object.keys(teams).length > 0) {
        const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
        teamScoreHtml = '<div class="card-team-scores">';
        sortedTeams.forEach(([team, score], index) => {
            teamScoreHtml += `<span class="team-score-${team.toLowerCase()}">${team}: ${score}</span>`;
            if (index < sortedTeams.length - 1) teamScoreHtml += '<span class="score-vs">vs</span>';
        });
        teamScoreHtml += '</div>';
    }
    
    // Sort players by team
    const sortedPlayers = [...players].sort((a, b) => {
        const teamOrder = { 'Red': 0, 'Blue': 1 };
        const teamA = teamOrder[a.team] !== undefined ? teamOrder[a.team] : 2;
        const teamB = teamOrder[b.team] !== undefined ? teamOrder[b.team] : 2;
        return teamA - teamB;
    });
    
    let html = `<div class="search-game-card" onclick="scrollToGame(${gameNumber})">`;
    html += '<div class="search-card-header">';
    html += `<img src="${mapImage}" class="search-card-map" alt="${mapName}">`;
    html += '<div class="search-card-info">';
    html += `<div class="search-card-title">${gameType}</div>`;
    html += `<div class="search-card-meta">${mapName} • ${duration} • ${startTime}</div>`;
    html += teamScoreHtml;
    html += '</div>';
    html += '</div>';
    
    // Mini scoreboard
    html += '<div class="search-card-scoreboard">';
    sortedPlayers.forEach(player => {
        const teamClass = player.team && player.team !== 'none' ? `team-${player.team.toLowerCase()}` : '';
        const highlightClass = highlightPlayer && player.name === highlightPlayer ? 'highlighted' : '';
        html += `<div class="search-card-player ${teamClass} ${highlightClass}">`;
        html += `<span class="player-name">${player.name}</span>`;
        html += `<span class="player-stats">${player.kills || 0}/${player.deaths || 0}</span>`;
        html += '</div>';
    });
    html += '</div>';
    
    html += '</div>';
    return html;
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
        accuracyCount: 0
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
        }
        
        const gameStat = game.stats.find(s => s.Player === playerName);
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

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('playerModal');
    if (modal && e.target === modal) {
        closePlayerModal();
    }
});
