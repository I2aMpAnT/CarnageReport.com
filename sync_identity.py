#!/usr/bin/env python3
"""
sync_identity.py - Fetch identity XLSX files from remote server and build MAC ID mappings.

This script connects to the stats server via SFTP, reads identity XLSX files from the
private folder, extracts MAC IDs, and updates players.json with the mappings.

Usage:
    python sync_identity.py

The identity files in /home/carnagereport/stats/private/ contain MAC IDs that can be
used to link players across different profile names. The filename of each identity
XLSX corresponds to the player's profile name.
"""

import paramiko
import pandas as pd
import json
import os
import io
from datetime import datetime

# Server configuration
SERVER_HOST = "104.207.143.249"
SERVER_USER = "root"
PRIVATE_STATS_PATH = "/home/carnagereport/stats/private/"
PUBLIC_STATS_PATH = "/home/carnagereport/stats/public/"

# Local files
PLAYERS_FILE = "players.json"
RANKSTATS_FILE = "rankstats.json"

def log(message):
    """Log with timestamp"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}")

def load_json_file(filepath):
    """Load JSON file or return empty dict"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_json_file(filepath, data):
    """Save data to JSON file"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def connect_sftp():
    """Establish SFTP connection to server"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # Try SSH key first, then agent
    home = os.path.expanduser("~")
    key_paths = [
        os.path.join(home, ".ssh", "id_rsa"),
        os.path.join(home, ".ssh", "id_ed25519"),
    ]

    key = None
    for kp in key_paths:
        if os.path.exists(kp):
            try:
                key = paramiko.RSAKey.from_private_key_file(kp)
                log(f"Using SSH key: {kp}")
                break
            except:
                try:
                    key = paramiko.Ed25519Key.from_private_key_file(kp)
                    log(f"Using SSH key: {kp}")
                    break
                except:
                    pass

    try:
        if key:
            ssh.connect(SERVER_HOST, username=SERVER_USER, pkey=key, timeout=30)
        else:
            log("No SSH key found, using SSH agent")
            ssh.connect(SERVER_HOST, username=SERVER_USER, timeout=30)

        return ssh, ssh.open_sftp()
    except Exception as e:
        log(f"Connection failed: {e}")
        return None, None

def extract_mac_from_identity(sftp, filepath):
    """
    Extract MAC ID from an identity XLSX file.

    Identity files typically contain player profile information including
    their hardware MAC address used for identification.
    """
    try:
        # Read file into memory
        with sftp.file(filepath, 'rb') as f:
            file_data = io.BytesIO(f.read())

        # Try to read Excel file and find MAC ID
        xl = pd.ExcelFile(file_data)

        mac_id = None
        profile_name = None

        # Common patterns for identity data in XLSX files
        for sheet_name in xl.sheet_names:
            df = pd.read_excel(file_data, sheet_name=sheet_name)
            file_data.seek(0)  # Reset for next read

            # Look for MAC-related columns (case-insensitive)
            for col in df.columns:
                col_lower = str(col).lower()
                if any(pattern in col_lower for pattern in ['mac', 'hardware', 'identifier', 'id']):
                    # Get first non-null value
                    values = df[col].dropna()
                    if len(values) > 0:
                        mac_id = str(values.iloc[0]).strip()
                        break

            # Look for profile name column
            for col in df.columns:
                col_lower = str(col).lower()
                if any(pattern in col_lower for pattern in ['profile', 'name', 'player', 'username']):
                    values = df[col].dropna()
                    if len(values) > 0:
                        profile_name = str(values.iloc[0]).strip()
                        break

            if mac_id:
                break

        # If no MAC column found, check if the first column in first row has MAC-like data
        if not mac_id:
            file_data.seek(0)
            df = pd.read_excel(file_data, sheet_name=0)
            if len(df.columns) > 0 and len(df) > 0:
                first_val = str(df.iloc[0, 0]).strip()
                # MAC addresses are typically in format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
                if ':' in first_val or '-' in first_val:
                    mac_id = first_val

        return mac_id, profile_name

    except Exception as e:
        log(f"Error reading {filepath}: {e}")
        return None, None

def sync_identity_data():
    """
    Main sync function - fetches identity data from server and updates players.json
    """
    log("Starting identity sync...")

    # Connect to server
    ssh, sftp = connect_sftp()
    if not sftp:
        log("Failed to connect to server. Please check SSH configuration.")
        return False

    try:
        # Load existing data
        players = load_json_file(PLAYERS_FILE)
        rankstats = load_json_file(RANKSTATS_FILE)

        # Build a map of profile names to discord user IDs from rankstats
        profile_to_user_id = {}
        for user_id, data in rankstats.items():
            discord_name = data.get('discord_name', '').lower()
            if discord_name:
                profile_to_user_id[discord_name] = user_id

        log(f"Found {len(profile_to_user_id)} players in rankstats.json")

        # List identity files in private directory
        log(f"Listing identity files in {PRIVATE_STATS_PATH}...")
        identity_files = []
        try:
            for filename in sftp.listdir(PRIVATE_STATS_PATH):
                if filename.endswith('.xlsx'):
                    identity_files.append(filename)
        except Exception as e:
            log(f"Error listing directory: {e}")
            return False

        log(f"Found {len(identity_files)} identity XLSX files")

        # Process each identity file
        mac_mappings = {}  # MAC ID -> profile name
        updated_count = 0

        for filename in identity_files:
            filepath = os.path.join(PRIVATE_STATS_PATH, filename)

            # The filename (without .xlsx) is the profile name
            profile_name = os.path.splitext(filename)[0]

            # Extract MAC ID from the file
            mac_id, file_profile = extract_mac_from_identity(sftp, filepath)

            if mac_id:
                # Use filename as profile name if not found in file
                final_profile = file_profile or profile_name
                mac_mappings[mac_id] = final_profile
                log(f"  {profile_name}: MAC={mac_id}")

                # Try to match to a user in rankstats
                profile_lower = final_profile.lower()
                if profile_lower in profile_to_user_id:
                    user_id = profile_to_user_id[profile_lower]

                    # Update players.json with MAC ID
                    if user_id not in players:
                        players[user_id] = {}

                    players[user_id]['mac_id'] = mac_id
                    players[user_id]['stats_profile'] = final_profile
                    updated_count += 1
                    log(f"    -> Linked to user {user_id}")

        # Save updated players.json
        save_json_file(PLAYERS_FILE, players)
        log(f"Saved {PLAYERS_FILE} with {updated_count} MAC ID mappings")

        # Also save the raw MAC mappings for reference
        mac_map_file = "mac_mappings.json"
        save_json_file(mac_map_file, mac_mappings)
        log(f"Saved {mac_map_file} with {len(mac_mappings)} entries")

        return True

    finally:
        sftp.close()
        ssh.close()
        log("Connection closed")

def build_mac_lookup():
    """
    Build a MAC ID to user ID lookup from players.json for use in populate_stats.py
    """
    players = load_json_file(PLAYERS_FILE)
    mac_to_user = {}

    for user_id, data in players.items():
        mac_id = data.get('mac_id')
        if mac_id:
            mac_to_user[mac_id] = user_id

    return mac_to_user

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--build-lookup':
        # Just build and print the MAC lookup
        lookup = build_mac_lookup()
        print(json.dumps(lookup, indent=2))
    else:
        # Full sync from server
        success = sync_identity_data()
        sys.exit(0 if success else 1)
