const fs = require('fs');

// Load playlists config
const playlists = JSON.parse(fs.readFileSync('playlists.json', 'utf8'));

let allGames = [];

// Load ranked playlists
for (const playlist of playlists.playlists) {
    try {
        const data = JSON.parse(fs.readFileSync(playlist.matches_file, 'utf8'));
        for (const match of data.matches || []) {
            allGames.push({
                map: match.map,
                timestamp: match.timestamp,
                source_file: match.source_file
            });
        }
    } catch (e) {}
}

// Load custom games
if (playlists.custom_games && playlists.custom_games.matches_file) {
    try {
        const data = JSON.parse(fs.readFileSync(playlists.custom_games.matches_file, 'utf8'));
        for (const match of data.matches || []) {
            allGames.push({
                map: match.map,
                timestamp: match.timestamp,
                source_file: match.source_file
            });
        }
    } catch (e) {}
}

// Parse date function
function parseDate(str) {
    if (!str) return new Date(0);
    // Handle MM/DD/YYYY HH:MM format
    const match = str.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/);
    if (match) {
        const [, month, day, year, hours, minutes] = match;
        return new Date(year, month - 1, day, hours, minutes);
    }
    return new Date(str);
}

// Sort chronologically (oldest first = Game 1)
allGames.sort((a, b) => parseDate(a.timestamp) - parseDate(b.timestamp));

// Build index (game number -> file info)
const index = {};
allGames.forEach((game, i) => {
    const gameNum = i + 1;
    index[gameNum] = {
        map: game.map,
        theater: game.source_file ? game.source_file.replace('.xlsx', '_theater.csv') : null
    };
});

fs.writeFileSync('gameindex.json', JSON.stringify(index, null, 2));
console.log('Created gameindex.json with ' + Object.keys(index).length + ' games');
