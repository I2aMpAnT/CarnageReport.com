// Initialize empty games data array
let gamesData = [];

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
    
    gameDiv.innerHTML = `
        <div class="game-header-bar" onclick="toggleGameDetails(${gameNumber})">
            <div class="game-header-left">
                <div class="game-number">GAME ${gameNumber}</div>
                <div class="game-info">
                    <span class="game-meta-tag">${displayGameType}</span>
                    <span class="game-meta-tag">${mapName}</span>
                    <span class="game-meta-tag">${duration}</span>
                    <span class="game-meta-tag">${players.length} Players</span>
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
    let html = '<div class="tab-navigation">';
    html += '<button class="tab-btn active" onclick="switchGameTab(this, \'scoreboard\')">Scoreboard</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'stats\')">Detailed Stats</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'medals\')">Medals</button>';
    html += '<button class="tab-btn" onclick="switchGameTab(this, \'weapons\')">Weapons</button>';
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
    
    let html = '<div class="scoreboard">';
    
    // Determine columns based on game type
    let columns = ['Place', 'Player'];
    
    if (hasTeams) {
        columns.push('Team');
    }
    
    if (gameType === 'ctf' || gameType === 'assault' || gameType === 'oddball') {
        columns.push('Score', 'K', 'D', 'A', 'K/D');
    } else {
        columns.push('Score', 'K', 'D', 'A', 'K/D');
    }
    
    // Build grid template
    let gridTemplate = hasTeams ? 
        '60px 50px 1fr 80px 50px 50px 50px 70px' : 
        '60px 1fr 80px 50px 50px 50px 70px';
    
    if (gameType === 'slayer' && hasTeams) {
        gridTemplate = '2fr 80px 50px 50px 50px 70px';
        columns = ['Player', 'Score', 'K', 'D', 'A', 'K/D'];
    }
    
    // Header
    html += `<div class="scoreboard-header" style="grid-template-columns: ${gridTemplate}">`;
    columns.forEach(col => {
        html += `<div>${col}</div>`;
    });
    html += '</div>';
    
    // Rows
    players.forEach(player => {
        const teamAttr = player.team && player.team !== 'none' ? `data-team="${player.team}"` : '';
        html += `<div class="scoreboard-row" ${teamAttr} style="grid-template-columns: ${gridTemplate}">`;
        
        if (gameType === 'slayer' && hasTeams) {
            // Team slayer format
            html += `<div class="sb-player">`;
            html += `<span class="player-name-text">${player.name}</span>`;
            if (player.team && player.team !== 'none') {
                html += ` <span class="team-badge team-${player.team.toLowerCase()}">${player.team}</span>`;
            }
            html += `</div>`;
            html += `<div class="sb-score">${player.score || 0}</div>`;
            html += `<div class="sb-kills">${player.kills || 0}</div>`;
            html += `<div class="sb-deaths">${player.deaths || 0}</div>`;
            html += `<div class="sb-assists">${player.assists || 0}</div>`;
            html += `<div class="sb-kd">${calculateKD(player.kills, player.deaths)}</div>`;
        } else {
            // FFA or other format
            html += `<div class="sb-place"><span class="place-badge place-${getPlaceClass(player.place)}">${player.place}</span></div>`;
            
            if (!hasTeams || gameType !== 'slayer') {
                html += `<div class="sb-rank"></div>`;
            }
            
            html += `<div class="sb-player">`;
            html += `<span class="player-name-text">${player.name}</span>`;
            if (player.team && player.team !== 'none' && hasTeams) {
                html += ` <span class="team-badge team-${player.team.toLowerCase()}">${player.team}</span>`;
            }
            html += `</div>`;
            
            if (hasTeams && gameType !== 'slayer') {
                html += `<div class="sb-col">${player.team || '-'}</div>`;
            }
            
            html += `<div class="sb-score">${player.score || 0}</div>`;
            html += `<div class="sb-kills">${player.kills || 0}</div>`;
            html += `<div class="sb-deaths">${player.deaths || 0}</div>`;
            html += `<div class="sb-assists">${player.assists || 0}</div>`;
            html += `<div class="sb-kd">${calculateKD(player.kills, player.deaths)}</div>`;
        }
        
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
    
    let html = '<div class="detailed-stats">';
    
    html += '<div class="stats-category">Combat Statistics</div>';
    html += '<table class="stats-table">';
    html += '<thead><tr>';
    html += '<th>Player</th><th>Kills</th><th>Assists</th><th>Deaths</th><th>Betrayals</th><th>Suicides</th><th>Best Spree</th><th>Time Alive</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    stats.forEach(stat => {
        const team = playerTeams[stat.Player];
        const teamAttr = team ? `data-team="${team}"` : '';
        const timeAlive = formatTime(stat.total_time_alive || 0);
        
        html += `<tr ${teamAttr}>`;
        html += `<td>${stat.Player}</td>`;
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
    const hasObjectiveStats = stats.some(s => 
        s.ctf_scores || s.assault_score || s.oddball_score || 
        s.koth_kills_as_king || s.territories_taken
    );
    
    if (hasObjectiveStats) {
        html += '<div class="stats-category">Objective Statistics</div>';
        html += '<table class="stats-table">';
        html += '<thead><tr><th>Player</th>';
        
        // Determine which columns to show
        const hasCTF = stats.some(s => s.ctf_scores || s.ctf_flag_steals || s.ctf_flag_saves);
        const hasAssault = stats.some(s => s.assault_score || s.assault_bomb_grabbed);
        const hasOddball = stats.some(s => s.oddball_score || s.oddball_ball_kills);
        const hasKOTH = stats.some(s => s.koth_kills_as_king || s.koth_kings_killed);
        const hasTerritories = stats.some(s => s.territories_taken || s.territories_lost);
        
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
        
        stats.forEach(stat => {
            const team = playerTeams[stat.Player];
            const teamAttr = team ? `data-team="${team}"` : '';
            
            html += `<tr ${teamAttr}><td>${stat.Player}</td>`;
            
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
    
    const medalTypes = new Set();
    medals.forEach(m => {
        Object.keys(m).forEach(key => {
            if (key !== 'player') medalTypes.add(key);
        });
    });
    
    let html = '<div class="detailed-stats">';
    html += '<table class="stats-table">';
    html += '<thead><tr>';
    html += '<th>Player</th>';
    
    Array.from(medalTypes).sort().forEach(medal => {
        html += `<th>${formatMedalName(medal)}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    
    medals.forEach(medal => {
        const team = playerTeams[medal.player];
        const teamAttr = team ? `data-team="${team}"` : '';
        
        html += `<tr ${teamAttr}>`;
        html += `<td>${medal.player}</td>`;
        Array.from(medalTypes).sort().forEach(type => {
            html += `<td>${medal[type] || 0}</td>`;
        });
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
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
            
            weapons.forEach(weapon => {
                const team = playerTeams[weapon.Player];
                const teamAttr = team ? `data-team="${team}"` : '';
                
                const kills = weapon[killsCol] || 0;
                const fired = weapon[firedCol] || 0;
                const hit = weapon[hitCol] || 0;
                const accuracy = fired > 0 ? ((hit / fired) * 100).toFixed(1) : '0.0';
                
                html += `<tr ${teamAttr}>`;
                html += `<td>${weapon.Player}</td>`;
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
        return p;
    });
    
    players.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return parseFloat(b.kd) - parseFloat(a.kd);
    });
    
    let html = '<div class="leaderboard">';
    html += '<div class="leaderboard-header">';
    html += '<div>Rank</div>';
    html += '<div>Level</div>';
    html += '<div>Player</div>';
    html += '<div>Record</div>';
    html += '<div>K/D</div>';
    html += '</div>';
    
    players.forEach((player, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        
        html += '<div class="leaderboard-row" onclick="openPlayerModal(\'' + player.name + '\')">';
        html += `<div class="lb-rank ${rankClass}">${rank}</div>`;
        html += `<div class="lb-level"><div class="level-badge"></div></div>`;
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
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
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
                meta: `${playerStats.games} games · ${playerStats.wins}W-${playerStats.games - playerStats.wins}L · ${playerStats.kd} K/D`
            });
        });
        
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
        
        displaySearchResults(results);
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
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

function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
        searchResults.classList.add('active');
        return;
    }
    
    let html = '';
    results.slice(0, 10).forEach(result => {
        html += `<div class="search-result-item" onclick="handleSearchResultClick('${result.type}', '${escapeHtml(result.name)}')">`;
        html += `<div class="search-result-type">${result.type}</div>`;
        html += `<div class="search-result-name">${result.name}</div>`;
        html += `<div class="search-result-meta">${result.meta}</div>`;
        html += `</div>`;
    });
    
    searchResults.innerHTML = html;
    searchResults.classList.add('active');
}

function handleSearchResultClick(type, name) {
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('playerSearch').value = name;
    
    if (type === 'player') {
        openPlayerModal(name);
    }
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


