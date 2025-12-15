// Initialize empty games data array
let gamesData = [];

// Global player ranks (randomly assigned once)
let playerRanks = {};

// Full player data from ranks.json (keyed by discord ID)
let rankstatsData = {};

// Rank history data from rankhistory.json (keyed by discord ID)
let rankHistoryData = {};

// Dynamic rank history calculated from game outcomes
let dynamicRankHistory = {};

// XP configuration for ranking
let xpConfig = null;

// Mapping from in-game profile names to discord IDs
let profileNameToDiscordId = {};

// Mapping from discord IDs to array of in-game profile names
let discordIdToProfileNames = {};

// Player emblems data from emblems.json
let playerEmblems = {};

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

// Get gametype with playlist prefix for display
function getGametypeWithPrefix(gameType, playlist) {
    if (!playlist) return gameType;

    const playlistLower = playlist.toLowerCase();
    if (playlistLower === 'mlg 4v4' || playlistLower === 'team hardcore' ||
        playlistLower.includes('tournament')) {
        return 'MLG ' + gameType;
    } else if (playlistLower === 'double team') {
        return '2v2 ' + gameType;
    } else if (playlistLower === 'head to head') {
        return '1v1 ' + gameType;
    }
    return gameType;
}

// Twitch VOD cache (username -> VOD data)
const twitchVodCache = {};
const TWITCH_GQL_URL = 'https://gql.twitch.tv/gql';
const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // Twitch's public web client ID
const SITE_DOMAIN = window.location.hostname || 'localhost';

// Fetch VODs for a Twitch user
async function fetchTwitchVods(username) {
    if (twitchVodCache[username]) {
        return twitchVodCache[username];
    }

    const query = `
        query GetUserVideos($login: String!, $type: BroadcastType, $first: Int) {
            user(login: $login) {
                id
                login
                displayName
                videos(type: $type, first: $first, sort: TIME) {
                    edges {
                        node {
                            id
                            title
                            createdAt
                            lengthSeconds
                            previewThumbnailURL(width: 320, height: 180)
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch(TWITCH_GQL_URL, {
            method: 'POST',
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                variables: { login: username, type: 'ARCHIVE', first: 30 }
            })
        });

        const data = await response.json();
        const videos = data?.data?.user?.videos?.edges?.map(e => e.node) || [];
        twitchVodCache[username] = videos;
        return videos;
    } catch (error) {
        console.error(`Error fetching VODs for ${username}:`, error);
        twitchVodCache[username] = [];
        return [];
    }
}

// Find VOD that covers a specific time, returns { vod, timestampSeconds } or null
function findVodForTime(vods, gameStartTime, gameDurationMinutes = 15) {
    // Parse game time using parseGameDateTime which handles EST/EDT properly
    const gameStartUTC = parseGameDateTime(gameStartTime);
    if (!gameStartUTC) return null;

    const gameEndUTC = new Date(gameStartUTC.getTime() + gameDurationMinutes * 60 * 1000);

    for (const vod of vods) {
        const vodStart = new Date(vod.createdAt);
        const vodEnd = new Date(vodStart.getTime() + vod.lengthSeconds * 1000);

        // Check if VOD covers the game time
        if (vodStart <= gameEndUTC && vodEnd >= gameStartUTC) {
            // Calculate timestamp offset (how far into the VOD the game starts)
            const offsetMs = Math.max(0, gameStartUTC - vodStart);
            const offsetSeconds = Math.floor(offsetMs / 1000);
            // Add small buffer for lobby time (20 seconds)
            const adjustedOffset = offsetSeconds + 20;
            return { vod, timestampSeconds: adjustedOffset };
        }
    }
    return null;
}

// Format seconds to Twitch timestamp format (1h23m45s)
function formatTwitchTimestamp(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h${m}m${s}s`;
}

// Twitch Hub - tracks if already loaded
let twitchHubLoaded = false;
let twitchHubVods = [];
let twitchHubClips = [];

// Get all game time ranges from gamesData, including player discord IDs
function getGameTimeRanges() {
    const ranges = [];
    gamesData.forEach(game => {
        if (game.details && game.details['Start Time']) {
            // Parse "11/28/2025 20:03" format
            const startStr = game.details['Start Time'];
            const startDate = parseGameDateTime(startStr);
            if (startDate) {
                // Calculate end time from duration if End Time not available
                let endDate;
                if (game.details['End Time']) {
                    endDate = parseGameDateTime(game.details['End Time']);
                } else if (game.details['Duration']) {
                    // Parse duration like "15:23" or "5:30" (mm:ss)
                    const durationStr = game.details['Duration'];
                    const durationParts = durationStr.split(':');
                    const durationMs = (parseInt(durationParts[0] || 0) * 60 + parseInt(durationParts[1] || 0)) * 1000;
                    endDate = new Date(startDate.getTime() + durationMs);
                } else {
                    // Default to 15 minutes if no duration
                    endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
                }
                if (endDate) {
                    // Get all player discord IDs in this game (for VOD matching)
                    const playerDiscordIds = (game.players || [])
                        .map(p => p.discord_id)
                        .filter(Boolean);
                    ranges.push({ start: startDate, end: endDate, playerDiscordIds });
                }
            }
        }
    });
    return ranges;
}

// Parse game date time string in various formats as Eastern Time and return Date object
// All game timestamps are stored in Eastern Time (America/New_York)
// Supports: MM/DD/YYYY HH:MM, YYYY-MM-DD HH:MM, ISO formats, and more
function parseGameDateTime(dateStr) {
    if (!dateStr) return null;

    try {
        let year, month, day, hours = 0, minutes = 0;

        // Try ISO format with T (2025-12-09T07:45:00)
        const isoTMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (isoTMatch) {
            [, year, month, day, hours, minutes] = isoTMatch.map(v => parseInt(v) || 0);
        }

        // Try ISO format with space (2025-12-09 07:45:00)
        if (!year) {
            const isoSpaceMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (isoSpaceMatch) {
                [, year, month, day, hours, minutes] = isoSpaceMatch.map(v => parseInt(v) || 0);
            }
        }

        // Try US format with AM/PM (12/9/2025 7:45 AM or 12/9/2025 7:45:00 PM)
        if (!year) {
            const usAmPmMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (usAmPmMatch) {
                [, month, day, year, hours, minutes] = usAmPmMatch.map(v => parseInt(v) || 0);
                const ampm = usAmPmMatch[7];
                if (ampm) {
                    // Convert 12-hour to 24-hour format
                    if (ampm.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;  // 12 AM = midnight
                    } else if (ampm.toUpperCase() === 'PM' && hours !== 12) {
                        hours += 12;  // 1 PM = 13, etc.
                    }
                }
            }
        }

        // Try US format with 2-digit year and optional AM/PM (12/9/25 7:45 AM)
        if (!year) {
            const us2Match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (us2Match) {
                [, month, day, year, hours, minutes] = us2Match.map(v => parseInt(v) || 0);
                year = year < 50 ? 2000 + year : 1900 + year;
                const ampm = us2Match[7];
                if (ampm) {
                    if (ampm.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;
                    } else if (ampm.toUpperCase() === 'PM' && hours !== 12) {
                        hours += 12;
                    }
                }
            }
        }

        // Try dash format with optional AM/PM (12-09-2025 07:45 PM)
        if (!year) {
            const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (dashMatch) {
                [, month, day, year, hours, minutes] = dashMatch.map(v => parseInt(v) || 0);
                const ampm = dashMatch[7];
                if (ampm) {
                    if (ampm.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;
                    } else if (ampm.toUpperCase() === 'PM' && hours !== 12) {
                        hours += 12;
                    }
                }
            }
        }

        // Try YYYY/MM/DD format with optional AM/PM (2025/12/09 07:45 PM)
        if (!year) {
            const ymdSlashMatch = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (ymdSlashMatch) {
                [, year, month, day, hours, minutes] = ymdSlashMatch.map(v => parseInt(v) || 0);
                const ampm = ymdSlashMatch[7];
                if (ampm) {
                    if (ampm.toUpperCase() === 'AM' && hours === 12) {
                        hours = 0;
                    } else if (ampm.toUpperCase() === 'PM' && hours !== 12) {
                        hours += 12;
                    }
                }
            }
        }

        // Fallback: try native Date parsing
        if (!year) {
            const fallbackDate = new Date(dateStr);
            if (!isNaN(fallbackDate.getTime())) {
                return fallbackDate;
            }
            return null;
        }

        // Calculate Eastern Time offset (EST/EDT)
        const tempDate = new Date(year, month - 1, day, hours, minutes);

        // DST in US: Second Sunday of March to First Sunday of November
        const marchSecondSunday = new Date(year, 2, 1);
        marchSecondSunday.setDate(14 - marchSecondSunday.getDay());
        const novFirstSunday = new Date(year, 10, 1);
        novFirstSunday.setDate(7 - novFirstSunday.getDay());

        const isEasternDST = tempDate >= marchSecondSunday && tempDate < novFirstSunday;
        const easternOffset = isEasternDST ? '-04:00' : '-05:00';

        // Create ISO string and parse it as Eastern Time
        const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${easternOffset}`;
        return new Date(isoStr);
    } catch (e) {
        return null;
    }
}

// Format a Date object to display in user's local timezone
function formatDateTimeLocal(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function getOrdinal(n) {
        if (n > 3 && n < 21) return 'th';
        switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${month} ${day}${getOrdinal(day)} ${year}, ${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// Get in-game names for a Discord ID (from in_game_names array + display_name/discord_name as fallbacks)
function getInGameNamesForDiscordId(discordId) {
    const data = rankstatsData[discordId];
    if (!data) return [];

    const names = new Set();

    // Primary: in_game_names from MAC matching
    if (data.in_game_names && Array.isArray(data.in_game_names)) {
        data.in_game_names.forEach(n => names.add(n.toLowerCase()));
    }

    // Fallback: display_name and discord_name (players often use these as in-game names)
    if (data.display_name) {
        names.add(data.display_name.toLowerCase());
    }
    if (data.discord_name) {
        names.add(data.discord_name.toLowerCase());
    }

    return Array.from(names);
}

// Check if a VOD overlaps with any game where the streamer was a participant
function vodOverlapsWithGames(vod, gameRanges) {
    const vodStart = new Date(vod.createdAt);
    const vodEnd = new Date(vodStart.getTime() + (vod.lengthSeconds * 1000));
    const streamerDiscordId = vod.user.discordId;

    for (const range of gameRanges) {
        // Check if VOD time range overlaps with game time range
        if (vodStart <= range.end && vodEnd >= range.start) {
            // Check if streamer was in this game by discord ID
            if (range.playerDiscordIds && range.playerDiscordIds.includes(streamerDiscordId)) {
                return true;
            }
        }
    }
    return false;
}

// Find games that overlap with a VOD where the streamer participated
// Returns array with timestamp offset for each game
function findGamesForVod(vod) {
    const vodStart = new Date(vod.createdAt);
    const vodEnd = new Date(vodStart.getTime() + (vod.lengthSeconds * 1000));
    const streamerDiscordId = vod.user.discordId;
    const matchingGames = [];

    gamesData.forEach((game, index) => {
        if (!game.details || !game.details['Start Time']) return;

        const startDate = parseGameDateTime(game.details['Start Time']);
        if (!startDate) return;

        // Calculate end date from End Time or Duration
        let endDate;
        if (game.details['End Time']) {
            endDate = parseGameDateTime(game.details['End Time']);
        } else if (game.details['Duration']) {
            // Parse duration like "15:23" (mm:ss)
            const durationStr = game.details['Duration'];
            const durationParts = durationStr.split(':');
            const durationMs = (parseInt(durationParts[0] || 0) * 60 + parseInt(durationParts[1] || 0)) * 1000;
            endDate = new Date(startDate.getTime() + durationMs);
        } else {
            // Default to 15 minutes
            endDate = new Date(startDate.getTime() + 15 * 60 * 1000);
        }
        if (!endDate) return;

        // Check time overlap
        if (vodStart <= endDate && vodEnd >= startDate) {
            // Check if streamer was in this game by discord ID
            const gamePlayerDiscordIds = (game.players || []).map(p => p.discord_id).filter(Boolean);
            if (gamePlayerDiscordIds.includes(streamerDiscordId)) {
                // Calculate timestamp offset from VOD start to game start
                const offsetSeconds = Math.max(0, Math.floor((startDate - vodStart) / 1000));

                const rawType = game.details['Game Type'] || 'Unknown';
                const baseGameType = getBaseGametype(rawType, game.playlist, game);
                matchingGames.push({
                    index: index,  // Keep array index for legacy compatibility
                    gameNumber: game.gameNumber,  // Stable game number for navigation
                    mapName: game.details['Map Name'] || 'Unknown',
                    gameType: baseGameType,
                    startTime: game.details['Start Time'],
                    timestampSeconds: offsetSeconds,
                    timestampFormatted: formatVodTimestamp(offsetSeconds)
                });
            }
        }
    });

    return matchingGames;
}

// Format seconds to Twitch timestamp format (XhXmXs)
function formatVodTimestamp(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let result = '';
    if (h > 0) result += `${h}h`;
    if (m > 0 || h > 0) result += `${m}m`;
    result += `${s}s`;
    return result;
}

// Check if a clip came from a VOD that overlaps with games where the streamer participated
function clipOverlapsWithGames(clip, gameRanges, filteredVods) {
    // If clip doesn't have a source VOD, can't verify it came from a game
    if (!clip.videoId) {
        return false;
    }

    // Check if this clip's source VOD is in the list of VODs that overlap with games
    // The filteredVods list already only contains VODs that overlap with games where the streamer participated
    return filteredVods.some(vod => vod.id === clip.videoId && vod.user.discordId === clip.user.discordId);
}

// Load the Twitch Hub - fetches VODs and clips that overlap with tracked games
async function loadTwitchHub() {
    if (twitchHubLoaded) return;

    console.log('[TWITCH_HUB] Loading Twitch Hub...');

    // Get game time ranges for filtering
    const gameRanges = getGameTimeRanges();
    console.log(`[TWITCH_HUB] Found ${gameRanges.length} game time ranges for filtering`);

    // Get all players with linked Twitch accounts
    const linkedTwitchUsers = [];
    for (const [discordId, data] of Object.entries(rankstatsData)) {
        if (data.twitch_name && data.twitch_url && !data.twitch_name.includes('google.com')) {
            linkedTwitchUsers.push({
                discordId,
                twitchName: data.twitch_name,
                displayName: data.display_name || data.discord_name || data.twitch_name
            });
        }
    }

    console.log(`[TWITCH_HUB] Found ${linkedTwitchUsers.length} linked Twitch users`);

    // Fetch VODs for all users
    const vodsPromises = linkedTwitchUsers.map(async (user) => {
        try {
            const vods = await fetchTwitchVods(user.twitchName);
            return vods.map(vod => ({ ...vod, user }));
        } catch (error) {
            console.error(`[TWITCH_HUB] Error fetching VODs for ${user.twitchName}:`, error);
            return [];
        }
    });

    // Fetch clips for all users
    const clipsPromises = linkedTwitchUsers.map(async (user) => {
        try {
            const clips = await fetchTwitchClips(user.twitchName);
            return clips.map(clip => ({ ...clip, user }));
        } catch (error) {
            console.error(`[TWITCH_HUB] Error fetching clips for ${user.twitchName}:`, error);
            return [];
        }
    });

    // Wait for all fetches
    const vodsResults = await Promise.all(vodsPromises);
    const clipsResults = await Promise.all(clipsPromises);

    // Flatten results
    const allVods = vodsResults.flat();
    const allClips = clipsResults.flat();

    console.log(`[TWITCH_HUB] Fetched ${allVods.length} total VODs and ${allClips.length} total clips`);

    // Filter to only VODs/clips that overlap with game times
    twitchHubVods = allVods
        .filter(vod => vodOverlapsWithGames(vod, gameRanges))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    twitchHubClips = allClips
        .filter(clip => clipOverlapsWithGames(clip, gameRanges, twitchHubVods))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`[TWITCH_HUB] After filtering: ${twitchHubVods.length} VODs and ${twitchHubClips.length} clips match game times`);

    // Render the content
    renderTwitchHubVods();
    renderTwitchHubClips();

    twitchHubLoaded = true;
}

// Fetch clips for a Twitch user using GQL
async function fetchTwitchClips(username) {
    try {
        const query = {
            operationName: 'ClipsCards__User',
            variables: {
                login: username,
                limit: 20,
                criteria: { filter: 'LAST_MONTH' }
            },
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: 'b73ad2bfaecfd30a9e6c28fada15bd97032c83ec77a0440766a56fe0a8f4e32e'
                }
            }
        };

        const response = await fetch(TWITCH_GQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-ID': TWITCH_CLIENT_ID,
            },
            body: JSON.stringify(query)
        });

        const data = await response.json();
        const clips = data?.data?.user?.clips?.edges || [];

        return clips.map(edge => ({
            id: edge.node.id,
            title: edge.node.title,
            createdAt: edge.node.createdAt,
            thumbnailURL: edge.node.thumbnailURL,
            url: edge.node.url,
            viewCount: edge.node.viewCount,
            durationSeconds: edge.node.durationSeconds,
            broadcaster: edge.node.broadcaster?.displayName || username,
            // Include video offset info if available (for clips from VODs)
            videoId: edge.node.video?.id || null,
            videoOffsetSeconds: edge.node.videoOffsetSeconds ?? null,
            videoCreatedAt: edge.node.video?.createdAt || null
        }));
    } catch (error) {
        console.error(`Error fetching clips for ${username}:`, error);
        return [];
    }
}

// Store expanded VOD entries (one per game) for filtering
let vodGameEntries = [];

// Build VOD game entries - creates one entry per game covered by each VOD
function buildVodGameEntries() {
    vodGameEntries = [];

    for (const vod of twitchHubVods) {
        const matchingGames = findGamesForVod(vod);
        const thumbnail = vod.previewThumbnailURL?.replace('%{width}', '320').replace('%{height}', '180') || '';

        if (matchingGames.length > 0) {
            // Create one entry per game
            for (const game of matchingGames) {
                vodGameEntries.push({
                    vod: vod,
                    game: game,
                    thumbnail: thumbnail,
                    vodUrl: `https://twitch.tv/videos/${vod.id}?t=${game.timestampFormatted}`,
                    mapName: game.mapName,
                    gameType: game.gameType,
                    players: game.players,
                    streamer: vod.user.displayName,
                    streamerChannel: vod.user.twitchName,
                    date: new Date(vod.createdAt),
                    gameIndex: game.index,
                    gameNumber: game.gameNumber  // Stable game number for navigation
                });
            }
        }
    }

    // Sort by date (newest first)
    vodGameEntries.sort((a, b) => b.date - a.date);
}

// Render VODs in the Twitch Hub with optional filter
function renderTwitchHubVods(filterQuery = '') {
    const container = document.getElementById('twitch-vods-grid');
    const loadingEl = container?.previousElementSibling;

    if (!container) return;

    if (loadingEl && loadingEl.classList.contains('twitch-hub-loading')) {
        loadingEl.style.display = 'none';
    }

    // Build entries if not already built
    if (vodGameEntries.length === 0 && twitchHubVods.length > 0) {
        buildVodGameEntries();
    }

    if (vodGameEntries.length === 0) {
        container.innerHTML = '<div class="twitch-hub-empty">No VODs found</div>';
        return;
    }

    // Filter entries based on search query
    let filteredEntries = vodGameEntries;
    if (filterQuery.trim()) {
        const query = filterQuery.toLowerCase().trim();
        filteredEntries = vodGameEntries.filter(entry => {
            // Search by map name
            if (entry.mapName.toLowerCase().includes(query)) return true;
            // Search by game type
            if (entry.gameType.toLowerCase().includes(query)) return true;
            // Search by streamer name
            if (entry.streamer.toLowerCase().includes(query)) return true;
            // Search by player names
            if (entry.players.some(p => p.toLowerCase().includes(query))) return true;
            return false;
        });
    }

    if (filteredEntries.length === 0) {
        container.innerHTML = '<div class="twitch-hub-empty">No VODs match your search</div>';
        return;
    }

    // Limit entries on mobile to prevent crashes
    const isMobile = window.innerWidth <= 768;
    const maxEntries = isMobile ? 20 : 100;

    let html = '';
    for (const entry of filteredEntries.slice(0, maxEntries)) {
        const date = entry.date.toLocaleDateString();
        // Build embed URL with timestamp
        const embedUrl = `https://player.twitch.tv/?video=${entry.vod.id}&parent=${SITE_DOMAIN}&time=${entry.game.timestampFormatted}&autoplay=false`;
        const vodUrl = `https://twitch.tv/videos/${entry.vod.id}?t=${entry.game.timestampFormatted}`;

        html += `
            <div class="twitch-hub-card" data-map="${entry.mapName}" data-gametype="${entry.gameType}">
                <div class="vod-game-header" onclick="navigateToGame(${entry.gameNumber})">${entry.mapName} - ${entry.gameType}</div>
                <div class="twitch-hub-embed-wrapper" data-embed-url="${embedUrl}" data-vod-url="${vodUrl}">
                    <div class="twitch-lazy-placeholder" onclick="loadTwitchEmbed(this)">
                        <div class="twitch-lazy-icon">▶</div>
                        <div class="twitch-lazy-text">Click to load video</div>
                    </div>
                </div>
                <div class="twitch-hub-info">
                    <div class="twitch-hub-meta">
                        <a href="https://twitch.tv/${entry.streamerChannel}" target="_blank" class="twitch-hub-streamer">${entry.streamer}</a>
                        <span class="twitch-hub-date">${date}</span>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Set up IntersectionObserver for lazy loading on desktop (auto-load when visible)
    if (!isMobile) {
        setupTwitchLazyLoading();
    }
}

// Load a single Twitch embed when clicked
function loadTwitchEmbed(placeholder) {
    const wrapper = placeholder.parentElement;
    const embedUrl = wrapper.dataset.embedUrl;
    if (embedUrl) {
        wrapper.innerHTML = `<iframe src="${embedUrl}" allowfullscreen="true" allow="fullscreen" loading="lazy"></iframe>`;
    }
}

// Lazy load Twitch embeds using IntersectionObserver
function setupTwitchLazyLoading() {
    const placeholders = document.querySelectorAll('.twitch-lazy-placeholder');
    if (placeholders.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const placeholder = entry.target;
                loadTwitchEmbed(placeholder);
                observer.unobserve(placeholder);
            }
        });
    }, {
        rootMargin: '200px', // Load when within 200px of viewport
        threshold: 0
    });

    placeholders.forEach(placeholder => observer.observe(placeholder));
}

// Filter VODs based on search input
function filterTwitchVods() {
    const searchInput = document.getElementById('vodSearchInput');
    if (searchInput) {
        renderTwitchHubVods(searchInput.value);
    }
}

// Navigate to a specific game in the games list and expand it
// gameNumber is the stable game number that matches gameindex.json (1-indexed)
function navigateToGame(gameNumber) {
    // Switch to Games History tab
    switchMainTab('gamehistory');

    // Scroll to and expand the game
    setTimeout(() => {
        const gameElement = document.getElementById(`game-${gameNumber}`);
        if (gameElement) {
            gameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Expand if not already expanded
            if (!gameElement.classList.contains('expanded')) {
                toggleGameDetails('game', gameNumber);
            }
        }
    }, 100);
}

// Render clips in the Twitch Hub
function renderTwitchHubClips() {
    const container = document.getElementById('twitch-clips-grid');
    const loadingEl = container?.previousElementSibling;

    if (!container) return;

    if (loadingEl && loadingEl.classList.contains('twitch-hub-loading')) {
        loadingEl.style.display = 'none';
    }

    if (twitchHubClips.length === 0) {
        container.innerHTML = '<div class="twitch-hub-empty">No clips found</div>';
        return;
    }

    let html = '';
    for (const clip of twitchHubClips.slice(0, 50)) { // Show latest 50
        const date = new Date(clip.createdAt).toLocaleDateString();
        const duration = clip.durationSeconds ? `${Math.floor(clip.durationSeconds)}s` : '';

        html += `
            <div class="twitch-hub-card">
                <a href="${clip.url}" target="_blank" class="twitch-hub-thumbnail">
                    <img src="${clip.thumbnailURL}" alt="${clip.title}" onerror="this.src='assets/placeholder-clip.png'">
                    ${duration ? `<span class="twitch-hub-duration">${duration}</span>` : ''}
                </a>
                <div class="twitch-hub-info">
                    <a href="${clip.url}" target="_blank" class="twitch-hub-title">${clip.title}</a>
                    <div class="twitch-hub-meta">
                        <a href="https://twitch.tv/${clip.user.twitchName}" target="_blank" class="twitch-hub-streamer">${clip.user.displayName}</a>
                        <span class="twitch-hub-views">${clip.viewCount?.toLocaleString() || 0} views</span>
                        <span class="twitch-hub-date">${date}</span>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Format VOD duration
function formatVodDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Switch between VODs and Clips tabs in Twitch Hub
function switchTwitchHubTab(tabName) {
    const allTabs = document.querySelectorAll('.twitch-hub-content');
    allTabs.forEach(tab => tab.style.display = 'none');

    const allBtns = document.querySelectorAll('.twitch-hub-tab');
    allBtns.forEach(btn => btn.classList.remove('active'));

    const selectedTab = document.getElementById('twitch-hub-' + tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    // Find and activate the button
    allBtns.forEach(btn => {
        if (btn.textContent.toLowerCase() === tabName) {
            btn.classList.add('active');
        }
    });
}

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
    'rocket launcher': 'assets/weapons/RocketLauncher.png',
    'rockets': 'assets/weapons/RocketLauncher.png',
    'frag grenade': 'assets/weapons/FragGrenadeHUD.png',
    'grenade': 'assets/weapons/FragGrenadeHUD.png',
    'fragmentation grenade': 'assets/weapons/FragGrenadeHUD.png',
    'plasma grenade': 'assets/weapons/PlasmaGrenadeHUD.png',

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
    'melee': 'assets/weapons/MeleeKill.png',
    'beatdown': 'assets/weapons/MeleeKill.png'
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

// Helper function to format date/time consistently (converts from Eastern Time to local)
function formatDateTime(startTime) {
    if (!startTime) return '';

    // Parse as Eastern Time and format in user's local timezone
    const date = parseGameDateTime(startTime);
    if (date) {
        return formatDateTimeLocal(date);
    }

    // Fallback for ISO format with T (e.g., 2025-12-10T00:39:00)
    const isoMatch = startTime.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (isoMatch) {
        const date = new Date(startTime);
        if (!isNaN(date)) {
            return formatDateTimeLocal(date);
        }
    }

    // Fallback for ISO format with space (e.g., 2025-12-10 00:39:00)
    const isoSpaceMatch = startTime.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (isoSpaceMatch) {
        const [, year, month, day, hour, minute] = isoSpaceMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        if (!isNaN(date)) {
            return formatDateTimeLocal(date);
        }
    }

    // Fallback for US format with PM/AM (e.g., 12/9/2025 18:16 PM)
    const usMatch = startTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (usMatch) {
        let [, month, day, year, hour, minute, second, ampm] = usMatch;
        hour = parseInt(hour);
        if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
        }
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minute));
        if (!isNaN(date)) {
            return formatDateTimeLocal(date);
        }
    }

    return startTime;
}

// Map variant names to base gametypes
function getBaseGametype(variantName, playlist = '', game = null) {
    if (!variantName) return 'Unknown';
    const name = variantName.toLowerCase();
    // MLG playlists use "Bomb" for assault, others use "Assault"
    const isMLG = playlist === 'MLG 4v4' || playlist === 'Team Hardcore' ||
                  (playlist && playlist.toLowerCase().includes('tournament'));

    let baseType = '';

    // CTF variants
    if (name.includes('flag') || name.includes('ctf')) {
        baseType = 'Capture the Flag';
    }
    // Oddball variants (includes "bawl" typo variant)
    else if (name.includes('oddball') || name.includes('ball') || name.includes('bawl')) {
        baseType = 'Oddball';
    }
    // King of the Hill variants
    else if (name.includes('king') || name.includes('koth') || name.includes('hill')) {
        baseType = 'King of the Hill';
    }
    // Assault variants - "Bomb" for MLG playlists, "Assault" for others
    else if (name.includes('assault') || name.includes('bomb')) {
        baseType = isMLG ? 'Bomb' : 'Assault';
    }
    // Territories variants
    else if (name.includes('territor')) {
        baseType = 'Territories';
    }
    // FFA / Slayer variants - check name first
    else if (name.includes('ffa') || name.includes('free for all') || name.includes('rumble')) {
        baseType = 'Free For All';
    }
    // Slayer - could be Team Slayer or FFA depending on team count
    else if (name.includes('slayer') || name.includes(' ts') || name === 'ts' || name.endsWith('ts')) {
        // If we have game data, check team count to determine if it's actually FFA
        if (game && game.players) {
            const teams = new Set();
            game.players.forEach(p => {
                if (isValidTeam(p.team)) {
                    teams.add(p.team);
                }
            });
            // If no valid teams or more than 2 teams, it's FFA
            if (teams.size === 0 || teams.size > 2) {
                baseType = 'Free For All';
            } else {
                baseType = 'Team Slayer';
            }
        } else {
            baseType = 'Team Slayer';
        }
    }
    // Default: return original
    else {
        return variantName;
    }

    // Add MLG prefix and 2007 suffix for MLG playlists (but not for FFA)
    if (isMLG && baseType !== 'Free For All') {
        return `MLG ${baseType} 2007`;
    }

    return baseType;
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

// Format Oddball score for display (ensures "0:56" instead of ":56")
function formatOddballScore(score) {
    if (!score) return '0:00';
    // Convert to seconds and back to ensure consistent M:SS format
    const totalSeconds = timeToSeconds(score);
    return secondsToTime(totalSeconds);
}

// Helper function to check if team is valid (not none/null/empty)
function isValidTeam(team) {
    if (!team) return false;
    const t = team.toString().toLowerCase().trim();
    return t !== '' && t !== 'none' && t !== 'null' && t !== 'undefined';
}

// Store playlist ranks per player: { playerName: { playlist1: rank, playlist2: rank, ... } }
let playerPlaylistRanks = {};

// Load ranks from ranks.json (pushed from server)
async function loadPlayerRanks() {
    try {
        const response = await fetch('ranks.json');
        if (!response.ok) {
            console.log('[RANKS] No ranks.json found');
            return;
        }
        const rankData = await response.json();

        // Store full rankstats data for leaderboard
        rankstatsData = rankData;

        // Process rank data - supports both formats:
        // Format 1 (playlist ranks): { "PlayerName": { "Team Slayer": 42, "MLG": 38 } }
        // Format 2 (legacy MMR): { "discordId": { "discord_name": "Name", "mmr": 900 } }
        Object.entries(rankData).forEach(([key, value]) => {
            let playerName = null;
            let ranks = {};

            if (value.discord_name) {
                // Use discord_name only
                playerName = value.discord_name;
                // Use the rank field directly if it exists, otherwise calculate from MMR
                if (value.rank) {
                    ranks['Overall'] = value.rank;
                } else if (value.mmr) {
                    const rank = Math.min(50, Math.max(1, Math.round((value.mmr - 500) / 20)));
                    ranks['Overall'] = rank;
                }
                // Check for playlist-specific ranks (exclude all stat fields)
                const excludedFields = ['xp', 'wins', 'losses', 'mmr', 'total_games', 'series_wins', 'series_losses',
                    'total_series', 'rank', 'highest_rank', 'kills', 'deaths', 'assists', 'headshots',
                    'discord_name', 'twitch_name', 'twitch_url', 'alias', 'playlists'];
                Object.keys(value).forEach(k => {
                    if (typeof value[k] === 'number' && !excludedFields.includes(k)) {
                        ranks[k] = value[k];
                    }
                });
            } else if (typeof value === 'object') {
                // New format: player name as key, playlist ranks as values
                playerName = key;
                Object.entries(value).forEach(([playlist, rank]) => {
                    if (typeof rank === 'number') {
                        ranks[playlist] = rank;
                    }
                });
            }

            if (playerName && Object.keys(ranks).length > 0) {
                playerPlaylistRanks[playerName] = ranks;
                // Set primary rank as highest across all playlists
                playerRanks[playerName] = Math.max(...Object.values(ranks));
            }
        });

        console.log('[RANKS] Loaded ranks for', Object.keys(playerPlaylistRanks).length, 'players');
    } catch (error) {
        console.log('[RANKS] Error loading ranks:', error);
    }
}

// Load rank history from rankhistory.json
async function loadRankHistory() {
    try {
        const response = await fetch('rankhistory.json');
        if (!response.ok) {
            console.log('[RANK_HISTORY] No rankhistory.json found');
            return;
        }
        rankHistoryData = await response.json();
        console.log('[RANK_HISTORY] Loaded history for', Object.keys(rankHistoryData).filter(k => !k.startsWith('_')).length, 'players');
    } catch (error) {
        console.log('[RANK_HISTORY] Error loading rank history:', error);
    }
}

// Load XP configuration for dynamic rank calculation
async function loadXPConfig() {
    try {
        const response = await fetch('xp_config.json');
        if (!response.ok) {
            console.log('[XP_CONFIG] No xp_config.json found, using defaults');
            return;
        }
        xpConfig = await response.json();
        console.log('[XP_CONFIG] Loaded XP configuration');
    } catch (error) {
        console.log('[XP_CONFIG] Error loading XP config:', error);
    }
}

// Calculate rank from XP using thresholds
function calculateRankFromXP(xp) {
    if (!xpConfig || !xpConfig.rank_thresholds) {
        // Fallback: simple calculation (every 100 XP = 1 rank)
        return Math.max(1, Math.min(50, Math.floor(xp / 100) + 1));
    }

    for (const [rankStr, [minXP, maxXP]] of Object.entries(xpConfig.rank_thresholds)) {
        if (xp >= minXP && xp <= maxXP) {
            return parseInt(rankStr);
        }
    }
    return 1; // Default to rank 1
}

// Get loss factor for a rank (lower ranks lose less XP)
function getLossFactor(rank) {
    if (!xpConfig || !xpConfig.loss_factors) return 1.0;
    return xpConfig.loss_factors[String(rank)] ?? 1.0;
}

// Build dynamic rank history from game outcomes
function buildDynamicRankHistory() {
    if (!gamesData || gamesData.length === 0) return;

    // Sort games chronologically
    const sortedGames = [...gamesData].sort((a, b) => {
        const timeA = new Date(a.details['End Time'] || a.details['Start Time'] || 0);
        const timeB = new Date(b.details['End Time'] || b.details['Start Time'] || 0);
        return timeA - timeB;
    });

    // Track XP for each player (by discord_id)
    const playerXP = {};
    dynamicRankHistory = {};

    const baseWinXP = xpConfig?.game_win || 100;
    const baseLossXP = xpConfig?.game_loss || -100;

    sortedGames.forEach(game => {
        const gameTime = game.details['End Time'] || game.details['Start Time'];
        if (!gameTime) return;

        // Determine winners and losers by place
        const winners = game.players.filter(p => p.place === '1st');
        const losers = game.players.filter(p => p.place === '2nd' || p.place === '3rd' || p.place === '4th');

        // Process each player
        game.players.forEach(player => {
            const discordId = player.discord_id;
            if (!discordId) return;

            // Initialize player if not seen before
            if (playerXP[discordId] === undefined) {
                playerXP[discordId] = 0;
            }
            if (!dynamicRankHistory[discordId]) {
                dynamicRankHistory[discordId] = { history: [] };
            }

            const oldXP = playerXP[discordId];
            const rankBefore = calculateRankFromXP(oldXP);
            const isWinner = player.place === '1st';

            // Calculate XP change
            let xpChange;
            if (isWinner) {
                xpChange = baseWinXP;
            } else {
                const lossFactor = getLossFactor(rankBefore);
                xpChange = Math.round(baseLossXP * lossFactor);
            }

            // Update XP (minimum 0)
            const newXP = Math.max(0, oldXP + xpChange);
            playerXP[discordId] = newXP;

            const rankAfter = calculateRankFromXP(newXP);

            // Store history entry
            dynamicRankHistory[discordId].history.push({
                timestamp: gameTime,
                rank_before: rankBefore,
                rank_after: rankAfter,
                xp_before: oldXP,
                xp_after: newXP,
                result: isWinner ? 'win' : 'loss'
            });
        });
    });

    console.log('[DYNAMIC_RANK] Built rank history for', Object.keys(dynamicRankHistory).length, 'players from', sortedGames.length, 'games');
}

// Get pre-game rank for a player at a specific game time
// Uses dynamically calculated ranks from game outcomes
// discordId can be passed directly (preferred) or looked up from playerName
function getRankAtTime(playerName, gameEndTime, discordId = null) {
    // Use provided discord ID or look it up from player name
    const playerId = discordId || profileNameToDiscordId[playerName];

    // Helper to parse timestamp strings like "11/28/2025 7:43" or "11/28/2025 20:18"
    function parseGameTimestamp(timestamp) {
        if (timestamp.includes('/')) {
            const [datePart, timePart] = timestamp.split(' ');
            const [month, day, year] = datePart.split('/');
            const [hour, minute] = timePart.split(':');
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`);
        }
        return new Date(timestamp);
    }

    // First try dynamic rank history (calculated from game outcomes)
    if (playerId && dynamicRankHistory[playerId]) {
        const history = dynamicRankHistory[playerId].history;
        if (history && history.length > 0) {
            const gameTime = parseGameTimestamp(gameEndTime);

            // Find the closest match within 5 minutes
            let closestMatch = null;
            let closestDiff = Infinity;

            for (const entry of history) {
                const entryTime = parseGameTimestamp(entry.timestamp);
                const diffMinutes = Math.abs((gameTime - entryTime) / (1000 * 60));

                if (diffMinutes <= 5 && diffMinutes < closestDiff) {
                    closestMatch = entry;
                    closestDiff = diffMinutes;
                }
            }

            if (closestMatch) {
                return closestMatch.rank_before;
            }
        }
    }

    // Fallback to static rankhistory.json if dynamic not available
    if (!playerId || !rankHistoryData[playerId]) {
        return null;
    }

    const history = rankHistoryData[playerId].history;
    if (!history || history.length === 0) {
        return null;
    }

    const gameTime = parseGameTimestamp(gameEndTime);

    // Find the CLOSEST history entry within 5 minutes tolerance
    // The entry's rank_before is what we want
    let closestMatch = null;
    let closestDiff = Infinity;

    for (const entry of history) {
        const entryTime = parseGameTimestamp(entry.timestamp);
        const diffMinutes = Math.abs((gameTime - entryTime) / (1000 * 60));

        if (diffMinutes <= 5 && diffMinutes < closestDiff) {
            closestMatch = entry;
            closestDiff = diffMinutes;
        }
    }

    if (closestMatch) {
        return closestMatch.rank_before;
    }

    // If no exact match, find the most recent entry before the game time
    let mostRecentBefore = null;
    for (const entry of history) {
        const entryTime = new Date(entry.timestamp);
        if (entryTime < gameTime) {
            if (!mostRecentBefore || entryTime > new Date(mostRecentBefore.timestamp)) {
                mostRecentBefore = entry;
            }
        }
    }

    if (mostRecentBefore) {
        return mostRecentBefore.rank_after;
    }

    // If no history before, return rank 1 (starting rank)
    return 1;
}

// Load player emblems from emblems.json
async function loadEmblems() {
    try {
        const response = await fetch('emblems.json');
        if (!response.ok) {
            console.log('[EMBLEMS] No emblems.json found');
            return;
        }
        playerEmblems = await response.json();
        console.log('[EMBLEMS] Loaded emblems for', Object.keys(playerEmblems).length, 'players');
    } catch (error) {
        console.log('[EMBLEMS] Error loading emblems:', error);
    }
}

// Parse emblem parameters from emblem URL or return null if not valid
function parseEmblemParams(url) {
    if (!url || (!url.includes('emblem.php') && !url.includes('emblem.html'))) return null;

    try {
        const urlParams = new URL(url).searchParams;
        return {
            P: parseInt(urlParams.get('P') || 0),
            S: parseInt(urlParams.get('S') || 0),
            EP: parseInt(urlParams.get('EP') || 0),
            ES: parseInt(urlParams.get('ES') || 0),
            EF: parseInt(urlParams.get('EF') || 0),
            EB: parseInt(urlParams.get('EB') || 0),
            ET: parseInt(urlParams.get('ET') || 0)
        };
    } catch (e) {
        return null;
    }
}

// Get emblem URL for a player (by in-game name or discord ID)
function getPlayerEmblem(playerNameOrId) {
    // First try direct discord ID lookup in emblems.json
    if (playerEmblems[playerNameOrId]) {
        return playerEmblems[playerNameOrId].emblem_url;
    }

    // Try to find via profile name mapping
    const discordId = profileNameToDiscordId[playerNameOrId];
    if (discordId && playerEmblems[discordId]) {
        return playerEmblems[discordId].emblem_url;
    }

    // Fallback: Search in gamesData detailed_stats for the most recent emblem
    // This handles cases where emblems.json doesn't exist
    let playerName = playerNameOrId;

    // If playerNameOrId is a discord ID, get the in-game name
    if (discordIdToProfileNames[playerNameOrId] && discordIdToProfileNames[playerNameOrId].length > 0) {
        playerName = discordIdToProfileNames[playerNameOrId][0];
    }

    // Search games in reverse order to get the most recent emblem
    for (let i = gamesData.length - 1; i >= 0; i--) {
        const game = gamesData[i];
        if (game.detailed_stats) {
            const playerStats = game.detailed_stats.find(s => s.player === playerName);
            if (playerStats && playerStats.emblem_url) {
                return playerStats.emblem_url;
            }
        }
    }

    return null;
}

// Build mappings between in-game profile names and discord IDs
// This should be called after gamesData is loaded
function buildProfileNameMappings() {
    // Reset mappings
    profileNameToDiscordId = {};
    discordIdToProfileNames = {};

    // PRIORITY 1: Use discord_id directly from game data (most reliable)
    // Each player in match data has their discord_id attached
    gamesData.forEach(game => {
        game.players.forEach(player => {
            if (!player.name) return;
            const discordId = player.discord_id;

            // Only use discord_id if it exists in rankstatsData
            if (discordId && rankstatsData[discordId]) {
                // Set the mapping (discord_id from game data takes priority)
                profileNameToDiscordId[player.name] = discordId;
                if (!discordIdToProfileNames[discordId]) {
                    discordIdToProfileNames[discordId] = [];
                }
                if (!discordIdToProfileNames[discordId].includes(player.name)) {
                    discordIdToProfileNames[discordId].push(player.name);
                }
            }
        });
    });

    console.log('[MAPPINGS] Built mappings from discord_id for', Object.keys(profileNameToDiscordId).length, 'in-game names');

    // PRIORITY 2: For names not yet mapped, try matching by discord_name or in_game_names
    const inGameNames = new Set();
    gamesData.forEach(game => {
        game.players.forEach(player => {
            if (player.name && !profileNameToDiscordId[player.name]) {
                inGameNames.add(player.name);
            }
        });
    });

    inGameNames.forEach(inGameName => {
        const inGameNameLower = inGameName.toLowerCase();

        // Try to find a matching discord ID
        for (const [discordId, data] of Object.entries(rankstatsData)) {
            const discordName = (data.discord_name || '').toLowerCase();
            const inGameNamesArr = (data.in_game_names || []).map(n => n.toLowerCase());

            // Check if in-game name matches discord_name or any in_game_names entry
            if (inGameNameLower === discordName || inGameNamesArr.includes(inGameNameLower)) {
                profileNameToDiscordId[inGameName] = discordId;
                if (!discordIdToProfileNames[discordId]) {
                    discordIdToProfileNames[discordId] = [];
                }
                if (!discordIdToProfileNames[discordId].includes(inGameName)) {
                    discordIdToProfileNames[discordId].push(inGameName);
                }
                break;
            }
        }
    });

    console.log('[MAPPINGS] After name matching, total mapped:', Object.keys(profileNameToDiscordId).length, 'in-game names');
}

// Get the display name for an in-game profile name
// Use display_name (server nickname) first, then discord_name
function getDisplayNameForProfile(inGameName) {
    const discordId = profileNameToDiscordId[inGameName];
    if (discordId && rankstatsData[discordId]) {
        const data = rankstatsData[discordId];
        // Use display_name (server nickname) first, then discord_name
        return data.display_name || data.discord_name || 'No MAC Linked';
    }
    // If no mapping found, player's MAC isn't linked to a discord ID
    return 'No MAC Linked';
}

// Get the display name for a discord ID
// Use display_name (server nickname) first, then discord_name
function getDisplayNameForDiscordId(discordId) {
    if (rankstatsData[discordId]) {
        const data = rankstatsData[discordId];
        return data.display_name || data.discord_name || 'Unknown';
    }
    return 'Unknown';
}

// Get the discord ID for an in-game profile name
function getDiscordIdForProfile(inGameName) {
    return profileNameToDiscordId[inGameName] || null;
}

// Get the rank for an in-game profile name (looks up via discord ID mapping)
function getRankForProfile(inGameName) {
    const discordId = profileNameToDiscordId[inGameName];
    if (discordId && rankstatsData[discordId]) {
        return rankstatsData[discordId].rank || 1;
    }
    // Fallback to old method
    return playerRanks[inGameName] || 1;
}

// Get playlist ranks for a player
function getPlayerPlaylistRanks(playerName) {
    return playerPlaylistRanks[playerName] || null;
}

// Get rank icon HTML for a player (only if they have a rank in ranks.json)
// Supports both in-game profile names and discord names
function getPlayerRankIcon(playerName, size = 'small') {
    // First try to get rank via profile name mapping
    let rank = getRankForProfile(playerName);
    // Fallback to old method (direct lookup by discord_name/alias)
    if (rank === 1) {
        rank = playerRanks[playerName] || 1;
    }
    if (!rank || rank < 1) return '';
    const sizeClass = size === 'small' ? 'rank-icon-small' : 'rank-icon';
    return `<img src="https://r2-cdn.insignia.live/h2-rank/${rank}.png" alt="Rank ${rank}" class="${sizeClass}" />`;
}

// Get rank icon for a specific rank number
function getRankIconForValue(rank, size = 'small') {
    if (!rank || rank < 1) return '';
    const sizeClass = size === 'small' ? 'rank-icon-small' : 'rank-icon';
    return `<img src="https://r2-cdn.insignia.live/h2-rank/${rank}.png" alt="Rank ${rank}" class="${sizeClass}" />`;
}

// Get pre-game rank icon for a player in a specific game
// Uses discord_id directly if available, otherwise falls back to name lookup
function getPreGameRankIcon(player, size = 'small', game = null) {
    // First priority: Check if player object has pre_game_rank stored from match data
    if (player.pre_game_rank && player.pre_game_rank > 0) {
        return getRankIconForValue(player.pre_game_rank, size);
    }

    // Second priority: Look up from rank history using discord_id (preferred) or player name
    if (game && game.details && game.details['End Time']) {
        const preGameRank = getRankAtTime(player.name, game.details['End Time'], player.discord_id);
        if (preGameRank) {
            return getRankIconForValue(preGameRank, size);
        }
    }

    // Fallback to current rank using discord_id if available
    const discordId = player.discord_id || profileNameToDiscordId[player.name];
    if (discordId && rankstatsData[discordId]) {
        return getRankIconForValue(rankstatsData[discordId].rank || 1, size);
    }
    return getPlayerRankIcon(player.name, size);
}

// Get pre-game rank icon by looking up player name in game data
function getPreGameRankIconByName(playerName, game, size = 'small') {
    // First priority: Check player object's pre_game_rank from match data
    if (game && game.players) {
        const player = game.players.find(p => p.name === playerName);
        if (player && player.pre_game_rank && player.pre_game_rank > 0) {
            return getRankIconForValue(player.pre_game_rank, size);
        }
    }

    // Second priority: Look up from rank history using discord_id or player name
    let discordId = null;
    if (game && game.players) {
        const player = game.players.find(p => p.name === playerName);
        if (player && player.discord_id) {
            discordId = player.discord_id;
        }
    }

    if (game && game.details && game.details['End Time']) {
        const preGameRank = getRankAtTime(playerName, game.details['End Time'], discordId);
        if (preGameRank) {
            return getRankIconForValue(preGameRank, size);
        }
    }

    // Third: Fall back to getPreGameRankIcon for any additional fallback logic
    if (game && game.players) {
        const player = game.players.find(p => p.name === playerName);
        if (player) {
            return getPreGameRankIcon(player, size, game);
        }
    }
    // Fallback to current rank
    return getPlayerRankIcon(playerName, size);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGamesData();
});

// Global storage for playlist data
let playlistsConfig = null;
let playlistMatches = {};  // {playlist_name: matches_array}
let playlistStats = {};    // {playlist_name: stats_object}
let customGamesData = [];
let showCustomGames = false;

// Convert match data from {playlist}_matches.json to gamesData player format
function convertMatchToPlayers(match, playlist) {
    // Use player_stats if available (includes kills, deaths, assists)
    if (match.player_stats && match.player_stats.length > 0) {
        return match.player_stats.map(p => ({
            name: p.name,
            discord_id: p.discord_id,  // Include discord_id for name resolution
            team: p.team,
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            assists: p.assists || 0,
            score: p.score || '0',
            winner: p.team === match.winner,
            pre_game_rank: p.pre_game_rank || 1
        }));
    }

    // Fall back to basic team lists
    const players = [];

    if (playlist.is_team === false) {
        // Head to Head - players array with no teams
        if (match.players) {
            for (const playerName of match.players) {
                players.push({
                    name: playerName,
                    team: null,
                    winner: playerName === match.winner
                });
            }
        }
    } else {
        // Team game - red and blue teams
        if (match.red_team) {
            for (const playerName of match.red_team) {
                players.push({
                    name: playerName,
                    team: 'Red',
                    winner: match.winner === 'Red'
                });
            }
        }
        if (match.blue_team) {
            for (const playerName of match.blue_team) {
                players.push({
                    name: playerName,
                    team: 'Blue',
                    winner: match.winner === 'Blue'
                });
            }
        }
    }

    return players;
}

// Load custom games when checkbox is toggled
async function loadCustomGames() {
    if (customGamesData.length > 0) {
        return customGamesData;  // Already loaded
    }

    try {
        const response = await fetch('customgames.json');
        if (response.ok) {
            const data = await response.json();
            customGamesData = data.matches || [];
            console.log(`[DEBUG] Loaded ${customGamesData.length} custom games`);
        }
    } catch (e) {
        console.warn('[WARN] Could not load customgames.json:', e);
    }

    return customGamesData;
}

// Toggle custom games display
async function toggleCustomGames(show) {
    showCustomGames = show;

    if (show && customGamesData.length === 0) {
        await loadCustomGames();

        // Add custom games to gamesData
        for (const match of customGamesData) {
            gamesData.push({
                details: {
                    'Start Time': match.timestamp,
                    'Map Name': match.map,
                    'Game Type': match.gametype
                },
                players: convertMatchToPlayers(match, { is_team: true }),
                playlist: null,  // Unranked
                source_file: match.source_file,
                isCustomGame: true
            });
        }
    } else if (!show) {
        // Remove custom games from gamesData
        gamesData = gamesData.filter(game => !game.isCustomGame);
    }

    // Re-render games list
    renderGamesList();
}

async function loadGamesData() {
    const loadingArea = document.getElementById('loadingArea');
    const statsArea = document.getElementById('statsArea');
    const mainHeader = document.getElementById('mainHeader');

    console.log('[DEBUG] Starting to load games data...');
    console.log('[DEBUG] Current URL:', window.location.href);
    console.log('[DEBUG] Protocol:', window.location.protocol);

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
        // Load playlists configuration first
        console.log('[DEBUG] Loading playlists.json...');
        const playlistsResponse = await fetch('playlists.json');
        if (playlistsResponse.ok) {
            playlistsConfig = await playlistsResponse.json();
            console.log('[DEBUG] Playlists config loaded:', playlistsConfig);
        } else {
            console.warn('[WARN] playlists.json not found, falling back to legacy loading');
            playlistsConfig = null;
        }

        // Load games from per-playlist files or legacy gameshistory.json
        gamesData = [];

        if (playlistsConfig && playlistsConfig.playlists) {
            // New per-playlist loading
            console.log('[DEBUG] Loading per-playlist match files...');
            for (const playlist of playlistsConfig.playlists) {
                try {
                    const matchesResponse = await fetch(playlist.matches_file);
                    if (matchesResponse.ok) {
                        const matchesData = await matchesResponse.json();
                        playlistMatches[playlist.name] = matchesData.matches || [];
                        console.log(`[DEBUG] Loaded ${playlistMatches[playlist.name].length} matches from ${playlist.matches_file}`);

                        // Convert to gamesData format for compatibility
                        for (const match of playlistMatches[playlist.name]) {
                            gamesData.push({
                                details: {
                                    'Start Time': match.timestamp,
                                    'Map Name': match.map,
                                    'Game Type': match.gametype,
                                    'Duration': match.duration || '0:00'
                                },
                                players: convertMatchToPlayers(match, playlist),
                                playlist: playlist.name,
                                source_file: match.source_file,
                                // Construct URLs from source_file
                                public_url: match.source_file ? `/stats/public/${match.source_file}` : null,
                                theater_url: match.source_file ? `/stats/theater/${match.source_file.replace('.xlsx', '_theater.csv')}` : null,
                                red_score: match.red_score,
                                blue_score: match.blue_score,
                                // Include all match data for detailed views (original structure)
                                detailed_stats: match.detailed_stats || [],
                                medals: match.medals || [],
                                weapons: match.weapons || [],
                                versus: match.versus || {}
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`[WARN] Could not load ${playlist.matches_file}:`, e);
                }

                // Also load stats for this playlist
                try {
                    const statsResponse = await fetch(playlist.stats_file);
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        playlistStats[playlist.name] = statsData.players || {};
                        console.log(`[DEBUG] Loaded stats for ${Object.keys(playlistStats[playlist.name]).length} players from ${playlist.stats_file}`);
                    }
                } catch (e) {
                    console.warn(`[WARN] Could not load ${playlist.stats_file}:`, e);
                }
            }
        } else {
            console.error('[ERROR] playlists.json not found - cannot load game data');
        }

        // Filter out hidden games (not included in stats or viewing)
        const totalGames = gamesData.length;
        gamesData = gamesData.filter(game => !game.hidden);
        const hiddenCount = totalGames - gamesData.length;
        if (hiddenCount > 0) {
            console.log('[DEBUG] Filtered out', hiddenCount, 'hidden game(s)');
        }

        // Always load custom games (shown in Recent Games, but not in stats unless checkbox is on)
        await loadCustomGames();
        for (const match of customGamesData) {
            gamesData.push({
                details: {
                    'Start Time': match.timestamp,
                    'Map Name': match.map,
                    'Game Type': match.gametype,
                    'Duration': match.duration || '0:00'
                },
                players: convertMatchToPlayers(match, { is_team: true }),
                playlist: 'Custom Games',
                source_file: match.source_file,
                // Construct URLs from source_file
                public_url: match.source_file ? `/stats/public/${match.source_file}` : null,
                theater_url: match.source_file ? `/stats/theater/${match.source_file.replace('.xlsx', '_theater.csv')}` : null,
                isCustomGame: true,
                red_score: match.red_score,
                blue_score: match.blue_score,
                // Include all match data for detailed views (original structure)
                detailed_stats: match.detailed_stats || [],
                medals: match.medals || [],
                weapons: match.weapons || [],
                versus: match.versus || {}
            });
        }
        console.log(`[DEBUG] Added ${customGamesData.length} custom games to gamesData`);

        // Sort all games chronologically (oldest first, newest last)
        gamesData.sort((a, b) => {
            const timeA = parseGameDateTime(a.details['Start Time']) || parseGameDateTime(a.details['End Time']) || new Date(0);
            const timeB = parseGameDateTime(b.details['Start Time']) || parseGameDateTime(b.details['End Time']) || new Date(0);
            return timeA - timeB;
        });
        console.log('[DEBUG] Games sorted chronologically');

        // IMPORTANT: Assign game numbers BEFORE any filtering
        // Game numbers must match gameindex.json (1-indexed, oldest = 1)
        // This ensures game numbers remain stable even when games are filtered out
        for (let i = 0; i < gamesData.length; i++) {
            gamesData[i].gameNumber = i + 1;
        }
        console.log('[DEBUG] Assigned game numbers to all games');

        console.log('[DEBUG] Games loaded successfully!');
        console.log('[DEBUG] Number of games:', gamesData.length);
        if (gamesData.length > 0) {
            console.log('[DEBUG] First game:', gamesData[0]);
        }
        
        // Load player ranks from ranks.json (supports playlist-based ranks)
        console.log('[DEBUG] Loading player ranks...');
        await loadPlayerRanks();

        // Load player emblems
        console.log('[DEBUG] Loading player emblems...');
        await loadEmblems();

        // Build mappings between in-game names and discord IDs
        console.log('[DEBUG] Building profile name mappings...');
        buildProfileNameMappings();

        // Load XP configuration for ranking
        console.log('[DEBUG] Loading XP configuration...');
        await loadXPConfig();

        // Build dynamic rank history from game outcomes
        console.log('[DEBUG] Building dynamic rank history...');
        buildDynamicRankHistory();

        // Load rank history (must be after mappings are built) - fallback
        console.log('[DEBUG] Loading rank history...');
        await loadRankHistory();

        loadingArea.style.display = 'none';
        statsArea.style.display = 'block';
        mainHeader.classList.add('loaded');

        console.log('[DEBUG] Rendering games list...');
        renderGamesList();

        console.log('[DEBUG] Rendering leaderboard...');
        renderLeaderboard();

        // Add playlist filter event listener
        const playlistFilter = document.getElementById('playlistFilter');
        if (playlistFilter) {
            playlistFilter.addEventListener('change', function() {
                renderLeaderboard(this.value);
            });
        }

        console.log('[DEBUG] Initializing search...');
        initializeSearch();

        console.log('[DEBUG] Handling URL navigation...');
        handleUrlNavigation();

        console.log('[DEBUG] All rendering complete!');
    } catch (error) {
        console.error('[ERROR] Failed to load games data:', error);
        console.error('[ERROR] Error name:', error.name);
        console.error('[ERROR] Error message:', error.message);
        console.error('[ERROR] Error stack:', error.stack);
        
        let errorMessage = error.message;
        let helpText = 'Check browser console (F12) for details';
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            helpText = 'Required JSON files not found. Make sure playlists.json and match files are in the same directory as index.html';
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

function switchMainTab(tabName, updateHash = true) {
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

    // Load Twitch Hub content when tab is selected
    if (tabName === 'twitch') {
        loadTwitchHub();
    }

    // Load Tournaments when tab is selected
    if (tabName === 'tournaments') {
        loadTournaments();
    }

    // Update URL hash for deep linking (e.g., #leaderboard, #twitch)
    if (updateHash) {
        const hashName = getHashNameForTab(tabName);
        if (hashName) {
            history.replaceState(null, '', '#' + hashName);
        } else {
            history.replaceState(null, '', window.location.pathname);
        }
    }
}

// Map tab names to URL paths
function getHashNameForTab(tabName) {
    const tabToHash = {
        'games': 'games',
        'leaderboard': 'leaderboard',
        'tournaments': 'tournaments',
        'twitch': 'twitch',
        'pvp': 'pvp',
        'emblem': 'emblem'
    };
    return tabToHash[tabName] || null;
}

// Map URL paths to tab names
function getTabNameFromHash(hash) {
    const hashToTab = {
        'games': 'gamehistory',
        'gamehistory': 'gamehistory',
        'leaderboard': 'leaderboard',
        'tournaments': 'tournaments',
        'twitch': 'twitch',
        'pvp': 'pvp',
        'emblem': 'emblem'
    };
    return hashToTab[hash] || null;
}

// Handle URL-based tab navigation on page load
function handleUrlNavigation() {
    // Get hash from URL (e.g., #leaderboard -> leaderboard)
    const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
    const path = hash.toLowerCase();

    if (path) {
        // First check if it's a tab name
        const tabName = getTabNameFromHash(path);
        if (tabName) {
            switchMainTab(tabName, false);
            return;
        }

        // Check if it's a player name (try to find matching player)
        const playerName = findPlayerByUrlPath(hash);
        if (playerName) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
                openPlayerProfile(playerName);
            }, 100);
            return;
        }
    }

    // Default to gamehistory tab if no valid path
    switchMainTab('gamehistory', false);
}

// Listen for hash changes
window.addEventListener('hashchange', handleUrlNavigation);

// Find player by URL path (case-insensitive match against discord_name only)
function findPlayerByUrlPath(urlPath) {
    const searchLower = decodeURIComponent(urlPath).toLowerCase();

    // Search by discord_name only (exact match) - NEVER use in-game names
    for (const [discordId, data] of Object.entries(rankstatsData)) {
        const discordName = data.discord_name || '';
        if (discordName.toLowerCase() === searchLower) {
            // Return the in-game name for this player (needed for openPlayerProfile)
            const profileNames = discordIdToProfileNames[discordId];
            if (profileNames && profileNames.length > 0) {
                return profileNames[0];
            }
            return discordName;
        }
    }

    return null;
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
    // Iterate in reverse order (newest games first at top, oldest at bottom)
    // Use game.gameNumber which is assigned before filtering and matches gameindex.json
    for (let i = gamesData.length - 1; i >= 0; i--) {
        const game = gamesData[i];
        const gameNumber = game.gameNumber;  // Use stable game number, not array index
        console.log(`[DEBUG] Creating game ${gameNumber}:`, game.details);
        const gameItem = createGameItem(game, gameNumber);
        gamesList.appendChild(gameItem);
    }
    
    console.log('[DEBUG] All game items created');
    
    // Populate filter dropdowns
    populateMainFilters();
}

function createGameItem(game, gameNumber, idPrefix = 'game') {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-item';
    gameDiv.id = `${idPrefix}-${gameNumber}`;

    // Store the stable game number for reliable game lookup
    // This ensures correct game is found even after filtering
    gameDiv.setAttribute('data-game-number', gameNumber);
    
    const details = game.details;
    const players = game.players;
    
    let displayGameType = getBaseGametype(details['Game Type'], game.playlist, game);
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
    const isOddball = displayGameType.toLowerCase().includes('oddball') || displayGameType.toLowerCase().includes('ball');
    const isFFA = displayGameType.toLowerCase().includes('ffa') || displayGameType.toLowerCase().includes('free for all');

    // Use pre-calculated scores if available (from per-playlist matches) - skip for FFA
    if (!isFFA && game.red_score !== undefined && game.blue_score !== undefined) {
        teams['Red'] = game.red_score;
        teams['Blue'] = game.blue_score;
    } else if (!isFFA) {
        // Fall back to calculating from player scores
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
    }
    
    // Determine winner
    let winnerClass = '';
    let scoreTagClass = '';
    
    if (Object.keys(teams).length === 2) {
        // Team game - find winning team (exactly 2 teams; more than 2 = FFA)
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
            const winnerDisplay = getDisplayNameForProfile(winner.name);
            winnerClass = 'winner-ffa';
            scoreTagClass = 'score-tag-ffa';
            teamScoreDisplay = `<span class="game-meta-tag ${scoreTagClass}">${winnerDisplay}</span>`;
        }
    }

    gameDiv.innerHTML = `
        <div class="game-header-bar ${winnerClass}" onclick="toggleGameDetails('${idPrefix}', ${gameNumber})">
            <div class="game-header-left">
                <div class="game-info">
                    <span class="game-type-title" title="Game ${gameNumber}">${displayGameType}</span>
                    <span class="game-meta-tag">${mapName}</span>
                    ${teamScoreDisplay}
                </div>
            </div>
            <div class="game-header-right">
                <span class="game-meta-tag playlist-tag${!game.playlist ? ' custom-game' : ''}">${game.playlist || 'Custom Games'}</span>
                ${dateDisplay ? `<span class="game-meta-tag date-tag">${dateDisplay}</span>` : ''}
                <div class="expand-icon">▶</div>
            </div>
        </div>
        <div class="game-details">
            <div class="game-details-content">
                <div id="${idPrefix}-content-${gameNumber}"></div>
            </div>
        </div>
    `;
    
    return gameDiv;
}

// Toggle download dropdown menu
function toggleDownloadMenu(event, gameNumber) {
    event.stopPropagation();
    const menu = document.getElementById(`download-menu-${gameNumber}`);
    if (!menu) return;

    // Close all other open menus
    document.querySelectorAll('.download-menu.show').forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });

    menu.classList.toggle('show');
}

// Close download menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.game-download-dropdown')) {
        document.querySelectorAll('.download-menu.show').forEach(m => {
            m.classList.remove('show');
        });
    }
});

function toggleGameDetails(idPrefix, gameNumber) {
    const gameItem = document.getElementById(`${idPrefix}-${gameNumber}`);
    const gameContent = document.getElementById(`${idPrefix}-content-${gameNumber}`);

    if (!gameItem) return;

    const isExpanded = gameItem.classList.contains('expanded');

    if (isExpanded) {
        gameItem.classList.remove('expanded');
    } else {
        gameItem.classList.add('expanded');

        if (!gameContent.innerHTML) {
            // Get the stored game number and find the game by its stable gameNumber property
            const gameNumber = parseInt(gameItem.getAttribute('data-game-number'));
            const game = gamesData.find(g => g.gameNumber === gameNumber);
            if (game) {
                gameContent.innerHTML = renderGameContent(game);
                // Load scoreboard emblems
                loadScoreboardEmblems(gameContent);
            }
        }
    }
}

function renderGameContent(game) {
    const mapName = game.details['Map Name'] || 'Unknown';
    const mapImage = mapImages[mapName] || defaultMapImage;
    const rawGameType = game.details['Game Type'] || 'Unknown';
    const displayGameType = getBaseGametype(rawGameType, game.playlist, game);
    const duration = formatDuration(game.details['Duration'] || '0:00');
    const startTime = game.details['Start Time'] || '';

    // Format the start time
    const formattedTime = formatDateTime(startTime);

    // Calculate team scores
    let teamScoreHtml = '';
    const teams = {};
    let hasRealTeams = false;
    const isOddball = displayGameType.toLowerCase().includes('oddball') || displayGameType.toLowerCase().includes('ball');
    const isFFA = displayGameType.toLowerCase().includes('ffa') || displayGameType.toLowerCase().includes('free for all');

    // Use pre-calculated scores if available (from per-playlist matches) - same logic as header
    if (!isFFA && game.red_score !== undefined && game.blue_score !== undefined) {
        teams['Red'] = game.red_score;
        teams['Blue'] = game.blue_score;
        hasRealTeams = true;
    } else {
        // Fall back to calculating from player scores
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
    }
    
    if (hasRealTeams && Object.keys(teams).length === 2) {
        // Team game - show team scores (exactly 2 teams; more than 2 = FFA)
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
            const winnerDisplayName = getDisplayNameForProfile(winner.name);
            teamScoreHtml = '<div class="game-final-score ffa-winner">';
            teamScoreHtml += `<span class="winner-label">WINNER:</span> `;
            teamScoreHtml += `<span class="winner-name clickable-player" data-player="${winner.name}">${winnerDisplayName}</span>`;
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
    html += `<div class="game-type-title">${displayGameType}</div>`;
    html += `<div class="game-meta-info">`;
    html += `<span><i class="icon-clock"></i> ${duration}</span>`;
    html += `<span><i class="icon-calendar"></i> ${formattedTime}</span>`;
    html += `</div>`;
    html += teamScoreHtml;
    html += `</div>`;

    // Download dropdown for expanded game view
    const hasStats = game.public_url && game.public_url.trim() !== '';
    const hasTelemetry = game.theater_url && game.theater_url.trim() !== '';
    const statsFilename = game.public_url ? game.public_url.split('/').pop() : '';
    const telemetryFilename = game.theater_url ? game.theater_url.split('/').pop() : '';

    // Get game index for 3D replay
    const gameIndex = gamesData.indexOf(game);

    // Halo 2 Theater Mode button (shown when telemetry is available)
    html += '<div class="game-actions">';
    html += `<button class="replay-3d-btn" onclick="event.stopPropagation(); open3DReplay(${gameIndex});" title="Halo 2 Theater Mode">`;
    html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>';
    html += '<span>Halo 2 Theater Mode</span>';
    html += '</button>';

    html += '<div class="game-download-dropdown">';
    html += '<button class="download-icon-btn" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(\'show\');" title="Download game files">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
    html += '</button>';
    html += '<div class="download-menu">';
    if (hasStats) {
        html += `<a href="${game.public_url}" class="download-menu-item" download="${statsFilename}" onclick="event.stopPropagation();">Stats</a>`;
    } else {
        html += '<span class="download-menu-item disabled" onclick="event.stopPropagation(); alert(\'Sorry, it seems this file was lost\');">Stats</span>';
    }
    if (hasTelemetry) {
        html += `<a href="${game.theater_url}" class="download-menu-item" download="${telemetryFilename}" onclick="event.stopPropagation();">Telemetry</a>`;
    } else {
        html += '<span class="download-menu-item disabled" onclick="event.stopPropagation(); alert(\'Sorry, it seems this file was lost\');">Telemetry</span>';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';

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

    // Sort players: Red team first then Blue team for team games, by score for FFA
    const sortedPlayers = [...players];
    if (hasTeams) {
        sortedPlayers.sort((a, b) => {
            const teamOrder = { 'Red': 0, 'Blue': 1 };
            const teamA = teamOrder[a.team] !== undefined ? teamOrder[a.team] : 2;
            const teamB = teamOrder[b.team] !== undefined ? teamOrder[b.team] : 2;
            return teamA - teamB;
        });
    } else {
        // FFA - sort by score descending (highest score first)
        const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');
        sortedPlayers.sort((a, b) => {
            if (isOddball) {
                return timeToSeconds(b.score) - timeToSeconds(a.score);
            }
            return (parseInt(b.score) || 0) - (parseInt(a.score) || 0);
        });
    }

    // Build map of player emblems from detailed_stats for this game
    const playerEmblemsInGame = {};
    if (game.detailed_stats) {
        game.detailed_stats.forEach(stat => {
            if (stat.player && stat.emblem_url) {
                playerEmblemsInGame[stat.player] = stat.emblem_url;
            }
        });
    }

    // Build map of weapon stats for each player
    const playerWeaponStats = {};
    if (game.weapons) {
        game.weapons.forEach(weaponData => {
            const playerName = weaponData.Player;
            if (!playerName) return;

            let grenadeKills = 0;
            let meleeKills = 0;

            // Count grenade kills
            grenadeKills += parseInt(weaponData['frag grenade kills']) || 0;
            grenadeKills += parseInt(weaponData['plasma grenade kills']) || 0;

            // Energy sword is a melee weapon
            meleeKills += parseInt(weaponData['energy sword kills']) || 0;

            playerWeaponStats[playerName] = { grenadeKills, meleeKills };
        });
    }

    // Also calculate beatdown kills from medals
    if (game.medals) {
        game.medals.forEach(medalData => {
            const playerName = medalData.player;
            if (!playerName) return;

            // bone_cracker and assassin are melee medals
            const meleeMedals = (parseInt(medalData.bone_cracker) || 0) + (parseInt(medalData.assassin) || 0);

            // Subtract sword kills (already counted) to get pure beatdowns
            const swordKills = playerWeaponStats[playerName]?.meleeKills || 0;
            const beatdowns = Math.max(0, meleeMedals - swordKills);

            if (!playerWeaponStats[playerName]) {
                playerWeaponStats[playerName] = { grenadeKills: 0, meleeKills: 0 };
            }
            playerWeaponStats[playerName].meleeKills += beatdowns;
        });
    }

    let html = '<div class="scoreboard">';

    // Determine columns
    let columns = ['', 'Player', 'Score', 'K', 'D', 'A', 'K/D'];

    // Build grid template
    let gridTemplate = '40px 2fr 80px 50px 50px 50px 70px';

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

        // Emblem column - prefer game's detailed_stats, fallback to getPlayerEmblem
        const emblemUrl = playerEmblemsInGame[player.name] || getPlayerEmblem(player.name);
        const emblemParams = emblemUrl ? parseEmblemParams(emblemUrl) : null;
        html += '<div class="sb-emblem">';
        if (emblemParams && typeof generateEmblemDataUrl === 'function') {
            html += `<div class="emblem-placeholder sb-emblem-placeholder" data-emblem-params='${JSON.stringify(emblemParams)}'></div>`;
        } else {
            html += '<div class="sb-emblem-empty"></div>';
        }
        html += '</div>';

        const displayName = getDisplayNameForProfile(player.name);
        html += `<div class="sb-player clickable-player" data-player="${player.name}">`;
        // Don't show rank icon for Custom Games - only ranked playlists
        if (game.playlist && game.playlist !== 'Custom Games') {
            html += getPreGameRankIcon(player, 'small', game);
        }
        html += `<span class="player-name-text">${displayName}</span>`;
        html += `</div>`;

        // Format score as time for oddball games
        const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');
        const displayScore = isOddball ? formatOddballScore(player.score) : (player.score || 0);
        html += `<div class="sb-score">${displayScore}</div>`;
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
        // Show abbreviated display name - first 7 chars or full name if shorter
        const fullDisplayName = getDisplayNameForProfile(player.name);
        const displayName = fullDisplayName.length > 7 ? fullDisplayName.substring(0, 7) : fullDisplayName;
        html += `<div class="pvp-col-header ${teamClass} clickable-player" data-player="${player.name}" title="${fullDisplayName}">${displayName}</div>`;
    });
    html += '</div>';
    
    // Data rows
    sortedPlayers.forEach(killer => {
        const teamClass = isValidTeam(killer.team) ? killer.team.toLowerCase() : '';
        html += `<div class="pvp-row ${teamClass}" style="display: grid; grid-template-columns: ${gridCols};">`;
        
        // Row header (killer name)
        const killerDisplayName = getDisplayNameForProfile(killer.name);
        html += `<div class="pvp-row-header clickable-player" data-player="${killer.name}">`;
        html += getPreGameRankIcon(killer, 'small', game);
        html += `<span class="player-name-text">${killerDisplayName}</span>`;
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
    const stats = game.detailed_stats;
    const players = game.players;

    if (!stats || stats.length === 0) {
        return '<div class="no-data">No detailed stats available</div>';
    }

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
        const teamA = teamOrder[playerTeams[a.player]] !== undefined ? teamOrder[playerTeams[a.player]] : 2;
        const teamB = teamOrder[playerTeams[b.player]] !== undefined ? teamOrder[playerTeams[b.player]] : 2;
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
        const team = playerTeams[stat.player];
        const teamAttr = team ? `data-team="${team}"` : '';
        const timeAlive = formatTime(stat.total_time_alive || 0);

        html += `<tr ${teamAttr}>`;
        html += `<td><span class="player-with-rank">${getPreGameRankIconByName(stat.player, game, 'small')}<span>${getDisplayNameForProfile(stat.player)}</span></span></td>`;
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
            const team = playerTeams[stat.player];
            const teamAttr = team ? `data-team="${team}"` : '';

            html += `<tr ${teamAttr}><td><span class="player-with-rank">${getPreGameRankIconByName(stat.player, game, 'small')}<span>${getDisplayNameForProfile(stat.player)}</span></span></td>`;

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
        // Get all medals for this player (excluding the 'player' key), sorted by count descending
        const playerMedalEntries = Object.entries(playerMedals)
            .filter(([medalKey, count]) => medalKey !== 'player' && (parseInt(count) || 0) > 0)
            .sort((a, b) => (parseInt(b[1]) || 0) - (parseInt(a[1]) || 0));

        // Filter to only medals we have icons for
        const validMedals = playerMedalEntries.filter(([medalKey]) => getMedalIcon(medalKey));

        // Skip players with no medals entirely
        if (validMedals.length === 0) return;

        const team = playerTeams[playerMedals.player];
        const teamAttr = team ? `data-team="${team}"` : '';

        html += `<div class="medals-row" ${teamAttr}>`;
        const medalPlayerDisplayName = getDisplayNameForProfile(playerMedals.player);
        html += `<div class="medals-player-col clickable-player" data-player="${playerMedals.player}">`;
        html += getPreGameRankIconByName(playerMedals.player, game, 'small');
        html += `<span class="player-name-text">${medalPlayerDisplayName}</span>`;
        html += `</div>`;
        html += `<div class="medals-icons-col">`;

        validMedals.forEach(([medalKey, count]) => {
            const medalCount = parseInt(count) || 0;
            const iconPath = getMedalIcon(medalKey);
            const medalName = formatMedalName(medalKey);

            html += `<div class="medal-badge" title="${medalName}">`;
            html += `<img src="${iconPath}" alt="${medalName}" class="medal-icon">`;
            html += `<span class="medal-count">x${medalCount}</span>`;
            html += `</div>`;
        });

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
        
        const accuracyDisplayName = getDisplayNameForProfile(playerName);
        html += `<div class="accuracy-row" ${teamAttr}>`;
        html += `<div class="accuracy-player-col clickable-player" data-player="${playerName}">`;
        html += getPreGameRankIconByName(playerName, game, 'small');
        html += `<span class="player-name-text">${accuracyDisplayName}</span>`;
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
    
    // Get all weapon columns with kills (excluding headshot kills and grenades)
    const weaponCols = Object.keys(weapons[0] || {}).filter(k => k !== 'Player');
    const killCols = weaponCols.filter(c => {
        const col = c.toLowerCase();
        return col.includes('kills') &&
               !col.includes('headshot') &&
               !col.includes('grenade');
    });
    
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
        const weaponsDisplayName = getDisplayNameForProfile(playerName);

        html += `<div class="weapons-row" ${teamAttr}>`;
        html += `<div class="weapons-player-col clickable-player" data-player="${playerName}">`;
        html += getPreGameRankIconByName(playerName, game, 'small');
        html += `<span class="player-name-text">${weaponsDisplayName}</span>`;
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

                html += `<div class="weapon-badge" title="${formatWeaponName(weaponName)}">`;
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
    const gameStartTime = details['Start Time'] || 'Unknown';
    const gameEndTime = details['End Time'] || '';
    const gameDuration = details['Duration'] || '';

    // Parse duration to minutes (format: "15:01" or "1:23:45")
    let durationMinutes = 15;
    if (gameDuration) {
        const parts = gameDuration.split(':').map(Number);
        if (parts.length === 2) {
            durationMinutes = parts[0] + parts[1] / 60;
        } else if (parts.length === 3) {
            durationMinutes = parts[0] * 60 + parts[1] + parts[2] / 60;
        }
    }

    // Generate unique ID for this game's twitch section
    const gameId = `twitch-${gameStartTime.replace(/[^a-zA-Z0-9]/g, '')}`;

    let html = '<div class="twitch-section">';

    html += '<div class="twitch-header">';
    html += '<div class="twitch-icon"><img src="assets/Twitch.png" alt="Twitch" class="twitch-icon-img"></div>';
    html += '<h3>Twitch VODs & Clips</h3>';
    html += '<p class="twitch-subtitle">Linked content from players in this match</p>';
    html += '</div>';

    html += '<div class="twitch-info-box">';
    html += `<p class="game-time-info">Game played: <strong>${gameStartTime}</strong>`;
    if (gameDuration) {
        html += ` (Duration: ${gameDuration})`;
    }
    html += '</p>';
    html += '</div>';

    // Find players with linked Twitch accounts
    const linkedPlayers = [];
    const unlinkedPlayers = [];

    players.forEach(player => {
        const discordId = getDiscordIdForProfile(player.name);
        let twitchData = null;

        if (discordId && rankstatsData[discordId]) {
            const data = rankstatsData[discordId];
            if (data.twitch_url && data.twitch_name) {
                twitchData = {
                    name: data.twitch_name,
                    url: data.twitch_url
                };
            }
        }

        if (twitchData) {
            linkedPlayers.push({ player, twitchData });
        } else {
            unlinkedPlayers.push(player);
        }
    });

    // VOD embeds container - will be populated async
    html += `<div id="${gameId}-vods" class="twitch-vods-container">`;
    html += '<div class="twitch-vods-loading">Loading VODs...</div>';
    html += '</div>';

    // Show linked players with Twitch channels
    if (linkedPlayers.length > 0) {
        html += '<div class="twitch-linked-section">';
        html += '<h4 class="twitch-section-title">Players with Linked Twitch</h4>';
        html += '<div class="twitch-players-grid">';

        linkedPlayers.forEach(({ player, twitchData }) => {
            const team = player.team;
            const teamClass = isValidTeam(team) ? `team-${team.toLowerCase()}` : '';
            const displayName = getDisplayNameForProfile(player.name);

            html += `<div class="twitch-player-card twitch-linked ${teamClass}">`;
            html += `<div class="twitch-player-header clickable-player" data-player="${player.name}">`;
            html += getPreGameRankIcon(player, 'small', game);
            html += `<span class="twitch-player-name">${displayName}</span>`;
            html += `</div>`;
            html += `<div class="twitch-player-status">`;
            html += `<a href="${twitchData.url}" target="_blank" class="twitch-channel-link">`;
            html += `<img src="assets/Twitch.png" alt="Twitch" class="twitch-linked-icon-img"> ${twitchData.name}`;
            html += `</a>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += '</div>';
        html += '</div>';
    }

    // Show unlinked players
    if (unlinkedPlayers.length > 0) {
        html += '<div class="twitch-unlinked-section">';
        html += '<h4 class="twitch-section-title">Players Without Linked Twitch</h4>';
        html += '<div class="twitch-players-grid">';

        unlinkedPlayers.forEach(player => {
            const team = player.team;
            const teamClass = isValidTeam(team) ? `team-${team.toLowerCase()}` : '';
            const displayName = getDisplayNameForProfile(player.name);

            html += `<div class="twitch-player-card ${teamClass}">`;
            html += `<div class="twitch-player-header clickable-player" data-player="${player.name}">`;
            html += getPreGameRankIcon(player, 'small', game);
            html += `<span class="twitch-player-name">${displayName}</span>`;
            html += `</div>`;
            html += `<div class="twitch-player-status">`;
            html += `<span class="twitch-not-linked">Not linked</span>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += '</div>';
        html += '</div>';
    }

    if (linkedPlayers.length === 0) {
        html += '<div class="twitch-coming-soon">';
        html += '<p>🔗 No players in this match have linked their Twitch accounts yet.</p>';
        html += '<p class="twitch-note">Use /linktwitch in Discord to link your channel!</p>';
        html += '</div>';
    }

    html += '</div>';

    // Async load VODs after render
    if (linkedPlayers.length > 0) {
        setTimeout(() => {
            loadTwitchVodsForGame(gameId, linkedPlayers, gameStartTime, durationMinutes);
        }, 100);
    }

    return html;
}

// Async function to load and display VOD and clip embeds
async function loadTwitchVodsForGame(gameId, linkedPlayers, gameStartTime, durationMinutes) {
    const container = document.getElementById(`${gameId}-vods`);
    if (!container) return;

    const vodEmbeds = [];
    const clipEmbeds = [];

    for (const { player, twitchData } of linkedPlayers) {
        try {
            // Fetch VODs
            const vods = await fetchTwitchVods(twitchData.name);
            const result = findVodForTime(vods, gameStartTime, durationMinutes);

            if (result) {
                const { vod, timestampSeconds } = result;
                const displayName = getDisplayNameForProfile(player.name);
                const timestamp = formatTwitchTimestamp(timestampSeconds);

                vodEmbeds.push({
                    player: displayName,
                    twitchName: twitchData.name,
                    vodId: vod.id,
                    vodTitle: vod.title,
                    timestamp: timestamp,
                    timestampSeconds: timestampSeconds,
                    thumbnail: vod.previewThumbnailURL,
                    team: player.team
                });
            }

            // Fetch clips and filter to those from the game's VOD
            const clips = await fetchTwitchClips(twitchData.name);
            const displayName = getDisplayNameForProfile(player.name);

            // If we found a matching VOD, include any clips from that VOD
            if (result) {
                const matchingVodId = result.vod.id;
                clips.forEach(clip => {
                    if (clip.videoId === matchingVodId) {
                        clipEmbeds.push({
                            ...clip,
                            player: displayName,
                            twitchName: twitchData.name,
                            team: player.team
                        });
                    }
                });
            }
        } catch (error) {
            console.error(`Error loading Twitch content for ${twitchData.name}:`, error);
        }
    }

    let html = '';

    // Render VOD embeds
    if (vodEmbeds.length > 0) {
        html += '<h4 class="twitch-section-title">Match VODs</h4>';
        html += '<div class="twitch-vods-grid">';

        vodEmbeds.forEach(embed => {
            const teamClass = isValidTeam(embed.team) ? `team-${embed.team.toLowerCase()}-border` : '';
            const embedUrl = `https://player.twitch.tv/?video=${embed.vodId}&parent=${SITE_DOMAIN}&time=${embed.timestamp}&autoplay=false`;
            const vodUrl = `https://twitch.tv/videos/${embed.vodId}?t=${embed.timestamp}`;

            html += `<div class="twitch-vod-embed ${teamClass}">`;
            html += `<div class="twitch-vod-header">`;
            html += `<span class="twitch-vod-player">${embed.player}</span>`;
            html += `<span class="twitch-vod-channel">@${embed.twitchName}</span>`;
            html += `</div>`;
            html += `<div class="twitch-vod-iframe-container">`;
            html += `<iframe src="${embedUrl}" frameborder="0" allowfullscreen="true" scrolling="no" allow="autoplay; fullscreen"></iframe>`;
            html += `</div>`;
            html += `<div class="twitch-vod-footer">`;
            html += `<span class="twitch-vod-title" title="${embed.vodTitle}">${embed.vodTitle}</span>`;
            html += `<a href="${vodUrl}" target="_blank" class="twitch-vod-link">Open in Twitch ↗</a>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += '</div>';
    }

    // Render clips section
    if (clipEmbeds.length > 0) {
        html += '<h4 class="twitch-section-title" style="margin-top: 20px;">Recent Clips from Players</h4>';
        html += '<div class="twitch-clips-grid">';

        clipEmbeds.slice(0, 10).forEach(clip => {
            const teamClass = isValidTeam(clip.team) ? `team-${clip.team.toLowerCase()}-border` : '';
            const duration = clip.durationSeconds ? `${Math.floor(clip.durationSeconds)}s` : '';

            html += `<div class="twitch-clip-card ${teamClass}">`;
            html += `<a href="${clip.url}" target="_blank" class="twitch-clip-thumbnail">`;
            html += `<img src="${clip.thumbnailURL}" alt="${clip.title}" onerror="this.style.display='none'">`;
            if (duration) html += `<span class="twitch-clip-duration">${duration}</span>`;
            html += `</a>`;
            html += `<div class="twitch-clip-info">`;
            html += `<a href="${clip.url}" target="_blank" class="twitch-clip-title" title="${clip.title}">${clip.title}</a>`;
            html += `<div class="twitch-clip-meta">`;
            html += `<span class="twitch-clip-player">${clip.player}</span>`;
            html += `<span class="twitch-clip-views">${clip.viewCount?.toLocaleString() || 0} views</span>`;
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;
        });

        html += '</div>';
    }

    if (html === '') {
        html = '<div class="twitch-no-vods"><p>No VODs or clips found for players in this match.</p><p class="twitch-note">Streamers may not have been live or content may have expired.</p></div>';
    }

    container.innerHTML = html;
}

function renderLeaderboard(selectedPlaylist = null) {
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    if (!leaderboardContainer) return;

    // Get selected playlist from dropdown if not provided
    if (selectedPlaylist === null) {
        const playlistFilter = document.getElementById('playlistFilter');
        selectedPlaylist = playlistFilter ? playlistFilter.value : 'all';
    }

    // Use per-playlist stats if available for specific playlist
    let statsSource = rankstatsData;
    let usePlaylistStats = false;

    if (selectedPlaylist !== 'all' && playlistStats[selectedPlaylist]) {
        statsSource = playlistStats[selectedPlaylist];
        usePlaylistStats = true;
        console.log(`[DEBUG] Using per-playlist stats for ${selectedPlaylist}`);
    }

    // Build leaderboard from stats source
    if (Object.keys(statsSource).length === 0) {
        leaderboardContainer.innerHTML = '<div class="loading-message">No leaderboard data available</div>';
        return;
    }

    // Convert stats to array format for sorting
    const players = Object.entries(statsSource).map(([discordId, data]) => {
        // Get profile names (in-game names) for this discord ID
        const profileNames = discordIdToProfileNames[discordId] || [];

        // Get rank and stats based on data source
        let rank, wins, losses, games, kills, deaths, assists;

        if (usePlaylistStats) {
            // Per-playlist stats file format
            rank = data.rank || 1;
            wins = data.wins || 0;
            losses = data.losses || 0;
            games = wins + losses;
            kills = data.kills || 0;
            deaths = data.deaths || 0;
            assists = data.assists || 0;
        } else {
            // ranks.json format with playlist data
            const hasSpecificPlaylistData = selectedPlaylist !== 'all' && data.playlists && data.playlists[selectedPlaylist];
            if (hasSpecificPlaylistData) {
                const plData = data.playlists[selectedPlaylist];
                rank = plData.rank || 1;
                wins = plData.wins || 0;
                losses = plData.losses || 0;
                games = plData.games || (wins + losses);
                kills = plData.kills || data.kills || 0;
                deaths = plData.deaths || data.deaths || 0;
                assists = plData.assists || data.assists || 0;
            } else {
                rank = data.rank || 1;
                wins = data.wins || 0;
                losses = data.losses || 0;
                games = data.total_games || 0;
                kills = data.kills || 0;
                deaths = data.deaths || 0;
                assists = data.assists || 0;
            }
        }

        // Determine if player has data for this specific playlist
        const hasDataForPlaylist = usePlaylistStats ||
            (selectedPlaylist === 'all' && (wins > 0 || losses > 0 || games > 0)) ||
            (selectedPlaylist !== 'all' && data.playlists && data.playlists[selectedPlaylist]);

        // Always get series wins from rankstatsData (not playlist-specific stats)
        const globalData = rankstatsData[discordId] || {};

        return {
            discordId: discordId,
            // Use display_name (server nickname) first, then discord_name - NEVER use in-game names
            displayName: data.display_name || globalData.display_name || data.discord_name || globalData.discord_name || 'No MAC Linked',
            profileNames: profileNames,
            rank: rank,
            wins: wins,
            losses: losses,
            games: games || (wins + losses),
            kills: kills,
            deaths: deaths,
            assists: assists,
            kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
            winrate: (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0',
            hasPlaylistData: hasDataForPlaylist,
            seriesWins: globalData.series_wins || 0,
            seriesLosses: globalData.series_losses || 0
        };
    });

    // Filter players based on playlist selection
    // Also filter out players without MAC linked (mac_linked: false in rankstatsData)
    let filteredPlayers;
    if (selectedPlaylist !== 'all') {
        // Only show players who have played in this playlist AND have MAC linked
        filteredPlayers = players.filter(p => {
            const globalData = rankstatsData[p.discordId] || {};
            const isMacLinked = globalData.mac_linked !== false;  // true if mac_linked is true or undefined
            return p.hasPlaylistData && isMacLinked;
        });
    } else {
        // Show all players with games AND MAC linked
        filteredPlayers = players.filter(p => {
            const globalData = rankstatsData[p.discordId] || {};
            const isMacLinked = globalData.mac_linked !== false;
            return p.games > 0 && isMacLinked;
        });
    }

    // Sort by rank descending (50 at top, 1 at bottom), then by wins, then by K/D
    filteredPlayers.sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return parseFloat(b.kd) - parseFloat(a.kd);
    });

    // Only show series column for MLG 4v4 and Team Hardcore
    const showSeries = selectedPlaylist === 'MLG 4v4' || selectedPlaylist === 'Team Hardcore' || selectedPlaylist === 'all';

    let html = '<div class="leaderboard">';
    html += '<div class="leaderboard-header">';
    html += '<div>Rank</div>';
    html += '<div></div>'; // Emblem column - no header text
    html += '<div>Player</div>';
    html += '<div>Record</div>';
    if (showSeries) html += '<div>Series</div>';
    html += '<div>Kills</div>';
    html += '<div>Deaths</div>';
    html += '<div>K/D</div>';
    html += '<div>Assists</div>';
    html += '</div>';

    if (filteredPlayers.length === 0) {
        html += '<div class="leaderboard-row"><div class="no-data-message" style="grid-column: 1/-1; text-align: center; padding: 20px;">No players found for this playlist</div></div>';
    }

    filteredPlayers.forEach((player) => {
        const rankIconUrl = `https://r2-cdn.insignia.live/h2-rank/${player.rank}.png`;
        // Use first profile name for data-player attribute (for game history lookups)
        // If no profile names, use discord name as fallback
        const playerDataAttr = player.profileNames.length > 0 ? player.profileNames[0] : player.displayName;

        // Get player emblem
        const emblemUrl = getPlayerEmblem(playerDataAttr) || getPlayerEmblem(player.discordId);
        const emblemParams = emblemUrl ? parseEmblemParams(emblemUrl) : null;

        // For players with 0 games, show dashes instead of stats
        const hasGames = player.games > 0;
        let recordDisplay, kdDisplay, kdClass;

        if (hasGames) {
            recordDisplay = `${player.wins}-${player.losses} (${player.winrate}%)`;
            kdDisplay = player.kd;
            // Color K/D based on value: green if >= 1.0, red if < 1.0
            kdClass = parseFloat(player.kd) >= 1.0 ? 'kd-positive' : 'kd-negative';
        } else {
            // Show dash for players with no games
            recordDisplay = '<span class="stat-empty">—</span>';
            kdDisplay = '<span class="stat-empty">—</span>';
            kdClass = '';
        }

        html += '<div class="leaderboard-row clickable-player" data-player="' + playerDataAttr + '" data-discord-id="' + player.discordId + '">';
        html += `<div class="lb-rank"><img src="${rankIconUrl}" alt="Rank ${player.rank}" class="rank-icon" /></div>`;
        html += '<div class="lb-emblem">';
        if (emblemParams && typeof generateEmblemDataUrl === 'function') {
            html += `<div class="emblem-placeholder lb-emblem-placeholder" data-emblem-params='${JSON.stringify(emblemParams)}'></div>`;
        } else {
            html += '<div class="lb-emblem-empty"></div>';
        }
        html += '</div>';
        html += `<div class="lb-player">${player.displayName}</div>`;
        html += `<div class="lb-record">${recordDisplay}</div>`;
        // Series wins-losses (only for MLG 4v4 and Team Hardcore)
        if (showSeries) {
            const seriesDisplay = (player.seriesWins > 0 || player.seriesLosses > 0)
                ? `${player.seriesWins}-${player.seriesLosses}`
                : '<span class="stat-empty">—</span>';
            html += `<div class="lb-series">${seriesDisplay}</div>`;
        }
        // Kills and Deaths
        const killsDisplay = hasGames ? player.kills.toLocaleString() : '<span class="stat-empty">—</span>';
        const deathsDisplay = hasGames ? player.deaths.toLocaleString() : '<span class="stat-empty">—</span>';
        html += `<div class="lb-kills">${killsDisplay}</div>`;
        html += `<div class="lb-deaths">${deathsDisplay}</div>`;
        html += `<div class="lb-kd ${kdClass}">${kdDisplay}</div>`;
        // Assists
        const assistsDisplay = hasGames ? player.assists.toLocaleString() : '<span class="stat-empty">—</span>';
        html += `<div class="lb-assists">${assistsDisplay}</div>`;
        html += '</div>';
    });

    html += '</div>';
    leaderboardContainer.innerHTML = html;

    // Load emblems async
    loadLeaderboardEmblems();
}

// Load emblems for leaderboard rows
async function loadLeaderboardEmblems() {
    const placeholders = document.querySelectorAll('.lb-emblem-placeholder[data-emblem-params]');
    for (const placeholder of placeholders) {
        try {
            const params = JSON.parse(placeholder.dataset.emblemParams);
            if (typeof generateEmblemDataUrl === 'function') {
                const dataUrl = await generateEmblemDataUrl(params);
                if (dataUrl) {
                    placeholder.innerHTML = `<img src="${dataUrl}" alt="Emblem" class="lb-emblem-img">`;
                }
            }
        } catch (e) {
            console.error('Error loading leaderboard emblem:', e);
        }
    }
}

// Load emblems for scoreboard rows within a container
async function loadScoreboardEmblems(container) {
    const placeholders = container.querySelectorAll('.sb-emblem-placeholder[data-emblem-params]');
    for (const placeholder of placeholders) {
        try {
            const params = JSON.parse(placeholder.dataset.emblemParams);
            if (typeof generateEmblemDataUrl === 'function') {
                const dataUrl = await generateEmblemDataUrl(params);
                if (dataUrl) {
                    placeholder.innerHTML = `<img src="${dataUrl}" alt="Emblem" class="sb-emblem-img">`;
                }
            }
        } catch (e) {
            console.error('Error loading scoreboard emblem:', e);
        }
    }
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
        const playerMatches = new Map();

        // Search in-game names from gamesData
        gamesData.forEach(game => {
            game.players.forEach(player => {
                if (player.name.toLowerCase().includes(query)) {
                    const discordName = getDisplayNameForProfile(player.name);
                    playerMatches.set(player.name, { profileName: player.name, discordName: discordName });
                }
            });
        });

        // Also search by discord names and in_game_names in rankstatsData
        Object.entries(rankstatsData).forEach(([discordId, data]) => {
            // Skip players without MAC linked
            if (data.mac_linked === false) return;

            const discordName = data.discord_name || '';
            const displayName = data.display_name || discordName || 'No MAC Linked';
            const inGameNamesArr = data.in_game_names || [];

            // Search matches discord_name or any in_game_names entry
            const matchesDiscord = discordName.toLowerCase().includes(query);
            const matchesInGame = inGameNamesArr.some(n => n.toLowerCase().includes(query));
            if (matchesDiscord || matchesInGame) {
                const profileNames = discordIdToProfileNames[discordId] || [];
                if (profileNames.length > 0) {
                    profileNames.forEach(profileName => {
                        if (!playerMatches.has(profileName)) {
                            // Use display_name (server nickname) - NEVER display in-game names
                            playerMatches.set(profileName, { profileName: profileName, discordName: displayName });
                        }
                    });
                }
            }
        });

        playerMatches.forEach(({ profileName, discordName }) => {
            const playerStats = calculatePlayerSearchStats(profileName);
            results.push({
                type: 'player',
                name: profileName,
                displayName: discordName,
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
        html += `<div class="search-result-name">${result.displayName || result.name}</div>`;
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
    html += `<div class="player-header">${getPlayerRankIcon(player1Name, 'normal')}<span class="player-header-name">${getDisplayNameForProfile(player1Name)}</span></div>`;
    html += '<div class="pvp-vs">VS</div>';
    html += `<div class="player-header">${getPlayerRankIcon(player2Name, 'normal')}<span class="player-header-name">${getDisplayNameForProfile(player2Name)}</span></div>`;
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
        
        // Search for players - by both in-game name and discord name
        const playerMatches = new Map(); // Map of profileName -> {profileName, discordName}

        // First, search in-game names from gamesData
        gamesData.forEach(game => {
            game.players.forEach(player => {
                if (player.name.toLowerCase().includes(query)) {
                    const discordName = getDisplayNameForProfile(player.name);
                    playerMatches.set(player.name, { profileName: player.name, discordName: discordName });
                }
            });
        });

        // Also search by discord names and in_game_names in rankstatsData
        Object.entries(rankstatsData).forEach(([discordId, data]) => {
            // Skip players without MAC linked
            if (data.mac_linked === false) return;

            const discordName = data.discord_name || '';
            const displayName = data.display_name || discordName || 'No MAC Linked';
            const inGameNamesArr = data.in_game_names || [];

            // Search matches discord_name or any in_game_names entry
            const matchesDiscord = discordName.toLowerCase().includes(query);
            const matchesInGame = inGameNamesArr.some(n => n.toLowerCase().includes(query));
            if (matchesDiscord || matchesInGame) {
                // Find associated profile names
                const profileNames = discordIdToProfileNames[discordId] || [];
                if (profileNames.length > 0) {
                    // Player has games - use their profile name for lookups
                    profileNames.forEach(profileName => {
                        if (!playerMatches.has(profileName)) {
                            // Use display_name (server nickname) - NEVER display in-game names
                            playerMatches.set(profileName, { profileName: profileName, discordName: displayName });
                        }
                    });
                } else {
                    // Player has no games - use display_name
                    if (!playerMatches.has(displayName)) {
                        playerMatches.set(displayName, { profileName: displayName, discordName: displayName, noGames: true });
                    }
                }
            }
        });

        playerMatches.forEach(({ profileName, discordName, noGames }) => {
            const playerStats = noGames ? { games: 0, wins: 0, kd: '0.00' } : calculatePlayerSearchStats(profileName);
            results.push({
                type: 'player',
                name: profileName,
                displayName: discordName,
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
            
            // Search for game types (use BASE gametype, not variant names)
            const gameTypes = new Set();
            gamesData.forEach(game => {
                const rawType = game.details['Game Type'] || '';
                const baseType = getBaseGametype(rawType, game.playlist, game);
                if (baseType && baseType.toLowerCase().includes(query)) {
                    gameTypes.add(baseType);
                }
            });

            gameTypes.forEach(type => {
                // Count games by base gametype
                const typeGames = gamesData.filter(g => {
                    const rawType = g.details['Game Type'] || '';
                    return getBaseGametype(rawType, g.playlist, g) === type;
                }).length;
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
                // Weapons are stored at game.weapons[] with keys like "Sniper Rifle kills"
                let totalKills = 0;
                gamesData.forEach(game => {
                    if (game.weapons) {
                        game.weapons.forEach(playerWeapons => {
                            Object.keys(playerWeapons).forEach(key => {
                                // Only match exact "{weapon} kills", not headshots/other stats
                                if (key.toLowerCase() === `${weapon.toLowerCase()} kills`) {
                                    totalKills += parseInt(playerWeapons[key]) || 0;
                                }
                            });
                        });
                    }
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
            kills += player.kills || 0;
            deaths += player.deaths || 0;

            // Check if player won (using same logic as calculatePlayerOverallStats)
            const hasTeams = game.players.some(p => isValidTeam(p.team));
            const gameType = game.details['Game Type'] || '';
            const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');

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
            html += `<div class="search-result-name">${formatWeaponName(result.name)}</div>`;
        } else if (result.type === 'player') {
            html += `<div class="search-result-type">${result.type}</div>`;
            html += `<div class="search-result-name">${result.displayName || result.name}</div>`;
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
        searchResultsTitle.innerHTML = `${getPlayerRankIcon(name, 'small')} ${getDisplayNameForProfile(name)}`;
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
        searchResultsTitle.innerHTML = `${iconHtml} ${formatWeaponName(name)}`;
        searchResultsContent.innerHTML = renderWeaponSearchResults(name);
        // Load emblems for weapon leaderboard
        loadBreakdownEmblems();
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

function renderPlayerSearchResults(playerName, includeCustomGames = false) {
    const stats = calculatePlayerStats(playerName, includeCustomGames);
    // Always show all games in the list (ranked + custom)
    const playerGames = gamesData.filter(game => {
        return game.players.some(p => p.name === playerName);
    }).sort((a, b) => {
        // Sort by date, most recent first
        const dateA = new Date(a.details['Start Time'] || a.details['End Time'] || 0);
        const dateB = new Date(b.details['Start Time'] || b.details['End Time'] || 0);
        return dateB - dateA;
    });

    // Store medal breakdown for modal
    window.currentSearchMedalBreakdown = stats.medalBreakdown;
    window.currentSearchContext = playerName;
    window.currentSearchPlayer = playerName;
    window.currentSearchPrecisionBreakdown = stats.precisionBreakdown;
    window.currentSearchBetrayedByBreakdown = stats.betrayedByBreakdown;
    window.currentSearchAccuracyByMap = stats.accuracyByMap;
    window.currentSearchAccuracyByGametype = stats.accuracyByGametype;
    window.currentSearchAccuracyByWeapon = stats.accuracyByWeapon;

    let html = '<div class="search-results-container">';

    // Custom games filter checkbox
    html += '<div class="stats-filter-row">';
    html += `<label class="custom-games-toggle">`;
    html += `<input type="checkbox" id="showCustomGames" ${includeCustomGames ? 'checked' : ''} onchange="toggleCustomGamesFilter()">`;
    html += `<span>Include Custom Games in Stats</span>`;
    html += `</label>`;
    html += '</div>';

    // Player stats summary
    html += '<div class="player-stats-summary">';
    html += '<div class="stats-grid">';
    html += `<div class="stat-card"><div class="stat-label">Games</div><div class="stat-value">${stats.games}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Wins</div><div class="stat-value">${stats.wins}</div><div class="stat-sublabel">${stats.winrate}% Win Rate</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchWeaponKillsBreakdown()"><div class="stat-label">Kills</div><div class="stat-value">${stats.kills}</div><div class="stat-sublabel">${stats.kpg} per game</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchWeaponDeathsBreakdown()"><div class="stat-label">Deaths</div><div class="stat-value">${stats.deaths}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showPlayersFacedBreakdown()"><div class="stat-label">K/D</div><div class="stat-value">${stats.kd}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${stats.assists}</div></div>`;
    html += `<div class="stat-card clickable-stat" onclick="showSearchMedalBreakdown()"><div class="stat-label">Total Medals</div><div class="stat-value">${stats.totalMedals}</div></div>`;
    if (stats.precisionKills > 0) {
        html += `<div class="stat-card clickable-stat" onclick="showSearchPrecisionBreakdown()"><div class="stat-label">Precision HS%</div><div class="stat-value">${stats.headshotPercent}%</div></div>`;
    }
    if (stats.timesBetrayed > 0) {
        html += `<div class="stat-card clickable-stat" onclick="showSearchBetrayedByBreakdown()"><div class="stat-label">Times TK'd</div><div class="stat-value">${stats.timesBetrayed}</div></div>`;
    }
    if (stats.totalShotsFired > 0) {
        html += `<div class="stat-card clickable-stat" onclick="showSearchAccuracyBreakdown()"><div class="stat-label">Avg Hit %</div><div class="stat-value">${stats.hitPercent}%</div></div>`;
    }
    html += '</div>';
    html += '</div>';

    // Recent games header
    html += '<div class="section-header">Recent Games</div>';

    // Games list
    html += '<div class="search-games-list">';
    playerGames.forEach((game, index) => {
        html += renderSearchGameCard(game, gamesData.indexOf(game) + 1, playerName);
    });
    html += '</div>';

    html += '</div>';
    return html;
}

function toggleCustomGamesFilter() {
    const checkbox = document.getElementById('showCustomGames');
    const includeCustomGames = checkbox ? checkbox.checked : false;
    const playerName = window.currentSearchPlayer;

    if (playerName) {
        const searchResultsContent = document.getElementById('searchResultsContent');
        if (searchResultsContent) {
            searchResultsContent.innerHTML = renderPlayerSearchResults(playerName, includeCustomGames);
        }
    }
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
        const gt = getBaseGametype(game.details['Game Type'], game.playlist, game);
        gametypeCounts[gt] = (gametypeCounts[gt] || 0) + 1;

        // Count all medals in this game (only Halo 2 medals)
        if (game.medals) {
            game.medals.forEach(playerMedals => {
                Object.entries(playerMedals).forEach(([medal, count]) => {
                    if (medal !== 'player' && medalIcons[medal]) {
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
    html += '</div>';
    html += '</div>';
    
    // Games header
    html += '<div class="section-header">All Games on ' + mapName + '</div>';
    
    // Games list
    html += '<div class="search-games-list">';
    mapGames.forEach((game, index) => {
        html += renderSearchGameCard(game, gamesData.indexOf(game) + 1);
    });
    html += '</div>';
    
    html += '</div>';
    return html;
}

function renderGametypeSearchResults(gametypeName) {
    // Filter by base gametype, not variant name
    const gametypeGames = gamesData.filter(game => {
        const rawType = game.details['Game Type'] || '';
        return getBaseGametype(rawType, game.playlist, game) === gametypeName;
    });

    // Calculate gametype stats including medals and player kills
    let totalGames = gametypeGames.length;
    let mapCounts = {};
    let totalMedals = 0;
    let medalBreakdown = {};
    let playerStats = {};

    gametypeGames.forEach(game => {
        const map = game.details['Map Name'] || 'Unknown';
        mapCounts[map] = (mapCounts[map] || 0) + 1;

        // Count all medals in this game (only Halo 2 medals)
        if (game.medals) {
            game.medals.forEach(playerMedals => {
                Object.entries(playerMedals).forEach(([medal, count]) => {
                    if (medal !== 'player' && medalIcons[medal]) {
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
        html += renderSearchGameCard(game, gamesData.indexOf(game) + 1);
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
            const gametype = getBaseGametype(game.details['Game Type'], game.playlist, game);

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
        html += renderSearchGameCard(game, gamesData.indexOf(game) + 1);
    });
    html += '</div>';

    html += '</div>';
    return html;
}

function renderWeaponSearchResults(weaponName) {
    // Find all games where this weapon was used
    const weaponGames = [];
    let playerKillStats = {};
    let playerDeathStats = {};
    let playerAccuracyStats = {};  // { playerName: { hit: 0, fired: 0 } }
    let playerHeadshotStats = {}; // { playerName: { headshots: 0, kills: 0 } }
    let mapWeaponKills = {};
    let gametypeWeaponKills = {};
    let totalKills = 0;
    let totalDeaths = 0;

    // Check if this is a precision weapon (has headshots)
    const precisionWeapons = ['battle rifle', 'sniper rifle', 'carbine', 'covenant carbine', 'beam rifle'];
    const isPrecisionWeapon = precisionWeapons.some(w => weaponName.toLowerCase().includes(w));

    const isMeleeSearch = weaponName.toLowerCase() === 'melee';

    if (isMeleeSearch) {
        // Special handling for melee - calculate from medals
        const meleeWeapons = ['energy sword', 'flag', 'bomb', 'oddball'];

        gamesData.forEach(game => {
            let gameMeleeKills = 0;
            const mapName = game.details['Map Name'] || 'Unknown';
            const gametype = getBaseGametype(game.details['Game Type'], game.playlist, game);

            // For each player in the game
            game.players?.forEach(player => {
                const playerName = player.name;

                // Get melee medals
                const medalData = game.medals?.find(m => m.player === playerName);
                const meleeMedals = medalData ? (medalData.bone_cracker || 0) + (medalData.assassin || 0) : 0;

                // Get melee weapon kills to subtract
                const weaponData = game.weapons?.find(w => w.Player === playerName);
                let meleeWeaponKills = 0;
                if (weaponData) {
                    Object.keys(weaponData).forEach(key => {
                        const keyLower = key.toLowerCase();
                        if (keyLower.includes('kills') && !keyLower.includes('headshot')) {
                            const wName = key.replace(/ kills/gi, '').trim().toLowerCase();
                            if (meleeWeapons.includes(wName)) {
                                meleeWeaponKills += parseInt(weaponData[key]) || 0;
                            }
                        }
                    });
                }

                const beatdownKills = Math.max(0, meleeMedals - meleeWeaponKills);
                if (beatdownKills > 0) {
                    playerKillStats[playerName] = (playerKillStats[playerName] || 0) + beatdownKills;
                    totalKills += beatdownKills;
                    gameMeleeKills += beatdownKills;
                }
            });

            if (gameMeleeKills > 0) {
                weaponGames.push({ game, kills: gameMeleeKills });
                mapWeaponKills[mapName] = (mapWeaponKills[mapName] || 0) + gameMeleeKills;
                gametypeWeaponKills[gametype] = (gametypeWeaponKills[gametype] || 0) + gameMeleeKills;
            }
        });
        // Note: Deaths from melee not tracked separately in data
    } else {
        // Regular weapon search
        gamesData.forEach(game => {
            let gameWeaponKills = 0;
            const mapName = game.details['Map Name'] || 'Unknown';
            const gametype = getBaseGametype(game.details['Game Type'], game.playlist, game);

            if (game.weapons) {
                game.weapons.forEach(playerWeapons => {
                    const playerName = playerWeapons.Player;
                    let playerHit = 0, playerFired = 0;
                    let playerHeadshots = 0, playerWeaponKills = 0;

                    Object.keys(playerWeapons).forEach(key => {
                        const keyLower = key.toLowerCase();
                        if (keyLower.includes(weaponName.toLowerCase())) {
                            if (keyLower.includes('kills') && !keyLower.includes('headshot')) {
                                const kills = parseInt(playerWeapons[key]) || 0;
                                gameWeaponKills += kills;
                                totalKills += kills;
                                playerWeaponKills += kills;

                                if (playerName && kills > 0) {
                                    playerKillStats[playerName] = (playerKillStats[playerName] || 0) + kills;
                                }
                            } else if (keyLower.includes('deaths')) {
                                const deaths = parseInt(playerWeapons[key]) || 0;
                                totalDeaths += deaths;

                                if (playerName && deaths > 0) {
                                    playerDeathStats[playerName] = (playerDeathStats[playerName] || 0) + deaths;
                                }
                            } else if (keyLower.includes('hit')) {
                                playerHit += parseInt(playerWeapons[key]) || 0;
                            } else if (keyLower.includes('fired')) {
                                playerFired += parseInt(playerWeapons[key]) || 0;
                            } else if (keyLower.includes('headshot')) {
                                playerHeadshots += parseInt(playerWeapons[key]) || 0;
                            }
                        }
                    });

                    // Track accuracy for this player (only if they fired shots)
                    if (playerName && playerFired > 0) {
                        if (!playerAccuracyStats[playerName]) {
                            playerAccuracyStats[playerName] = { hit: 0, fired: 0 };
                        }
                        playerAccuracyStats[playerName].hit += playerHit;
                        playerAccuracyStats[playerName].fired += playerFired;
                    }

                    // Track headshots for precision weapons
                    if (isPrecisionWeapon && playerName && playerWeaponKills > 0) {
                        if (!playerHeadshotStats[playerName]) {
                            playerHeadshotStats[playerName] = { headshots: 0, kills: 0 };
                        }
                        playerHeadshotStats[playerName].headshots += playerHeadshots;
                        playerHeadshotStats[playerName].kills += playerWeaponKills;
                    }
                });
            }

            if (gameWeaponKills > 0) {
                weaponGames.push({ game, kills: gameWeaponKills });
                mapWeaponKills[mapName] = (mapWeaponKills[mapName] || 0) + gameWeaponKills;
                gametypeWeaponKills[gametype] = (gametypeWeaponKills[gametype] || 0) + gameWeaponKills;
            }
        });
    }

    // Sort leaderboards
    const topKillers = Object.entries(playerKillStats).sort((a, b) => b[1] - a[1]);
    const topVictims = Object.entries(playerDeathStats).sort((a, b) => b[1] - a[1]);
    const topAccuracy = Object.entries(playerAccuracyStats)
        .map(([name, data]) => [name, data.fired > 0 ? (data.hit / data.fired * 100) : 0, data])
        .sort((a, b) => b[1] - a[1]);
    const topHeadshots = Object.entries(playerHeadshotStats)
        .map(([name, data]) => [name, data.kills > 0 ? (data.headshots / data.kills * 100) : 0, data])
        .sort((a, b) => b[1] - a[1]);

    window.currentSearchContext = formatWeaponName(weaponName);

    const weaponIcon = weaponIcons[weaponName.toLowerCase()];

    let html = '<div class="search-results-container">';

    // Weapon info header
    html += '<div class="weapon-info-header">';
    if (weaponIcon) {
        html += `<div class="weapon-large-image"><img src="${weaponIcon}" alt="${weaponName}"></div>`;
    }
    html += '<div class="weapon-stats">';
    html += `<div class="stat-card"><div class="stat-label">Total Kills</div><div class="stat-value">${totalKills}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Total Deaths</div><div class="stat-value">${totalDeaths}</div></div>`;
    html += `<div class="stat-card"><div class="stat-label">Games</div><div class="stat-value">${weaponGames.length}</div></div>`;
    html += '</div>';
    html += '</div>';

    // Tabbed leaderboard
    html += '<div class="weapon-leaderboard-tabs">';
    html += '<div class="accuracy-tabs">';
    html += '<button class="accuracy-tab-btn active" onclick="switchWeaponLeaderboardTab(\'kills\')">Kills With</button>';
    html += '<button class="accuracy-tab-btn" onclick="switchWeaponLeaderboardTab(\'deaths\')">Killed By</button>';
    if (!isMeleeSearch) {
        html += '<button class="accuracy-tab-btn" onclick="switchWeaponLeaderboardTab(\'accuracy\')">Accuracy</button>';
    }
    if (isPrecisionWeapon) {
        html += '<button class="accuracy-tab-btn" onclick="switchWeaponLeaderboardTab(\'headshots\')">Headshot %</button>';
    }
    html += '</div>';

    // Helper function to render player item
    const renderPlayerItem = (name, statValue, statLabel, index) => {
        const displayName = getDisplayNameForProfile(name);
        const discordId = profileNameToDiscordId[name];
        const playerInfo = discordId ? playersData.players?.find(p => p.discord_id === discordId) : null;
        const emblemUrl = playerInfo?.emblem_url || getPlayerEmblemUrl(name);
        const emblemParams = emblemUrl ? parseEmblemParams(emblemUrl) : null;
        const rank = getRankForPlayer(name);

        let itemHtml = `<div class="breakdown-item" onclick="openPlayerProfile('${name.replace(/'/g, "\\'")}')">`;
        itemHtml += `<span class="breakdown-rank">#${index + 1}</span>`;
        if (emblemParams) {
            itemHtml += `<div class="emblem-placeholder breakdown-emblem" data-emblem-params='${JSON.stringify(emblemParams)}'></div>`;
        }
        itemHtml += `<span class="breakdown-name">${displayName}</span>`;
        if (rank) {
            itemHtml += `<img src="assets/ranks/${rank}.png" alt="Rank ${rank}" class="breakdown-rank-icon">`;
        }
        itemHtml += `<span class="breakdown-count">${statValue}${statLabel ? ' ' + statLabel : ''}</span>`;
        itemHtml += '</div>';
        return itemHtml;
    };

    // Kills tab
    html += '<div id="weapon-tab-kills" class="weapon-tab-content active">';
    html += '<div class="breakdown-list">';
    if (topKillers.length === 0) {
        html += '<div class="no-data">No kills recorded</div>';
    }
    topKillers.slice(0, 15).forEach(([name, kills], index) => {
        html += renderPlayerItem(name, kills, 'kills', index);
    });
    html += '</div></div>';

    // Deaths tab
    html += '<div id="weapon-tab-deaths" class="weapon-tab-content" style="display:none;">';
    html += '<div class="breakdown-list">';
    if (topVictims.length === 0) {
        html += '<div class="no-data">No deaths recorded</div>';
    }
    topVictims.slice(0, 15).forEach(([name, deaths], index) => {
        html += renderPlayerItem(name, deaths, 'deaths', index);
    });
    html += '</div></div>';

    // Accuracy tab
    if (!isMeleeSearch) {
        html += '<div id="weapon-tab-accuracy" class="weapon-tab-content" style="display:none;">';
        html += '<div class="breakdown-list">';
        if (topAccuracy.length === 0) {
            html += '<div class="no-data">No accuracy data recorded</div>';
        }
        topAccuracy.slice(0, 15).forEach(([name, acc, data], index) => {
            html += renderPlayerItem(name, `${acc.toFixed(1)}%`, `(${data.hit}/${data.fired})`, index);
        });
        html += '</div></div>';
    }

    // Headshots tab (precision weapons only)
    if (isPrecisionWeapon) {
        html += '<div id="weapon-tab-headshots" class="weapon-tab-content" style="display:none;">';
        html += '<div class="breakdown-list">';
        if (topHeadshots.length === 0) {
            html += '<div class="no-data">No headshot data recorded</div>';
        }
        topHeadshots.slice(0, 15).forEach(([name, hsPercent, data], index) => {
            html += renderPlayerItem(name, `${hsPercent.toFixed(1)}%`, `(${data.headshots}/${data.kills})`, index);
        });
        html += '</div></div>';
    }

    html += '</div>'; // End weapon-leaderboard-tabs

    // Breakdowns container for Map and Gametype
    html += '<div class="breakdowns-container">';

    // By Map
    html += '<div class="breakdown-section">';
    html += '<div class="section-header">By Map</div>';
    html += '<div class="breakdown-list">';
    Object.entries(mapWeaponKills).sort((a, b) => b[1] - a[1]).forEach(([map, kills], index) => {
        const mapImg = mapImages[map] || defaultMapImage;
        const pct = totalKills > 0 ? ((kills / totalKills) * 100).toFixed(1) : '0';
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
        const pct = totalKills > 0 ? ((kills / totalKills) * 100).toFixed(1) : '0';
        html += `<div class="breakdown-item" onclick="openSearchResultsPage('gametype', '${gt.replace(/'/g, "\\'")}')">`;
        html += `<span class="breakdown-rank">#${index + 1}</span>`;
        html += `<span class="breakdown-name">${gt}</span>`;
        html += `<span class="breakdown-count">${kills} (${pct}%)</span>`;
        html += '</div>';
    });
    html += '</div></div>';

    html += '</div>'; // End breakdowns-container

    // Games header
    html += `<div class="section-header">Games with ${formatWeaponName(weaponName)} Kills (${weaponGames.length})</div>`;

    // Games list
    html += '<div class="search-games-list">';
    weaponGames.forEach(({ game, kills }) => {
        html += renderSearchGameCard(game, gamesData.indexOf(game) + 1);
    });
    html += '</div>';

    html += '</div>';
    return html;
}

// Switch weapon leaderboard tabs
window.switchWeaponLeaderboardTab = function(tabName) {
    // Update tab buttons
    document.querySelectorAll('.weapon-leaderboard-tabs .accuracy-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.weapon-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    const targetTab = document.getElementById(`weapon-tab-${tabName}`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    // Load emblems for the newly visible tab
    loadBreakdownEmblems();
};

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
    const rawGameType = details['Game Type'] || 'Unknown';
    const displayGameType = getBaseGametype(rawGameType, game.playlist, game);
    const startTime = details['Start Time'] || '';

    // Calculate team scores
    let teamScoreHtml = '';
    const teams = {};
    const isOddball = displayGameType.toLowerCase().includes('oddball') || displayGameType.toLowerCase().includes('ball');

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
    html += '<div class="game-info">';
    html += `<span class="game-type-title" title="Game ${gameNumber}">${displayGameType}</span>`;
    html += `<span class="game-meta-tag">${mapName}</span>`;
    html += teamScoreHtml;
    html += '</div>';
    html += '</div>';
    html += '<div class="game-header-right">';
    html += `<span class="game-meta-tag playlist-tag${!game.playlist ? ' custom-game' : ''}">${game.playlist || 'Custom Games'}</span>`;
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
        // Find the game data (gameNumber is 1-indexed, oldest = 1)
        const game = gamesData[gameNumber - 1];
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

function calculatePlayerStats(playerName, includeCustomGames = false) {
    const stats = {
        games: 0,
        rankedGames: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        bestSpree: 0,
        totalDamage: 0,
        accuracy: 0,
        accuracyCount: 0,
        totalMedals: 0,
        medalBreakdown: {},
        precisionHeadshots: 0,
        precisionKills: 0,
        precisionBreakdown: {},
        timesBetrayed: 0,
        betrayedByBreakdown: {},
        totalShotsHit: 0,
        totalShotsFired: 0,
        accuracyByMap: {},
        accuracyByGametype: {},
        accuracyByWeapon: {}
    };

    gamesData.forEach(game => {
        const isRankedGame = game.playlist && game.playlist.trim() !== '' && !game.isCustomGame;

        // Skip custom games for game count unless includeCustomGames is true
        if (!includeCustomGames && !isRankedGame) {
            return;
        }

        const player = game.players.find(p => p.name === playerName);
        if (player) {
            stats.games++;

            // Always count stats from all visible games
            stats.kills += player.kills || 0;
            stats.deaths += player.deaths || 0;
            stats.assists += player.assists || 0;

            if (player.accuracy) {
                stats.accuracy += player.accuracy;
                stats.accuracyCount++;
            }

            // Count medals from all visible games
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

            // Count precision weapon stats (BR, Sniper, Carbine)
            if (game.weapons) {
                const playerWeapons = game.weapons.find(w => w.player === playerName);
                if (playerWeapons) {
                    const precisionWeapons = ['battle rifle', 'sniper rifle', 'carbine', 'covenant carbine'];
                    Object.entries(playerWeapons).forEach(([key, value]) => {
                        const keyLower = key.toLowerCase();
                        for (const weapon of precisionWeapons) {
                            if (keyLower.startsWith(weapon)) {
                                if (keyLower.includes('headshots')) {
                                    const hs = parseInt(value) || 0;
                                    stats.precisionHeadshots += hs;
                                    if (!stats.precisionBreakdown[weapon]) {
                                        stats.precisionBreakdown[weapon] = { headshots: 0, kills: 0 };
                                    }
                                    stats.precisionBreakdown[weapon].headshots += hs;
                                } else if (keyLower.includes('kills') && !keyLower.includes('headshots')) {
                                    const kills = parseInt(value) || 0;
                                    stats.precisionKills += kills;
                                    if (!stats.precisionBreakdown[weapon]) {
                                        stats.precisionBreakdown[weapon] = { headshots: 0, kills: 0 };
                                    }
                                    stats.precisionBreakdown[weapon].kills += kills;
                                }
                                break;
                            }
                        }
                    });
                }
            }

            // Count times betrayed (team killed)
            if (game.kills) {
                const playerData = player;
                game.kills.forEach(kill => {
                    if (kill.victim === playerName && kill.killer !== playerName) {
                        // Check if killer was on same team
                        const killer = game.players.find(p => p.name === kill.killer);
                        if (killer && playerData.team && killer.team === playerData.team) {
                            stats.timesBetrayed++;
                            stats.betrayedByBreakdown[kill.killer] = (stats.betrayedByBreakdown[kill.killer] || 0) + 1;
                        }
                    }
                });
            }

            // Track accuracy stats by map, gametype, and weapon
            if (game.weapons) {
                const playerWeapons = game.weapons.find(w => w.Player === playerName);
                if (playerWeapons) {
                    const mapName = game.details['Map Name'] || 'Unknown';
                    const rawGametype = game.details['Game Type'] || '';
                    const baseGametype = getBaseGametype(rawGametype, game.playlist, game);

                    let gameShotsHit = 0;
                    let gameShotsFired = 0;

                    // Iterate through weapon columns
                    Object.entries(playerWeapons).forEach(([key, value]) => {
                        if (key === 'Player') return;
                        const keyLower = key.toLowerCase();
                        const val = parseInt(value) || 0;

                        if (keyLower.includes('hit') && !keyLower.includes('headshot')) {
                            gameShotsHit += val;
                            stats.totalShotsHit += val;

                            // Extract weapon name for per-weapon tracking
                            const weaponName = key.replace(/ hit$/i, '').trim();
                            if (!stats.accuracyByWeapon[weaponName]) {
                                stats.accuracyByWeapon[weaponName] = { hit: 0, fired: 0 };
                            }
                            stats.accuracyByWeapon[weaponName].hit += val;
                        } else if (keyLower.includes('fired')) {
                            gameShotsFired += val;
                            stats.totalShotsFired += val;

                            // Extract weapon name for per-weapon tracking
                            const weaponName = key.replace(/ fired$/i, '').trim();
                            if (!stats.accuracyByWeapon[weaponName]) {
                                stats.accuracyByWeapon[weaponName] = { hit: 0, fired: 0 };
                            }
                            stats.accuracyByWeapon[weaponName].fired += val;
                        }
                    });

                    // Track by map
                    if (!stats.accuracyByMap[mapName]) {
                        stats.accuracyByMap[mapName] = { hit: 0, fired: 0 };
                    }
                    stats.accuracyByMap[mapName].hit += gameShotsHit;
                    stats.accuracyByMap[mapName].fired += gameShotsFired;

                    // Track by gametype
                    if (!stats.accuracyByGametype[baseGametype]) {
                        stats.accuracyByGametype[baseGametype] = { hit: 0, fired: 0 };
                    }
                    stats.accuracyByGametype[baseGametype].hit += gameShotsHit;
                    stats.accuracyByGametype[baseGametype].fired += gameShotsFired;
                }
            }

            // Only count wins/losses from ranked games - NEVER from custom games
            if (isRankedGame) {
                stats.rankedGames++;

                const hasTeams = game.players.some(p => isValidTeam(p.team));
                const gameType = game.details['Game Type'] || '';
                const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');

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
                    if (sortedTeams[0] && sortedTeams[0][0] === player.team) stats.wins++;
                } else {
                    // FFA - check if 1st place
                    if (player.place === '1st' || player.place === 1) stats.wins++;
                }
            }
        }

        const gameStat = game.stats ? game.stats.find(s => s.Player === playerName) : null;
        if (gameStat && gameStat.best_spree > stats.bestSpree) {
            stats.bestSpree = gameStat.best_spree;
        }
    });

    stats.kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
    stats.winrate = stats.rankedGames > 0 ? ((stats.wins / stats.rankedGames) * 100).toFixed(1) : '0.0';
    stats.avgAccuracy = stats.accuracyCount > 0 ? (stats.accuracy / stats.accuracyCount).toFixed(1) : '0.0';
    stats.kpg = stats.games > 0 ? (stats.kills / stats.games).toFixed(1) : '0.0';
    stats.headshotPercent = stats.precisionKills > 0 ? ((stats.precisionHeadshots / stats.precisionKills) * 100).toFixed(1) : '0.0';
    stats.hitPercent = stats.totalShotsFired > 0 ? ((stats.totalShotsHit / stats.totalShotsFired) * 100).toFixed(1) : '0.0';

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
    let sameteamGames = 0;
    let opposingGames = 0;

    gamesData.forEach(game => {
        const p1 = game.players.find(p => p.name === player1);
        const p2 = game.players.find(p => p.name === player2);

        if (p1 && p2) {
            gamesPlayed++;
            player1Kills += p1.kills || 0;
            player2Kills += p2.kills || 0;

            // Check if on different teams
            const onSameTeam = isValidTeam(p1.team) && isValidTeam(p2.team) && p1.team === p2.team;
            const onDifferentTeams = isValidTeam(p1.team) && isValidTeam(p2.team) && p1.team !== p2.team;

            if (onSameTeam) {
                sameteamGames++;
            } else if (onDifferentTeams) {
                opposingGames++;
                // Determine winner by team score
                const gameType = game.details['Game Type'] || '';
                const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');
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
                if (sortedTeams[0]) {
                    const winningTeam = sortedTeams[0][0];
                    if (p1.team === winningTeam && sortedTeams[0][1] > sortedTeams[1][1]) player1Wins++;
                    else if (p2.team === winningTeam && sortedTeams[0][1] > sortedTeams[1][1]) player2Wins++;
                }
            }
        }
    });

    return {
        gamesPlayed,
        player1Wins,
        player2Wins,
        player1Kills,
        player2Kills,
        sameteamGames,
        opposingGames
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

function formatWeaponName(name) {
    // Handle special cases
    const specialCases = {
        'smg': 'SMG',
        'br': 'BR',
        'brute plasma rifle': 'Brute Plasma Rifle',
        'plasma pistol': 'Plasma Pistol',
        'plasma rifle': 'Plasma Rifle',
        'battle rifle': 'Battle Rifle',
        'sniper rifle': 'Sniper Rifle',
        'beam rifle': 'Beam Rifle',
        'rocket launcher': 'Rocket Launcher',
        'fuel rod': 'Fuel Rod',
        'brute shot': 'Brute Shot',
        'energy sword': 'Energy Sword',
        'frag grenade': 'Frag Grenade',
        'plasma grenade': 'Plasma Grenade',
        'sentinal beam': 'Sentinel Beam',
        'sentinel beam': 'Sentinel Beam',
        'melee': 'Melee Kill',
        'beatdown': 'Melee Kill'
    };

    const lower = name.toLowerCase();
    if (specialCases[lower]) {
        return specialCases[lower];
    }

    // Default: capitalize each word
    return name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
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
    
    // Helper function to check if game is ranked (not custom)
    const isRankedGame = (game) => game.playlist && game.playlist.trim() !== '' && !game.isCustomGame;

    // Helper function to determine if player won
    const didPlayerWin = (game, player) => {
        const hasTeams = game.players.some(p => isValidTeam(p.team));
        const gameType = game.details['Game Type'] || '';
        const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');

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
            // FFA - check if 1st place
            return player.place === '1st' || player.place === 1;
        }
    };

    if (filterType === 'wins') {
        filteredGames = currentProfileGames.filter(game => {
            if (!isRankedGame(game)) return false;
            return didPlayerWin(game, game.playerData);
        });

        // Highlight wins card
        event.target.closest('.profile-stat-card').classList.add('stat-active');
    } else if (filterType === 'losses') {
        filteredGames = currentProfileGames.filter(game => {
            if (!isRankedGame(game)) return false;
            return !didPlayerWin(game, game.playerData);
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
                const keyLower = key.toLowerCase();
                // Exclude Player, headshots, and grenades
                if (key !== 'Player' && keyLower.includes('kills') &&
                    !keyLower.includes('headshot') && !keyLower.includes('grenade')) {
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
        html += `<div class="weapon-breakdown-name">${formatWeaponName(weapon)}</div>`;
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
    // Only count medals that are in the official Halo 2 medalIcons list
    const medalStats = {};

    currentProfileGames.forEach(game => {
        if (game.medals) {
            const playerMedals = game.medals.find(m => m.player === currentProfilePlayer);
            if (playerMedals) {
                Object.entries(playerMedals).forEach(([medal, count]) => {
                    if (medal !== 'player' && medalIcons[medal]) {
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

// Show precision headshot breakdown for search context
function showSearchPrecisionBreakdown() {
    const breakdown = window.currentSearchPrecisionBreakdown || {};
    const context = window.currentSearchContext || 'Unknown';

    const weaponIcons = {
        'battle rifle': '/assets/medals/weapons/battle_rifle.webp',
        'sniper rifle': '/assets/medals/weapons/sniper_rifle.webp',
        'carbine': '/assets/medals/weapons/carbine.webp',
        'covenant carbine': '/assets/medals/weapons/carbine.webp'
    };

    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${context} - Precision HS%</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    const weapons = Object.entries(breakdown);
    if (weapons.length === 0) {
        html += '<div class="no-data">No precision weapon data available</div>';
    }

    weapons.forEach(([weapon, data]) => {
        const iconUrl = weaponIcons[weapon] || '';
        const hsPercent = data.kills > 0 ? ((data.headshots / data.kills) * 100).toFixed(1) : '0.0';
        const displayName = weapon.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${displayName}</div>`;
        html += `<div class="weapon-breakdown-stats">${data.headshots} HS / ${data.kills} Kills = ${hsPercent}%</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

// Show betrayed by breakdown for search context
function showSearchBetrayedByBreakdown() {
    const breakdown = window.currentSearchBetrayedByBreakdown || {};
    const context = window.currentSearchContext || 'Unknown';

    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${context} - Times Team Killed By</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    const betrayers = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    if (betrayers.length === 0) {
        html += '<div class="no-data">No team kill data available</div>';
    }

    betrayers.forEach(([killer, count]) => {
        const emblemUrl = getEmblemFromProfileName(killer);

        html += `<div class="weapon-breakdown-item">`;
        if (emblemUrl) {
            html += `<img src="${emblemUrl}" alt="${killer}" class="weapon-breakdown-icon player-emblem-small">`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${getDisplayNameForProfile(killer)}</div>`;
        html += `<div class="weapon-breakdown-stats">${count} time${count !== 1 ? 's' : ''}</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

// Show accuracy breakdown with tabs for map/gametype/weapon
function showSearchAccuracyBreakdown() {
    const context = window.currentSearchContext || 'Unknown';
    const byMap = window.currentSearchAccuracyByMap || {};
    const byGametype = window.currentSearchAccuracyByGametype || {};
    const byWeapon = window.currentSearchAccuracyByWeapon || {};

    // Gametype icons (using existing assets)
    const gametypeIcons = {
        'Capture the Flag': '/assets/medals/MedalFlagScore.png',
        'Oddball': '/assets/medals/OddballScoreMedal.png',
        'Team Slayer': '/assets/emblems/bullseye.png',
        'Slayer': '/assets/emblems/bullseye.png',
        'King of the Hill': '/assets/medals/MedalKingSpree.png',
        'Assault': '/assets/medals/weapons/AssaultBomb.png',
        'Bomb': '/assets/medals/weapons/AssaultBomb.png',
        'Territories': '/assets/medals/MedalControlSpree.png',
        'Free For All': '/assets/emblems/bullseye.png'
    };

    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal accuracy-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${context} - Hit % Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;

    // Tabs
    html += '<div class="accuracy-tabs">';
    html += '<button class="accuracy-tab-btn active" onclick="switchAccuracyTab(\'map\')">By Map</button>';
    html += '<button class="accuracy-tab-btn" onclick="switchAccuracyTab(\'gametype\')">By Gametype</button>';
    html += '<button class="accuracy-tab-btn" onclick="switchAccuracyTab(\'weapon\')">By Weapon</button>';
    html += '</div>';

    // Map tab content
    html += '<div id="accuracy-tab-map" class="accuracy-tab-content active">';
    html += '<div class="weapon-breakdown-grid">';
    const mapEntries = Object.entries(byMap).sort((a, b) => {
        const accA = a[1].fired > 0 ? (a[1].hit / a[1].fired) : 0;
        const accB = b[1].fired > 0 ? (b[1].hit / b[1].fired) : 0;
        return accB - accA;
    });
    if (mapEntries.length === 0) {
        html += '<div class="no-data">No map accuracy data available</div>';
    }
    mapEntries.forEach(([mapName, data]) => {
        const acc = data.fired > 0 ? ((data.hit / data.fired) * 100).toFixed(1) : '0.0';
        const mapImg = mapImages[mapName] || defaultMapImage;
        html += `<div class="weapon-breakdown-item">`;
        html += `<img src="${mapImg}" alt="${mapName}" class="weapon-breakdown-icon map-icon">`;
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${mapName}</div>`;
        html += `<div class="weapon-breakdown-stats">${acc}% (${data.hit}/${data.fired})</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div></div>';

    // Gametype tab content
    html += '<div id="accuracy-tab-gametype" class="accuracy-tab-content" style="display:none;">';
    html += '<div class="weapon-breakdown-grid">';
    const gametypeEntries = Object.entries(byGametype).sort((a, b) => {
        const accA = a[1].fired > 0 ? (a[1].hit / a[1].fired) : 0;
        const accB = b[1].fired > 0 ? (b[1].hit / b[1].fired) : 0;
        return accB - accA;
    });
    if (gametypeEntries.length === 0) {
        html += '<div class="no-data">No gametype accuracy data available</div>';
    }
    gametypeEntries.forEach(([gametype, data]) => {
        const acc = data.fired > 0 ? ((data.hit / data.fired) * 100).toFixed(1) : '0.0';
        const gtIcon = gametypeIcons[gametype] || '/assets/emblems/bullseye.png';
        html += `<div class="weapon-breakdown-item">`;
        html += `<img src="${gtIcon}" alt="${gametype}" class="weapon-breakdown-icon gametype-icon">`;
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${gametype}</div>`;
        html += `<div class="weapon-breakdown-stats">${acc}% (${data.hit}/${data.fired})</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div></div>';

    // Weapon tab content
    html += '<div id="accuracy-tab-weapon" class="accuracy-tab-content" style="display:none;">';
    html += '<div class="weapon-breakdown-grid">';
    const weaponEntries = Object.entries(byWeapon).sort((a, b) => {
        const accA = a[1].fired > 0 ? (a[1].hit / a[1].fired) : 0;
        const accB = b[1].fired > 0 ? (b[1].hit / b[1].fired) : 0;
        return accB - accA;
    });
    if (weaponEntries.length === 0) {
        html += '<div class="no-data">No weapon accuracy data available</div>';
    }
    weaponEntries.forEach(([weapon, data]) => {
        const acc = data.fired > 0 ? ((data.hit / data.fired) * 100).toFixed(1) : '0.0';
        // Strip " Shots" suffix for icon lookup and display
        const baseWeaponName = weapon.replace(/ shots$/i, '').trim();
        const weaponIcon = getWeaponIcon(baseWeaponName);
        html += `<div class="weapon-breakdown-item">`;
        if (weaponIcon) {
            html += `<img src="${weaponIcon}" alt="${baseWeaponName}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${baseWeaponName.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatWeaponName(baseWeaponName)}</div>`;
        html += `<div class="weapon-breakdown-stats">${acc}% (${data.hit}/${data.fired})</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div></div>';

    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

// Switch accuracy breakdown tabs
window.switchAccuracyTab = function(tabName) {
    // Update tab buttons
    document.querySelectorAll('.accuracy-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.accuracy-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`accuracy-tab-${tabName}`).style.display = 'block';
};

// Show precision headshot breakdown by weapon
function showPrecisionHeadshotBreakdown() {
    if (!currentProfilePlayer) return;

    const precisionWeapons = ['battle rifle', 'sniper rifle', 'carbine', 'covenant carbine'];
    const weaponStats = {};

    currentProfileGames.forEach(game => {
        if (game.weapons) {
            const playerWeapons = game.weapons.find(w => w.Player === currentProfilePlayer);
            if (playerWeapons) {
                Object.entries(playerWeapons).forEach(([key, value]) => {
                    const keyLower = key.toLowerCase();
                    for (const weapon of precisionWeapons) {
                        if (keyLower.startsWith(weapon)) {
                            if (!weaponStats[weapon]) {
                                weaponStats[weapon] = { kills: 0, headshots: 0 };
                            }
                            if (keyLower.includes('headshot')) {
                                weaponStats[weapon].headshots += parseInt(value) || 0;
                            } else if (keyLower.endsWith('kills')) {
                                weaponStats[weapon].kills += parseInt(value) || 0;
                            }
                        }
                    }
                });
            }
        }
    });

    // Sort by most kills
    const sortedWeapons = Object.entries(weaponStats)
        .filter(([_, stats]) => stats.kills > 0)
        .sort((a, b) => b[1].kills - a[1].kills);

    let html = '<div class="weapon-breakdown-overlay" onclick="closePrecisionBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${currentProfilePlayer} - Precision Headshot %</h2>`;
    html += `<button class="modal-close" onclick="closePrecisionBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (sortedWeapons.length === 0) {
        html += '<div class="no-data">No precision weapon data available</div>';
    }

    sortedWeapons.forEach(([weapon, stats]) => {
        const percent = stats.kills > 0 ? ((stats.headshots / stats.kills) * 100).toFixed(1) : 0;
        const iconUrl = weaponIcons[weapon] || weaponIcons[weapon.replace('covenant ', '')];
        const displayName = weapon.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${displayName.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${displayName}</div>`;
        html += `<div class="weapon-breakdown-stats">${stats.headshots}/${stats.kills} kills (${percent}% HS)</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';
    html += '</div>';

    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

function closePrecisionBreakdown() {
    const overlay = document.querySelector('.weapon-breakdown-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Show who team killed the player
function showBetrayedByBreakdown() {
    if (!currentProfilePlayer) return;

    const betrayedBy = {};

    currentProfileGames.forEach(game => {
        const player = game.players.find(p => p.name === currentProfilePlayer);
        if (!player || !player.team || player.team === 'none') return;

        if (game.kills) {
            game.kills.forEach(kill => {
                if (kill.victim === currentProfilePlayer && kill.killer !== currentProfilePlayer) {
                    const killer = game.players.find(p => p.name === kill.killer);
                    if (killer && killer.team === player.team) {
                        betrayedBy[kill.killer] = (betrayedBy[kill.killer] || 0) + 1;
                    }
                }
            });
        }
    });

    // Sort by most betrayals
    const sortedBetrayers = Object.entries(betrayedBy).sort((a, b) => b[1] - a[1]);

    let html = '<div class="weapon-breakdown-overlay" onclick="closeBetrayedBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${currentProfilePlayer} - Team Killed By</h2>`;
    html += `<button class="modal-close" onclick="closeBetrayedBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (sortedBetrayers.length === 0) {
        html += '<div class="no-data">No team kill data available</div>';
    }

    sortedBetrayers.forEach(([betrayer, count]) => {
        const emblemUrl = getPlayerEmblem(betrayer);
        const displayName = getDisplayNameForProfile(betrayer);

        html += `<div class="weapon-breakdown-item player-faced-item" onclick="event.stopPropagation(); closeBetrayedBreakdown(); openPlayerProfile('${betrayer.replace(/'/g, "\\'")}')">`;
        if (emblemUrl) {
            html += `<div class="emblem-placeholder weapon-breakdown-emblem" data-emblem-params='${JSON.stringify(parseEmblemParams(emblemUrl))}'></div>`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${displayName.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name clickable-player">${displayName}</div>`;
        html += `<div class="weapon-breakdown-stats">${count} team kill${count !== 1 ? 's' : ''}</div>`;
        html += `</div>`;
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';
    html += '</div>';

    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);

    // Render emblems
    setTimeout(() => {
        document.querySelectorAll('.weapon-breakdown-emblem').forEach(el => {
            const params = JSON.parse(el.dataset.emblemParams || '{}');
            if (params && typeof generateEmblemDataUrl === 'function') {
                const dataUrl = generateEmblemDataUrl(params);
                if (dataUrl) {
                    el.style.backgroundImage = `url(${dataUrl})`;
                    el.style.backgroundSize = 'contain';
                    el.style.backgroundRepeat = 'no-repeat';
                    el.style.backgroundPosition = 'center';
                }
            }
        });
    }, 50);
}

function closeBetrayedBreakdown() {
    const overlay = document.querySelector('.weapon-breakdown-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Show accuracy breakdown for profile (by map/gametype/weapon)
function showProfileAccuracyBreakdown() {
    if (!currentProfilePlayer) return;

    const byMap = window.currentProfileAccuracyByMap || {};
    const byGametype = window.currentProfileAccuracyByGametype || {};
    const byWeapon = window.currentProfileAccuracyByWeapon || {};

    // Gametype icons
    const gametypeIcons = {
        'Capture the Flag': '/assets/medals/MedalFlagScore.png',
        'Oddball': '/assets/medals/OddballScoreMedal.png',
        'Team Slayer': '/assets/emblems/bullseye.png',
        'Slayer': '/assets/emblems/bullseye.png',
        'King of the Hill': '/assets/medals/MedalKingSpree.png',
        'Assault': '/assets/medals/weapons/AssaultBomb.png',
        'Bomb': '/assets/medals/weapons/AssaultBomb.png',
        'Territories': '/assets/medals/MedalControlSpree.png',
        'Free For All': '/assets/emblems/bullseye.png'
    };

    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal accuracy-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${currentProfilePlayer} - Hit % Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;

    // Tabs
    html += '<div class="accuracy-tabs">';
    html += '<button class="accuracy-tab-btn active" onclick="switchAccuracyTab(\'map\')">By Map</button>';
    html += '<button class="accuracy-tab-btn" onclick="switchAccuracyTab(\'gametype\')">By Gametype</button>';
    html += '<button class="accuracy-tab-btn" onclick="switchAccuracyTab(\'weapon\')">By Weapon</button>';
    html += '</div>';

    // Map tab content
    html += '<div id="accuracy-tab-map" class="accuracy-tab-content active">';
    html += '<div class="weapon-breakdown-grid">';
    const mapEntries = Object.entries(byMap).sort((a, b) => {
        const accA = a[1].fired > 0 ? (a[1].hit / a[1].fired) : 0;
        const accB = b[1].fired > 0 ? (b[1].hit / b[1].fired) : 0;
        return accB - accA;
    });
    if (mapEntries.length === 0) {
        html += '<div class="no-data">No map accuracy data available</div>';
    }
    mapEntries.forEach(([mapName, data]) => {
        const acc = data.fired > 0 ? ((data.hit / data.fired) * 100).toFixed(1) : '0.0';
        const mapImg = mapImages[mapName] || defaultMapImage;
        html += `<div class="weapon-breakdown-item">`;
        html += `<img src="${mapImg}" alt="${mapName}" class="weapon-breakdown-icon map-icon">`;
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${mapName}</div>`;
        html += `<div class="weapon-breakdown-stats">${acc}% (${data.hit}/${data.fired})</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div></div>';

    // Gametype tab content
    html += '<div id="accuracy-tab-gametype" class="accuracy-tab-content" style="display:none;">';
    html += '<div class="weapon-breakdown-grid">';
    const gametypeEntries = Object.entries(byGametype).sort((a, b) => {
        const accA = a[1].fired > 0 ? (a[1].hit / a[1].fired) : 0;
        const accB = b[1].fired > 0 ? (b[1].hit / b[1].fired) : 0;
        return accB - accA;
    });
    if (gametypeEntries.length === 0) {
        html += '<div class="no-data">No gametype accuracy data available</div>';
    }
    gametypeEntries.forEach(([gametype, data]) => {
        const acc = data.fired > 0 ? ((data.hit / data.fired) * 100).toFixed(1) : '0.0';
        const gtIcon = gametypeIcons[gametype] || '/assets/emblems/bullseye.png';
        html += `<div class="weapon-breakdown-item">`;
        html += `<img src="${gtIcon}" alt="${gametype}" class="weapon-breakdown-icon gametype-icon">`;
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${gametype}</div>`;
        html += `<div class="weapon-breakdown-stats">${acc}% (${data.hit}/${data.fired})</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div></div>';

    // Weapon tab content
    html += '<div id="accuracy-tab-weapon" class="accuracy-tab-content" style="display:none;">';
    html += '<div class="weapon-breakdown-grid">';
    const weaponEntries = Object.entries(byWeapon).sort((a, b) => {
        const accA = a[1].fired > 0 ? (a[1].hit / a[1].fired) : 0;
        const accB = b[1].fired > 0 ? (b[1].hit / b[1].fired) : 0;
        return accB - accA;
    });
    if (weaponEntries.length === 0) {
        html += '<div class="no-data">No weapon accuracy data available</div>';
    }
    weaponEntries.forEach(([weapon, data]) => {
        const acc = data.fired > 0 ? ((data.hit / data.fired) * 100).toFixed(1) : '0.0';
        // Strip " Shots" suffix for icon lookup and display
        const baseWeaponName = weapon.replace(/ shots$/i, '').trim();
        const weaponIcon = getWeaponIcon(baseWeaponName);
        html += `<div class="weapon-breakdown-item">`;
        if (weaponIcon) {
            html += `<img src="${weaponIcon}" alt="${baseWeaponName}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${baseWeaponName.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatWeaponName(baseWeaponName)}</div>`;
        html += `<div class="weapon-breakdown-stats">${acc}% (${data.hit}/${data.fired})</div>`;
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div></div>';

    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

// Show winrate breakdown by map and gametype
function showProfileWinrateBreakdown() {
    if (!currentProfilePlayer) return;

    // Calculate wins/losses by map and gametype
    const statsByMap = {};
    const statsByGametype = {};

    for (const game of currentProfileGames) {
        // Skip custom/unranked games
        const isRankedGame = game.playlist && game.playlist.trim() !== '' && !game.isCustomGame;
        if (!isRankedGame) continue;

        const mapName = game.details['Map Name'] || 'Unknown';
        const gameType = game.details['Game Type'] || 'Unknown';
        const player = game.players.find(p => p.name === currentProfilePlayer);
        if (!player) continue;

        // Determine if player won
        let isWin = false;
        const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');

        // Check if it's a team game
        const hasTeams = game.players.some(p => isValidTeam(p.team));

        if (hasTeams && isValidTeam(player.team)) {
            // Calculate team scores
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
            isWin = sortedTeams[0] && sortedTeams[0][0] === player.team;
        } else {
            // FFA - check placement
            isWin = player.place === '1st' || player.place === 1;
        }

        // Track by map
        if (!statsByMap[mapName]) {
            statsByMap[mapName] = { wins: 0, losses: 0 };
        }
        if (isWin) {
            statsByMap[mapName].wins++;
        } else {
            statsByMap[mapName].losses++;
        }

        // Track by gametype
        if (!statsByGametype[gameType]) {
            statsByGametype[gameType] = { wins: 0, losses: 0 };
        }
        if (isWin) {
            statsByGametype[gameType].wins++;
        } else {
            statsByGametype[gameType].losses++;
        }
    }

    // Sort by total games played descending
    const sortedMaps = Object.entries(statsByMap)
        .map(([name, stats]) => ({ name, ...stats, total: stats.wins + stats.losses }))
        .sort((a, b) => b.total - a.total);

    const sortedGametypes = Object.entries(statsByGametype)
        .map(([name, stats]) => ({ name, ...stats, total: stats.wins + stats.losses }))
        .sort((a, b) => b.total - a.total);

    // Build HTML
    let html = `<h2>${getDisplayNameForProfile(currentProfilePlayer)} - Win Rate Breakdown</h2>`;
    html += '<button class="close-breakdown-btn" onclick="closeBreakdownOverlay()">Close</button>';

    // By Gametype section
    html += '<div class="breakdown-section"><h3>By Gametype</h3>';
    if (sortedGametypes.length === 0) {
        html += '<p class="no-data">No games played</p>';
    } else {
        html += '<table class="breakdown-table"><thead><tr><th>Gametype</th><th>Wins</th><th>Losses</th><th>Win Rate</th></tr></thead><tbody>';
        for (const gt of sortedGametypes) {
            const winRate = gt.total > 0 ? ((gt.wins / gt.total) * 100).toFixed(1) : '0.0';
            html += `<tr><td>${gt.name}</td><td class="stat-win">${gt.wins}</td><td class="stat-loss">${gt.losses}</td><td>${winRate}%</td></tr>`;
        }
        html += '</tbody></table>';
    }
    html += '</div>';

    // By Map section
    html += '<div class="breakdown-section"><h3>By Map</h3>';
    if (sortedMaps.length === 0) {
        html += '<p class="no-data">No games played</p>';
    } else {
        html += '<table class="breakdown-table"><thead><tr><th>Map</th><th>Wins</th><th>Losses</th><th>Win Rate</th></tr></thead><tbody>';
        for (const map of sortedMaps) {
            const winRate = map.total > 0 ? ((map.wins / map.total) * 100).toFixed(1) : '0.0';
            html += `<tr><td>${map.name}</td><td class="stat-win">${map.wins}</td><td class="stat-loss">${map.losses}</td><td>${winRate}%</td></tr>`;
        }
        html += '</tbody></table>';
    }
    html += '</div>';

    showBreakdownOverlay(html);
}

// Show assists breakdown by gametype and map
function showProfileAssistsBreakdown() {
    if (!currentProfilePlayer) return;

    // Calculate assists by gametype and map
    const assistsByGametype = {};
    const assistsByMap = {};
    let totalAssists = 0;

    currentProfileGames.forEach(game => {
        const player = game.players.find(p => p.name === currentProfilePlayer);
        if (player && player.assists) {
            const assists = parseInt(player.assists) || 0;
            totalAssists += assists;

            const gametype = game.details['Game Type'] || 'Unknown';
            const mapName = game.details['Map Name'] || 'Unknown';

            assistsByGametype[gametype] = (assistsByGametype[gametype] || 0) + assists;
            assistsByMap[mapName] = (assistsByMap[mapName] || 0) + assists;
        }
    });

    // Sort by most assists
    const sortedGametypes = Object.entries(assistsByGametype).sort((a, b) => b[1] - a[1]);
    const sortedMaps = Object.entries(assistsByMap).sort((a, b) => b[1] - a[1]);

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal assists-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${currentProfilePlayer} - Assists Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;

    // Two column layout for gametypes and maps
    html += '<div class="assists-breakdown-container">';

    // Gametypes column
    html += '<div class="assists-breakdown-section">';
    html += '<h3 class="assists-section-title">By Gametype</h3>';
    html += '<div class="assists-breakdown-list">';
    if (sortedGametypes.length === 0) {
        html += '<div class="no-data">No assist data available</div>';
    } else {
        sortedGametypes.forEach(([gametype, count]) => {
            const percentage = totalAssists > 0 ? ((count / totalAssists) * 100).toFixed(1) : 0;
            html += `<div class="assists-breakdown-item">`;
            html += `<div class="assists-breakdown-name">${gametype}</div>`;
            html += `<div class="assists-breakdown-stats">${count} assists (${percentage}%)</div>`;
            html += `</div>`;
        });
    }
    html += '</div></div>';

    // Maps column
    html += '<div class="assists-breakdown-section">';
    html += '<h3 class="assists-section-title">By Map</h3>';
    html += '<div class="assists-breakdown-list">';
    if (sortedMaps.length === 0) {
        html += '<div class="no-data">No assist data available</div>';
    } else {
        sortedMaps.forEach(([mapName, count]) => {
            const percentage = totalAssists > 0 ? ((count / totalAssists) * 100).toFixed(1) : 0;
            html += `<div class="assists-breakdown-item">`;
            html += `<div class="assists-breakdown-name">${mapName}</div>`;
            html += `<div class="assists-breakdown-stats">${count} assists (${percentage}%)</div>`;
            html += `</div>`;
        });
    }
    html += '</div></div>';

    html += '</div>'; // Close assists-breakdown-container
    html += '</div>'; // Close modal
    html += '</div>'; // Close overlay

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

// Global to store K/D breakdown data for re-rendering
let kdBreakdownPlayerStats = {};

// Show K/D breakdown - players with Killed/Killed by counts (using versus data)
function showProfileKDBreakdown(sortMode = 'killed') {
    if (!currentProfilePlayer) return;

    // Calculate kills and deaths against each opponent from versus data (only once)
    if (Object.keys(kdBreakdownPlayerStats).length === 0 || !document.querySelector('.kd-breakdown-modal')) {
        kdBreakdownPlayerStats = {};

        currentProfileGames.forEach(game => {
            if (!game.versus) return;

            // Get kills by this player
            const versusData = game.versus[currentProfilePlayer];
            if (versusData) {
                Object.entries(versusData).forEach(([opponent, kills]) => {
                    if (opponent !== currentProfilePlayer && kills > 0) {
                        if (!kdBreakdownPlayerStats[opponent]) {
                            kdBreakdownPlayerStats[opponent] = { killed: 0, killedBy: 0, games: 0 };
                        }
                        kdBreakdownPlayerStats[opponent].killed += kills;
                    }
                });
            }

            // Get deaths to this player (how many times each opponent killed currentProfilePlayer)
            Object.entries(game.versus).forEach(([killer, victims]) => {
                if (killer !== currentProfilePlayer && victims[currentProfilePlayer]) {
                    const deaths = victims[currentProfilePlayer];
                    if (deaths > 0) {
                        if (!kdBreakdownPlayerStats[killer]) {
                            kdBreakdownPlayerStats[killer] = { killed: 0, killedBy: 0, games: 0 };
                        }
                        kdBreakdownPlayerStats[killer].killedBy += deaths;
                    }
                }
            });

            // Count games together
            game.players.forEach(p => {
                if (p.name !== currentProfilePlayer && kdBreakdownPlayerStats[p.name]) {
                    kdBreakdownPlayerStats[p.name].games++;
                }
            });
        });
    }

    // Sort based on mode
    let sortedPlayers;
    if (sortMode === 'killedBy') {
        // Sort by who kills you most
        sortedPlayers = Object.entries(kdBreakdownPlayerStats)
            .filter(([_, data]) => data.killedBy > 0)
            .sort((a, b) => b[1].killedBy - a[1].killedBy);
    } else {
        // Sort by who you kill most
        sortedPlayers = Object.entries(kdBreakdownPlayerStats)
            .filter(([_, data]) => data.killed > 0)
            .sort((a, b) => b[1].killed - a[1].killed);
    }

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal kd-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${getDisplayNameForProfile(currentProfilePlayer)} - K/D Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;

    // Toggle buttons
    html += '<div class="kd-toggle-container">';
    html += `<button class="kd-toggle-btn ${sortMode === 'killedBy' ? 'active' : ''}" onclick="event.stopPropagation(); reRenderKDBreakdown('killedBy')">Who Kills Me Most</button>`;
    html += `<button class="kd-toggle-btn ${sortMode === 'killed' ? 'active' : ''}" onclick="event.stopPropagation(); reRenderKDBreakdown('killed')">Who I Kill Most</button>`;
    html += '</div>';

    html += '<div class="weapon-breakdown-grid player-breakdown-grid" id="kdBreakdownGrid">';

    if (sortedPlayers.length === 0) {
        html += '<div class="no-data">No player data available</div>';
    }

    for (let i = 0; i < sortedPlayers.length; i++) {
        const [opponent, data] = sortedPlayers[i];
        const emblemUrl = getPlayerEmblem(opponent);
        const emblemParams = emblemUrl ? parseEmblemParams(emblemUrl) : null;
        const kd = data.killedBy > 0 ? (data.killed / data.killedBy).toFixed(2) : data.killed.toFixed(2);
        const primaryStat = sortMode === 'killedBy' ? data.killedBy : data.killed;

        html += `<div class="weapon-breakdown-item player-breakdown-item player-faced-item">`;
        html += `<span class="player-faced-rank">#${i + 1}</span>`;
        html += `<div class="player-breakdown-emblem">`;
        if (emblemParams && typeof generateEmblemDataUrl === 'function') {
            html += `<div class="emblem-placeholder" data-emblem-params='${JSON.stringify(emblemParams)}'></div>`;
        } else {
            html += `<div class="emblem-placeholder-empty"></div>`;
        }
        html += `</div>`;
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name clickable-player" data-player="${opponent}" onclick="event.stopPropagation(); closeMedalBreakdown(); openPlayerProfile('${opponent}')">${getDisplayNameForProfile(opponent)}</div>`;
        html += `<div class="weapon-breakdown-stats kd-stats">`;
        html += `<span class="kd-killed">Killed: ${data.killed}</span>`;
        html += `<span class="kd-killedby">Killed by: ${data.killedBy}</span>`;
        html += `</div>`;
        html += `<div class="weapon-breakdown-substats">K/D: ${kd} • ${data.games} games</div>`;
        html += `</div>`;
        html += `<div class="kd-primary-stat">${primaryStat}</div>`;
        html += `</div>`;
    }

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);

    // Load emblems async
    loadBreakdownEmblems();
}

// Re-render K/D breakdown with new sort mode
function reRenderKDBreakdown(sortMode) {
    // Close current modal
    const overlay = document.querySelector('.weapon-breakdown-overlay');
    if (overlay) {
        overlay.remove();
    }
    // Re-open with new sort mode (data is cached in kdBreakdownPlayerStats)
    showProfileKDBreakdown(sortMode);
}

// Show weapon kills breakdown with icons
function showProfileWeaponKillsBreakdown() {
    if (!currentProfilePlayer) return;

    // Calculate weapon kill stats for the player
    const weaponStats = {};
    let totalMeleeMedals = 0;
    let meleeWeaponKills = 0;
    const meleeWeapons = ['energy sword', 'flag', 'bomb', 'oddball'];

    currentProfileGames.forEach(game => {
        const weaponData = game.weapons?.find(w => w.Player === currentProfilePlayer);
        if (weaponData) {
            Object.keys(weaponData).forEach(key => {
                const keyLower = key.toLowerCase();
                if (key !== 'Player' && keyLower.includes('kills') && !keyLower.includes('headshot')) {
                    const weaponName = key.replace(/ kills/gi, '').trim();
                    const kills = parseInt(weaponData[key]) || 0;
                    if (kills > 0) {
                        weaponStats[weaponName] = (weaponStats[weaponName] || 0) + kills;
                        // Track melee weapon kills
                        if (meleeWeapons.includes(weaponName.toLowerCase())) {
                            meleeWeaponKills += kills;
                        }
                    }
                }
            });
        }

        // Get melee medals (bone_cracker + assassin)
        const medalData = game.medals?.find(m => m.player === currentProfilePlayer);
        if (medalData) {
            totalMeleeMedals += (medalData.bone_cracker || 0) + (medalData.assassin || 0);
        }
    });

    // Calculate beatdown kills (melee medals minus melee weapon kills)
    const beatdownKills = Math.max(0, totalMeleeMedals - meleeWeaponKills);
    if (beatdownKills > 0) {
        weaponStats['melee'] = beatdownKills;
    }

    // Sort by most kills, but put grenades at the bottom
    const sortedWeapons = Object.entries(weaponStats).sort((a, b) => b[1] - a[1]);
    const totalKills = sortedWeapons.reduce((sum, [_, kills]) => sum + kills, 0);

    // Separate grenades to show at bottom
    const isGrenade = (name) => name.toLowerCase().includes('grenade');
    const regularWeapons = sortedWeapons.filter(([weapon]) => !isGrenade(weapon));
    const grenades = sortedWeapons.filter(([weapon]) => isGrenade(weapon));

    // Combine: regular weapons first, then grenades
    const orderedWeapons = [...regularWeapons, ...grenades];

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${getDisplayNameForProfile(currentProfilePlayer)} - Weapon Kills</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (orderedWeapons.length === 0) {
        html += '<div class="no-data">No weapon data available</div>';
    }

    // Render all weapons with icons (grenades at bottom)
    for (const [weapon, kills] of orderedWeapons) {
        const iconUrl = getWeaponIcon(weapon);
        const percentage = totalKills > 0 ? ((kills / totalKills) * 100).toFixed(1) : '0';

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${weapon.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatWeaponName(weapon)}</div>`;
        html += `<div class="weapon-breakdown-stats">${kills} kills (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    }

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

// Show weapon deaths breakdown with icons
function showProfileWeaponDeathsBreakdown() {
    if (!currentProfilePlayer) return;

    // Calculate weapon death stats for the player
    const weaponStats = {};

    currentProfileGames.forEach(game => {
        const weaponData = game.weapons?.find(w => w.Player === currentProfilePlayer);
        if (weaponData) {
            Object.keys(weaponData).forEach(key => {
                const keyLower = key.toLowerCase();
                if (key !== 'Player' && keyLower.includes('deaths') && !keyLower.includes('headshot')) {
                    const weaponName = key.replace(/ deaths/gi, '').trim();
                    const deaths = parseInt(weaponData[key]) || 0;
                    if (deaths > 0) {
                        weaponStats[weaponName] = (weaponStats[weaponName] || 0) + deaths;
                    }
                }
            });
        }
    });

    // Sort by most deaths, put grenades at bottom
    const sortedWeapons = Object.entries(weaponStats).sort((a, b) => b[1] - a[1]);
    const totalDeaths = sortedWeapons.reduce((sum, [_, deaths]) => sum + deaths, 0);

    // Separate grenades to show at bottom
    const isGrenade = (name) => name.toLowerCase().includes('grenade');
    const regularWeapons = sortedWeapons.filter(([weapon]) => !isGrenade(weapon));
    const grenades = sortedWeapons.filter(([weapon]) => isGrenade(weapon));

    // Combine: regular weapons first, then grenades
    const orderedWeapons = [...regularWeapons, ...grenades];

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${getDisplayNameForProfile(currentProfilePlayer)} - Weapon Deaths</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (orderedWeapons.length === 0) {
        html += '<div class="no-data">No weapon data available</div>';
    }

    // Render all weapons with icons (grenades at bottom)
    for (const [weapon, deaths] of orderedWeapons) {
        const iconUrl = getWeaponIcon(weapon);
        const percentage = totalDeaths > 0 ? ((deaths / totalDeaths) * 100).toFixed(1) : '0';

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${weapon.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatWeaponName(weapon)}</div>`;
        html += `<div class="weapon-breakdown-stats">${deaths} deaths (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    }

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

// Get all unique weapons from all games
function getAllWeapons() {
    const weapons = new Set();
    gamesData.forEach(game => {
        game.weapons?.forEach(weaponData => {
            Object.keys(weaponData).forEach(key => {
                if (key !== 'Player' && key.toLowerCase().includes('kills')) {
                    const weaponName = key.replace(/ kills/gi, '').trim().toLowerCase();
                    weapons.add(weaponName);
                }
            });
        });
    });
    // Add melee as a searchable weapon (calculated from medals)
    weapons.add('melee');
    return Array.from(weapons).sort();
}

// Calculate melee kills for a player from medals
function calculatePlayerMeleeKills(playerName) {
    const meleeWeapons = ['energy sword', 'flag', 'bomb', 'oddball'];
    let totalMeleeMedals = 0;
    let meleeWeaponKills = 0;

    gamesData.forEach(game => {
        // Get melee medals
        const medalData = game.medals?.find(m => m.player === playerName);
        if (medalData) {
            totalMeleeMedals += (medalData.bone_cracker || 0) + (medalData.assassin || 0);
        }

        // Get melee weapon kills to subtract
        const weaponData = game.weapons?.find(w => w.Player === playerName);
        if (weaponData) {
            Object.keys(weaponData).forEach(key => {
                const keyLower = key.toLowerCase();
                if (keyLower.includes('kills') && !keyLower.includes('headshot')) {
                    const weaponName = key.replace(/ kills/gi, '').trim().toLowerCase();
                    if (meleeWeapons.includes(weaponName)) {
                        meleeWeaponKills += parseInt(weaponData[key]) || 0;
                    }
                }
            });
        }
    });

    return Math.max(0, totalMeleeMedals - meleeWeaponKills);
}

// Show global weapon leaderboard for a specific weapon
function showWeaponLeaderboard(weaponName) {
    const weaponLower = weaponName.toLowerCase();

    // Calculate kills and deaths for each player with this weapon
    const playerKills = {};
    const playerDeaths = {};

    gamesData.forEach(game => {
        game.weapons?.forEach(weaponData => {
            const player = weaponData.Player;
            if (!player) return;

            Object.keys(weaponData).forEach(key => {
                const keyLower = key.toLowerCase();
                const weaponInKey = key.replace(/ (kills|deaths)/gi, '').trim().toLowerCase();

                if (weaponInKey === weaponLower || weaponInKey.includes(weaponLower) || weaponLower.includes(weaponInKey)) {
                    if (keyLower.includes('kills') && !keyLower.includes('headshot')) {
                        const kills = parseInt(weaponData[key]) || 0;
                        playerKills[player] = (playerKills[player] || 0) + kills;
                    } else if (keyLower.includes('deaths')) {
                        const deaths = parseInt(weaponData[key]) || 0;
                        playerDeaths[player] = (playerDeaths[player] || 0) + deaths;
                    }
                }
            });
        });
    });

    // Sort by most kills/deaths
    const topKillers = Object.entries(playerKills)
        .filter(([_, kills]) => kills > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    const topVictims = Object.entries(playerDeaths)
        .filter(([_, deaths]) => deaths > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-leaderboard-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    const iconUrl = getWeaponIcon(weaponName);
    if (iconUrl) {
        html += `<img src="${iconUrl}" alt="${weaponName}" class="weapon-header-icon">`;
    }
    html += `<h2>${formatWeaponName(weaponName)} Leaderboard</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;

    html += '<div class="weapon-leaderboard-columns">';

    // Most Kills column
    html += '<div class="weapon-leaderboard-column">';
    html += '<h3>Most Kills</h3>';
    if (topKillers.length === 0) {
        html += '<div class="no-data">No kills recorded</div>';
    } else {
        html += '<div class="weapon-leaderboard-list">';
        for (let i = 0; i < topKillers.length; i++) {
            const [player, kills] = topKillers[i];
            const displayName = getDisplayNameForProfile(player);
            const discordId = profileNameToDiscordId[player];
            const playerInfo = discordId ? playersData.players?.find(p => p.discord_id === discordId) : null;
            const emblemUrl = playerInfo?.emblem_url || getPlayerEmblemUrl(player);
            const emblemParams = emblemUrl ? parseEmblemParams(emblemUrl) : null;
            const rank = getRankForPlayer(player);

            html += `<div class="weapon-lb-row">`;
            html += `<span class="weapon-lb-rank">#${i + 1}</span>`;
            if (emblemParams) {
                html += `<div class="emblem-placeholder weapon-lb-emblem" data-emblem-params='${JSON.stringify(emblemParams)}'></div>`;
            }
            html += `<span class="weapon-lb-name">${displayName}</span>`;
            if (rank) {
                html += `<img src="assets/ranks/${rank}.png" alt="Rank ${rank}" class="weapon-lb-rank-icon">`;
            }
            html += `<span class="weapon-lb-count">${kills}</span>`;
            html += `</div>`;
        }
        html += '</div>';
    }
    html += '</div>';

    // Most Deaths column
    html += '<div class="weapon-leaderboard-column">';
    html += '<h3>Most Deaths</h3>';
    if (topVictims.length === 0) {
        html += '<div class="no-data">No deaths recorded</div>';
    } else {
        html += '<div class="weapon-leaderboard-list">';
        for (let i = 0; i < topVictims.length; i++) {
            const [player, deaths] = topVictims[i];
            const displayName = getDisplayNameForProfile(player);
            const discordId = profileNameToDiscordId[player];
            const playerInfo = discordId ? playersData.players?.find(p => p.discord_id === discordId) : null;
            const emblemUrl = playerInfo?.emblem_url || getPlayerEmblemUrl(player);
            const emblemParams = emblemUrl ? parseEmblemParams(emblemUrl) : null;
            const rank = getRankForPlayer(player);

            html += `<div class="weapon-lb-row">`;
            html += `<span class="weapon-lb-rank">#${i + 1}</span>`;
            if (emblemParams) {
                html += `<div class="emblem-placeholder weapon-lb-emblem" data-emblem-params='${JSON.stringify(emblemParams)}'></div>`;
            }
            html += `<span class="weapon-lb-name">${displayName}</span>`;
            if (rank) {
                html += `<img src="assets/ranks/${rank}.png" alt="Rank ${rank}" class="weapon-lb-rank-icon">`;
            }
            html += `<span class="weapon-lb-count">${deaths}</span>`;
            html += `</div>`;
        }
        html += '</div>';
    }
    html += '</div>';

    html += '</div>'; // columns
    html += '</div>'; // modal
    html += '</div>'; // overlay

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);

    // Load emblems
    loadBreakdownEmblems();
}

// Show weapon search modal with all weapons
function showWeaponSearch() {
    const weapons = getAllWeapons();

    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal weapon-search-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>Weapon Leaderboards</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += `<input type="text" class="weapon-search-input" placeholder="Search weapons..." oninput="filterWeaponSearch(this.value)">`;
    html += '<div class="weapon-breakdown-grid weapon-search-grid">';

    for (const weapon of weapons) {
        const iconUrl = getWeaponIcon(weapon);
        html += `<div class="weapon-breakdown-item weapon-search-item" data-weapon="${weapon}" onclick="closeMedalBreakdown(); showWeaponLeaderboard('${weapon}')">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${weapon.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatWeaponName(weapon)}</div>`;
        html += `</div>`;
        html += `</div>`;
    }

    html += '</div>';
    html += '</div>';
    html += '</div>';

    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

// Filter weapon search results
function filterWeaponSearch(query) {
    const items = document.querySelectorAll('.weapon-search-item');
    const queryLower = query.toLowerCase();
    items.forEach(item => {
        const weapon = item.dataset.weapon;
        if (weapon.includes(queryLower) || formatWeaponName(weapon).toLowerCase().includes(queryLower)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Load emblems for breakdown modals
async function loadBreakdownEmblems() {
    const placeholders = document.querySelectorAll('.emblem-placeholder[data-emblem-params]');
    for (const placeholder of placeholders) {
        try {
            const params = JSON.parse(placeholder.dataset.emblemParams);
            const dataUrl = await generateEmblemDataUrl(params);
            if (dataUrl) {
                placeholder.innerHTML = `<img src="${dataUrl}" alt="Emblem" class="breakdown-emblem-img">`;
            }
        } catch (e) {
            console.error('Error loading emblem:', e);
        }
    }
}

function showPlayersFacedBreakdown() {
    const playerName = window.currentSearchContext;
    if (!playerName) return;

    // Calculate kills and deaths against each opponent from versus data
    const playerStats = {};
    const playerGames = gamesData.filter(game =>
        game.players.some(p => p.name === playerName)
    );

    playerGames.forEach(game => {
        if (!game.versus) return;

        // Get kills by this player
        const versusData = game.versus[playerName];
        if (versusData) {
            Object.entries(versusData).forEach(([opponent, kills]) => {
                if (opponent !== playerName && kills > 0) {
                    if (!playerStats[opponent]) {
                        playerStats[opponent] = { killed: 0, killedBy: 0, games: 0 };
                    }
                    playerStats[opponent].killed += kills;
                }
            });
        }

        // Get deaths to this player
        Object.entries(game.versus).forEach(([killer, victims]) => {
            if (killer !== playerName && victims[playerName]) {
                const deaths = victims[playerName];
                if (deaths > 0) {
                    if (!playerStats[killer]) {
                        playerStats[killer] = { killed: 0, killedBy: 0, games: 0 };
                    }
                    playerStats[killer].killedBy += deaths;
                }
            }
        });

        // Count games together
        game.players.forEach(p => {
            if (p.name !== playerName && playerStats[p.name]) {
                playerStats[p.name].games++;
            }
        });
    });

    // Sort by total interactions
    const sortedPlayers = Object.entries(playerStats)
        .filter(([_, data]) => data.killed > 0 || data.killedBy > 0)
        .sort((a, b) => (b[1].killed + b[1].killedBy) - (a[1].killed + a[1].killedBy));

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${getDisplayNameForProfile(playerName)} - K/D Breakdown</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid player-breakdown-grid">';

    if (sortedPlayers.length === 0) {
        html += '<div class="no-data">No player data available</div>';
    }

    for (const [opponent, data] of sortedPlayers) {
        const emblemUrl = getPlayerEmblem(opponent) || getEmblemFromProfileName(opponent);
        const emblemParams = emblemUrl ? parseEmblemParams(emblemUrl) : null;
        const kd = data.killedBy > 0 ? (data.killed / data.killedBy).toFixed(2) : data.killed.toFixed(2);

        html += `<div class="weapon-breakdown-item player-breakdown-item">`;
        html += `<div class="player-breakdown-emblem">`;
        if (emblemParams && typeof generateEmblemDataUrl === 'function') {
            html += `<div class="emblem-placeholder" data-emblem-params='${JSON.stringify(emblemParams)}'></div>`;
        } else if (emblemUrl) {
            html += `<img src="${emblemUrl}" alt="${opponent}" class="breakdown-emblem-img">`;
        } else {
            html += `<div class="emblem-placeholder-empty"></div>`;
        }
        html += `</div>`;
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name clickable-player" data-player="${opponent}" onclick="event.stopPropagation(); closeMedalBreakdown(); openPlayerProfile('${opponent}')">${getDisplayNameForProfile(opponent)}</div>`;
        html += `<div class="weapon-breakdown-stats kd-stats">`;
        html += `<span class="kd-killed">Killed: ${data.killed}</span>`;
        html += `<span class="kd-killedby">Killed by: ${data.killedBy}</span>`;
        html += `</div>`;
        html += `<div class="weapon-breakdown-substats">K/D: ${kd} • ${data.games} games</div>`;
        html += `</div>`;
        html += `</div>`;
    }

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);

    // Load emblems async
    loadBreakdownEmblems();
}

// Show weapon kills breakdown for search results
function showSearchWeaponKillsBreakdown() {
    const playerName = window.currentSearchContext;
    if (!playerName) return;

    // Calculate weapon kill stats
    const weaponStats = {};
    let totalMeleeMedals = 0;
    let meleeWeaponKills = 0;
    const meleeWeapons = ['energy sword', 'flag', 'bomb', 'oddball'];

    const playerGames = gamesData.filter(game =>
        game.players.some(p => p.name === playerName)
    );

    playerGames.forEach(game => {
        const weaponData = game.weapons?.find(w => w.Player === playerName);
        if (weaponData) {
            Object.keys(weaponData).forEach(key => {
                const keyLower = key.toLowerCase();
                if (key !== 'Player' && keyLower.includes('kills') && !keyLower.includes('headshot')) {
                    const weaponName = key.replace(/ kills/gi, '').trim();
                    const kills = parseInt(weaponData[key]) || 0;
                    if (kills > 0) {
                        weaponStats[weaponName] = (weaponStats[weaponName] || 0) + kills;
                        // Track melee weapon kills
                        if (meleeWeapons.includes(weaponName.toLowerCase())) {
                            meleeWeaponKills += kills;
                        }
                    }
                }
            });
        }

        // Get melee medals (bone_cracker + assassin)
        const medalData = game.medals?.find(m => m.player === playerName);
        if (medalData) {
            totalMeleeMedals += (medalData.bone_cracker || 0) + (medalData.assassin || 0);
        }
    });

    // Calculate beatdown kills (melee medals minus melee weapon kills)
    const beatdownKills = Math.max(0, totalMeleeMedals - meleeWeaponKills);
    if (beatdownKills > 0) {
        weaponStats['melee'] = beatdownKills;
    }

    // Sort by most kills, but put grenades at the bottom
    const sortedWeapons = Object.entries(weaponStats).sort((a, b) => b[1] - a[1]);
    const totalKills = sortedWeapons.reduce((sum, [_, kills]) => sum + kills, 0);

    // Separate grenades to show at bottom
    const isGrenade = (name) => name.toLowerCase().includes('grenade');
    const regularWeapons = sortedWeapons.filter(([weapon]) => !isGrenade(weapon));
    const grenades = sortedWeapons.filter(([weapon]) => isGrenade(weapon));

    // Combine: regular weapons first, then grenades
    const orderedWeapons = [...regularWeapons, ...grenades];

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${getDisplayNameForProfile(playerName)} - Weapon Kills</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (orderedWeapons.length === 0) {
        html += '<div class="no-data">No weapon data available</div>';
    }

    for (const [weapon, kills] of orderedWeapons) {
        const iconUrl = getWeaponIcon(weapon);
        const percentage = totalKills > 0 ? ((kills / totalKills) * 100).toFixed(1) : '0';

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${weapon.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatWeaponName(weapon)}</div>`;
        html += `<div class="weapon-breakdown-stats">${kills} kills (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    }

    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Add to page
    const overlay = document.createElement('div');
    overlay.innerHTML = html;
    document.body.appendChild(overlay.firstChild);
}

// Show weapon deaths breakdown for search results
function showSearchWeaponDeathsBreakdown() {
    const playerName = window.currentSearchContext;
    if (!playerName) return;

    // Calculate weapon death stats
    const weaponStats = {};
    const playerGames = gamesData.filter(game =>
        game.players.some(p => p.name === playerName)
    );

    playerGames.forEach(game => {
        const weaponData = game.weapons?.find(w => w.Player === playerName);
        if (weaponData) {
            Object.keys(weaponData).forEach(key => {
                const keyLower = key.toLowerCase();
                if (key !== 'Player' && keyLower.includes('deaths') && !keyLower.includes('headshot')) {
                    const weaponName = key.replace(/ deaths/gi, '').trim();
                    const deaths = parseInt(weaponData[key]) || 0;
                    if (deaths > 0) {
                        weaponStats[weaponName] = (weaponStats[weaponName] || 0) + deaths;
                    }
                }
            });
        }
    });

    // Sort by most deaths
    const sortedWeapons = Object.entries(weaponStats).sort((a, b) => b[1] - a[1]);
    const totalDeaths = sortedWeapons.reduce((sum, [_, deaths]) => sum + deaths, 0);

    // Create modal
    let html = '<div class="weapon-breakdown-overlay" onclick="closeMedalBreakdown()">';
    html += '<div class="weapon-breakdown-modal" onclick="event.stopPropagation()">';
    html += `<div class="weapon-breakdown-header">`;
    html += `<h2>${getDisplayNameForProfile(playerName)} - Weapon Deaths</h2>`;
    html += `<button class="modal-close" onclick="closeMedalBreakdown()">&times;</button>`;
    html += `</div>`;
    html += '<div class="weapon-breakdown-grid">';

    if (sortedWeapons.length === 0) {
        html += '<div class="no-data">No weapon data available</div>';
    }

    for (const [weapon, deaths] of sortedWeapons) {
        const iconUrl = getWeaponIcon(weapon);
        const percentage = totalDeaths > 0 ? ((deaths / totalDeaths) * 100).toFixed(1) : '0';

        html += `<div class="weapon-breakdown-item">`;
        if (iconUrl) {
            html += `<img src="${iconUrl}" alt="${weapon}" class="weapon-breakdown-icon">`;
        } else {
            html += `<div class="weapon-breakdown-placeholder">${weapon.substring(0, 2).toUpperCase()}</div>`;
        }
        html += `<div class="weapon-breakdown-info">`;
        html += `<div class="weapon-breakdown-name">${formatWeaponName(weapon)}</div>`;
        html += `<div class="weapon-breakdown-stats">${deaths} deaths (${percentage}%)</div>`;
        html += `</div>`;
        html += `</div>`;
    }

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

    // Filter to only Halo 2 medals and sort by most earned
    const sortedMedals = Object.entries(medalBreakdown)
        .filter(([medal]) => medalIcons[medal])
        .sort((a, b) => b[1] - a[1]);
    const totalMedals = sortedMedals.reduce((sum, [, count]) => sum + count, 0);

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

    // Get the display name (discord nickname) for the player
    const displayName = getDisplayNameForProfile(playerName);

    // Set player emblem, name and rank
    const emblemUrl = getPlayerEmblem(playerName);
    const emblemElement = document.getElementById('profileEmblem');
    if (emblemUrl) {
        // Check if emblem URL has params - generate locally instead
        const emblemParams = parseEmblemParams(emblemUrl);
        if (emblemParams && typeof generateEmblemDataUrl === 'function') {
            emblemElement.innerHTML = '<div class="profile-emblem-loading"></div>';
            emblemElement.style.display = 'block';
            generateEmblemDataUrl(emblemParams).then(dataUrl => {
                if (dataUrl) {
                    emblemElement.innerHTML = `<img src="${dataUrl}" alt="Player Emblem" class="profile-emblem-img" />`;
                } else {
                    emblemElement.style.display = 'none';
                }
            });
        } else {
            emblemElement.innerHTML = `<img src="${emblemUrl}" alt="Player Emblem" class="profile-emblem-img" onerror="this.parentElement.style.display='none'" />`;
            emblemElement.style.display = 'block';
        }
    } else {
        emblemElement.innerHTML = '';
        emblemElement.style.display = 'none';
    }

    document.getElementById('profilePlayerName').textContent = displayName;
    document.getElementById('profileRankIcon').innerHTML = getPlayerRankIcon(playerName, 'large');

    // Set Twitch link if player has a linked Twitch account
    const twitchLinkElement = document.getElementById('profileTwitchLink');
    const discordIdForTwitch = profileNameToDiscordId[playerName];
    const twitchData = discordIdForTwitch ? rankstatsData[discordIdForTwitch] : null;
    if (twitchData && twitchData.twitch_url && twitchData.twitch_name && !twitchData.twitch_name.includes('google.com')) {
        twitchLinkElement.innerHTML = `<a href="${twitchData.twitch_url}" target="_blank" class="twitch-icon-link" title="Watch on Twitch: ${twitchData.twitch_name}"><svg class="twitch-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57V4.714zm4.715 0H18v5.143h-1.714V4.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0H6zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714v9.429z"/></svg></a>`;
        twitchLinkElement.style.display = 'inline-flex';
    } else {
        twitchLinkElement.innerHTML = '';
        twitchLinkElement.style.display = 'none';
    }

    // Calculate overall stats
    const stats = calculatePlayerOverallStats(playerName);
    renderProfileStats(stats);

    // Get player's games
    currentProfileGames = getPlayerGames(playerName);

    // Render playlist ranks
    renderProfilePlaylistRanks(playerName);

    // Populate filter dropdowns
    populateProfileFilters();

    // Render games list
    renderProfileGames(currentProfileGames);
}

// Render playlist-specific ranks for the player profile
function renderProfilePlaylistRanks(playerName) {
    const container = document.getElementById('profilePlaylistRanks');
    if (!container) return;

    // Get discord ID for the player
    const discordId = profileNameToDiscordId[playerName];
    const playerData = discordId ? rankstatsData[discordId] : null;

    if (!playerData) {
        container.innerHTML = '';
        return;
    }

    // Available playlists
    const playlists = ['MLG 4v4', 'Double Team', 'Head to Head'];

    let html = '<div class="playlist-ranks-grid">';

    playlists.forEach(playlist => {
        const playlistRank = playerData[playlist] || null;
        const hasPlaylistData = playlistRank !== null;

        if (hasPlaylistData) {
            const rankIconUrl = `https://r2-cdn.insignia.live/h2-rank/${playlistRank}.png`;
            html += `
                <div class="playlist-rank-card">
                    <div class="playlist-rank-icon">
                        <img src="${rankIconUrl}" alt="Rank ${playlistRank}" class="rank-icon-medium" />
                    </div>
                    <div class="playlist-rank-info">
                        <div class="playlist-name">${playlist}</div>
                        <div class="playlist-rank-value">Rank ${playlistRank}</div>
                    </div>
                </div>
            `;
        }
    });

    html += '</div>';

    // Only show if player has at least one playlist rank
    if (html.includes('playlist-rank-card')) {
        container.innerHTML = html;
    } else {
        container.innerHTML = '';
    }
}

function closePlayerProfile() {
    document.getElementById('playerProfilePage').style.display = 'none';
    document.getElementById('statsArea').style.display = 'block';
    currentProfilePlayer = null;
    currentProfileGames = [];
}

function returnToMainPage() {
    // Hide profile page
    document.getElementById('playerProfilePage').style.display = 'none';
    // Hide search results page
    document.getElementById('searchResultsPage').style.display = 'none';
    // Show main stats area
    document.getElementById('statsArea').style.display = 'block';
    // Clear search input
    const searchInput = document.getElementById('playerSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    // Clear any search dropdown results
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
    }
    // Reset profile state
    currentProfilePlayer = null;
    currentProfileGames = [];
    // Switch to game history tab
    switchMainTab('gamehistory');
    // Clear URL hash
    history.replaceState(null, '', window.location.pathname);
}

function calculatePlayerOverallStats(playerName, includeCustomGames = false) {
    let rankedGames = 0, wins = 0;
    let totalGames = 0, kills = 0, deaths = 0, assists = 0, totalScore = 0, totalMedals = 0;
    let totalBallTime = 0, flagCaptures = 0, flagReturns = 0, flagSteals = 0, bombArms = 0, totalShotsFired = 0;
    let totalShotsHit = 0;
    let precisionHeadshots = 0, precisionKills = 0;
    let timesBetrayed = 0;
    const precisionWeapons = ['battle rifle', 'sniper rifle', 'carbine', 'covenant carbine'];
    const accuracyByMap = {}, accuracyByGametype = {}, accuracyByWeapon = {};

    gamesData.forEach(game => {
        const player = game.players.find(p => p.name === playerName);
        if (!player) return;

        const isRankedGame = game.playlist && game.playlist.trim() !== '' && !game.isCustomGame;

        // Skip custom games unless checkbox is checked
        if (!isRankedGame && !includeCustomGames) return;

        // Count stats from visible games
        totalGames++;
        kills += player.kills || 0;
        deaths += player.deaths || 0;
        assists += player.assists || 0;
        totalScore += parseInt(player.score) || 0;

        // Track Oddball time
        const gameType = game.details['Game Type'] || '';
        const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');
        if (isOddball && player.score) {
            totalBallTime += timeToSeconds(player.score);
        }

        // Track CTF stats from detailed_stats
        if (game.detailed_stats) {
            const detailedStats = game.detailed_stats.find(s => s.player === playerName);
            if (detailedStats) {
                flagCaptures += detailedStats.ctf_scores || 0;
                flagReturns += detailedStats.ctf_flag_saves || 0;
                flagSteals += detailedStats.ctf_flag_steals || 0;
            }
        }

        // Track Bomb Arms and medals
        if (game.medals) {
            const playerMedals = game.medals.find(m => m.player === playerName);
            if (playerMedals) {
                bombArms += playerMedals.bomb_planted || 0;
                Object.entries(playerMedals).forEach(([key, count]) => {
                    if (key !== 'player' && medalIcons[key]) {
                        totalMedals += parseInt(count) || 0;
                    }
                });
            }
        }

        // Track shots fired/hit from weapons and precision headshots
        if (game.weapons) {
            const playerWeapons = game.weapons.find(w => w.Player === playerName);
            if (playerWeapons) {
                let gameShotsHit = 0, gameShotsFired = 0;
                const mapName = game.details['Map Name'] || 'Unknown';
                const rawType = game.details['Game Type'] || '';
                const gametype = getBaseGametype(rawType, game.playlist, game);

                Object.entries(playerWeapons).forEach(([key, value]) => {
                    const keyLower = key.toLowerCase();
                    const val = parseInt(value) || 0;

                    if (keyLower.includes('hit')) {
                        gameShotsHit += val;
                        totalShotsHit += val;
                        // Track per-weapon accuracy
                        const weaponName = key.replace(/ hit$/i, '').trim();
                        if (!accuracyByWeapon[weaponName]) {
                            accuracyByWeapon[weaponName] = { hit: 0, fired: 0 };
                        }
                        accuracyByWeapon[weaponName].hit += val;
                    } else if (keyLower.includes('fired')) {
                        gameShotsFired += val;
                        totalShotsFired += val;
                        // Track per-weapon accuracy
                        const weaponName = key.replace(/ fired$/i, '').trim();
                        if (!accuracyByWeapon[weaponName]) {
                            accuracyByWeapon[weaponName] = { hit: 0, fired: 0 };
                        }
                        accuracyByWeapon[weaponName].fired += val;
                    }

                    // Track precision weapon stats
                    for (const weapon of precisionWeapons) {
                        if (keyLower.startsWith(weapon)) {
                            if (keyLower.includes('headshot')) {
                                precisionHeadshots += val;
                            } else if (keyLower.endsWith('kills')) {
                                precisionKills += val;
                            }
                        }
                    }
                });

                // Aggregate per-map and per-gametype accuracy
                if (gameShotsFired > 0) {
                    if (!accuracyByMap[mapName]) {
                        accuracyByMap[mapName] = { hit: 0, fired: 0 };
                    }
                    accuracyByMap[mapName].hit += gameShotsHit;
                    accuracyByMap[mapName].fired += gameShotsFired;

                    if (!accuracyByGametype[gametype]) {
                        accuracyByGametype[gametype] = { hit: 0, fired: 0 };
                    }
                    accuracyByGametype[gametype].hit += gameShotsHit;
                    accuracyByGametype[gametype].fired += gameShotsFired;
                }
            }
        }

        // Track times betrayed (team killed)
        if (game.kills) {
            const playerTeam = player.team;
            if (playerTeam && playerTeam !== 'none') {
                game.kills.forEach(kill => {
                    if (kill.victim === playerName && kill.killer !== playerName) {
                        // Find the killer's team
                        const killer = game.players.find(p => p.name === kill.killer);
                        if (killer && killer.team === playerTeam) {
                            timesBetrayed++;
                        }
                    }
                });
            }
        }

        // Only count wins/losses from ranked games - NEVER from custom games
        if (isRankedGame) {
            rankedGames++;

            const hasTeams = game.players.some(p => isValidTeam(p.team));
            const gameType = game.details['Game Type'] || '';
            const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');

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
                // FFA - check if 1st place
                if (player.place === '1st' || player.place === 1) wins++;
            }
        }
    });

    // Get series wins/losses from rank data
    const discordId = profileNameToDiscordId[playerName];
    const rankData = discordId ? rankstatsData[discordId] : null;
    const seriesWins = rankData ? (rankData.series_wins || 0) : 0;
    const seriesLosses = rankData ? (rankData.series_losses || 0) : 0;

    const headshotPercent = precisionKills > 0 ? ((precisionHeadshots / precisionKills) * 100).toFixed(1) : 0;
    const hitPercent = totalShotsFired > 0 ? ((totalShotsHit / totalShotsFired) * 100).toFixed(1) : 0;

    return {
        games: totalGames,
        rankedGames,
        wins,
        losses: rankedGames - wins,
        winRate: rankedGames > 0 ? ((wins / rankedGames) * 100).toFixed(1) : 0,
        kills,
        deaths,
        assists,
        kd: deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2),
        kpg: totalGames > 0 ? (kills / totalGames).toFixed(1) : 0,
        dpg: totalGames > 0 ? (deaths / totalGames).toFixed(1) : 0,
        totalScore,
        avgScore: totalGames > 0 ? Math.round(totalScore / totalGames) : 0,
        totalMedals,
        seriesWins,
        seriesLosses,
        totalBallTime,
        ballTimeDisplay: secondsToTime(totalBallTime),
        flagCaptures,
        flagReturns,
        flagSteals,
        bombArms,
        totalShotsFired,
        totalShotsHit,
        hitPercent,
        avgShotsFired: totalGames > 0 ? Math.round(totalShotsFired / totalGames) : 0,
        precisionHeadshots,
        precisionKills,
        headshotPercent,
        timesBetrayed,
        accuracyByMap,
        accuracyByGametype,
        accuracyByWeapon
    };
}

// Toggle custom games inclusion in profile stats
function toggleProfileCustomGames() {
    if (!currentProfilePlayer) return;
    const checkbox = document.getElementById('profileIncludeCustomGames');
    const includeCustomGames = checkbox ? checkbox.checked : false;
    const stats = calculatePlayerOverallStats(currentProfilePlayer, includeCustomGames);
    renderProfileStats(stats);
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
        <div class="profile-stat-card clickable-stat" onclick="showProfileWinrateBreakdown()">
            <div class="stat-value">${stats.winRate}%</div>
            <div class="stat-label">Win Rate</div>
        </div>
        ${(stats.seriesWins > 0 || stats.seriesLosses > 0) ? `
        <div class="profile-stat-card">
            <div class="stat-value">${stats.seriesWins}-${stats.seriesLosses}</div>
            <div class="stat-label">Series W/L</div>
        </div>
        ` : ''}
        <div class="profile-stat-card highlight clickable-stat" onclick="showProfileKDBreakdown()">
            <div class="stat-value">${stats.kd}</div>
            <div class="stat-label">K/D Ratio</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="showProfileWeaponKillsBreakdown()">
            <div class="stat-value">${stats.kills}</div>
            <div class="stat-label">Total Kills</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="showProfileWeaponDeathsBreakdown()">
            <div class="stat-value">${stats.deaths}</div>
            <div class="stat-label">Total Deaths</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="showProfileAssistsBreakdown()">
            <div class="stat-value">${stats.assists}</div>
            <div class="stat-label">Assists</div>
        </div>
        <div class="profile-stat-card">
            <div class="stat-value">${stats.kpg}</div>
            <div class="stat-label">Kills/Game</div>
        </div>
        <div class="profile-stat-card clickable-stat" onclick="showMedalBreakdown()">
            <div class="stat-value">${stats.totalMedals}</div>
            <div class="stat-label">Total Medals</div>
        </div>
        ${stats.totalBallTime > 0 ? `
        <div class="profile-stat-card">
            <div class="stat-value">${stats.ballTimeDisplay}</div>
            <div class="stat-label">Ball Time</div>
        </div>
        ` : ''}
        ${stats.flagCaptures > 0 ? `
        <div class="profile-stat-card">
            <div class="stat-value">${stats.flagCaptures}</div>
            <div class="stat-label">Flag Captures</div>
        </div>
        ` : ''}
        ${stats.flagReturns > 0 ? `
        <div class="profile-stat-card">
            <div class="stat-value">${stats.flagReturns}</div>
            <div class="stat-label">Flag Returns</div>
        </div>
        ` : ''}
        ${stats.flagSteals > 0 ? `
        <div class="profile-stat-card">
            <div class="stat-value">${stats.flagSteals}</div>
            <div class="stat-label">Flag Steals</div>
        </div>
        ` : ''}
        ${stats.bombArms > 0 ? `
        <div class="profile-stat-card">
            <div class="stat-value">${stats.bombArms}</div>
            <div class="stat-label">Bomb Arms</div>
        </div>
        ` : ''}
        <div class="profile-stat-card">
            <div class="stat-value">${stats.avgShotsFired.toLocaleString()}</div>
            <div class="stat-label">Avg Shots/Game</div>
        </div>
        ${stats.precisionKills > 0 ? `
        <div class="profile-stat-card clickable-stat" onclick="showPrecisionHeadshotBreakdown()">
            <div class="stat-value">${stats.headshotPercent}%</div>
            <div class="stat-label">Precision HS%</div>
        </div>
        ` : ''}
        ${stats.timesBetrayed > 0 ? `
        <div class="profile-stat-card clickable-stat" onclick="showBetrayedByBreakdown()">
            <div class="stat-value">${stats.timesBetrayed}</div>
            <div class="stat-label">Times TK'd</div>
        </div>
        ` : ''}
        ${stats.totalShotsFired > 0 ? `
        <div class="profile-stat-card clickable-stat" onclick="showProfileAccuracyBreakdown()">
            <div class="stat-value">${stats.hitPercent}%</div>
            <div class="stat-label">Avg Hit %</div>
        </div>
        ` : ''}
    `;

    // Store accuracy data for breakdown modal
    window.currentProfileAccuracyByMap = stats.accuracyByMap;
    window.currentProfileAccuracyByGametype = stats.accuracyByGametype;
    window.currentProfileAccuracyByWeapon = stats.accuracyByWeapon;
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
        const rawType = game.details['Game Type'] || '';
        const baseGametype = getBaseGametype(rawType, game.playlist, game);
        if (mapName) {
            maps.set(mapName, (maps.get(mapName) || 0) + 1);
        }
        if (baseGametype) {
            gametypes.set(baseGametype, (gametypes.get(baseGametype) || 0) + 1);
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
            games.sort((a, b) => (parseGameDateTime(b.details['Start Time']) || new Date(0)) - (parseGameDateTime(a.details['Start Time']) || new Date(0)));
            break;
        case 'date-asc':
            games.sort((a, b) => (parseGameDateTime(a.details['Start Time']) || new Date(0)) - (parseGameDateTime(b.details['Start Time']) || new Date(0)));
            break;
        case 'map':
            games.sort((a, b) => (a.details['Map Name'] || '').localeCompare(b.details['Map Name'] || ''));
            break;
        case 'gametype':
            games.sort((a, b) => getBaseGametype(a.details['Game Type'], a.playlist, a).localeCompare(getBaseGametype(b.details['Game Type'], b.playlist, b)));
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
                const gameType = game.details['Game Type'] || '';
                const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');
                
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
                const gameType = game.details['Game Type'] || '';
                const isOddball = gameType.toLowerCase().includes('oddball') || gameType.toLowerCase().includes('ball');
                
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
        games = games.filter(g => {
            const rawType = g.details['Game Type'] || '';
            return getBaseGametype(rawType, g.playlist, g) === profileCurrentGametypeFilter;
        });
    }
    
    renderProfileGames(games);
}

function renderProfileGames(games) {
    const container = document.getElementById('profileGamesList');
    container.innerHTML = '';

    games.forEach((game, idx) => {
        // Use stable gameNumber if available, fall back to originalIndex for compatibility
        const gameNumber = game.gameNumber || (game.originalIndex + 1);
        const gameDiv = createGameItem(game, gameNumber, 'profile-game');
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
        // Use BASE gametype from 'Game Type' field, not variant name
        const baseGameType = getBaseGametype(game.details['Game Type'], game.playlist, game);
        if (mapName) {
            maps.set(mapName, (maps.get(mapName) || 0) + 1);
        }
        if (baseGameType && baseGameType !== 'Unknown') {
            gametypes.set(baseGameType, (gametypes.get(baseGameType) || 0) + 1);
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
            games.sort((a, b) => (parseGameDateTime(b.details['Start Time']) || new Date(0)) - (parseGameDateTime(a.details['Start Time']) || new Date(0)));
            break;
        case 'date-asc':
            games.sort((a, b) => (parseGameDateTime(a.details['Start Time']) || new Date(0)) - (parseGameDateTime(b.details['Start Time']) || new Date(0)));
            break;
        case 'map':
            games.sort((a, b) => (a.details['Map Name'] || '').localeCompare(b.details['Map Name'] || ''));
            break;
        case 'gametype':
            games.sort((a, b) => getBaseGametype(a.details['Game Type'], a.playlist, a).localeCompare(getBaseGametype(b.details['Game Type'], b.playlist, b)));
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
        games = games.filter(g => {
            // Use 'Game Type' field for base gametype filtering
            const baseType = getBaseGametype(g.details['Game Type'], g.playlist, g);
            return baseType === currentGametypeFilter;
        });
    }
    
    renderFilteredGames(games);
}

function renderFilteredGames(games) {
    const container = document.getElementById('gamesList');
    container.innerHTML = '';

    games.forEach((game, idx) => {
        // Use stable gameNumber which matches gameindex.json
        const gameNumber = game.gameNumber;
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

// ==================== 3D REPLAY VIEWER ====================

// Cache for available telemetry files
let availableTelemetryFiles = null;

// Fetch available telemetry files from stats folder
async function fetchAvailableTelemetryFiles() {
    if (availableTelemetryFiles !== null) {
        return availableTelemetryFiles;
    }

    try {
        // Try to fetch telemetry index file
        const response = await fetch('stats/telemetry_index.json');
        if (response.ok) {
            availableTelemetryFiles = await response.json();
            return availableTelemetryFiles;
        }
    } catch (e) {
        console.log('No telemetry index found, using direct file check');
    }

    // Fallback: return empty array (will check files directly when needed)
    availableTelemetryFiles = [];
    return availableTelemetryFiles;
}

// Parse game start time to Date object
function parseGameStartTime(startTimeStr) {
    if (!startTimeStr) return null;

    // Format: "MM/DD/YYYY HH:MM" or "M/D/YYYY H:MM"
    const parts = startTimeStr.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/);
    if (!parts) return null;

    const [, month, day, year, hour, minute] = parts;
    return new Date(year, month - 1, day, hour, minute);
}

// Convert game start time to telemetry filename format
function gameTimeToTelemetryFilename(startTimeStr) {
    const date = parseGameStartTime(startTimeStr);
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    // Telemetry files are named: YYYYMMDD_HHMMSS_theater.csv
    // We'll match based on date and approximate time (within 5 minutes)
    return `${year}${month}${day}_${hour}${minute}`;
}

// Find matching telemetry file for a game
function findTelemetryFileForGame(game) {
    // First check if game has a direct theater_url
    if (game.theater_url && game.theater_url.trim() !== '') {
        // Extract filename from URL
        const filename = game.theater_url.split('/').pop();
        return filename;
    }

    // Try to match by timestamp
    const startTime = game.details?.['Start Time'];
    if (!startTime) return null;

    const prefix = gameTimeToTelemetryFilename(startTime);
    if (!prefix) return null;

    // If we have an index, search it
    if (availableTelemetryFiles && availableTelemetryFiles.length > 0) {
        // Find files that start with the date portion and are within 10 minutes
        const datePrefix = prefix.substring(0, 8); // YYYYMMDD
        const timeValue = parseInt(prefix.substring(9)); // HHMM as number

        for (const file of availableTelemetryFiles) {
            if (file.startsWith(datePrefix)) {
                const fileTime = parseInt(file.substring(9, 13));
                // Allow 10 minute window (time could be slightly different)
                if (Math.abs(fileTime - timeValue) <= 10) {
                    return file;
                }
            }
        }
    }

    // Return the expected filename (viewer will handle if not found)
    return `${prefix}00_theater.csv`;
}

// Open 3D replay viewer for a game
function open3DReplay(gameIndex) {
    const game = gamesData[gameIndex];
    if (!game) {
        console.error('Game not found:', gameIndex);
        return;
    }

    // Use the stored gameNumber (assigned before filtering) to match gameindex.json
    // This ensures the correct game is loaded even when games have been filtered out
    const gameNumber = game.gameNumber;
    if (!gameNumber) {
        console.error('Game number not found for game:', game);
        return;
    }

    // Open theater mode with simple game number URL
    window.open(`/theater/${gameNumber}`, '_blank');
}

// Check if a game has telemetry available
function hasTelemetryAvailable(game) {
    // Check direct URL first
    if (game.theater_url && game.theater_url.trim() !== '') {
        return true;
    }

    // Check if we can match by timestamp
    const startTime = game.details?.['Start Time'];
    if (!startTime) return false;

    const prefix = gameTimeToTelemetryFilename(startTime);
    if (!prefix) return false;

    // If we have an index, check it
    if (availableTelemetryFiles && availableTelemetryFiles.length > 0) {
        const datePrefix = prefix.substring(0, 8);
        return availableTelemetryFiles.some(f => f.startsWith(datePrefix));
    }

    // Otherwise assume it might be available (viewer will handle errors)
    return true;
}

// Initialize telemetry index on page load
fetchAvailableTelemetryFiles();

// Load and display tournaments
let tournamentsLoaded = false;

async function loadTournaments() {
    if (tournamentsLoaded) return;

    const container = document.getElementById('tournamentsList');
    if (!container) return;

    container.innerHTML = '<div class="loading-message">Loading tournaments...</div>';

    try {
        const response = await fetch('playlists.json');
        if (!response.ok) throw new Error('Failed to load playlists');

        const data = await response.json();
        const tournaments = data.playlists.filter(p => p.bracket);

        if (tournaments.length === 0) {
            container.innerHTML = '<div class="loading-message">No tournaments available yet.</div>';
            return;
        }

        let html = '';
        for (const tournament of tournaments) {
            const teamsCount = tournament.bracket?.teams?.length || 0;
            const tournamentDate = tournament.date || '';

            // Find the winner from grand finals
            let winnerName = '';
            const grandFinals = tournament.bracket?.series?.find(s => s.round === 'grand_finals');
            if (grandFinals && grandFinals.winner_seed) {
                const winnerTeam = tournament.bracket.teams?.find(t => t.seed === grandFinals.winner_seed);
                if (winnerTeam) {
                    winnerName = `Team ${winnerTeam.captain}`;
                }
            }

            html += `
                <a href="/playlist.html?name=${encodeURIComponent(tournament.name)}" class="tournament-card">
                    <div class="tournament-info">
                        <div class="tournament-name">${tournament.name}</div>
                        <div class="tournament-date">${tournamentDate}</div>
                        ${winnerName ? `<div class="tournament-winner">Winner: ${winnerName}</div>` : ''}
                    </div>
                    <div class="tournament-stats">
                        <div class="tournament-stat">
                            <div class="tournament-stat-value">${teamsCount}</div>
                            <div class="tournament-stat-label">Teams</div>
                        </div>
                    </div>
                    <span class="tournament-arrow">→</span>
                </a>
            `;
        }

        container.innerHTML = html;
        tournamentsLoaded = true;

    } catch (error) {
        console.error('Error loading tournaments:', error);
        container.innerHTML = '<div class="loading-message">Error loading tournaments.</div>';
    }
}
