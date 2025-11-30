#!/usr/bin/env python3
"""
fetch_twitch_vods.py - Fetch VODs and Clips from Twitch for a specific time period

Usage:
    python fetch_twitch_vods.py --usernames kidm0de,e212,c6rocky,h2roasted --date "2025-11-28 20:50" --duration 15

Requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET environment variables.
Get these from https://dev.twitch.tv/console/apps
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import urllib.request
import urllib.parse
import urllib.error

# Twitch API endpoints
TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token"
TWITCH_API_BASE = "https://api.twitch.tv/helix"


def get_app_access_token(client_id: str, client_secret: str) -> Optional[str]:
    """Get an app access token from Twitch"""
    data = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials"
    }).encode()

    try:
        req = urllib.request.Request(TWITCH_AUTH_URL, data=data, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            return result.get("access_token")
    except Exception as e:
        print(f"Error getting access token: {e}")
        return None


def twitch_api_request(endpoint: str, params: dict, client_id: str, access_token: str) -> Optional[dict]:
    """Make an authenticated request to Twitch API"""
    url = f"{TWITCH_API_BASE}/{endpoint}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    headers = {
        "Client-ID": client_id,
        "Authorization": f"Bearer {access_token}"
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


def get_user_id(username: str, client_id: str, access_token: str) -> Optional[str]:
    """Get Twitch user ID from username"""
    result = twitch_api_request("users", {"login": username}, client_id, access_token)
    if result and result.get("data"):
        return result["data"][0]["id"]
    return None


def get_vods(user_id: str, client_id: str, access_token: str, first: int = 20) -> List[dict]:
    """Get VODs (past broadcasts) for a user"""
    result = twitch_api_request("videos", {
        "user_id": user_id,
        "type": "archive",  # Past broadcasts
        "first": first
    }, client_id, access_token)

    if result and result.get("data"):
        return result["data"]
    return []


def get_clips(user_id: str, client_id: str, access_token: str,
              started_at: Optional[str] = None, ended_at: Optional[str] = None,
              first: int = 20) -> List[dict]:
    """Get clips for a user within a time range"""
    params = {
        "broadcaster_id": user_id,
        "first": first
    }
    if started_at:
        params["started_at"] = started_at
    if ended_at:
        params["ended_at"] = ended_at

    result = twitch_api_request("clips", params, client_id, access_token)

    if result and result.get("data"):
        return result["data"]
    return []


def parse_datetime(date_str: str) -> datetime:
    """Parse datetime string in various formats"""
    formats = [
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%Y-%m-%dT%H:%M:%SZ"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    raise ValueError(f"Could not parse date: {date_str}")


def vod_covers_time(vod: dict, target_start: datetime, target_end: datetime) -> bool:
    """Check if a VOD covers the target time period"""
    try:
        # Parse VOD start time
        vod_start = datetime.strptime(vod["created_at"], "%Y-%m-%dT%H:%M:%SZ")

        # Parse duration (format: "3h20m15s" or "20m15s" or "45s")
        duration_str = vod.get("duration", "0s")
        total_seconds = 0

        import re
        hours = re.search(r"(\d+)h", duration_str)
        minutes = re.search(r"(\d+)m", duration_str)
        seconds = re.search(r"(\d+)s", duration_str)

        if hours:
            total_seconds += int(hours.group(1)) * 3600
        if minutes:
            total_seconds += int(minutes.group(1)) * 60
        if seconds:
            total_seconds += int(seconds.group(1))

        vod_end = vod_start + timedelta(seconds=total_seconds)

        # Check if there's any overlap between VOD and target period
        # VOD covers target if: vod_start <= target_end AND vod_end >= target_start
        return vod_start <= target_end and vod_end >= target_start
    except Exception as e:
        print(f"Error checking VOD time: {e}")
        return False


def get_vod_timestamp_url(vod: dict, target_time: datetime) -> str:
    """Get VOD URL with timestamp to jump to the match"""
    try:
        vod_start = datetime.strptime(vod["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        offset = target_time - vod_start
        offset_seconds = int(offset.total_seconds())

        if offset_seconds < 0:
            offset_seconds = 0

        hours = offset_seconds // 3600
        minutes = (offset_seconds % 3600) // 60
        seconds = offset_seconds % 60

        timestamp = f"{hours}h{minutes}m{seconds}s"
        return f"{vod['url']}?t={timestamp}"
    except:
        return vod["url"]


def format_duration(duration_str: str) -> str:
    """Format duration string for display"""
    return duration_str


def main():
    parser = argparse.ArgumentParser(description="Fetch Twitch VODs and Clips for a time period")
    parser.add_argument("--usernames", "-u", required=True, help="Comma-separated Twitch usernames")
    parser.add_argument("--date", "-d", required=True, help="Match date/time (e.g., '2025-11-28 20:50')")
    parser.add_argument("--duration", "-m", type=int, default=15, help="Match duration in minutes")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    # Get credentials from environment
    client_id = os.environ.get("TWITCH_CLIENT_ID")
    client_secret = os.environ.get("TWITCH_CLIENT_SECRET")

    if not client_id or not client_secret:
        print("ERROR: Missing Twitch API credentials")
        print()
        print("Please set the following environment variables:")
        print("  export TWITCH_CLIENT_ID='your_client_id'")
        print("  export TWITCH_CLIENT_SECRET='your_client_secret'")
        print()
        print("Get credentials from: https://dev.twitch.tv/console/apps")
        print("1. Click 'Register Your Application'")
        print("2. Name: 'CarnageReport VOD Fetcher'")
        print("3. OAuth Redirect URLs: http://localhost")
        print("4. Category: 'Application Integration'")
        print("5. Click 'Create', then 'Manage' to get Client ID")
        print("6. Click 'New Secret' to get Client Secret")
        sys.exit(1)

    # Parse arguments
    usernames = [u.strip() for u in args.usernames.split(",")]
    match_time = parse_datetime(args.date)
    match_end = match_time + timedelta(minutes=args.duration)

    print(f"Fetching VODs and Clips for: {', '.join(usernames)}")
    print(f"Match time: {match_time} - {match_end} ({args.duration} min)")
    print()

    # Get access token
    print("Authenticating with Twitch...")
    access_token = get_app_access_token(client_id, client_secret)
    if not access_token:
        print("Failed to authenticate with Twitch API")
        sys.exit(1)
    print("Authenticated successfully!")
    print()

    results = {}

    for username in usernames:
        print(f"=== {username} ===")
        results[username] = {"vods": [], "clips": [], "user_id": None}

        # Get user ID
        user_id = get_user_id(username, client_id, access_token)
        if not user_id:
            print(f"  Could not find user: {username}")
            print()
            continue

        results[username]["user_id"] = user_id
        print(f"  User ID: {user_id}")

        # Get VODs
        print(f"  Fetching VODs...")
        vods = get_vods(user_id, client_id, access_token, first=50)
        matching_vods = []

        for vod in vods:
            if vod_covers_time(vod, match_time, match_end):
                matching_vods.append(vod)

        results[username]["vods"] = matching_vods

        if matching_vods:
            print(f"  Found {len(matching_vods)} VOD(s) covering this time:")
            for vod in matching_vods:
                timestamp_url = get_vod_timestamp_url(vod, match_time)
                print(f"    - {vod['title']}")
                print(f"      Duration: {format_duration(vod['duration'])}")
                print(f"      URL: {timestamp_url}")
        else:
            print(f"  No VODs found covering this time period")
            # Show recent VODs for context
            if vods:
                print(f"  Recent VODs (last 3):")
                for vod in vods[:3]:
                    print(f"    - {vod['title']} ({vod['created_at'][:10]})")

        # Get Clips
        print(f"  Fetching Clips...")
        # Search for clips around the match time (expand window by a day since clips can be created later)
        clip_start = (match_time - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        clip_end = (match_end + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")

        clips = get_clips(user_id, client_id, access_token,
                         started_at=clip_start, ended_at=clip_end, first=50)

        results[username]["clips"] = clips

        if clips:
            print(f"  Found {len(clips)} clip(s):")
            for clip in clips[:10]:  # Show first 10
                print(f"    - {clip['title']}")
                print(f"      Created: {clip['created_at'][:16].replace('T', ' ')}")
                print(f"      Views: {clip.get('view_count', 0)}")
                print(f"      URL: {clip['url']}")
        else:
            print(f"  No clips found in this time range")

        print()

    # Output JSON if requested
    if args.json:
        print("\n=== JSON OUTPUT ===")
        print(json.dumps(results, indent=2, default=str))

    # Summary
    print("=== SUMMARY ===")
    total_vods = sum(len(r["vods"]) for r in results.values())
    total_clips = sum(len(r["clips"]) for r in results.values())
    print(f"Total VODs found: {total_vods}")
    print(f"Total Clips found: {total_clips}")

    if total_vods > 0:
        print("\nVODs with timestamps:")
        for username, data in results.items():
            for vod in data["vods"]:
                timestamp_url = get_vod_timestamp_url(vod, match_time)
                print(f"  {username}: {timestamp_url}")


if __name__ == "__main__":
    main()
