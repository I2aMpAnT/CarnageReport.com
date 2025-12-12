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
import requests
import subprocess
from datetime import datetime

# File paths - VPS stats directories (the only source for game files)
STATS_PUBLIC_DIR = '/home/carnagereport/stats/public'
STATS_PRIVATE_DIR = '/home/carnagereport/stats/private'
STATS_THEATER_DIR = '/home/carnagereport/stats/theater'
STATS_DIR = STATS_PUBLIC_DIR  # Default fallback for local development
RANKSTATS_FILE = 'rankstats.json'  # Legacy - will be replaced by per-playlist stats
RANKS_FILE = 'ranks.json'  # Simple discord_id -> rank mapping for bot
PLAYLISTS_FILE = 'playlists.json'
CUSTOMGAMES_FILE = 'customgames.json'
XP_CONFIG_FILE = 'xp_config.json'
PLAYERS_FILE = '/home/carnagereport/bot/players.json'
EMBLEMS_FILE = 'emblems.json'
ACTIVE_MATCHES_FILE = 'active_matches.json'
RANKHISTORY_FILE = 'rankhistory.json'
MANUAL_PLAYLISTS_FILE = 'manual_playlists.json'
PROCESSED_STATE_FILE = 'processed_state.json'
SERIES_FILE = 'series.json'

# Bot match history files (on VPS at /home/carnagereport/bot/)
BOT_DIR = '/home/carnagereport/bot'
ACTIVE_MATCH_FILE = f'{BOT_DIR}/activematch.json'  # New single file for all active matches
MATCH_HISTORY_FILES = {
    'Head to Head': f'{BOT_DIR}/head_to_head_matches.json',
    'Double Team': f'{BOT_DIR}/double_team_matches.json',
    'Team Hardcore': f'{BOT_DIR}/team_hardcore_matches.json',
    'MLG 4v4': f'{BOT_DIR}/MLG4v4.json',
}

# Base URL for downloadable files on the VPS
STATS_BASE_URL = 'http://104.207.143.249/stats'

# Discord webhook for triggering bot rank refresh
DISCORD_REFRESH_WEBHOOK = 'https://discord.com/api/webhooks/1445741545318780958/Vp-tbL32JhMu36j7qxG704GbWcgrJE9-JIdhUrpMMfAx3fpsGv82Sxi5F3r0lepor4fq'
DISCORD_TRIGGER_CHANNEL_ID = 1427929973125156924

# Default playlist name for 4v4 games (fallback)
PLAYLIST_NAME = 'MLG 4v4'

# Valid MLG 4v4 combinations: map + base gametype (11 total)
# These use "Game Type" field (CTF, Slayer, Oddball), NOT variant name
VALID_MLG_4V4_COMBOS = {
    "Midship": ["ctf", "slayer", "oddball", "assault"],  # 4 gametypes (includes MLG Bomb/Assault)
    "Beaver Creek": ["ctf", "slayer"],            # 2 gametypes
    "Lockout": ["slayer", "oddball"],             # 2 gametypes
    "Warlock": ["ctf", "slayer", "oddball"],      # 3 gametypes
    "Sanctuary": ["ctf", "slayer"]                # 2 gametypes
}  # Total: 12 combos

# Minimum game duration in seconds to count (filters out restarts)
MIN_GAME_DURATION_SECONDS = 120  # 2 minutes

# Dedicated server names to filter out (not real players)
DEDICATED_SERVER_NAMES = {'statsdedi', 'dedi', 'dedicated', 'server'}

# Hardcoded Unicode name to Discord ID mappings
# For players whose names contain special characters that may not resolve correctly
UNICODE_NAME_MAPPINGS = {
    'isis rinsy isis': '210187331066396672',
    'isisrinsyisis': '210187331066396672',
    # PUA (Private Use Area) Unicode characters - game-specific symbols
    '\ue101\ue100\ue101\ue103\ue075': '210187331066396672',  # iSiS RiNsY iSiS's symbol name
}

# Playlist types
PLAYLIST_MLG_4V4 = 'MLG 4v4'
PLAYLIST_TEAM_HARDCORE = 'Team Hardcore'
PLAYLIST_DOUBLE_TEAM = 'Double Team'
PLAYLIST_HEAD_TO_HEAD = 'Head to Head'

# Playlist aliases - map alternate names to canonical names
PLAYLIST_ALIASES = {
    'Ranked MLG 4v4': PLAYLIST_MLG_4V4,
    'Ranked Team Hardcore': PLAYLIST_TEAM_HARDCORE,
    'Ranked Double Team': PLAYLIST_DOUBLE_TEAM,
    'Ranked Head to Head': PLAYLIST_HEAD_TO_HEAD,
}

# All supported timestamp formats for parsing
TIMESTAMP_FORMATS = [
    '%m/%d/%Y %H:%M',       # 12/9/2025 7:45
    '%m/%d/%Y %H:%M:%S',    # 12/9/2025 7:45:00
    '%Y-%m-%d %H:%M:%S',    # 2025-12-09 07:45:00
    '%Y-%m-%d %H:%M',       # 2025-12-09 07:45
    '%Y-%m-%dT%H:%M:%S',    # 2025-12-09T07:45:00
    '%Y-%m-%dT%H:%M',       # 2025-12-09T07:45
    '%m-%d-%Y %H:%M',       # 12-09-2025 07:45
    '%m-%d-%Y %H:%M:%S',    # 12-09-2025 07:45:00
    '%d/%m/%Y %H:%M',       # 9/12/2025 7:45 (European)
    '%d/%m/%Y %H:%M:%S',    # 9/12/2025 7:45:00 (European)
    '%Y/%m/%d %H:%M',       # 2025/12/09 07:45
    '%Y/%m/%d %H:%M:%S',    # 2025/12/09 07:45:00
    '%m/%d/%y %H:%M',       # 12/9/25 7:45 (2-digit year)
    '%m/%d/%y %H:%M:%S',    # 12/9/25 7:45:00 (2-digit year)
    '%b %d %Y %H:%M',       # Dec 9 2025 7:45
    '%b %d, %Y %H:%M',      # Dec 9, 2025 7:45
    '%B %d %Y %H:%M',       # December 9 2025 7:45
    '%B %d, %Y %H:%M',      # December 9, 2025 7:45
]

def parse_timestamp(timestamp_str):
    """
    Parse a timestamp string into a datetime object.
    Handles many common formats including manually adjusted timestamps.

    Returns datetime object or None if parsing fails.
    """
    if not timestamp_str:
        return None

    # If already a datetime, return it
    if isinstance(timestamp_str, datetime):
        if hasattr(timestamp_str, 'tzinfo') and timestamp_str.tzinfo is not None:
            return timestamp_str.replace(tzinfo=None)
        return timestamp_str

    timestamp_str = str(timestamp_str).strip()
    if not timestamp_str:
        return None

    # Try each format
    for fmt in TIMESTAMP_FORMATS:
        try:
            return datetime.strptime(timestamp_str, fmt)
        except (ValueError, TypeError):
            continue

    # Try pandas as fallback (handles many edge cases)
    try:
        dt = pd.to_datetime(timestamp_str)
        if pd.notna(dt):
            return dt.to_pydatetime().replace(tzinfo=None)
    except:
        pass

    return None

def normalize_playlist_name(playlist):
    """Convert playlist aliases to canonical names."""
    if not playlist:
        return None
    return PLAYLIST_ALIASES.get(playlist, playlist)

def time_to_seconds(time_str):
    """Convert time string like '1:53' or '0:56' to total seconds."""
    if not time_str:
        return 0
    try:
        if isinstance(time_str, (int, float)):
            return int(time_str)
        time_str = str(time_str).strip()
        if ':' in time_str:
            parts = time_str.split(':')
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return int(float(time_str))
    except:
        return 0

def get_base_gametype(game_type_field):
    """
    Convert Game Type field to display name.
    Input: 'CTF', 'Slayer', 'Oddball', 'Assault', 'KoTH', 'Territories', 'Juggernaut'
    Output: 'CTF', 'Team Slayer', 'Oddball', 'Bomb', 'King of the Hill', etc.
    """
    if not game_type_field:
        return 'Unknown'
    gt = game_type_field.strip().lower()
    mapping = {
        'ctf': 'CTF',
        'capture the flag': 'CTF',
        'slayer': 'Team Slayer',
        'team slayer': 'Team Slayer',
        'oddball': 'Oddball',
        'assault': 'Bomb',
        'bomb': 'Bomb',
        'koth': 'King of the Hill',
        'king of the hill': 'King of the Hill',
        'king': 'King of the Hill',
        'territories': 'Territories',
        'juggernaut': 'Juggernaut',
    }
    return mapping.get(gt, game_type_field)

def get_playlist_files(playlist_name):
    """Get the matches and stats filenames for a playlist."""
    return {
        'matches': f'{playlist_name}_matches.json',
        'stats': f'{playlist_name}_stats.json'
    }

def load_playlist_matches(playlist_name):
    """Load existing matches for a playlist."""
    files = get_playlist_files(playlist_name)
    try:
        with open(files['matches'], 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'playlist': playlist_name, 'matches': []}

def save_playlist_matches(playlist_name, matches_data):
    """Save matches for a playlist."""
    files = get_playlist_files(playlist_name)
    with open(files['matches'], 'w') as f:
        json.dump(matches_data, f, indent=2)

def load_playlist_stats(playlist_name):
    """Load existing stats for a playlist."""
    files = get_playlist_files(playlist_name)
    try:
        with open(files['stats'], 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'playlist': playlist_name, 'players': {}}

def save_playlist_stats(playlist_name, stats_data):
    """Save stats for a playlist."""
    files = get_playlist_files(playlist_name)
    with open(files['stats'], 'w') as f:
        json.dump(stats_data, f, indent=2)

def load_custom_games():
    """Load existing custom games."""
    try:
        with open(CUSTOMGAMES_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'matches': []}

def save_custom_games(data):
    """Save custom games."""
    with open(CUSTOMGAMES_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def get_team_signature(game):
    """
    Get a unique signature for the team composition of a game.
    Returns (frozenset of red team, frozenset of blue team) sorted by team.
    This allows detecting when the same players are on the same teams.
    """
    red_team = frozenset(p['name'].lower() for p in game['players'] if p.get('team') == 'Red')
    blue_team = frozenset(p['name'].lower() for p in game['players'] if p.get('team') == 'Blue')
    # Return as tuple with teams sorted to ensure consistent ordering
    return (red_team, blue_team)

def detect_series(games, get_display_name_func):
    """
    Detect series from consecutive games with the same team composition.
    A series ends when the player/team composition changes.

    Returns:
        list of series dicts with:
        - series_id: unique identifier
        - playlist: playlist name
        - red_team: list of player names
        - blue_team: list of player names
        - games: list of game entries in the series
        - red_wins: number of games won by red team
        - blue_wins: number of games won by blue team
        - winner: 'Red', 'Blue', or 'Ongoing'
        - series_type: 'Bo3', 'Bo5', 'Bo7', or 'Custom'
        - start_time: timestamp of first game
        - end_time: timestamp of last game
    """
    if not games:
        return []

    # Sort games by timestamp using robust parser
    def get_game_time(g):
        ts = g['details'].get('Start Time', '')
        dt = parse_timestamp(ts)
        return dt if dt else datetime.min
    sorted_games = sorted(games, key=get_game_time)

    series_list = []
    current_series = None
    series_counter = 0

    for game in sorted_games:
        team_sig = get_team_signature(game)
        winners, _ = determine_winners_losers(game)

        # Get team names
        red_team = sorted([get_display_name_func(p['name']) for p in game['players'] if p.get('team') == 'Red'])
        blue_team = sorted([get_display_name_func(p['name']) for p in game['players'] if p.get('team') == 'Blue'])

        # Determine which team won this game
        red_team_lower = [n.lower() for n in red_team]
        game_winner = None
        if winners:
            winner_name_lower = winners[0].lower() if winners else None
            # Check player_to_id for display name resolution
            for p in game['players']:
                if p['name'] in winners:
                    if p.get('team') == 'Red':
                        game_winner = 'Red'
                    elif p.get('team') == 'Blue':
                        game_winner = 'Blue'
                    break

        # Check if this continues the current series (same team composition)
        if current_series and current_series['_team_sig'] == team_sig:
            # Same series - add game
            current_series['games'].append({
                'timestamp': game['details'].get('Start Time', ''),
                'map': game['details'].get('Map Name', 'Unknown'),
                'gametype': get_base_gametype(game['details'].get('Game Type', '')),
                'variant_name': game['details'].get('Variant Name', ''),
                'winner': game_winner,
                'source_file': game.get('source_file', '')
            })
            current_series['end_time'] = game['details'].get('Start Time', '')

            if game_winner == 'Red':
                current_series['red_wins'] += 1
            elif game_winner == 'Blue':
                current_series['blue_wins'] += 1
        else:
            # Different composition - close previous series if exists
            if current_series:
                # Finalize and add to list
                del current_series['_team_sig']
                _finalize_series(current_series)
                series_list.append(current_series)

            # Start new series
            series_counter += 1
            current_series = {
                '_team_sig': team_sig,  # Internal, removed before saving
                'series_id': f"series_{series_counter}",
                'playlist': game.get('playlist', 'Unknown'),
                'red_team': red_team,
                'blue_team': blue_team,
                'games': [{
                    'timestamp': game['details'].get('Start Time', ''),
                    'map': game['details'].get('Map Name', 'Unknown'),
                    'gametype': get_base_gametype(game['details'].get('Game Type', '')),
                    'variant_name': game['details'].get('Variant Name', ''),
                    'winner': game_winner,
                    'source_file': game.get('source_file', '')
                }],
                'red_wins': 1 if game_winner == 'Red' else 0,
                'blue_wins': 1 if game_winner == 'Blue' else 0,
                'start_time': game['details'].get('Start Time', ''),
                'end_time': game['details'].get('Start Time', ''),
                'winner': 'Ongoing',
                'series_type': 'Custom'
            }

    # Don't forget the last series
    if current_series:
        del current_series['_team_sig']
        _finalize_series(current_series)
        series_list.append(current_series)

    return series_list

def _finalize_series(series):
    """
    Finalize a series by determining the winner and series type.
    """
    red_wins = series['red_wins']
    blue_wins = series['blue_wins']
    total_games = len(series['games'])

    # Determine series type based on games played
    if total_games <= 3:
        series['series_type'] = 'Bo3'
        wins_needed = 2
    elif total_games <= 5:
        series['series_type'] = 'Bo5'
        wins_needed = 3
    elif total_games <= 7:
        series['series_type'] = 'Bo7'
        wins_needed = 4
    else:
        series['series_type'] = 'Custom'
        wins_needed = (total_games // 2) + 1

    # Determine winner
    if red_wins >= wins_needed:
        series['winner'] = 'Red'
    elif blue_wins >= wins_needed:
        series['winner'] = 'Blue'
    elif red_wins > blue_wins:
        series['winner'] = 'Red'  # Series ended with red ahead
    elif blue_wins > red_wins:
        series['winner'] = 'Blue'  # Series ended with blue ahead
    else:
        series['winner'] = 'Tie'  # Equal wins when series ended

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
    Load active and completed matches from bot files.

    Loads from:
    1. activematch.json - New single file for all active matches (has playlist in series_label)
    2. Per-playlist history files (MLG4v4.json, etc.) - Completed matches

    Returns list of all matches (active + completed) with playlist info, or None.
    """
    all_matches = []
    active_count = 0
    completed_count = 0

    # Load from new activematch.json (single file for all active matches)
    try:
        with open(ACTIVE_MATCH_FILE, 'r') as f:
            data = json.load(f)
            for match in data.get('active_matches', []):
                # Determine playlist from series_label or playlist field
                series_label = match.get('series_label', '')
                playlist = match.get('playlist', '')
                if 'MLG' in series_label or 'MLG' in playlist:
                    match['_playlist'] = 'MLG 4v4'
                elif 'Hardcore' in series_label or 'Hardcore' in playlist:
                    match['_playlist'] = 'Team Hardcore'
                elif 'Double' in series_label or 'Double' in playlist:
                    match['_playlist'] = 'Double Team'
                elif 'Head' in series_label or 'H2H' in series_label or 'Head' in playlist:
                    match['_playlist'] = 'Head to Head'
                else:
                    match['_playlist'] = 'MLG 4v4'  # Default
                all_matches.append(match)
                active_count += 1
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"  Warning: Error loading {ACTIVE_MATCH_FILE}: {e}")

    # Load from per-playlist history files (completed matches)
    for playlist_name, filename in MATCH_HISTORY_FILES.items():
        try:
            with open(filename, 'r') as f:
                data = json.load(f)

                # Add active matches (legacy format)
                for match in data.get('active_matches', []):
                    match['_playlist'] = playlist_name
                    all_matches.append(match)
                    active_count += 1

                # Add completed matches
                for match in data.get('matches', []):
                    match['_playlist'] = playlist_name
                    all_matches.append(match)
                    completed_count += 1
        except FileNotFoundError:
            pass
        except Exception as e:
            print(f"  Warning: Error loading {filename}: {e}")

    print(f"  Loaded {len(all_matches)} matches from bot ({active_count} active, {completed_count} completed)")
    return all_matches if all_matches else None

def load_manual_playlists():
    """
    Load manual_playlists.json for manually flagging games with a playlist.

    Expected format:
    {
        "20251128_201839.xlsx": "MLG 4v4",
        "20251128_202256.xlsx": "MLG 4v4",
        ...
    }

    Maps game filename to playlist name. Games listed here will be ranked
    even without a bot session.
    """
    try:
        with open(MANUAL_PLAYLISTS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def load_processed_state():
    """
    Load processed_state.json which tracks what has been processed.

    Format:
    {
        "games": {
            "filename.xlsx": "playlist_or_null"
        },
        "manual_playlists_hash": "hash_of_manual_playlists_json"
    }
    """
    try:
        with open(PROCESSED_STATE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {"games": {}, "manual_playlists_hash": ""}

def save_processed_state(state):
    """Save processed state to file"""
    with open(PROCESSED_STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def get_manual_playlists_hash(manual_playlists):
    """Get a hash of manual_playlists to detect changes"""
    import hashlib
    content = json.dumps(manual_playlists, sort_keys=True)
    return hashlib.md5(content.encode()).hexdigest()

def check_for_changes(stats_files, manual_playlists, processed_state):
    """
    Check what needs to be processed.

    Returns:
        (needs_full_rebuild, new_files, changed_playlists)
        - needs_full_rebuild: True if we need to recalc everything
        - new_files: List of new game files to process
        - changed_playlists: Dict of files whose playlist changed
    """
    old_games = processed_state.get("games", {})
    old_hash = processed_state.get("manual_playlists_hash", "")
    new_hash = get_manual_playlists_hash(manual_playlists)

    new_files = []
    changed_playlists = {}

    for filename in stats_files:
        old_playlist = old_games.get(filename)
        new_playlist = manual_playlists.get(filename)  # None if not in manual

        if filename not in old_games:
            # Brand new file
            new_files.append(filename)
        elif old_playlist != new_playlist:
            # Playlist assignment changed
            changed_playlists[filename] = {"old": old_playlist, "new": new_playlist}

    # If any old game's playlist changed, we need full rebuild
    # (because XP calculations depend on game order and player rank at time)
    needs_full_rebuild = len(changed_playlists) > 0

    return needs_full_rebuild, new_files, changed_playlists


def load_player_state_from_processed(processed_state):
    """
    Load saved player XP/rank state from processed_state.json.
    Returns dict of {user_id: {playlist: {'xp': int, 'rank': int, ...}}}
    """
    return processed_state.get("player_state", {})

def is_dedicated_server(player_name):
    """Check if a player name is a dedicated server (not a real player)."""
    name_lower = player_name.strip().lower()
    # Check exact matches
    if name_lower in DEDICATED_SERVER_NAMES:
        return True
    # Check if name contains 'dedi' as part of name
    if 'dedi' in name_lower and len(name_lower) <= 15:
        return True
    return False


def is_valid_mlg_combo(map_name, base_gametype):
    """Check if map + base gametype is a valid MLG 4v4 combination.

    Uses the base gametype (Game Type field like "CTF", "Slayer", "Oddball"),
    NOT the variant name. There are 11 valid combinations.
    """
    if map_name not in VALID_MLG_4V4_COMBOS:
        return False

    valid_gametypes = VALID_MLG_4V4_COMBOS[map_name]
    base_gametype_lower = base_gametype.lower()

    # Normalize game type names (handle both "CTF" and "capture_the_flag" etc.)
    gametype_aliases = {
        'capture_the_flag': 'ctf',
        'king_of_the_hill': 'koth',
        'king': 'koth',
    }
    normalized_gametype = gametype_aliases.get(base_gametype_lower, base_gametype_lower)

    # Check if base gametype matches any valid type for this map
    for valid_type in valid_gametypes:
        if valid_type in normalized_gametype or normalized_gametype in valid_type:
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

def players_match_active_match(game_players, match, ingame_to_discord=None):
    """
    Check if game players match a match entry's players.
    Handles both old format (red_team/blue_team) and new format (team1/team2).
    Returns True if most players from the game are in the match.

    Args:
        game_players: List of in-game player names from the XLSX file
        match: Match entry from bot's match history
        ingame_to_discord: Optional dict mapping in-game names to Discord names
    """
    if not match:
        return False

    match_players = set()

    # New format: team1/team2 with player_names
    if match.get('team1'):
        match_players.update([p.lower() for p in match['team1'].get('player_names', [])])
    if match.get('team2'):
        match_players.update([p.lower() for p in match['team2'].get('player_names', [])])

    # Old format fallback: red_team/blue_team
    if not match_players:
        if match.get('red_team'):
            match_players.update([p.lower() for p in match['red_team']])
        if match.get('blue_team'):
            match_players.update([p.lower() for p in match['blue_team']])

    if not match_players:
        return False

    # For each game player, check both their in-game name AND resolved Discord name
    matches = 0
    for player in game_players:
        player_lower = player.lower()

        # Direct match with in-game name
        if player_lower in match_players:
            matches += 1
            continue

        # Try resolved Discord name (from identity file -> MAC -> Discord)
        if ingame_to_discord:
            discord_name = ingame_to_discord.get(player_lower, '')
            if discord_name and discord_name.lower() in match_players:
                matches += 1
                continue

    # At least 75% of game players should be in match
    return matches >= len(game_players) * 0.75


def find_match_for_game(game_timestamp, all_matches, game_players, ingame_to_discord_id=None, debug=False, filename=''):
    """
    Find a match entry that corresponds to a game based on timestamp window AND player Discord IDs.

    Args:
        game_timestamp: Game start time as datetime or string
        all_matches: List of match entries from load_active_matches()
        game_players: List of player names from the game
        ingame_to_discord_id: Dict mapping in-game name (lowercase) to Discord ID (integer)
        debug: If True, print debug info
        filename: For debug output

    Returns:
        Matching match entry or None
    """
    if not all_matches:
        return None

    # Parse game timestamp (assumed to be local time, no timezone info)
    # Use robust timestamp parser
    game_dt = parse_timestamp(game_timestamp)
    if game_dt is None:
        if debug:
            print(f"    DEBUG [{filename}]: Failed to parse game timestamp: {game_timestamp}")
        return None

    if debug:
        print(f"    DEBUG [{filename}]: Game datetime (local): {game_dt}")
        print(f"    DEBUG [{filename}]: Game players: {game_players}")

    # Resolve game players to Discord IDs
    game_discord_ids = set()
    if ingame_to_discord_id and game_players:
        for player_name in game_players:
            player_lower = player_name.lower() if player_name else ''
            discord_id = ingame_to_discord_id.get(player_lower)
            if discord_id:
                game_discord_ids.add(str(discord_id))  # Convert to string for comparison
        if debug:
            print(f"    DEBUG [{filename}]: Resolved {len(game_discord_ids)}/{len(game_players)} players to Discord IDs: {game_discord_ids}")

    for idx, match in enumerate(all_matches):
        # Parse match timestamps (bot stores UTC)
        # Handle both old format (string) and new format (object with iso/display/timezone)
        start_time_raw = match.get('start_time')
        end_time_raw = match.get('end_time')
        playlist = match.get('_playlist', 'unknown')

        # Extract ISO string from new format or use directly if old format
        if isinstance(start_time_raw, dict):
            start_time = start_time_raw.get('iso', '')
        else:
            start_time = start_time_raw

        if isinstance(end_time_raw, dict):
            end_time = end_time_raw.get('iso', '')
        else:
            end_time = end_time_raw

        if not start_time:
            continue

        try:
            # Bot timestamps are UTC - convert to local time for comparison
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if start_dt.tzinfo is not None:
                start_dt = start_dt.replace(tzinfo=None)
            # Subtract 5 hours for EST (UTC-5) - bot stores UTC, games are local EST
            from datetime import timedelta
            start_dt = start_dt - timedelta(hours=5)
            # Add 5-minute buffer before start to account for timestamp differences
            start_dt_with_buffer = start_dt - timedelta(minutes=5)
        except:
            continue

        if debug:
            print(f"    DEBUG [{filename}]: Match {idx} ({playlist}): bot_start_utc={start_time}, converted_est={start_dt}, with_buffer={start_dt_with_buffer}")

        # Check if game is within match time window (with buffer)
        if game_dt < start_dt_with_buffer:
            if debug:
                print(f"    DEBUG [{filename}]: Match {idx}: SKIP - game_dt {game_dt} < start_dt_with_buffer {start_dt_with_buffer}")
            continue

        if end_time:
            try:
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                if end_dt.tzinfo is not None:
                    end_dt = end_dt.replace(tzinfo=None)
                # Convert UTC to EST
                end_dt = end_dt - timedelta(hours=5)
                # Add 5-minute buffer after end to account for timestamp differences
                end_dt_with_buffer = end_dt + timedelta(minutes=5)
                if debug:
                    print(f"    DEBUG [{filename}]: Match {idx}: bot_end_utc={end_time}, converted_est={end_dt}, with_buffer={end_dt_with_buffer}")
                if game_dt > end_dt_with_buffer:
                    if debug:
                        print(f"    DEBUG [{filename}]: Match {idx}: SKIP - game_dt {game_dt} > end_dt_with_buffer {end_dt_with_buffer}")
                    continue
            except:
                pass
        # If no end_time (active match), game just needs to be after start

        # Timestamp matches - now verify Discord IDs
        # Get all player_ids from the match (both teams)
        match_discord_ids = set()
        team1 = match.get('team1', {})
        team2 = match.get('team2', {})
        for player_id in team1.get('player_ids', []):
            match_discord_ids.add(str(player_id))
        for player_id in team2.get('player_ids', []):
            match_discord_ids.add(str(player_id))

        if debug:
            print(f"    DEBUG [{filename}]: Match {idx}: Match player_ids: {match_discord_ids}")

        # Check if game players' Discord IDs match the match's player_ids
        if game_discord_ids and match_discord_ids:
            # At least one resolved game player must be in the match
            matching_ids = game_discord_ids & match_discord_ids
            if not matching_ids:
                if debug:
                    print(f"    DEBUG [{filename}]: Match {idx}: SKIP - No matching Discord IDs")
                continue
            if debug:
                print(f"    DEBUG [{filename}]: Match {idx}: Found {len(matching_ids)} matching Discord IDs: {matching_ids}")

        if debug:
            print(f"    DEBUG [{filename}]: Match {idx}: TIMESTAMP + PLAYER MATCH!")
        return match

    return None


def determine_playlist(file_path, all_matches=None, manual_playlists=None, ingame_to_discord_id=None, debug=False):
    """
    Determine the appropriate playlist for a game based on:
    1. Manual override from manual_playlists.json (highest priority)
    2. Game duration (must be >= 2 minutes to filter restarts)
    3. Match from Discord bot (matched by timestamp window AND player Discord IDs)

    Returns: playlist name string or None if game doesn't qualify for any playlist
    """
    filename = os.path.basename(file_path)

    # Check manual override first (highest priority)
    if manual_playlists:
        if filename in manual_playlists:
            # Normalize playlist name (e.g., "Ranked MLG 4v4" -> "MLG 4v4")
            return normalize_playlist_name(manual_playlists[filename])

    # Filter out short games (restarts)
    if not is_game_long_enough(file_path):
        if debug:
            print(f"    DEBUG [{filename}]: Game too short")
        return None

    player_count = get_game_player_count(file_path)
    is_team = is_team_game(file_path)
    game_players = get_game_players(file_path)

    # Get map, base gametype, and start time from game details
    try:
        game_details_df = pd.read_excel(file_path, sheet_name='Game Details')
        if len(game_details_df) > 0:
            row = game_details_df.iloc[0]
            map_name = str(row.get('Map Name', '')).strip()
            base_gametype = str(row.get('Game Type', '')).strip()
            game_start_time = row.get('Start Time', '')
        else:
            map_name = ''
            base_gametype = ''
            game_start_time = ''
    except:
        map_name = ''
        base_gametype = ''
        game_start_time = ''

    if debug:
        print(f"    DEBUG [{filename}]: players={player_count}, is_team={is_team}, start={game_start_time}")
        print(f"    DEBUG [{filename}]: game_players={game_players}")
        print(f"    DEBUG [{filename}]: all_matches count={len(all_matches) if all_matches else 0}")

    # Try to find a matching bot match by timestamp AND player Discord IDs
    if all_matches:
        matched_entry = find_match_for_game(game_start_time, all_matches, game_players, ingame_to_discord_id, debug=debug, filename=filename)

        if matched_entry:
            playlist = matched_entry.get('_playlist') or matched_entry.get('playlist_name', '')
            playlist = normalize_playlist_name(playlist)  # Convert "Ranked MLG 4v4" -> "MLG 4v4" etc.
            if debug:
                print(f"    DEBUG [{filename}]: Matched playlist={playlist}")

            # Head to Head: 1v1 games
            if playlist == PLAYLIST_HEAD_TO_HEAD:
                if player_count == 2:
                    return PLAYLIST_HEAD_TO_HEAD
                elif debug:
                    print(f"    DEBUG [{filename}]: H2H match but player_count={player_count} (need 2)")

            # Double Team: 2v2 team games
            elif playlist == PLAYLIST_DOUBLE_TEAM:
                if player_count == 4 and is_team:
                    return PLAYLIST_DOUBLE_TEAM
                elif debug:
                    print(f"    DEBUG [{filename}]: DT match but player_count={player_count}, is_team={is_team}")

            # MLG 4v4 or Team Hardcore: 4v4 team games with valid map + base gametype
            elif playlist in [PLAYLIST_MLG_4V4, PLAYLIST_TEAM_HARDCORE]:
                if player_count == 8 and is_team:
                    if is_valid_mlg_combo(map_name, base_gametype):
                        return playlist
                    elif debug:
                        print(f"    DEBUG [{filename}]: {playlist} match but invalid map/gametype: {map_name}/{base_gametype}")
                elif debug:
                    print(f"    DEBUG [{filename}]: {playlist} match but player_count={player_count}, is_team={is_team}")
        elif debug:
            print(f"    DEBUG [{filename}]: No matching bot entry found")
    elif debug:
        print(f"    DEBUG [{filename}]: No bot matches loaded")

    # No matching bot session = UNRANKED
    # Games MUST have a bot session to be tagged with a playlist
    return None

def normalize_mac(mac):
    """
    Normalize MAC address to lowercase without any separators.
    Handles: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, aabbccddeeff, etc.
    """
    if not mac:
        return ''
    return mac.replace(':', '').replace('-', '').replace(' ', '').lower()

def build_mac_to_discord_lookup(players):
    """
    Build a lookup from MAC address to Discord user_id from players.json.
    MAC addresses are normalized to lowercase without any separators.
    """
    mac_to_user = {}
    for user_id, data in players.items():
        # Try multiple possible field names for MAC addresses
        mac_addresses = data.get('mac_addresses', [])
        if not mac_addresses:
            mac_addresses = data.get('mac_address', [])
            if isinstance(mac_addresses, str):
                mac_addresses = [mac_addresses]
        if not mac_addresses:
            mac_addr = data.get('mac', '')
            if mac_addr:
                mac_addresses = [mac_addr]

        for mac in mac_addresses:
            normalized_mac = normalize_mac(mac)
            if normalized_mac:
                mac_to_user[normalized_mac] = user_id
    return mac_to_user


def build_ingame_to_discord_mapping(all_identity_mappings, mac_to_discord, players):
    """
    Build a mapping from in-game names to Discord display names.

    This is used to match players in game files (which have in-game names) to
    bot match entries (which have Discord names).

    Flow: in-game name -> MAC (from identity) -> Discord ID -> display name
    """
    ingame_to_discord = {}

    # Combine all identity mappings
    combined_identity = {}
    for mapping in all_identity_mappings.values():
        combined_identity.update(mapping)

    # For each in-game name, try to find the Discord display name
    for ingame_name_lower, mac in combined_identity.items():
        discord_id = mac_to_discord.get(mac)
        if discord_id and discord_id in players:
            player_data = players[discord_id]
            display_name = player_data.get('display_name') or player_data.get('discord_name', '')
            if display_name:
                ingame_to_discord[ingame_name_lower] = display_name

    return ingame_to_discord


def build_ingame_to_discord_id_mapping(all_identity_mappings, mac_to_discord):
    """
    Build a mapping from in-game names to Discord user IDs (integers).

    This is used to match players in game files to bot match player_ids.

    Flow: in-game name -> MAC (from identity) -> Discord ID (integer)
    """
    ingame_to_discord_id = {}

    # Combine all identity mappings
    combined_identity = {}
    for mapping in all_identity_mappings.values():
        combined_identity.update(mapping)

    # For each in-game name, try to find the Discord ID
    for ingame_name_lower, mac in combined_identity.items():
        discord_id = mac_to_discord.get(mac)
        if discord_id:
            ingame_to_discord_id[ingame_name_lower] = discord_id

    return ingame_to_discord_id


def parse_identity_file(identity_path):
    """
    Parse an identity XLSX file and return a mapping of in-game name to MAC address.
    Identity files contain: Player Name, Xbox Identifier, Machine Identifier (MAC)
    """
    try:
        df = pd.read_excel(identity_path)
        name_to_mac = {}
        for _, row in df.iterrows():
            player_name = str(row.get('Player Name', '')).strip()
            # Machine Identifier is the MAC address - normalize it
            raw_mac = str(row.get('Machine Identifier', '')).strip()
            mac = normalize_mac(raw_mac)
            if player_name and mac:
                name_to_mac[player_name.lower()] = mac
        return name_to_mac
    except Exception as e:
        print(f"  Warning: Could not parse identity file {identity_path}: {e}")
        return {}


def get_identity_file_for_game(game_file, identity_dir=None):
    """
    Find the corresponding identity file for a game file.
    Game files: 20251128_201839.xlsx
    Identity files: 20251128_074332_identity.xlsx (use closest timestamp before game)

    Args:
        game_file: Path to the game file
        identity_dir: Directory to search for identity files (optional, defaults to game's dir)
    """
    game_basename = os.path.basename(game_file)
    game_timestamp = game_basename.replace('.xlsx', '')

    # Look for identity files in the specified directory, or game's directory as fallback
    if identity_dir and os.path.exists(identity_dir):
        search_dir = identity_dir
    else:
        search_dir = os.path.dirname(game_file) or STATS_DIR

    if not os.path.exists(search_dir):
        return None

    identity_files = sorted([f for f in os.listdir(search_dir) if '_identity.xlsx' in f])

    if not identity_files:
        return None

    # Find the most recent identity file with timestamp <= game timestamp
    best_identity = None
    for identity_file in identity_files:
        identity_timestamp = identity_file.replace('_identity.xlsx', '')
        if identity_timestamp <= game_timestamp:
            best_identity = identity_file

    # If no identity file before, use the earliest one
    if not best_identity and identity_files:
        best_identity = identity_files[0]

    return os.path.join(search_dir, best_identity) if best_identity else None


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


def resolve_player_to_discord(player_name, identity_name_to_mac, mac_to_discord):
    """
    Resolve a player's in-game name to their Discord ID.

    ONLY valid path: In-game name -> MAC (identity file) -> Discord ID (players.json)

    The MAC address is the source of truth. No shortcuts.
    """
    name_lower = player_name.strip().lower()

    # ONLY valid resolution: In-game name -> MAC (identity file) -> Discord ID (players.json)
    if name_lower in identity_name_to_mac:
        mac = identity_name_to_mac[name_lower]
        if mac in mac_to_discord:
            return mac_to_discord[mac]

    return None

def get_download_urls(game_filename):
    """
    Get download URLs for public stats and theater files based on game filename.

    Args:
        game_filename: The game stats filename (e.g., '20251128_201839.xlsx')

    Returns:
        dict with 'public_url' and 'theater_url' (None if file doesn't exist)
    """
    # Extract timestamp from filename (remove .xlsx extension)
    timestamp = game_filename.replace('.xlsx', '')

    downloads = {
        'public_url': None,
        'theater_url': None
    }

    # Check for stats file in public directory first, then private
    stats_filename = f"{timestamp}.xlsx"
    public_path = os.path.join(STATS_PUBLIC_DIR, stats_filename)
    private_path = os.path.join(STATS_PRIVATE_DIR, stats_filename)

    if os.path.exists(public_path):
        downloads['public_url'] = f"{STATS_BASE_URL}/public/{stats_filename}"
    elif os.path.exists(private_path):
        downloads['public_url'] = f"{STATS_BASE_URL}/private/{stats_filename}"

    # Check for theater file (.csv)
    theater_filename = f"{timestamp}.csv"
    theater_path = os.path.join(STATS_THEATER_DIR, theater_filename)
    if os.path.exists(theater_path):
        downloads['theater_url'] = f"{STATS_BASE_URL}/theater/{theater_filename}"

    return downloads


def get_all_game_files():
    """
    Get all game files from VPS stats directories.
    Returns a list of tuples: (filename, source_dir)

    Stats files are ONLY read from /home/carnagereport/stats/public and /private.
    """
    game_files = []

    # VPS public directory
    if os.path.exists(STATS_PUBLIC_DIR):
        for f in os.listdir(STATS_PUBLIC_DIR):
            if f.endswith('.xlsx') and '_identity' not in f:
                game_files.append((f, STATS_PUBLIC_DIR))

    # VPS private directory
    if os.path.exists(STATS_PRIVATE_DIR):
        for f in os.listdir(STATS_PRIVATE_DIR):
            if f.endswith('.xlsx') and '_identity' not in f:
                # Only add if not already in the list
                if not any(gf[0] == f for gf in game_files):
                    game_files.append((f, STATS_PRIVATE_DIR))

    # Sort by filename (timestamp)
    game_files.sort(key=lambda x: x[0])
    return game_files


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

    # Check if this is a CTF game
    variant_name = game['details'].get('Variant Name', '').lower()
    game_type = game['details'].get('Game Type', '').lower()
    is_ctf = 'ctf' in variant_name or 'ctf' in game_type or 'capture' in game_type or 'flag' in variant_name

    # Build detailed stats lookup for CTF
    detailed = {}
    if is_ctf and game.get('detailed_stats'):
        detailed = {s['player']: s for s in game.get('detailed_stats', [])}

    teams = {}
    for player in players:
        team = player.get('team', '').strip()
        if team and team in ['Red', 'Blue']:
            if team not in teams:
                teams[team] = {'score': 0, 'players': []}
            # For CTF, use flag captures; otherwise use score_numeric
            if is_ctf and detailed:
                teams[team]['score'] += detailed.get(player['name'], {}).get('ctf_scores', 0)
            else:
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
    import argparse
    parser = argparse.ArgumentParser(description='Populate stats from game files')
    parser.add_argument('--force', action='store_true', help='Force full rebuild, ignoring processed_state.json')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()

    # Check for debug mode via argument or environment variable
    debug_mode = args.debug or os.environ.get('POPSTATS_DEBUG', '').lower() in ('1', 'true', 'yes')
    force_rebuild = args.force

    if force_rebuild:
        print("FORCE REBUILD MODE - ignoring processed_state.json")
        print("=" * 50)
    if debug_mode:
        print("DEBUG MODE ENABLED")
        print("=" * 50)

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

    # Build MAC address to Discord ID lookup from players.json
    mac_to_discord = build_mac_to_discord_lookup(players)
    print(f"Built {len(mac_to_discord)} MAC->Discord mappings")

    # Load identity files for in-game name -> Discord mapping
    print("\nLoading identity files for in-game name -> Discord mapping...")
    identity_dir = STATS_PRIVATE_DIR if os.path.exists(STATS_PRIVATE_DIR) else STATS_DIR
    all_identity_mappings = {}
    if os.path.exists(identity_dir):
        identity_files = sorted([f for f in os.listdir(identity_dir) if '_identity.xlsx' in f])
        for identity_file in identity_files:
            identity_path = os.path.join(identity_dir, identity_file)
            name_to_mac = parse_identity_file(identity_path)
            all_identity_mappings[identity_file] = name_to_mac
        print(f"  Loaded {len(identity_files)} identity file(s) with {sum(len(m) for m in all_identity_mappings.values())} player mappings")

    # Build in-game name to Discord display name mapping (for stats attribution)
    ingame_to_discord = build_ingame_to_discord_mapping(all_identity_mappings, mac_to_discord, players)
    print(f"Built {len(ingame_to_discord)} in-game->Discord name mappings")

    # Build in-game name to Discord ID mapping (for bot match player matching)
    ingame_to_discord_id = build_ingame_to_discord_id_mapping(all_identity_mappings, mac_to_discord)
    print(f"Built {len(ingame_to_discord_id)} in-game->Discord ID mappings")

    # Load matches from Discord bot match history files
    all_matches = load_active_matches()
    if all_matches:
        active_count = sum(1 for m in all_matches if m.get('result') == 'STARTED' or not m.get('end_time'))
        completed_count = len(all_matches) - active_count
        print(f"\nLoaded {len(all_matches)} matches from bot ({active_count} active, {completed_count} completed)")
    else:
        print("\nNo bot matches loaded")

    # Load manual playlist overrides (if any)
    manual_playlists = load_manual_playlists()
    if manual_playlists:
        print(f"Loaded {len(manual_playlists)} manual playlist override(s)")

    # Check for changes since last run - use get_all_game_files() which checks all directories
    all_game_files = get_all_game_files()
    stats_files = sorted([f[0] for f in all_game_files])  # Extract just filenames

    # If force rebuild, clear processed state to treat all files as new
    if force_rebuild:
        print("\nForce rebuild requested - clearing processed state...")
        processed_state = {"games": {}, "manual_playlists_hash": ""}
        new_files = stats_files  # All files are "new"
        changed_playlists = {}
        needs_full_rebuild = True
    else:
        processed_state = load_processed_state()
        needs_full_rebuild, new_files, changed_playlists = check_for_changes(stats_files, manual_playlists, processed_state)

        if not new_files and not changed_playlists:
            print("\nNo changes detected - nothing to process!")
            print("  (Add new game files or update manual_playlists.json to trigger processing)")
            print("  (Use --force to force a full rebuild)")
            return

    print(f"\nChanges detected:")
    if new_files:
        print(f"  New files: {len(new_files)}")
        for f in new_files[:5]:
            print(f"    - {f}")
        if len(new_files) > 5:
            print(f"    ... and {len(new_files) - 5} more")
    if changed_playlists:
        print(f"  Playlist changes: {len(changed_playlists)}")
        for f, change in list(changed_playlists.items())[:3]:
            print(f"    - {f}: {change['old']} -> {change['new']}")

    # Determine processing mode
    incremental_mode = not needs_full_rebuild and len(new_files) > 0
    saved_player_state = load_player_state_from_processed(processed_state) if incremental_mode else {}

    if needs_full_rebuild:
        print("\n  -> Playlist changes require full recalculation from start")
    elif incremental_mode and saved_player_state:
        print("\n  -> Incremental mode: resuming from saved state, processing new games only")
    else:
        print("\n  -> Full processing (no saved state found)")
        incremental_mode = False

    # STEP 1: Zero out or restore player stats
    if incremental_mode and saved_player_state:
        print("\nStep 1: Restoring player stats from saved state...")
        for user_id, state in saved_player_state.items():
            if user_id in rankstats:
                # Restore per-playlist state
                for playlist, pl_state in state.get('playlists', {}).items():
                    if 'playlists' not in rankstats[user_id]:
                        rankstats[user_id]['playlists'] = {}
                    rankstats[user_id]['playlists'][playlist] = pl_state.copy()
                    rankstats[user_id][playlist] = pl_state.get('rank', 1)
                # Restore overall stats
                rankstats[user_id]['xp'] = state.get('xp', 0)
                rankstats[user_id]['rank'] = state.get('rank', 1)
                rankstats[user_id]['wins'] = state.get('wins', 0)
                rankstats[user_id]['losses'] = state.get('losses', 0)
                rankstats[user_id]['total_games'] = state.get('total_games', 0)
                rankstats[user_id]['kills'] = state.get('kills', 0)
                rankstats[user_id]['deaths'] = state.get('deaths', 0)
                rankstats[user_id]['assists'] = state.get('assists', 0)
                rankstats[user_id]['headshots'] = state.get('headshots', 0)
                rankstats[user_id]['highest_rank'] = state.get('highest_rank', 1)
        print(f"  Restored state for {len(saved_player_state)} players")
    else:
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
        # Clear customgames.json during full rebuild to avoid duplicates
        try:
            with open(CUSTOMGAMES_FILE, 'w') as f:
                json.dump([], f)
            print(f"  Cleared {CUSTOMGAMES_FILE} for fresh rebuild")
        except Exception as e:
            print(f"  Warning: Could not clear {CUSTOMGAMES_FILE}: {e}")

    # STEP 2: Find and parse ALL games, determining playlist for each
    # ALL matches are logged for stats, but only playlist-tagged matches count for rank
    print("\nStep 2: Finding and categorizing games...")
    all_game_files = get_all_game_files()  # Returns list of (filename, source_dir) tuples

    # Store ALL games (for stats tracking)
    all_games = []
    # Group games by playlist (for ranking)
    games_by_playlist = {}
    untagged_games = []

    for filename, source_dir in all_game_files:
        file_path = os.path.join(source_dir, filename)
        playlist = determine_playlist(file_path, all_matches, manual_playlists, ingame_to_discord_id, debug=debug_mode)

        game = parse_excel_file(file_path)
        game['source_file'] = filename
        game['source_dir'] = source_dir  # Track where game came from
        game['playlist'] = playlist  # Will be None for untagged games

        # Add download URLs for public stats and theater files
        downloads = get_download_urls(filename)
        game['public_url'] = downloads['public_url']
        game['theater_url'] = downloads['theater_url']

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

    # Parse all identity files and build per-game name->MAC mappings
    # Each identity file covers a session, use it for games in that session
    print("\n  Loading identity files for MAC->name resolution...")
    all_identity_mappings = {}  # {identity_file: {name_lower: mac}}
    # Identity files are in the private directory
    identity_dir = STATS_PRIVATE_DIR if os.path.exists(STATS_PRIVATE_DIR) else STATS_DIR
    identity_files = sorted([f for f in os.listdir(identity_dir) if '_identity.xlsx' in f]) if os.path.exists(identity_dir) else []
    for identity_file in identity_files:
        identity_path = os.path.join(identity_dir, identity_file)
        name_to_mac = parse_identity_file(identity_path)
        all_identity_mappings[identity_file] = name_to_mac
        print(f"    {identity_file}: {len(name_to_mac)} player(s)")

    # Get combined identity mapping (for games that don't have a specific identity file)
    combined_identity = {}
    for mapping in all_identity_mappings.values():
        combined_identity.update(mapping)

    # First, identify all players from ALL games and match them to rankstats
    # Uses identity file MAC -> Discord ID resolution (game by game)
    all_player_names = set()
    player_to_id = {}  # {player_name: discord_id}

    # In incremental mode, restore previous player name -> ID mappings
    if incremental_mode:
        saved_name_to_id = processed_state.get("player_name_to_id", {})
        if saved_name_to_id:
            player_to_id.update(saved_name_to_id)
            print(f"  Restored {len(saved_name_to_id)} player name->ID mappings from saved state")

    for game in all_games:
        game_file = game.get('source_file', '')
        game_source_dir = game.get('source_dir', STATS_PUBLIC_DIR)
        file_path = os.path.join(game_source_dir, game_file)

        # Find and use the identity file for this game's session
        # Identity files are in private dir on VPS, same dir locally
        identity_file = get_identity_file_for_game(file_path, identity_dir)
        if identity_file:
            identity_basename = os.path.basename(identity_file)
            identity_name_to_mac = all_identity_mappings.get(identity_basename, {})
        else:
            identity_name_to_mac = combined_identity

        for player in game['players']:
            player_name = player['name']

            # Skip dedicated servers (not real players)
            if is_dedicated_server(player_name):
                print(f"    Skipping dedicated server: '{player_name}' in {game_file}")
                continue

            all_player_names.add(player_name)

            # Skip if already resolved
            if player_name in player_to_id:
                continue

            # Resolve player using identity MAC -> Discord ID
            user_id = resolve_player_to_discord(
                player_name, identity_name_to_mac, mac_to_discord
            )

            if user_id:
                player_to_id[player_name] = user_id
                # discord_name should already be set correctly in rankstats from players.json
                # Don't overwrite with in-game names - those are only for identification
                # Only set alias if player has explicitly set one (not from in-game names)

                # Check if this player was previously unlinked (had a temp_id)
                # If so, remove the old temp_id entry since they're now properly linked
                old_temp_id = str(abs(hash(player_name)) % 10**18)
                if old_temp_id in rankstats and rankstats[old_temp_id].get('mac_linked') == False:
                    print(f"    Merging previously unlinked player '{player_name}' to discord ID {user_id}")
                    del rankstats[old_temp_id]
            else:
                # Create new entry for unmatched player - flag as not MAC linked
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
                    'discord_name': '',  # Empty - NEVER use in-game name as discord_name
                    'rank': 1,
                    'mac_linked': False,  # Flag to hide from leaderboard until MAC is linked
                    'in_game_name': player_name  # Store in-game name separately for reference
                }
                print(f"    Warning: Could not resolve '{player_name}' to Discord ID (in {game_file})")

            # Initialize overall stats tracking (from ALL games) - only if not already initialized
            if player_name not in player_game_stats:
                # Check if we have saved state for this player (in incremental mode)
                if incremental_mode and user_id and user_id in saved_player_state:
                    saved = saved_player_state[user_id]
                    player_game_stats[player_name] = {
                        'kills': saved.get('kills', 0),
                        'deaths': saved.get('deaths', 0),
                        'assists': saved.get('assists', 0),
                        'games': saved.get('total_games', 0),
                        'headshots': saved.get('headshots', 0)
                    }
                    # Restore per-playlist tracking from saved state
                    player_playlist_xp[player_name] = {}
                    player_playlist_wins[player_name] = {}
                    player_playlist_losses[player_name] = {}
                    player_playlist_games[player_name] = {}
                    for pl, pl_state in saved.get('playlists', {}).items():
                        player_playlist_xp[player_name][pl] = pl_state.get('xp', 0)
                        player_playlist_wins[player_name][pl] = pl_state.get('wins', 0)
                        player_playlist_losses[player_name][pl] = pl_state.get('losses', 0)
                        player_playlist_games[player_name][pl] = pl_state.get('games', 0)
                else:
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
        # In incremental mode, restore saved ranks
        if incremental_mode and name in player_to_id:
            user_id = player_to_id[name]
            if user_id in saved_player_state:
                for pl, pl_state in saved_player_state[user_id].get('playlists', {}).items():
                    player_playlist_rank[name][pl] = pl_state.get('rank', 1)
                    player_playlist_highest_rank[name][pl] = pl_state.get('highest_rank', 1)

    # In incremental mode, restore player XP/rank state from saved state
    if incremental_mode and saved_player_state:
        print("\n  Restoring player XP/rank state from saved state...")
        for user_id, state in saved_player_state.items():
            # Find player names that map to this user_id
            for player_name, pid in player_to_id.items():
                if pid == user_id:
                    # Initialize dicts for this player if not exists
                    if player_name not in player_playlist_xp:
                        player_playlist_xp[player_name] = {}
                        player_playlist_rank[player_name] = {}
                        player_playlist_highest_rank[player_name] = {}
                        player_playlist_wins[player_name] = {}
                        player_playlist_losses[player_name] = {}
                        player_playlist_games[player_name] = {}
                    if player_name not in player_game_stats:
                        player_game_stats[player_name] = {
                            'kills': 0, 'deaths': 0, 'assists': 0,
                            'games': 0, 'headshots': 0
                        }
                    # Restore per-playlist XP and rank
                    for playlist, pl_state in state.get('playlists', {}).items():
                        player_playlist_xp[player_name][playlist] = pl_state.get('xp', 0)
                        player_playlist_rank[player_name][playlist] = pl_state.get('rank', 1)
                        player_playlist_highest_rank[player_name][playlist] = pl_state.get('highest_rank', 1)
                        player_playlist_wins[player_name][playlist] = pl_state.get('wins', 0)
                        player_playlist_losses[player_name][playlist] = pl_state.get('losses', 0)
                        player_playlist_games[player_name][playlist] = pl_state.get('games', 0)
                    # Restore game stats (kills, deaths, etc.)
                    if player_name in player_game_stats:
                        player_game_stats[player_name]['kills'] = state.get('kills', 0)
                        player_game_stats[player_name]['deaths'] = state.get('deaths', 0)
                        player_game_stats[player_name]['assists'] = state.get('assists', 0)
                        player_game_stats[player_name]['headshots'] = state.get('headshots', 0)
                        player_game_stats[player_name]['games'] = state.get('total_games', 0)

    # Initialize rank history tracking (for rankhistory.json)
    # Structure: {discord_id: {"discord_name": str, "history": [...]}}
    rankhistory = load_rankhistory() if incremental_mode else {}

    print(f"  Found {len(all_player_names)} unique players")

    # STEP 3a: Process RANKED games for stats (kills, deaths, etc.)
    # Only include games with a playlist - custom/unranked games are excluded from stats
    # In incremental mode, only process new games (old stats restored from saved state)
    if incremental_mode:
        games_to_process_for_stats = [g for g in ranked_games if g.get('source_file') in new_files]
        print(f"\n  Processing {len(games_to_process_for_stats)} NEW ranked games for stats (incremental mode)...")
    else:
        games_to_process_for_stats = ranked_games
        print(f"\n  Processing {len(games_to_process_for_stats)} ranked games for stats...")

    for game_num, game in enumerate(games_to_process_for_stats, 1):
        game_name = game['details'].get('Variant Name', 'Unknown')
        playlist = game.get('playlist')
        playlist_tag = f"[{playlist}]" if playlist else "[UNRANKED]"

        for player in game['players']:
            player_name = player['name']

            # Skip dedicated servers
            if is_dedicated_server(player_name):
                continue

            # Skip if not in player_game_stats (shouldn't happen, but be safe)
            if player_name not in player_game_stats:
                continue

            # Update cumulative stats
            player_game_stats[player_name]['kills'] += player.get('kills', 0)
            player_game_stats[player_name]['deaths'] += player.get('deaths', 0)
            player_game_stats[player_name]['assists'] += player.get('assists', 0)
            player_game_stats[player_name]['headshots'] += player.get('head_shots', 0)
            player_game_stats[player_name]['games'] += 1

    print(f"  Processed {len(games_to_process_for_stats)} games for stats")

    # STEP 3b: Process RANKED games for XP/wins/losses (per playlist)
    # In incremental mode, only process new games
    if incremental_mode:
        games_to_process_for_xp = [g for g in ranked_games if g.get('source_file') in new_files]
        print(f"\n  Processing {len(games_to_process_for_xp)} NEW ranked games for XP (incremental mode)...")
    else:
        games_to_process_for_xp = ranked_games
        print(f"\n  Processing {len(games_to_process_for_xp)} RANKED games for XP (per playlist)...")

    for game_num, game in enumerate(games_to_process_for_xp, 1):
        winners, losers = determine_winners_losers(game)
        game_name = game['details'].get('Variant Name', 'Unknown')
        playlist = game.get('playlist')

        if not playlist:
            continue  # Skip untagged games for ranking

        # Get game end time for rankhistory timestamp
        game_end_time = game['details'].get('End Time', '')
        # Convert to ISO format "YYYY-MM-DDTHH:MM:00" using robust parser
        dt = parse_timestamp(game_end_time)
        if dt:
            game_timestamp = dt.strftime('%Y-%m-%dT%H:%M:00')
        else:
            game_timestamp = game_end_time

        print(f"\n  Ranked Game {game_num} [{playlist}]: {game_name}")

        for player in game['players']:
            player_name = player['name']

            # Skip dedicated servers
            if is_dedicated_server(player_name):
                continue

            user_id = player_to_id.get(player_name)

            # Skip if not properly resolved
            if player_name not in player_playlist_xp:
                continue

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

            # Store pre_game_rank on the player dict so it can be included in match data
            player['pre_game_rank'] = rank_before

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
                    discord_name = rankstats.get(user_id, {}).get('discord_name', '')
                    rankhistory[user_id] = {
                        'discord_name': discord_name,
                        'history': []
                    }

                history_entry = {
                    'timestamp': game_timestamp,
                    'source_file': game.get('source_file'),
                    'map': game['details'].get('Map Name', 'Unknown'),
                    'gametype': game['details'].get('Variant Name', 'Unknown'),
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

    # Group player names by user_id to consolidate stats for aliases
    user_id_to_names = {}
    for player_name in all_player_names:
        user_id = player_to_id[player_name]
        if user_id not in user_id_to_names:
            user_id_to_names[user_id] = []
        user_id_to_names[user_id].append(player_name)

    for user_id, player_names in user_id_to_names.items():
        # Ensure user exists in rankstats
        if user_id not in rankstats:
            # Get discord_name from players.json ONLY - never use in-game name
            discord_name = players.get(user_id, {}).get('discord_name', '')
            rankstats[user_id] = {
                'discord_name': discord_name,
                'total_games': 0,
                'kills': 0,
                'deaths': 0,
                'assists': 0,
                'headshots': 0,
                'wins': 0,
                'losses': 0,
                'playlists': {},
                'series_wins': 0,
                'series_losses': 0,
            }

        # Consolidate stats from all aliases for this user
        total_games = 0
        total_kills = 0
        total_deaths = 0
        total_assists = 0
        total_headshots = 0

        for player_name in player_names:
            # Initialize all player dicts if missing
            if player_name not in player_game_stats:
                player_game_stats[player_name] = {'kills': 0, 'deaths': 0, 'assists': 0, 'games': 0, 'headshots': 0}
            if player_name not in player_playlist_xp:
                player_playlist_xp[player_name] = {}
            if player_name not in player_playlist_wins:
                player_playlist_wins[player_name] = {}
            if player_name not in player_playlist_losses:
                player_playlist_losses[player_name] = {}
            if player_name not in player_playlist_games:
                player_playlist_games[player_name] = {}
            if player_name not in player_playlist_rank:
                player_playlist_rank[player_name] = {}
            if player_name not in player_playlist_highest_rank:
                player_playlist_highest_rank[player_name] = {}
            stats = player_game_stats[player_name]
            total_games += stats['games']
            total_kills += stats['kills']
            total_deaths += stats['deaths']
            total_assists += stats['assists']
            total_headshots += stats['headshots']

        # Overall stats from ALL games (consolidated)
        rankstats[user_id]['total_games'] = total_games
        rankstats[user_id]['kills'] = total_kills
        rankstats[user_id]['deaths'] = total_deaths
        rankstats[user_id]['assists'] = total_assists
        rankstats[user_id]['headshots'] = total_headshots
        # Store all in-game names for this user (for frontend name resolution)
        rankstats[user_id]['in_game_names'] = player_names
        # Set mac_linked flag - true if not already set to false (from unlinked player creation)
        if 'mac_linked' not in rankstats[user_id]:
            rankstats[user_id]['mac_linked'] = True

        # Calculate total wins/losses across all playlists and all aliases
        total_wins = 0
        total_losses = 0
        for player_name in player_names:
            if player_name not in player_playlist_wins:
                player_playlist_wins[player_name] = {}
            if player_name not in player_playlist_losses:
                player_playlist_losses[player_name] = {}
            total_wins += sum(player_playlist_wins[player_name].values())
            total_losses += sum(player_playlist_losses[player_name].values())

        rankstats[user_id]['wins'] = total_wins
        rankstats[user_id]['losses'] = total_losses

        # Per-playlist ranking data (consolidated from all aliases)
        # First, collect all playlists this user played in across all aliases
        all_playlists = set()
        for player_name in player_names:
            all_playlists.update(player_playlist_xp[player_name].keys())

        playlists_data = {}
        overall_highest_rank = 1
        primary_playlist = None
        primary_xp = 0

        for playlist in all_playlists:
            # Sum stats across all aliases for this playlist
            playlist_xp = 0
            playlist_highest = 1
            playlist_wins = 0
            playlist_losses = 0
            playlist_games = 0

            for player_name in player_names:
                playlist_xp += player_playlist_xp[player_name].get(playlist, 0)
                playlist_highest = max(playlist_highest, player_playlist_highest_rank[player_name].get(playlist, 1))
                playlist_wins += player_playlist_wins[player_name].get(playlist, 0)
                playlist_losses += player_playlist_losses[player_name].get(playlist, 0)
                playlist_games += player_playlist_games[player_name].get(playlist, 0)

            playlist_rank = calculate_rank(playlist_xp, rank_thresholds)

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

        # Store playlist details (use 'playlists' key for bot compatibility)
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

    # Add discord_id to each player in all games (for frontend rank lookups)
    for game in all_games:
        for player in game['players']:
            player_name = player['name']
            if player_name in player_to_id:
                player['discord_id'] = player_to_id[player_name]

    # Save ranks.json - consolidated file for both bot and website
    # Contains all player data needed by both systems
    ranks_data = {}
    for user_id, data in rankstats.items():
        ranks_data[user_id] = {
            # Core identity - use discord_name only, no aliases
            'discord_name': data.get('discord_name', ''),
            'twitch_name': data.get('twitch_name', ''),
            'twitch_url': data.get('twitch_url', ''),
            # Ranking
            'rank': data.get('rank', 1),
            'highest_rank': data.get('highest_rank', 1),
            'xp': data.get('xp', 0),
            'mmr': data.get('mmr', 750),
            # Overall stats
            'wins': data.get('wins', 0),
            'losses': data.get('losses', 0),
            'total_games': data.get('total_games', 0),
            'kills': data.get('kills', 0),
            'deaths': data.get('deaths', 0),
            'assists': data.get('assists', 0),
            'headshots': data.get('headshots', 0),
            # Series stats
            'series_wins': data.get('series_wins', 0),
            'series_losses': data.get('series_losses', 0),
            # Per-playlist data
            'playlists': {}
        }
        # Add per-playlist stats
        playlists_info = data.get('playlists', {})
        for playlist_name, pl_data in playlists_info.items():
            ranks_data[user_id]['playlists'][playlist_name] = {
                'rank': pl_data.get('rank', 1),
                'highest_rank': pl_data.get('highest_rank', 1),
                'xp': pl_data.get('xp', 0),
                'wins': pl_data.get('wins', 0),
                'losses': pl_data.get('losses', 0),
                'games': pl_data.get('games', 0)
            }

    with open(RANKS_FILE, 'w') as f:
        json.dump(ranks_data, f, indent=2)
    print(f"  Saved {RANKS_FILE} ({len(ranks_data)} players)")

    # Save per-playlist matches and stats
    print("\n  Saving per-playlist files...")
    all_playlists = [PLAYLIST_MLG_4V4, PLAYLIST_TEAM_HARDCORE, PLAYLIST_DOUBLE_TEAM, PLAYLIST_HEAD_TO_HEAD]
    playlist_files_saved = []

    # Helper function to get display name (discord_name instead of in-game name)
    def get_display_name(player_name):
        user_id = player_to_id.get(player_name)
        if user_id and user_id in rankstats:
            return rankstats[user_id].get('discord_name') or player_name
        return player_name

    for playlist_name in all_playlists:
        playlist_games = games_by_playlist.get(playlist_name, [])
        if not playlist_games:
            continue

        # Build matches for this playlist
        matches_data = {'playlist': playlist_name, 'matches': []}
        for game in playlist_games:
            winners, losers = determine_winners_losers(game)
            red_team = [get_display_name(p['name']) for p in game['players'] if p.get('team') == 'Red']
            blue_team = [get_display_name(p['name']) for p in game['players'] if p.get('team') == 'Blue']

            # Check if this is a CTF or Oddball game (need special score handling)
            variant_name = game['details'].get('Variant Name', '').lower()
            game_type = game['details'].get('Game Type', '').lower()
            is_ctf = 'ctf' in variant_name or 'ctf' in game_type or 'capture' in game_type or 'flag' in variant_name
            is_oddball = 'oddball' in variant_name or 'oddball' in game_type or 'ball' in game_type

            # Calculate team scores
            if is_ctf and game.get('detailed_stats'):
                # For CTF, use flag captures from detailed stats
                detailed = {s['player']: s for s in game.get('detailed_stats', [])}
                red_score = sum(detailed.get(p['name'], {}).get('ctf_scores', 0) for p in game['players'] if p.get('team') == 'Red')
                blue_score = sum(detailed.get(p['name'], {}).get('ctf_scores', 0) for p in game['players'] if p.get('team') == 'Blue')
            elif is_oddball:
                # For Oddball, convert time scores to seconds
                red_score = sum(time_to_seconds(p.get('score', '0')) for p in game['players'] if p.get('team') == 'Red')
                blue_score = sum(time_to_seconds(p.get('score', '0')) for p in game['players'] if p.get('team') == 'Blue')
            else:
                # For other games, use score_numeric
                red_score = sum(p.get('score_numeric', 0) for p in game['players'] if p.get('team') == 'Red')
                blue_score = sum(p.get('score_numeric', 0) for p in game['players'] if p.get('team') == 'Blue')

            # Determine winner team color
            winner_team = 'Red' if any(p in red_team for p in winners) else 'Blue' if winners else 'Tie'

            # Build player_stats array (basic player info with stats)
            # Keep original in-game name and add discord_id for frontend name resolution
            player_stats = []
            for p in game['players']:
                player_discord_id = player_to_id.get(p['name'])
                player_stats.append({
                    'name': p['name'],  # Keep original in-game name for lookups
                    'discord_id': player_discord_id,  # Add discord_id for name resolution
                    'team': p.get('team', ''),
                    'kills': p.get('kills', 0),
                    'deaths': p.get('deaths', 0),
                    'assists': p.get('assists', 0),
                    'score': p.get('score', '0'),
                    'score_numeric': p.get('score_numeric', 0),
                    'kda': p.get('kda', 0),
                    'suicides': p.get('suicides', 0),
                    'shots_fired': p.get('shots_fired', 0),
                    'shots_hit': p.get('shots_hit', 0),
                    'accuracy': p.get('accuracy', 0),
                    'headshots': p.get('head_shots', 0),
                    'pre_game_rank': p.get('pre_game_rank', 1)
                })

            # Build detailed_stats array (Game Statistics sheet data with emblem URLs)
            # Keep original in-game names - frontend handles display name conversion
            detailed_stats = []
            for stat in game.get('detailed_stats', []):
                detailed_stats.append({
                    'player': stat.get('player', ''),  # Keep original in-game name
                    'emblem_url': stat.get('emblem_url', ''),
                    'kills': stat.get('kills', 0),
                    'assists': stat.get('assists', 0),
                    'deaths': stat.get('deaths', 0),
                    'headshots': stat.get('headshots', 0),
                    'betrayals': stat.get('betrayals', 0),
                    'suicides': stat.get('suicides', 0),
                    'best_spree': stat.get('best_spree', 0),
                    'total_time_alive': stat.get('total_time_alive', 0),
                    'ctf_scores': stat.get('ctf_scores', 0),
                    'ctf_flag_steals': stat.get('ctf_flag_steals', 0),
                    'ctf_flag_saves': stat.get('ctf_flag_saves', 0)
                })

            # Build medals array (Medal Stats sheet data)
            # Keep original in-game names - frontend handles display name conversion
            medals = []
            for medal in game.get('medals', []):
                medal_entry = {'player': medal.get('player', '')}  # Keep original in-game name
                for k, v in medal.items():
                    if k != 'player':
                        medal_entry[k] = v
                medals.append(medal_entry)

            # Build weapons array (Weapon Statistics sheet data)
            # Keep original in-game names - frontend handles display name conversion
            weapons = []
            for weapon in game.get('weapons', []):
                weapon_entry = {'Player': weapon.get('Player', '')}  # Keep original in-game name
                for k, v in weapon.items():
                    if k != 'Player':
                        weapon_entry[k] = v
                weapons.append(weapon_entry)

            # Build versus data (Versus sheet - kill matrix)
            # Keep original in-game names - frontend handles display name conversion
            versus_data = {}
            for player_name, opponents in game.get('versus', {}).items():
                versus_data[player_name] = {}  # Keep original in-game name
                for opponent, kills in opponents.items():
                    versus_data[player_name][opponent.strip()] = kills  # Keep original

            match_entry = {
                'timestamp': game['details'].get('Start Time', ''),
                'map': game['details'].get('Map Name', 'Unknown'),
                'gametype': get_base_gametype(game['details'].get('Variant Name', game['details'].get('Game Type', ''))),
                'variant_name': game['details'].get('Variant Name', ''),
                'duration': game['details'].get('Duration', '0:00'),
                'red_score': red_score,
                'blue_score': blue_score,
                'winner': winner_team,
                'red_team': red_team,
                'blue_team': blue_team,
                'player_stats': player_stats,
                'detailed_stats': detailed_stats,
                'medals': medals,
                'weapons': weapons,
                'versus': versus_data,
                'source_file': game.get('source_file', '')
            }

            # For Head to Head, use player names instead of teams
            if playlist_name == PLAYLIST_HEAD_TO_HEAD:
                all_players = [p['name'] for p in game['players']]
                match_entry['players'] = all_players
                match_entry['winner'] = winners[0] if winners else 'Tie'
                del match_entry['red_team']
                del match_entry['blue_team']

            matches_data['matches'].append(match_entry)

        save_playlist_matches(playlist_name, matches_data)
        playlist_files_saved.append(get_playlist_files(playlist_name)['matches'])
        print(f"    Saved {get_playlist_files(playlist_name)['matches']} ({len(playlist_games)} matches)")

        # Build stats for this playlist
        stats_data = {'playlist': playlist_name, 'players': {}}
        for user_id, data in rankstats.items():
            playlists_info = data.get('playlists', {})
            if playlist_name in playlists_info:
                pl_data = playlists_info[playlist_name]
                stats_data['players'][user_id] = {
                    'discord_name': data.get('discord_name', ''),
                    'xp': pl_data.get('xp', 0),
                    'rank': pl_data.get('rank', 1),
                    'wins': pl_data.get('wins', 0),
                    'losses': pl_data.get('losses', 0),
                    'highest_rank': pl_data.get('highest_rank', 1),
                    # Include overall stats for K/D display
                    'kills': data.get('kills', 0),
                    'deaths': data.get('deaths', 0),
                    'assists': data.get('assists', 0),
                    'headshots': data.get('headshots', 0),
                    # Include series stats
                    'series_wins': data.get('series_wins', 0),
                    'series_losses': data.get('series_losses', 0)
                }

        save_playlist_stats(playlist_name, stats_data)
        playlist_files_saved.append(get_playlist_files(playlist_name)['stats'])
        print(f"    Saved {get_playlist_files(playlist_name)['stats']} ({len(stats_data['players'])} players)")

    # Save unranked games to customgames.json
    if untagged_games:
        custom_data = {'matches': []}
        for game in untagged_games:
            winners, losers = determine_winners_losers(game)
            red_team = [get_display_name(p['name']) for p in game['players'] if p.get('team') == 'Red']
            blue_team = [get_display_name(p['name']) for p in game['players'] if p.get('team') == 'Blue']
            winner_team = 'Red' if any(p in red_team for p in winners) else 'Blue' if winners else 'Tie'

            # Check if this is a CTF or Oddball game
            variant_name = game['details'].get('Variant Name', '').lower()
            game_type = game['details'].get('Game Type', '').lower()
            is_ctf = 'ctf' in variant_name or 'ctf' in game_type or 'capture' in game_type or 'flag' in variant_name
            is_oddball = 'oddball' in variant_name or 'oddball' in game_type or 'ball' in game_type

            # Calculate team scores
            if is_ctf and game.get('detailed_stats'):
                detailed = {s['player']: s for s in game.get('detailed_stats', [])}
                red_score = sum(detailed.get(p['name'], {}).get('ctf_scores', 0) for p in game['players'] if p.get('team') == 'Red')
                blue_score = sum(detailed.get(p['name'], {}).get('ctf_scores', 0) for p in game['players'] if p.get('team') == 'Blue')
            elif is_oddball:
                red_score = sum(time_to_seconds(p.get('score', '0')) for p in game['players'] if p.get('team') == 'Red')
                blue_score = sum(time_to_seconds(p.get('score', '0')) for p in game['players'] if p.get('team') == 'Blue')
            else:
                red_score = sum(p.get('score_numeric', 0) for p in game['players'] if p.get('team') == 'Red')
                blue_score = sum(p.get('score_numeric', 0) for p in game['players'] if p.get('team') == 'Blue')

            # Build player_stats array (basic player info with stats)
            # Keep original in-game name and add discord_id for frontend name resolution
            player_stats = []
            for p in game['players']:
                player_discord_id = player_to_id.get(p['name'])
                player_stats.append({
                    'name': p['name'],  # Keep original in-game name for lookups
                    'discord_id': player_discord_id,  # Add discord_id for name resolution
                    'team': p.get('team', ''),
                    'kills': p.get('kills', 0),
                    'deaths': p.get('deaths', 0),
                    'assists': p.get('assists', 0),
                    'score': p.get('score', '0'),
                    'score_numeric': p.get('score_numeric', 0),
                    'kda': p.get('kda', 0),
                    'suicides': p.get('suicides', 0),
                    'shots_fired': p.get('shots_fired', 0),
                    'shots_hit': p.get('shots_hit', 0),
                    'accuracy': p.get('accuracy', 0),
                    'headshots': p.get('head_shots', 0),
                    'pre_game_rank': p.get('pre_game_rank', 1)
                })

            # Build detailed_stats array (Game Statistics sheet data)
            # Keep original in-game names - frontend handles display name conversion
            detailed_stats = []
            for stat in game.get('detailed_stats', []):
                detailed_stats.append({
                    'player': stat.get('player', ''),  # Keep original in-game name
                    'emblem_url': stat.get('emblem_url', ''),
                    'kills': stat.get('kills', 0),
                    'assists': stat.get('assists', 0),
                    'deaths': stat.get('deaths', 0),
                    'headshots': stat.get('headshots', 0),
                    'betrayals': stat.get('betrayals', 0),
                    'suicides': stat.get('suicides', 0),
                    'best_spree': stat.get('best_spree', 0),
                    'total_time_alive': stat.get('total_time_alive', 0),
                    'ctf_scores': stat.get('ctf_scores', 0),
                    'ctf_flag_steals': stat.get('ctf_flag_steals', 0),
                    'ctf_flag_saves': stat.get('ctf_flag_saves', 0)
                })

            # Build medals array (Medal Stats sheet data)
            # Keep original in-game names - frontend handles display name conversion
            medals = []
            for medal in game.get('medals', []):
                medal_entry = {'player': medal.get('player', '')}  # Keep original in-game name
                for k, v in medal.items():
                    if k != 'player':
                        medal_entry[k] = v
                medals.append(medal_entry)

            # Build weapons array (Weapon Statistics sheet data)
            # Keep original in-game names - frontend handles display name conversion
            weapons = []
            for weapon in game.get('weapons', []):
                weapon_entry = {'Player': weapon.get('Player', '')}  # Keep original in-game name
                for k, v in weapon.items():
                    if k != 'Player':
                        weapon_entry[k] = v
                weapons.append(weapon_entry)

            # Build versus data (Versus sheet - kill matrix)
            # Keep original in-game names - frontend handles display name conversion
            versus_data = {}
            for player_name, opponents in game.get('versus', {}).items():
                versus_data[player_name] = {}  # Keep original in-game name
                for opponent, kills in opponents.items():
                    versus_data[player_name][opponent.strip()] = kills  # Keep original

            match_entry = {
                'timestamp': game['details'].get('Start Time', ''),
                'map': game['details'].get('Map Name', 'Unknown'),
                'gametype': get_base_gametype(game['details'].get('Game Type', '')),
                'variant_name': game['details'].get('Variant Name', 'Unknown'),
                'duration': game['details'].get('Duration', '0:00'),
                'red_score': red_score,
                'blue_score': blue_score,
                'winner': winner_team,
                'red_team': red_team,
                'blue_team': blue_team,
                'player_stats': player_stats,
                'detailed_stats': detailed_stats,
                'medals': medals,
                'weapons': weapons,
                'versus': versus_data,
                'source_file': game.get('source_file', '')
            }
            custom_data['matches'].append(match_entry)

        save_custom_games(custom_data)
        playlist_files_saved.append(CUSTOMGAMES_FILE)
        print(f"    Saved {CUSTOMGAMES_FILE} ({len(untagged_games)} custom games)")

    # Extract and save player emblems (most recent emblem for each player)
    # Maps discord_id to their emblem_url
    # Emblems are in detailed_stats (from Game Statistics sheet), not players
    emblems = {}
    for game in all_games:
        for stat in game.get('detailed_stats', []):
            emblem_url = stat.get('emblem_url')
            if emblem_url:
                player_name = stat.get('player', '')
                # Get discord ID for this player
                user_id = player_to_id.get(player_name)
                if user_id:
                    emblems[user_id] = {
                        'emblem_url': emblem_url,
                        'player_name': player_name,
                        'discord_name': rankstats.get(user_id, {}).get('discord_name', '')
                    }

    with open(EMBLEMS_FILE, 'w') as f:
        json.dump(emblems, f, indent=2)
    print(f"  Saved {EMBLEMS_FILE} ({len(emblems)} player emblems)")

    # Save rank history (for pre-game rank lookups on the website)
    with open(RANKHISTORY_FILE, 'w') as f:
        json.dump(rankhistory, f, indent=2)
    print(f"  Saved {RANKHISTORY_FILE} ({len(rankhistory)} players with history)")

    # Detect and save series data (for manual playlists)
    print("\n  Detecting series from ranked games...")
    all_series = []
    series_player_stats = {}  # Track series wins/losses per player

    for playlist_name in all_playlists:
        playlist_games = games_by_playlist.get(playlist_name, [])
        if not playlist_games:
            continue

        # Detect series for this playlist
        playlist_series = detect_series(playlist_games, get_display_name)
        print(f"    {playlist_name}: {len(playlist_series)} series detected")

        for series in playlist_series:
            all_series.append(series)

            # Track series wins/losses for players
            winning_team = series['winner']
            if winning_team in ['Red', 'Blue']:
                # Get player discord IDs for each team
                for player_name in series['red_team']:
                    # Find discord ID from in-game name
                    for ingame_name, discord_id in player_to_id.items():
                        display = get_display_name(ingame_name)
                        if display == player_name:
                            if discord_id not in series_player_stats:
                                series_player_stats[discord_id] = {'series_wins': 0, 'series_losses': 0}
                            if winning_team == 'Red':
                                series_player_stats[discord_id]['series_wins'] += 1
                            else:
                                series_player_stats[discord_id]['series_losses'] += 1
                            break

                for player_name in series['blue_team']:
                    for ingame_name, discord_id in player_to_id.items():
                        display = get_display_name(ingame_name)
                        if display == player_name:
                            if discord_id not in series_player_stats:
                                series_player_stats[discord_id] = {'series_wins': 0, 'series_losses': 0}
                            if winning_team == 'Blue':
                                series_player_stats[discord_id]['series_wins'] += 1
                            else:
                                series_player_stats[discord_id]['series_losses'] += 1
                            break

    # Update rankstats with series wins/losses
    for discord_id, stats in series_player_stats.items():
        if discord_id in rankstats:
            rankstats[discord_id]['series_wins'] = stats['series_wins']
            rankstats[discord_id]['series_losses'] = stats['series_losses']

    # Save series data for bot
    series_data = {
        'series': all_series,
        'player_series_stats': series_player_stats,
        'generated_at': datetime.now().isoformat()
    }
    with open(SERIES_FILE, 'w') as f:
        json.dump(series_data, f, indent=2)
    print(f"  Saved {SERIES_FILE} ({len(all_series)} series, {len(series_player_stats)} players)")

    # Re-save ranks.json with series data
    for user_id in ranks_data:
        if user_id in series_player_stats:
            ranks_data[user_id]['series_wins'] = series_player_stats[user_id]['series_wins']
            ranks_data[user_id]['series_losses'] = series_player_stats[user_id]['series_losses']
    with open(RANKS_FILE, 'w') as f:
        json.dump(ranks_data, f, indent=2)
    print(f"  Updated {RANKS_FILE} with series stats")

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

    print(f"\nSeries Summary:")
    print(f"  Total series detected: {len(all_series)}")
    series_by_type = {}
    for s in all_series:
        st = s['series_type']
        series_by_type[st] = series_by_type.get(st, 0) + 1
    for st, count in sorted(series_by_type.items()):
        print(f"  {st}: {count} series")

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

    # Save processed state for incremental updates
    print("\n  Saving processed state for future incremental updates...")
    new_player_state = {}
    for user_id, data in rankstats.items():
        # Only save players with actual game data
        if data.get('total_games', 0) > 0 or data.get('wins', 0) > 0 or data.get('losses', 0) > 0:
            new_player_state[user_id] = {
                'xp': data.get('xp', 0),
                'rank': data.get('rank', 1),
                'wins': data.get('wins', 0),
                'losses': data.get('losses', 0),
                'total_games': data.get('total_games', 0),
                'kills': data.get('kills', 0),
                'deaths': data.get('deaths', 0),
                'assists': data.get('assists', 0),
                'headshots': data.get('headshots', 0),
                'highest_rank': data.get('highest_rank', 1),
                'playlists': data.get('playlists', {})
            }

    # Build games dict - preserve old playlist assignments if game wasn't re-matched
    # This prevents losing ranked status if bot files temporarily unavailable
    old_games = processed_state.get("games", {})
    new_games = {}
    for game in all_games:
        filename = game['source_file']
        new_playlist = game.get('playlist')
        old_playlist = old_games.get(filename)

        # If game was previously ranked but now unranked (and not a full rebuild),
        # preserve the old playlist assignment
        if new_playlist is None and old_playlist is not None and not needs_full_rebuild:
            new_games[filename] = old_playlist
            game['playlist'] = old_playlist  # Also update the game object
        else:
            new_games[filename] = new_playlist

    new_processed_state = {
        "games": new_games,
        "manual_playlists_hash": get_manual_playlists_hash(manual_playlists),
        "player_state": new_player_state,
        "player_name_to_id": player_to_id  # Save name->id mapping for incremental mode
    }
    save_processed_state(new_processed_state)
    print(f"  Saved {PROCESSED_STATE_FILE} ({len(new_player_state)} players, {len(all_games)} games)")

    print("\nDone!")

    # Trigger Discord bot to refresh ranks
    print("\nTriggering Discord bot rank refresh...")
    try:
        response = requests.post(DISCORD_REFRESH_WEBHOOK, json={
            "content": "!refresh_ranks_trigger"
        })
        if response.status_code == 204:
            print("  Discord webhook sent successfully!")
        else:
            print(f"  Warning: Webhook returned status {response.status_code}")
    except Exception as e:
        print(f"  Error sending webhook: {e}")

    # Push JSON files to GitHub for website updates
    print("\nPushing stats to GitHub...")
    # Base files
    json_files = [
        RANKS_FILE, RANKHISTORY_FILE, EMBLEMS_FILE,
        PROCESSED_STATE_FILE, PLAYLISTS_FILE, SERIES_FILE
    ]
    # Add per-playlist files that were saved
    json_files.extend(playlist_files_saved)

    try:
        # Change to repository directory (script may run from different location)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)

        # Ensure we're on main branch before committing
        subprocess.run(['git', 'checkout', 'main'], check=True)

        # Add all JSON files (filter out any that don't exist)
        existing_files = [f for f in json_files if os.path.exists(f)]
        subprocess.run(['git', 'add'] + existing_files, check=True)

        # Check if there are changes to commit
        result = subprocess.run(['git', 'diff', '--cached', '--quiet'], capture_output=True)
        if result.returncode == 0:
            print("  No changes to commit")
        else:
            # Commit and push
            commit_msg = f"Update stats ({len(all_games)} games, {len(rankstats)} players)"
            subprocess.run(['git', 'commit', '-m', commit_msg], check=True)
            print(f"  Committed: {commit_msg}")

            # Push to origin main with force (this script is authoritative for stats)
            max_retries = 4
            for attempt in range(max_retries):
                try:
                    subprocess.run(['git', 'push', 'origin', 'main', '--force'], check=True, timeout=60)
                    print("  Pushed to GitHub successfully!")
                    break
                except subprocess.CalledProcessError as e:
                    if attempt < max_retries - 1:
                        wait_time = 2 ** (attempt + 1)  # 2, 4, 8, 16 seconds
                        print(f"  Push failed, retrying in {wait_time}s...")
                        import time
                        time.sleep(wait_time)
                    else:
                        print(f"  Error: Failed to push after {max_retries} attempts")
                        raise
    except subprocess.CalledProcessError as e:
        print(f"  Git error: {e}")
    except Exception as e:
        print(f"  Error pushing to GitHub: {e}")


if __name__ == '__main__':
    main()
