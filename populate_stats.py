#!/usr/bin/env python3
"""
Script to parse Excel stats files and populate the site with game data and rankings.
Supports multiple playlists based on active matches from the Discord bot:
- MLG 4v4 / Team Hardcore: 4v4 games with valid map/gametype combos (11 total)
- Double Team: 2v2 team games
- Head to Head: 1v1 games
"""

import pandas as pd
import json
import os
from datetime import datetime

# File paths
STATS_DIR = 'stats'
RANKSTATS_FILE = 'rankstats.json'
GAMESTATS_FILE = 'gamestats.json'
MATCHHISTORY_FILE = 'matchhistory.json'
GAMESDATA_FILE = 'gameshistory.json'
XP_CONFIG_FILE = 'xp_config.json'
PLAYERS_FILE = 'players.json'
EMBLEMS_FILE = 'emblems.json'
ACTIVE_MATCHES_FILE = 'active_matches.json'
RANKHISTORY_FILE = 'rankhistory.json'

# Default playlist name for 4v4 games (fallback)
PLAYLIST_NAME = 'MLG 4v4'

# Valid MLG 4v4 combinations: map + base gametype (11 total)
# These use "Game Type" field (CTF, Slayer, Oddball), NOT variant name
VALID_MLG_4V4_COMBOS = {
    "Midship": ["ctf", "slayer", "oddball"],      # 3 gametypes
    "Beaver Creek": ["ctf", "slayer"],            # 2 gametypes
    "Lockout": ["slayer", "oddball"],             # 2 gametypes
    "Warlock": ["slayer", "oddball"],             # 2 gametypes
    "Sanctuary": ["ctf", "slayer"]                # 2 gametypes
}  # Total: 11 combos

# Minimum game duration in seconds to count (filters out restarts)
MIN_GAME_DURATION_SECONDS = 120  # 2 minutes

# Playlist types
PLAYLIST_MLG_4V4 = 'MLG 4v4'
PLAYLIST_TEAM_HARDCORE = 'Team Hardcore'
PLAYLIST_DOUBLE_TEAM = 'Double Team'
PLAYLIST_HEAD_TO_HEAD = 'Head to Head'

def get_loss_factor(rank, loss_factors):
    """Get the loss factor for a given rank. Lower ranks lose less XP."""
    rank_str = str(rank)
    if rank >= 30:
        return 1.0  # Full loss penalty
    return loss_factors.get(rank_str, 1.0)

def get_win_factor(rank, win_factors):
    """Get the win factor for a given rank. Higher ranks gain less XP."""
    rank_str = str(rank)
    if rank <= 40:
        return 1.0  # Full win bonus
    return win_factors.get(rank_str, 0.50)

def load_xp_config():
    """Load XP configuration for ranking."""
    with open(XP_CONFIG_FILE, 'r') as f:
        return json.load(f)

def load_rankstats():
    """Load existing rankstats.json."""
    try:
        with open(RANKSTATS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def load_players():
    """Load players.json which contains MAC addresses and stats_profile mappings."""
    try:
        with open(PLAYERS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def load_rankhistory():
    """Load existing rankhistory.json or return empty dict."""
    try:
        with open(RANKHISTORY_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def load_active_matches():
    """
    Load active_matches.json which contains info about currently active matches from the Discord bot.

    Expected format:
    {
        "active_match": {
            "playlist": "MLG 4v4",  // or "Double Team", "Head to Head", "Team Hardcore"
            "start_time": "2025-11-28T20:00:00",
            "red_team": ["player1", "player2", ...],  // in-game names
            "blue_team": ["player1", "player2", ...],
            "discord_ids": {
                "red": [user_id1, user_id2, ...],
                "blue": [user_id1, user_id2, ...]
            }
        }
    }

    Returns None if no active match or file doesn't exist.
    """
    try:
        with open(ACTIVE_MATCHES_FILE, 'r') as f:
            data = json.load(f)
            return data.get('active_match')
    except:
        return None

def is_valid_mlg_combo(map_name, base_gametype):
    """Check if map + base gametype is a valid MLG 4v4 combination.

    Uses the base gametype (Game Type field like "CTF", "Slayer", "Oddball"),
    NOT the variant name. There are 11 valid combinations.
    """
    if map_name not in VALID_MLG_4V4_COMBOS:
        return False

    valid_gametypes = VALID_MLG_4V4_COMBOS[map_name]
    base_gametype_lower = base_gametype.lower()

    # Check if base gametype matches any valid type for this map
    for valid_type in valid_gametypes:
        if valid_type in base_gametype_lower:
            return True
    return False

def parse_duration_seconds(duration_str):
    """Parse duration string (M:SS or MM:SS) to seconds."""
    if not duration_str:
        return 0
    try:
        parts = str(duration_str).split(':')
        if len(parts) == 2:
            minutes = int(parts[0])
            seconds = int(parts[1])
            return minutes * 60 + seconds
        elif len(parts) == 3:
            # H:MM:SS format
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = int(parts[2])
            return hours * 3600 + minutes * 60 + seconds
    except:
        pass
    return 0

def get_game_duration_seconds(file_path):
    """Get game duration in seconds from Game Details sheet."""
    try:
        game_details_df = pd.read_excel(file_path, sheet_name='Game Details')
        if len(game_details_df) > 0:
            row = game_details_df.iloc[0]
            duration = str(row.get('Duration', '0:00'))
            return parse_duration_seconds(duration)
    except:
        pass
    return 0

def is_game_long_enough(file_path):
    """Check if game duration is at least MIN_GAME_DURATION_SECONDS (filters restarts)."""
    duration = get_game_duration_seconds(file_path)
    return duration >= MIN_GAME_DURATION_SECONDS

def get_game_player_count(file_path):
    """Get the number of players in a game from the Post Game Report."""
    try:
        post_df = pd.read_excel(file_path, sheet_name='Post Game Report')
        return len(post_df)
    except:
        return 0

def is_team_game(file_path):
    """Check if a game has Red and Blue teams."""
    try:
        post_df = pd.read_excel(file_path, sheet_name='Post Game Report')
        teams = post_df['team'].unique().tolist()
        return 'Red' in teams and 'Blue' in teams
    except:
        return False

def get_game_players(file_path):
    """Get list of player names from the game."""
    try:
        post_df = pd.read_excel(file_path, sheet_name='Post Game Report')
        return [str(row.get('name', '')).strip() for _, row in post_df.iterrows() if row.get('name')]
    except:
        return []

def players_match_active_match(game_players, active_match):
    """
    Check if game players match the active match players.
    Returns True if most players from the game are in the active match.
    """
    if not active_match:
        return False

    active_players = set()
    if active_match.get('red_team'):
        active_players.update([p.lower() for p in active_match['red_team']])
    if active_match.get('blue_team'):
        active_players.update([p.lower() for p in active_match['blue_team']])

    if not active_players:
        return False

    game_players_lower = [p.lower() for p in game_players]
    matches = sum(1 for p in game_players_lower if p in active_players)

    # At least 75% of game players should be in active match
    return matches >= len(game_players) * 0.75

def determine_playlist(file_path, active_match=None):
    """
    Determine the appropriate playlist for a game based on:
    1. Game duration (must be >= 2 minutes to filter restarts)
    2. Active match from Discord bot (if any)
    3. Game characteristics (player count, teams, map + base gametype)

    Returns: playlist name string or None if game doesn't qualify for any playlist
    """
    # Filter out short games (restarts)
    if not is_game_long_enough(file_path):
        return None

    player_count = get_game_player_count(file_path)
    is_team = is_team_game(file_path)
    game_players = get_game_players(file_path)

    # Get map and base gametype from game details
    try:
        game_details_df = pd.read_excel(file_path, sheet_name='Game Details')
        if len(game_details_df) > 0:
            row = game_details_df.iloc[0]
            map_name = str(row.get('Map Name', '')).strip()
            base_gametype = str(row.get('Game Type', '')).strip()  # Use base gametype, not variant
        else:
            map_name = ''
            base_gametype = ''
    except:
        map_name = ''
        base_gametype = ''

    # If there's an active match, check if this game matches it
    if active_match:
        active_playlist = active_match.get('playlist', '')

        # Head to Head: 1v1 games
        if active_playlist == PLAYLIST_HEAD_TO_HEAD:
            if player_count == 2 and players_match_active_match(game_players, active_match):
                return PLAYLIST_HEAD_TO_HEAD

        # Double Team: 2v2 team games
        elif active_playlist == PLAYLIST_DOUBLE_TEAM:
            if player_count == 4 and is_team and players_match_active_match(game_players, active_match):
                return PLAYLIST_DOUBLE_TEAM

        # MLG 4v4 or Team Hardcore: 4v4 team games with valid map + base gametype
        elif active_playlist in [PLAYLIST_MLG_4V4, PLAYLIST_TEAM_HARDCORE]:
            if player_count == 8 and is_team:
                if is_valid_mlg_combo(map_name, base_gametype):
                    if players_match_active_match(game_players, active_match):
                        return active_playlist

    # Fallback: No active match or game doesn't match active match
    # Default behavior: 4v4 team games with valid combos go to MLG 4v4
    if player_count == 8 and is_team and is_valid_mlg_combo(map_name, base_gametype):
        return PLAYLIST_MLG_4V4

    return None

def build_profile_lookup(players):
    """
    Build a lookup from stats profile name to Discord user_id.

    Uses stats_profile field from players.json (populated by the bot from identity XLSX files).
    The bot parses identity files to get MAC -> profile_name, then stores stats_profile
    for each user based on their mac_addresses.
    Also includes aliases from the /linkalias command.
    """
    profile_to_user = {}

    for user_id, data in players.items():
        # Primary: use stats_profile (in-game name from identity files)
        stats_profile = data.get('stats_profile', '')
        if stats_profile:
            profile_to_user[stats_profile.lower()] = user_id

        # Also include display_name as alias
        display_name = data.get('display_name', '')
        if display_name:
            profile_to_user[display_name.lower()] = user_id

        # Include aliases from /linkalias command
        aliases = data.get('aliases', [])
        for alias in aliases:
            if alias:
                profile_to_user[alias.lower()] = user_id

    return profile_to_user

def calculate_rank(xp, rank_thresholds):
    """Calculate rank based on XP and thresholds."""
    for rank in range(50, 0, -1):
        rank_str = str(rank)
        if rank_str in rank_thresholds:
            min_xp, max_xp = rank_thresholds[rank_str]
            if min_xp <= xp <= max_xp:
                return rank
    return 1

def parse_score(score_val):
    """Parse score which can be an integer or time format (M:SS)."""
    if pd.isna(score_val):
        return 0, '0'

    score_str = str(score_val).strip()

    # Check if it's a time format (contains ':')
    if ':' in score_str:
        parts = score_str.split(':')
        try:
            minutes = int(parts[0])
            seconds = int(parts[1]) if len(parts) > 1 else 0
            return minutes * 60 + seconds, score_str
        except:
            return 0, score_str

    try:
        return int(float(score_val)), str(int(float(score_val)))
    except:
        return 0, str(score_val)

def is_4v4_team_game(file_path, require_valid_combo=True):
    """
    Check if a game is a 4v4 team game (has Red and Blue teams).

    Args:
        file_path: Path to the Excel stats file
        require_valid_combo: If True, also require valid MLG map/gametype combo

    Returns:
        bool: True if it's a valid 4v4 team game
    """
    try:
        post_df = pd.read_excel(file_path, sheet_name='Post Game Report')
        teams = post_df['team'].unique().tolist()
        # Must have both Red and Blue teams and 8 players
        is_4v4 = 'Red' in teams and 'Blue' in teams and len(post_df) == 8

        if not is_4v4:
            return False

        if require_valid_combo:
            # Check map + base gametype combo (use Game Type, not Variant Name)
            game_details_df = pd.read_excel(file_path, sheet_name='Game Details')
            if len(game_details_df) > 0:
                row = game_details_df.iloc[0]
                map_name = str(row.get('Map Name', '')).strip()
                base_gametype = str(row.get('Game Type', '')).strip()
                return is_valid_mlg_combo(map_name, base_gametype)
            return False

        return True
    except:
        return False

def parse_excel_file(file_path):
    """Parse a single Excel stats file and return game data."""
    print(f"Parsing {file_path}...")

    # Read all sheets
    game_details_df = pd.read_excel(file_path, sheet_name='Game Details')
    post_game_df = pd.read_excel(file_path, sheet_name='Post Game Report')
    versus_df = pd.read_excel(file_path, sheet_name='Versus')
    game_stats_df = pd.read_excel(file_path, sheet_name='Game Statistics')
    medal_stats_df = pd.read_excel(file_path, sheet_name='Medal Stats')
    weapon_stats_df = pd.read_excel(file_path, sheet_name='Weapon Statistics')

    # Extract game details
    details = {}
    if len(game_details_df) > 0:
        row = game_details_df.iloc[0]
        details = {
            'Game Type': str(row.get('Game Type', 'Unknown')),
            'Variant Name': str(row.get('Variant Name', 'Unknown')),
            'Map Name': str(row.get('Map Name', 'Unknown')),
            'Start Time': str(row.get('Start Time', '')),
            'End Time': str(row.get('End Time', '')),
            'Duration': str(row.get('Duration', '0:00'))
        }

    # Extract players from Post Game Report
    players = []
    for _, row in post_game_df.iterrows():
        score_numeric, score_display = parse_score(row.get('score', 0))
        player = {
            'name': str(row.get('name', '')).strip(),
            'place': str(row.get('place', '')),
            'score': score_display,
            'score_numeric': score_numeric,
            'kills': int(row.get('kills', 0)) if pd.notna(row.get('kills')) else 0,
            'deaths': int(row.get('deaths', 0)) if pd.notna(row.get('deaths')) else 0,
            'assists': int(row.get('assists', 0)) if pd.notna(row.get('assists')) else 0,
            'kda': float(row.get('kda', 0)) if pd.notna(row.get('kda')) else 0,
            'suicides': int(row.get('suicides', 0)) if pd.notna(row.get('suicides')) else 0,
            'team': str(row.get('team', '')).strip(),
            'shots_fired': int(row.get('shots_fired', 0)) if pd.notna(row.get('shots_fired')) else 0,
            'shots_hit': int(row.get('shots_hit', 0)) if pd.notna(row.get('shots_hit')) else 0,
            'accuracy': float(row.get('accuracy', 0)) if pd.notna(row.get('accuracy')) else 0,
            'head_shots': int(row.get('head_shots', 0)) if pd.notna(row.get('head_shots')) else 0
        }
        if player['name']:
            players.append(player)

    # Extract versus data
    versus = {}
    if len(versus_df) > 0:
        for i, row in versus_df.iterrows():
            player_name = str(row.iloc[0]).strip()
            if player_name:
                versus[player_name] = {}
                for col in versus_df.columns[1:]:
                    opponent = str(col).strip()
                    kills = int(row[col]) if pd.notna(row[col]) else 0
                    versus[player_name][opponent] = kills

    # Extract detailed game statistics
    detailed_stats = []
    for _, row in game_stats_df.iterrows():
        player_name = str(row.get('Player', '')).strip()
        if player_name:
            stats = {
                'player': player_name,
                'emblem_url': str(row.get('Emblem URL', '')) if pd.notna(row.get('Emblem URL')) else '',
                'kills': int(row.get('kills', 0)) if pd.notna(row.get('kills')) else 0,
                'assists': int(row.get('assists', 0)) if pd.notna(row.get('assists')) else 0,
                'deaths': int(row.get('deaths', 0)) if pd.notna(row.get('deaths')) else 0,
                'headshots': int(row.get('headshots', 0)) if pd.notna(row.get('headshots')) else 0,
                'betrayals': int(row.get('betrayals', 0)) if pd.notna(row.get('betrayals')) else 0,
                'suicides': int(row.get('suicides', 0)) if pd.notna(row.get('suicides')) else 0,
                'best_spree': int(row.get('best_spree', 0)) if pd.notna(row.get('best_spree')) else 0,
                'total_time_alive': int(row.get('total_time_alive', 0)) if pd.notna(row.get('total_time_alive')) else 0,
                'ctf_scores': int(row.get('ctf_scores', 0)) if pd.notna(row.get('ctf_scores')) else 0,
                'ctf_flag_steals': int(row.get('ctf_flag_steals', 0)) if pd.notna(row.get('ctf_flag_steals')) else 0,
                'ctf_flag_saves': int(row.get('ctf_flag_saves', 0)) if pd.notna(row.get('ctf_flag_saves')) else 0
            }
            detailed_stats.append(stats)

    # Extract medal statistics
    medals = []
    medal_columns = ['double_kill', 'triple_kill', 'killtacular', 'kill_frenzy', 'killtrocity',
                     'killamanjaro', 'sniper_kill', 'road_kill', 'bone_cracker', 'assassin',
                     'vehicle_destroyed', 'car_jacking', 'stick_it', 'killing_spree',
                     'running_riot', 'rampage', 'beserker', 'over_kill', 'flag_taken',
                     'flag_carrier_kill', 'flag_returned', 'bomb_planted', 'bomb_carrier_kill', 'bomb_returned']

    for _, row in medal_stats_df.iterrows():
        player_name = str(row.get('player', '')).strip()
        if player_name:
            medal_data = {'player': player_name}
            for col in medal_columns:
                if col in row:
                    medal_data[col] = int(row[col]) if pd.notna(row[col]) else 0
            medals.append(medal_data)

    # Extract weapon statistics
    weapons = []
    for _, row in weapon_stats_df.iterrows():
        player_name = str(row.get('Player', '')).strip()
        if player_name:
            weapon_data = {'Player': player_name}
            for col in weapon_stats_df.columns:
                if col != 'Player':
                    col_clean = str(col).strip().lower()
                    weapon_data[col_clean] = int(row[col]) if pd.notna(row[col]) else 0
            weapons.append(weapon_data)

    game = {
        'details': details,
        'players': players,
        'versus': versus,
        'detailed_stats': detailed_stats,
        'medals': medals,
        'weapons': weapons
    }

    return game

def determine_winners_losers(game):
    """Determine winning and losing teams for a 4v4 team game."""
    players = game['players']

    teams = {}
    for player in players:
        team = player.get('team', '').strip()
        if team and team in ['Red', 'Blue']:
            if team not in teams:
                teams[team] = {'score': 0, 'players': []}
            teams[team]['score'] += player.get('score_numeric', 0)
            teams[team]['players'].append(player['name'])

    if len(teams) == 2:
        sorted_teams = sorted(teams.items(), key=lambda x: x[1]['score'], reverse=True)
        winning_team = sorted_teams[0]
        losing_team = sorted_teams[1]

        # Tie = no winners/losers
        if winning_team[1]['score'] == losing_team[1]['score']:
            return [], []

        return winning_team[1]['players'], losing_team[1]['players']

    return [], []

def find_player_by_name(rankstats, name, profile_lookup=None):
    """
    Find a player in rankstats by their stats profile name.

    Matching priority:
    1. MAC ID-linked stats_profile from players.json (via profile_lookup)
    2. discord_name field in rankstats.json
    """
    name_lower = name.lower().strip()

    # First try MAC ID-linked profile lookup from players.json
    if profile_lookup and name_lower in profile_lookup:
        user_id = profile_lookup[name_lower]
        if user_id in rankstats:
            return user_id

    # Fall back to discord_name matching in rankstats
    for user_id, data in rankstats.items():
        discord_name = data.get('discord_name', '').lower()
        if discord_name == name_lower:
            return user_id

    return None

def main():
    print("Starting stats population...")
    print("=" * 50)

    # Load configurations
    xp_config = load_xp_config()
    rank_thresholds = xp_config['rank_thresholds']
    xp_win = xp_config['game_win']  # 100 XP per win
    xp_loss = xp_config['game_loss']  # -100 XP per loss
    loss_factors = xp_config.get('loss_factors', {})
    win_factors = xp_config.get('win_factors', {})

    # Load existing rankstats
    rankstats = load_rankstats()

    # Load players.json for stats_profile to Discord user mappings
    # The bot populates stats_profile by parsing identity XLSX files
    players = load_players()
    print(f"Loaded {len(players)} players from players.json")

    # Build profile name to user_id lookup using stats_profile field
    profile_lookup = build_profile_lookup(players)
    print(f"Built {len(profile_lookup)} profile->user mappings")

    # Load active matches from Discord bot (if any)
    active_match = load_active_matches()
    if active_match:
        print(f"\nActive match detected: {active_match.get('playlist', 'Unknown')} playlist")
        if active_match.get('red_team'):
            print(f"  Red team: {', '.join(active_match['red_team'])}")
        if active_match.get('blue_team'):
            print(f"  Blue team: {', '.join(active_match['blue_team'])}")
    else:
        print("\nNo active match detected - using default playlist detection")

    # STEP 1: Zero out ALL player stats
    print("\nStep 1: Zeroing out all player stats...")
    for user_id in rankstats:
        rankstats[user_id]['xp'] = 0
        rankstats[user_id]['wins'] = 0
        rankstats[user_id]['losses'] = 0
        rankstats[user_id]['total_games'] = 0
        rankstats[user_id]['series_wins'] = 0
        rankstats[user_id]['series_losses'] = 0
        rankstats[user_id]['total_series'] = 0
        rankstats[user_id]['rank'] = 1
        # Remove any detailed stats
        for key in ['kills', 'deaths', 'assists', 'headshots']:
            if key in rankstats[user_id]:
                del rankstats[user_id][key]

    print(f"  Zeroed stats for {len(rankstats)} players")

    # STEP 2: Find and parse ALL games, determining playlist for each
    # ALL matches are logged for stats, but only playlist-tagged matches count for rank
    print("\nStep 2: Finding and categorizing games...")
    stats_files = sorted([f for f in os.listdir(STATS_DIR) if f.endswith('.xlsx')])

    # Store ALL games (for stats tracking)
    all_games = []
    # Group games by playlist (for ranking)
    games_by_playlist = {}
    untagged_games = []

    for filename in stats_files:
        file_path = os.path.join(STATS_DIR, filename)
        playlist = determine_playlist(file_path, active_match)

        game = parse_excel_file(file_path)
        game['source_file'] = filename
        game['playlist'] = playlist  # Will be None for untagged games

        # ALL games go into all_games for stats tracking
        all_games.append(game)

        map_name = game['details'].get('Map Name', 'Unknown')
        gametype = game['details'].get('Variant Name', 'Unknown')

        if playlist:
            if playlist not in games_by_playlist:
                games_by_playlist[playlist] = []
            games_by_playlist[playlist].append(game)
            print(f"  [{playlist}] {gametype} on {map_name} - RANKED")
        else:
            untagged_games.append(game)
            print(f"  [UNRANKED] {gametype} on {map_name} - stats only")

    # Summary
    print(f"\nGames categorized by playlist:")
    for playlist, games in games_by_playlist.items():
        print(f"  {playlist}: {len(games)} games (ranked)")
    if untagged_games:
        print(f"  Unranked (stats only): {len(untagged_games)} games")
    print(f"  Total games: {len(all_games)}")

    # Ranked games are those with a valid playlist tag
    ranked_games = games_by_playlist.get(PLAYLIST_MLG_4V4, [])
    ranked_games.extend(games_by_playlist.get(PLAYLIST_TEAM_HARDCORE, []))
    ranked_games.extend(games_by_playlist.get(PLAYLIST_DOUBLE_TEAM, []))
    ranked_games.extend(games_by_playlist.get(PLAYLIST_HEAD_TO_HEAD, []))

    print(f"\nTotal ranked games (for XP/rank): {len(ranked_games)}")
    print(f"Total games (for stats): {len(all_games)}")

    # STEP 3: Process ALL games for stats, but only ranked games for XP
    print("\nStep 3: Processing games (all for stats, ranked for XP)...")

    # Track cumulative stats per player (from ALL games)
    player_game_stats = {}
    # Track XP per playlist per player (only from ranked games)
    player_playlist_xp = {}  # {player_name: {playlist: xp}}
    player_playlist_wins = {}  # {player_name: {playlist: wins}}
    player_playlist_losses = {}  # {player_name: {playlist: losses}}
    player_playlist_games = {}  # {player_name: {playlist: games}}

    # First, identify all players from ALL games and match them to rankstats
    all_player_names = set()
    for game in all_games:
        for player in game['players']:
            all_player_names.add(player['name'])

    # Match players to existing entries or create new ones
    # Uses MAC ID-linked profile matching from players.json
    player_to_id = {}
    for player_name in all_player_names:
        user_id = find_player_by_name(rankstats, player_name, profile_lookup)
        if user_id:
            player_to_id[player_name] = user_id
            # Update alias from players.json if available
            if user_id in players:
                player_data = players[user_id]
                # Set alias from first entry in aliases array (for website display)
                # Priority: aliases[0] > display_name
                aliases = player_data.get('aliases', [])
                if aliases:
                    rankstats[user_id]['alias'] = aliases[0]
                elif player_data.get('display_name'):
                    rankstats[user_id]['alias'] = player_data['display_name']
        else:
            # Create new entry for unmatched player
            temp_id = str(abs(hash(player_name)) % 10**18)
            player_to_id[player_name] = temp_id
            rankstats[temp_id] = {
                'xp': 0,
                'wins': 0,
                'losses': 0,
                'series_wins': 0,
                'series_losses': 0,
                'total_games': 0,
                'total_series': 0,
                'mmr': 750,
                'discord_name': player_name,
                'rank': 1
            }

        # Initialize overall stats tracking (from ALL games)
        player_game_stats[player_name] = {
            'kills': 0, 'deaths': 0, 'assists': 0,
            'games': 0, 'headshots': 0
        }
        # Initialize per-playlist tracking (only from ranked games)
        player_playlist_xp[player_name] = {}
        player_playlist_wins[player_name] = {}
        player_playlist_losses[player_name] = {}
        player_playlist_games[player_name] = {}

    # Track current rank per player per playlist
    player_playlist_rank = {}  # {player_name: {playlist: rank}}
    # Track highest rank achieved per player per playlist
    player_playlist_highest_rank = {}  # {player_name: {playlist: highest_rank}}
    for name in all_player_names:
        player_playlist_rank[name] = {}
        player_playlist_highest_rank[name] = {}

    # Initialize rank history tracking (for rankhistory.json)
    # Structure: {discord_id: {"discord_name": str, "history": [...]}}
    rankhistory = {}

    print(f"  Found {len(all_player_names)} unique players")

    # STEP 3a: Process ALL games for stats (kills, deaths, etc.)
    print("\n  Processing ALL games for stats...")
    for game_num, game in enumerate(all_games, 1):
        game_name = game['details'].get('Variant Name', 'Unknown')
        playlist = game.get('playlist')
        playlist_tag = f"[{playlist}]" if playlist else "[UNRANKED]"

        for player in game['players']:
            player_name = player['name']

            # Update cumulative stats from ALL games
            player_game_stats[player_name]['kills'] += player.get('kills', 0)
            player_game_stats[player_name]['deaths'] += player.get('deaths', 0)
            player_game_stats[player_name]['assists'] += player.get('assists', 0)
            player_game_stats[player_name]['headshots'] += player.get('head_shots', 0)
            player_game_stats[player_name]['games'] += 1

    print(f"  Processed {len(all_games)} games for stats")

    # STEP 3b: Process RANKED games for XP/wins/losses (per playlist)
    print("\n  Processing RANKED games for XP (per playlist)...")
    for game_num, game in enumerate(ranked_games, 1):
        winners, losers = determine_winners_losers(game)
        game_name = game['details'].get('Variant Name', 'Unknown')
        playlist = game.get('playlist')

        if not playlist:
            continue  # Skip untagged games for ranking

        # Get game end time for rankhistory timestamp
        game_end_time = game['details'].get('End Time', '')
        # Convert "MM/DD/YYYY HH:MM" to ISO format "YYYY-MM-DDTHH:MM:00"
        try:
            if game_end_time and '/' in game_end_time:
                dt = datetime.strptime(game_end_time, '%m/%d/%Y %H:%M')
                game_timestamp = dt.strftime('%Y-%m-%dT%H:%M:00')
            else:
                game_timestamp = game_end_time
        except:
            game_timestamp = game_end_time

        print(f"\n  Ranked Game {game_num} [{playlist}]: {game_name}")

        for player in game['players']:
            player_name = player['name']
            user_id = player_to_id.get(player_name)

            # Initialize playlist tracking if needed
            if playlist not in player_playlist_xp[player_name]:
                player_playlist_xp[player_name][playlist] = 0
                player_playlist_wins[player_name][playlist] = 0
                player_playlist_losses[player_name][playlist] = 0
                player_playlist_games[player_name][playlist] = 0
                player_playlist_rank[player_name][playlist] = 1
                player_playlist_highest_rank[player_name][playlist] = 1

            # Get current XP and rank for this playlist (this is rank_before)
            old_xp = player_playlist_xp[player_name][playlist]
            rank_before = player_playlist_rank[player_name][playlist]

            # Determine result and calculate XP change
            xp_change = 0
            game_result = 'tie'

            if player_name in winners:
                player_playlist_wins[player_name][playlist] += 1
                player_playlist_games[player_name][playlist] += 1
                # Apply win factor (high ranks gain less)
                win_factor = get_win_factor(rank_before, win_factors)
                xp_change = int(xp_win * win_factor)
                player_playlist_xp[player_name][playlist] += xp_change
                result = f"WIN (+{xp_change} @ {int(win_factor*100)}%)"
                game_result = 'win'
            elif player_name in losers:
                player_playlist_losses[player_name][playlist] += 1
                player_playlist_games[player_name][playlist] += 1
                # Apply loss factor (low ranks lose less)
                loss_factor = get_loss_factor(rank_before, loss_factors)
                xp_change = int(xp_loss * loss_factor)  # xp_loss is negative
                player_playlist_xp[player_name][playlist] += xp_change
                # Ensure XP cannot go below 0
                if player_playlist_xp[player_name][playlist] < 0:
                    player_playlist_xp[player_name][playlist] = 0
                result = f"LOSS ({xp_change} @ {int(loss_factor*100)}%)"
                game_result = 'loss'
            else:
                player_playlist_games[player_name][playlist] += 1
                result = "TIE"

            new_xp = player_playlist_xp[player_name][playlist]
            new_rank = calculate_rank(new_xp, rank_thresholds)
            player_playlist_rank[player_name][playlist] = new_rank
            # Track highest rank achieved in this playlist
            if new_rank > player_playlist_highest_rank[player_name][playlist]:
                player_playlist_highest_rank[player_name][playlist] = new_rank

            # Add entry to rankhistory for this player
            if user_id:
                if user_id not in rankhistory:
                    discord_name = rankstats.get(user_id, {}).get('discord_name', player_name)
                    rankhistory[user_id] = {
                        'discord_name': discord_name,
                        'history': []
                    }

                history_entry = {
                    'timestamp': game_timestamp,
                    'playlist': playlist,
                    'xp_change': xp_change,
                    'xp_total': new_xp,
                    'rank_before': rank_before,
                    'rank_after': new_rank,
                    'result': game_result
                }
                rankhistory[user_id]['history'].append(history_entry)

            print(f"    {player_name}: {result} | XP: {old_xp} -> {new_xp} | Rank: {rank_before} -> {new_rank}")

    # STEP 4: Update rankstats with final values
    print("\n\nStep 4: Updating rankstats with final values...")

    for player_name in all_player_names:
        user_id = player_to_id[player_name]
        stats = player_game_stats[player_name]

        # Overall stats from ALL games
        rankstats[user_id]['total_games'] = stats['games']
        rankstats[user_id]['kills'] = stats['kills']
        rankstats[user_id]['deaths'] = stats['deaths']
        rankstats[user_id]['assists'] = stats['assists']
        rankstats[user_id]['headshots'] = stats['headshots']

        # Calculate total wins/losses across all playlists (for legacy compatibility)
        total_wins = sum(player_playlist_wins[player_name].values())
        total_losses = sum(player_playlist_losses[player_name].values())
        total_ranked_games = sum(player_playlist_games[player_name].values())

        rankstats[user_id]['wins'] = total_wins
        rankstats[user_id]['losses'] = total_losses

        # Per-playlist ranking data
        playlists_data = {}
        overall_highest_rank = 1
        primary_playlist = None
        primary_xp = 0

        for playlist in player_playlist_xp[player_name]:
            playlist_xp = player_playlist_xp[player_name][playlist]
            playlist_rank = calculate_rank(playlist_xp, rank_thresholds)
            playlist_highest = player_playlist_highest_rank[player_name].get(playlist, 1)
            playlist_wins = player_playlist_wins[player_name].get(playlist, 0)
            playlist_losses = player_playlist_losses[player_name].get(playlist, 0)
            playlist_games = player_playlist_games[player_name].get(playlist, 0)

            playlists_data[playlist] = {
                'xp': playlist_xp,
                'rank': playlist_rank,
                'highest_rank': playlist_highest,
                'wins': playlist_wins,
                'losses': playlist_losses,
                'games': playlist_games
            }

            # Store flat rank for each playlist (legacy compatibility)
            rankstats[user_id][playlist] = playlist_rank

            # Track highest rank across all playlists
            if playlist_highest > overall_highest_rank:
                overall_highest_rank = playlist_highest

            # Primary playlist is the one with most XP
            if playlist_xp > primary_xp:
                primary_xp = playlist_xp
                primary_playlist = playlist

        # Store playlist details
        rankstats[user_id]['playlists'] = playlists_data

        # For legacy compatibility: use primary playlist's XP/rank as the main one
        if primary_playlist:
            rankstats[user_id]['xp'] = primary_xp
            rankstats[user_id]['rank'] = calculate_rank(primary_xp, rank_thresholds)
        else:
            # No ranked games played
            rankstats[user_id]['xp'] = 0
            rankstats[user_id]['rank'] = 1

        rankstats[user_id]['highest_rank'] = overall_highest_rank

    # STEP 5: Save all data files
    print("\nStep 5: Saving data files...")

    with open(RANKSTATS_FILE, 'w') as f:
        json.dump(rankstats, f, indent=2)
    print(f"  Saved {RANKSTATS_FILE}")

    # Save ALL games to gameshistory.json (includes ranked and unranked)
    # Games have their playlist set from determine_playlist() - None for unranked
    with open(GAMESDATA_FILE, 'w') as f:
        json.dump(all_games, f, indent=2)
    print(f"  Saved {GAMESDATA_FILE} ({len(all_games)} total games)")

    # Extract and save player emblems (most recent emblem for each player)
    # Maps discord_id to their emblem_url
    emblems = {}
    for game in all_games:
        for player in game['players']:
            emblem_url = player.get('emblem_url')
            if emblem_url:
                player_name = player['name']
                # Get discord ID for this player
                user_id = player_to_id.get(player_name)
                if user_id:
                    emblems[user_id] = {
                        'emblem_url': emblem_url,
                        'player_name': player_name,
                        'discord_name': rankstats.get(user_id, {}).get('discord_name', player_name)
                    }

    with open(EMBLEMS_FILE, 'w') as f:
        json.dump(emblems, f, indent=2)
    print(f"  Saved {EMBLEMS_FILE} ({len(emblems)} player emblems)")

    # Save rank history (for pre-game rank lookups on the website)
    with open(RANKHISTORY_FILE, 'w') as f:
        json.dump(rankhistory, f, indent=2)
    print(f"  Saved {RANKHISTORY_FILE} ({len(rankhistory)} players with history)")

    # Create gamestats.json (includes all games)
    gamestats = {}
    for i, game in enumerate(all_games, 1):
        match_key = f"match_{i}"
        gamestats[match_key] = {
            "game_1": {
                'map': game['details'].get('Map Name', 'Unknown'),
                'gametype': game['details'].get('Variant Name', 'Unknown'),
                'game_type': game['details'].get('Game Type', 'Unknown'),
                'timestamp': game['details'].get('Start Time', ''),
                'duration': game['details'].get('Duration', ''),
                'playlist': game.get('playlist')  # None for unranked games
            }
        }

    with open(GAMESTATS_FILE, 'w') as f:
        json.dump(gamestats, f, indent=2)
    print(f"  Saved {GAMESTATS_FILE}")

    # Create matchhistory.json (includes all games with proper tagging)
    matchhistory = {
        'total_matches': len(all_games),
        'total_ranked_matches': len(ranked_games),
        'matches': []
    }

    for i, game in enumerate(all_games, 1):
        winners, losers = determine_winners_losers(game)
        red_team = [p['name'] for p in game['players'] if p.get('team') == 'Red']
        blue_team = [p['name'] for p in game['players'] if p.get('team') == 'Blue']
        playlist = game.get('playlist')

        match_entry = {
            'match_number': i,
            'match_type': 'RANKED' if playlist else 'UNRANKED',
            'playlist': playlist,  # None for unranked games
            'timestamp': game['details'].get('Start Time', ''),
            'map': game['details'].get('Map Name', 'Unknown'),
            'gametype': game['details'].get('Variant Name', 'Unknown'),
            'red_team': red_team,
            'blue_team': blue_team,
            'winners': winners,
            'losers': losers
        }
        matchhistory['matches'].append(match_entry)

    with open(MATCHHISTORY_FILE, 'w') as f:
        json.dump(matchhistory, f, indent=2)
    print(f"  Saved {MATCHHISTORY_FILE}")

    # Print summary
    print("\n" + "=" * 50)
    print("STATS POPULATION SUMMARY")
    print("=" * 50)
    print(f"\nGames Summary:")
    print(f"  Total games (stats tracked): {len(all_games)}")
    print(f"  Ranked games (XP/rank counts): {len(ranked_games)}")
    print(f"  Unranked games (stats only): {len(untagged_games)}")

    # Count ranked games by playlist
    print(f"\nRanked Games by Playlist:")
    playlist_counts = {}
    for game in ranked_games:
        pl = game.get('playlist')
        if pl:
            playlist_counts[pl] = playlist_counts.get(pl, 0) + 1
    for pl, count in sorted(playlist_counts.items()):
        print(f"  {pl}: {count} games")

    print(f"\nTotal players with game data: {len(player_game_stats)}")

    print(f"\nTop Rankings (by primary playlist):")
    ranked_players = [(uid, d) for uid, d in rankstats.items() if d.get('wins', 0) > 0 or d.get('losses', 0) > 0]
    ranked_players.sort(key=lambda x: (x[1].get('rank', 0), x[1].get('wins', 0)), reverse=True)
    for uid, d in ranked_players[:15]:
        name = d.get('discord_name', 'Unknown')
        rank = d.get('rank', 1)
        xp = d.get('xp', 0)
        wins = d.get('wins', 0)
        losses = d.get('losses', 0)
        print(f"  {name:20s} | Rank: {rank:2d} | XP: {xp:4d} | W-L: {wins}-{losses}")

    # Note: Website now loads data via fetch() from JSON files
    # No need to embed data in HTML anymore

    print("\nDone!")


if __name__ == '__main__':
    main()
