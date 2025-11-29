#!/usr/bin/env python3
"""
Script to parse Excel stats files and populate the site with game data and rankings.
Only processes 4v4 team games for the MLG 4v4 playlist.
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
HTML_FILE = 'h2carnagereport.html'

# Playlist name for 4v4 games
PLAYLIST_NAME = 'MLG 4v4'

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

def is_4v4_team_game(file_path):
    """Check if a game is a 4v4 team game (has Red and Blue teams)."""
    try:
        post_df = pd.read_excel(file_path, sheet_name='Post Game Report')
        teams = post_df['team'].unique().tolist()
        # Must have both Red and Blue teams and 8 players
        return 'Red' in teams and 'Blue' in teams and len(post_df) == 8
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

def find_player_by_name(rankstats, name):
    """Find a player in rankstats by their discord_name or alias."""
    name_lower = name.lower().strip()

    for user_id, data in rankstats.items():
        discord_name = data.get('discord_name', '').lower()
        alias = data.get('alias', '').lower()
        twitch_name = data.get('twitch_name', '').lower()

        if discord_name == name_lower or alias == name_lower or twitch_name == name_lower:
            return user_id
        if name_lower in discord_name or discord_name in name_lower:
            return user_id

    return None

def main():
    print("Starting stats population (MLG 4v4 only)...")
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

    # STEP 2: Find and parse only 4v4 team games
    print("\nStep 2: Finding 4v4 team games...")
    stats_files = sorted([f for f in os.listdir(STATS_DIR) if f.endswith('.xlsx')])

    team_games = []
    for filename in stats_files:
        file_path = os.path.join(STATS_DIR, filename)
        if is_4v4_team_game(file_path):
            game = parse_excel_file(file_path)
            game['source_file'] = filename
            team_games.append(game)
            print(f"  Found 4v4 game: {game['details'].get('Variant Name')} on {game['details'].get('Map Name')}")
        else:
            print(f"  Skipping non-4v4 game: {filename}")

    print(f"\nTotal 4v4 games found: {len(team_games)}")

    # STEP 3: Process games SEQUENTIALLY and update player stats
    print("\nStep 3: Processing games sequentially (in order played)...")

    # Track cumulative stats and XP per player
    player_game_stats = {}
    player_xp = {}  # Track XP separately for sequential calculation

    # First, identify all players and match them to rankstats
    all_player_names = set()
    for game in team_games:
        for player in game['players']:
            all_player_names.add(player['name'])

    # Match players to existing entries or create new ones
    player_to_id = {}
    for player_name in all_player_names:
        user_id = find_player_by_name(rankstats, player_name)
        if user_id:
            player_to_id[player_name] = user_id
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

        # Initialize tracking
        player_game_stats[player_name] = {
            'kills': 0, 'deaths': 0, 'assists': 0,
            'wins': 0, 'losses': 0, 'games': 0, 'headshots': 0
        }
        player_xp[player_name] = 0  # Start at 0 XP

    # Track current rank per player (starts at rank 1)
    player_rank = {name: 1 for name in all_player_names}

    print(f"  Found {len(all_player_names)} unique players")

    # Process each game in order
    for game_num, game in enumerate(team_games, 1):
        winners, losers = determine_winners_losers(game)
        game_name = game['details'].get('Variant Name', 'Unknown')
        print(f"\n  Game {game_num}: {game_name}")

        for player in game['players']:
            player_name = player['name']

            # Update cumulative stats
            player_game_stats[player_name]['kills'] += player.get('kills', 0)
            player_game_stats[player_name]['deaths'] += player.get('deaths', 0)
            player_game_stats[player_name]['assists'] += player.get('assists', 0)
            player_game_stats[player_name]['headshots'] += player.get('head_shots', 0)
            player_game_stats[player_name]['games'] += 1

            # Calculate XP change based on win/loss with rank-based factors
            old_xp = player_xp[player_name]
            current_rank = player_rank[player_name]

            if player_name in winners:
                player_game_stats[player_name]['wins'] += 1
                # Apply win factor (high ranks gain less)
                win_factor = get_win_factor(current_rank, win_factors)
                xp_change = int(xp_win * win_factor)
                player_xp[player_name] += xp_change
                result = f"WIN (+{xp_change} @ {int(win_factor*100)}%)"
            elif player_name in losers:
                player_game_stats[player_name]['losses'] += 1
                # Apply loss factor (low ranks lose less)
                loss_factor = get_loss_factor(current_rank, loss_factors)
                xp_change = int(xp_loss * loss_factor)  # xp_loss is negative
                player_xp[player_name] += xp_change
                # Ensure XP cannot go below 0
                if player_xp[player_name] < 0:
                    player_xp[player_name] = 0
                result = f"LOSS ({xp_change} @ {int(loss_factor*100)}%)"
            else:
                result = "TIE"

            new_xp = player_xp[player_name]
            new_rank = calculate_rank(new_xp, rank_thresholds)
            player_rank[player_name] = new_rank  # Update rank for next game
            print(f"    {player_name}: {result} | XP: {old_xp} -> {new_xp} | Rank: {new_rank}")

    # STEP 4: Update rankstats with final values
    print("\n\nStep 4: Updating rankstats with final values...")

    for player_name in all_player_names:
        user_id = player_to_id[player_name]
        stats = player_game_stats[player_name]
        final_xp = player_xp[player_name]
        final_rank = calculate_rank(final_xp, rank_thresholds)

        rankstats[user_id]['wins'] = stats['wins']
        rankstats[user_id]['losses'] = stats['losses']
        rankstats[user_id]['total_games'] = stats['games']
        rankstats[user_id]['kills'] = stats['kills']
        rankstats[user_id]['deaths'] = stats['deaths']
        rankstats[user_id]['assists'] = stats['assists']
        rankstats[user_id]['headshots'] = stats['headshots']
        rankstats[user_id]['xp'] = final_xp
        rankstats[user_id]['rank'] = final_rank
        rankstats[user_id][PLAYLIST_NAME] = final_rank
        # Track highest rank achieved
        current_highest = rankstats[user_id].get('highest_rank', 1)
        rankstats[user_id]['highest_rank'] = max(current_highest, final_rank)

    # STEP 5: Save all data files
    print("\nStep 5: Saving data files...")

    with open(RANKSTATS_FILE, 'w') as f:
        json.dump(rankstats, f, indent=2)
    print(f"  Saved {RANKSTATS_FILE}")

    # Add playlist to each game
    for game in team_games:
        game['playlist'] = PLAYLIST_NAME

    with open(GAMESDATA_FILE, 'w') as f:
        json.dump(team_games, f, indent=2)
    print(f"  Saved {GAMESDATA_FILE}")

    # Create gamestats.json
    gamestats = {}
    for i, game in enumerate(team_games, 1):
        match_key = f"match_{i}"
        gamestats[match_key] = {
            "game_1": {
                'map': game['details'].get('Map Name', 'Unknown'),
                'gametype': game['details'].get('Variant Name', 'Unknown'),
                'game_type': game['details'].get('Game Type', 'Unknown'),
                'timestamp': game['details'].get('Start Time', ''),
                'duration': game['details'].get('Duration', '')
            }
        }

    with open(GAMESTATS_FILE, 'w') as f:
        json.dump(gamestats, f, indent=2)
    print(f"  Saved {GAMESTATS_FILE}")

    # Create matchhistory.json
    matchhistory = {
        'total_ranked_matches': len(team_games),
        'matches': []
    }

    for i, game in enumerate(team_games, 1):
        winners, losers = determine_winners_losers(game)
        red_team = [p['name'] for p in game['players'] if p.get('team') == 'Red']
        blue_team = [p['name'] for p in game['players'] if p.get('team') == 'Blue']

        match_entry = {
            'match_number': i,
            'match_type': 'RANKED',
            'playlist': PLAYLIST_NAME,
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
    print(f"Playlist: {PLAYLIST_NAME}")
    print(f"Total 4v4 games processed: {len(team_games)}")
    print(f"Total players with game data: {len(player_game_stats)}")

    print(f"\n{PLAYLIST_NAME} Rankings:")
    ranked = [(uid, d) for uid, d in rankstats.items() if d.get('wins', 0) > 0 or d.get('losses', 0) > 0]
    ranked.sort(key=lambda x: (x[1].get('rank', 0), x[1].get('wins', 0)), reverse=True)
    for uid, d in ranked[:15]:
        name = d.get('discord_name', 'Unknown')
        rank = d.get('rank', 1)
        xp = d.get('xp', 0)
        wins = d.get('wins', 0)
        losses = d.get('losses', 0)
        print(f"  {name:20s} | Rank: {rank:2d} | XP: {xp:4d} | W-L: {wins}-{losses}")

    # STEP 6: Update HTML file with embedded data
    print("\nStep 6: Updating HTML file...")
    update_html_file(team_games, rankstats)

    print("\nDone!")


def update_html_file(games_data, rank_stats):
    """Update the HTML file with embedded gamesData and rankStats."""
    import re

    with open(HTML_FILE, 'r') as f:
        html_content = f.read()

    # Update gamesData - find and replace the entire line
    games_json = json.dumps(games_data)
    # Use a function to avoid escape issues
    def replace_games(match):
        return f'let gamesData = {games_json};'

    html_content = re.sub(
        r'let gamesData = \[.*?\];',
        replace_games,
        html_content,
        flags=re.DOTALL
    )

    # Add or update rankStats
    rank_stats_json = json.dumps(rank_stats)

    def replace_rankstats(match):
        return f'let rankStats = {rank_stats_json};'

    if 'let rankStats = ' in html_content:
        html_content = re.sub(
            r'let rankStats = \{.*?\};',
            replace_rankstats,
            html_content,
            flags=re.DOTALL
        )
    else:
        # Insert rankStats after gamesData line
        def insert_rankstats(match):
            return f'{match.group(0)}\n        let rankStats = {rank_stats_json};'

        html_content = re.sub(
            r'let gamesData = \[.*?\];',
            insert_rankstats,
            html_content,
            flags=re.DOTALL
        )

    with open(HTML_FILE, 'w') as f:
        f.write(html_content)

    print(f"  Updated {HTML_FILE}")


if __name__ == '__main__':
    main()
