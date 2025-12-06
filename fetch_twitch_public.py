#!/usr/bin/env python3
"""
fetch_twitch_public.py - Fetch public VODs and Clips from Twitch using GQL API
No authentication required for public data.
"""

import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import urllib.request
import urllib.error

TWITCH_GQL_URL = "https://gql.twitch.tv/gql"
CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"  # Twitch's public web client ID


def gql_request(query: str, variables: dict = None) -> Optional[dict]:
    """Make a GraphQL request to Twitch"""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    data = json.dumps(payload).encode()

    headers = {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json"
    }

    try:
        req = urllib.request.Request(TWITCH_GQL_URL, data=data, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        try:
            error_body = e.read().decode()
            print(f"Error body: {error_body[:500]}")
        except:
            pass
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


def get_user_videos(username: str, video_type: str = "ARCHIVE", limit: int = 20) -> List[dict]:
    """Get videos (VODs) for a user"""
    query = """
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
                        publishedAt
                        createdAt
                        lengthSeconds
                        viewCount
                        previewThumbnailURL(width: 320, height: 180)
                        game {
                            name
                        }
                    }
                }
            }
        }
    }
    """

    result = gql_request(query, {
        "login": username,
        "type": video_type,
        "first": limit
    })

    if result and result.get("data", {}).get("user", {}).get("videos"):
        edges = result["data"]["user"]["videos"]["edges"]
        return [edge["node"] for edge in edges]
    return []


def get_user_clips(username: str, limit: int = 20) -> List[dict]:
    """Get clips for a user"""
    query = """
    query GetUserClips($login: String!, $first: Int, $criteria: ClipsCriteriaInput) {
        user(login: $login) {
            id
            login
            displayName
            clips(first: $first, criteria: $criteria) {
                edges {
                    node {
                        id
                        slug
                        title
                        createdAt
                        viewCount
                        durationSeconds
                        url
                        thumbnailURL
                        broadcaster {
                            displayName
                        }
                        game {
                            name
                        }
                    }
                }
            }
        }
    }
    """

    # Get clips from last 7 days
    result = gql_request(query, {
        "login": username,
        "first": limit,
        "criteria": {"filter": "LAST_WEEK"}
    })

    if result and result.get("data", {}).get("user", {}).get("clips"):
        edges = result["data"]["user"]["clips"]["edges"]
        return [edge["node"] for edge in edges]
    return []


def parse_datetime(date_str: str) -> datetime:
    """Parse datetime string"""
    formats = [
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %H:%M",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Could not parse date: {date_str}")


def format_duration(seconds: int) -> str:
    """Format duration in seconds to human readable"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours}h{minutes}m{secs}s"
    elif minutes > 0:
        return f"{minutes}m{secs}s"
    else:
        return f"{secs}s"


def vod_covers_time(vod: dict, target_start: datetime, target_end: datetime) -> tuple:
    """Check if a VOD covers the target time period, return (covers, timestamp_seconds)"""
    try:
        # Parse VOD start time
        created_at = vod.get("createdAt") or vod.get("publishedAt")
        if not created_at:
            return False, 0

        vod_start = datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ")
        duration = vod.get("lengthSeconds", 0)
        vod_end = vod_start + timedelta(seconds=duration)

        # Check overlap
        if vod_start <= target_end and vod_end >= target_start:
            # Calculate timestamp offset
            offset = max(0, (target_start - vod_start).total_seconds())
            return True, int(offset)

        return False, 0
    except Exception as e:
        print(f"Error checking VOD time: {e}")
        return False, 0


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Fetch Twitch VODs and Clips for a match time period")
    parser.add_argument("--usernames", "-u", help="Comma-separated Twitch usernames")
    parser.add_argument("--date", "-d", help="Match date/time in local time (e.g., '2025-11-28 20:50')")
    parser.add_argument("--duration", "-m", type=int, default=15, help="Match duration in minutes")
    parser.add_argument("--utc-offset", "-z", type=int, default=-5,
                       help="UTC offset in hours (default: -5 for EST)")

    args = parser.parse_args()

    # Default values if not specified
    usernames = args.usernames.split(",") if args.usernames else ["kidm0de", "e212", "c6rocky", "h2roasted"]
    usernames = [u.strip() for u in usernames]
    match_time_str = args.date or "2025-11-28 20:50"
    duration_minutes = args.duration
    utc_offset_hours = args.utc_offset

    # Parse local time and convert to UTC
    match_time_local = parse_datetime(match_time_str)
    # Convert local time to UTC by subtracting the offset (EST is -5, so we add 5 hours)
    match_time_utc = match_time_local - timedelta(hours=utc_offset_hours)
    match_end_utc = match_time_utc + timedelta(minutes=duration_minutes)

    print("=" * 60)
    print("TWITCH VOD & CLIP FETCHER")
    print("=" * 60)
    print(f"\nMatch Time (Local): {match_time_str} (Duration: {duration_minutes} min)")
    print(f"Match Time (UTC):   {match_time_utc.strftime('%Y-%m-%d %H:%M')}")
    print(f"Accounts: {', '.join(usernames)}")
    print()

    all_vods = []
    all_clips = []

    for username in usernames:
        print(f"\n{'='*50}")
        print(f"  {username.upper()}")
        print(f"{'='*50}")

        # Get VODs
        print("\n  VODs (Past Broadcasts):")
        print("  " + "-" * 40)

        videos = get_user_videos(username, "ARCHIVE", 30)

        if not videos:
            print("  No VODs found or user doesn't exist")
        else:
            found_match = False
            for vod in videos:
                covers, offset = vod_covers_time(vod, match_time_utc, match_end_utc)
                if covers:
                    found_match = True
                    vod_id = vod["id"]
                    duration = format_duration(vod.get("lengthSeconds", 0))
                    title = vod.get("title", "Untitled")[:60]

                    # Format timestamp
                    h = offset // 3600
                    m = (offset % 3600) // 60
                    s = offset % 60
                    timestamp = f"{h}h{m}m{s}s"

                    url = f"https://twitch.tv/videos/{vod_id}?t={timestamp}"

                    print(f"\n  ** MATCH FOUND **")
                    print(f"  Title: {title}")
                    print(f"  Duration: {duration}")
                    print(f"  Jump to match: {url}")

                    all_vods.append({
                        "username": username,
                        "title": title,
                        "url": url,
                        "vod_id": vod_id
                    })

            if not found_match:
                print("  No VODs covering the match time period")
                if videos:
                    print("\n  Recent VODs:")
                    for vod in videos[:3]:
                        created = vod.get("createdAt", "")[:10]
                        title = vod.get("title", "Untitled")[:50]
                        print(f"    - {created}: {title}")

        # Get Clips
        print("\n  Clips (Last 7 Days):")
        print("  " + "-" * 40)

        clips = get_user_clips(username, 30)

        if not clips:
            print("  No clips found")
        else:
            print(f"  Found {len(clips)} clip(s):")
            for clip in clips[:10]:
                title = clip.get("title", "Untitled")[:50]
                created = clip.get("createdAt", "")[:16].replace("T", " ")
                views = clip.get("viewCount", 0)
                url = clip.get("url", f"https://clips.twitch.tv/{clip.get('slug', '')}")

                print(f"\n    Title: {title}")
                print(f"    Created: {created}")
                print(f"    Views: {views}")
                print(f"    URL: {url}")

                all_clips.append({
                    "username": username,
                    "title": title,
                    "url": url,
                    "created": created,
                    "views": views
                })

    # Summary
    print("\n")
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)

    print(f"\nMatch: MLG CTF Sanctuary - 11/28/2025 20:50 (15:01)")
    print()

    if all_vods:
        print("VODs with Match Footage:")
        print("-" * 40)
        for vod in all_vods:
            print(f"  {vod['username']}: {vod['url']}")
    else:
        print("No VODs found covering the match time period.")
        print("(Streamers may not have been live or VODs may have expired)")

    print()

    if all_clips:
        print(f"Clips Found ({len(all_clips)} total):")
        print("-" * 40)
        for clip in all_clips:
            print(f"  {clip['username']}: {clip['title']}")
            print(f"    {clip['url']}")
    else:
        print("No clips found from last 7 days.")

    print()
    print("Direct channel links:")
    print("-" * 40)
    for username in usernames:
        print(f"  {username}:")
        print(f"    VODs:  https://twitch.tv/{username}/videos")
        print(f"    Clips: https://twitch.tv/{username}/clips")


if __name__ == "__main__":
    main()
