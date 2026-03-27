#!/usr/bin/env python3
"""Populate blind_test_songs with ~500 songs. Run: python3 scripts/populate-songs.py"""

import json
import urllib.request
import urllib.error
import urllib.parse
import re
import time
import sys

URL = "https://rdkgouofytwfdpbxbzio.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJka2dvdW9meXR3ZmRwYnhiemlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU0NzE4NSwiZXhwIjoyMDkwMTIzMTg1fQ.bLOCbY2i_UEWU4iw8MoymkgchoDxc60Kr11mi07R4Q4"

# Get group IDs
def get_group_ids():
    req = urllib.request.Request(
        f"{URL}/rest/v1/groups?select=id,slug",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    )
    resp = urllib.request.urlopen(req)
    groups = json.loads(resp.read())
    return {g["slug"]: g["id"] for g in groups}

GROUP_IDS = get_group_ids()
print(f"Loaded {len(GROUP_IDS)} groups")

# Get existing youtube_ids to avoid duplicates
def get_existing():
    req = urllib.request.Request(
        f"{URL}/rest/v1/blind_test_songs?select=youtube_id&status=eq.active",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    )
    resp = urllib.request.urlopen(req)
    return {s["youtube_id"] for s in json.loads(resp.read())}

EXISTING = get_existing()
print(f"Existing songs: {len(EXISTING)}")

def verify_yt(video_id):
    """Check if a YouTube video ID is valid via oEmbed"""
    try:
        req = urllib.request.Request(
            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        )
        resp = urllib.request.urlopen(req)
        return resp.status == 200
    except:
        return False

def search_yt(artist, title):
    """Search YouTube for an official MV and return the video ID"""
    query = urllib.parse.quote(f"{artist} {title} official MV")
    try:
        req = urllib.request.Request(
            f"https://www.youtube.com/results?search_query={query}",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        resp = urllib.request.urlopen(req)
        html = resp.read().decode("utf-8", errors="ignore")
        ids = re.findall(r'watch\?v=([a-zA-Z0-9_-]{11})', html)
        # Return first unique ID
        seen = set()
        for vid in ids:
            if vid not in seen:
                seen.add(vid)
                if verify_yt(vid):
                    return vid
        return None
    except:
        return None

def insert_batch(songs):
    """Insert a batch of songs, skipping duplicates"""
    if not songs:
        return 0
    data = json.dumps(songs).encode()
    req = urllib.request.Request(
        f"{URL}/rest/v1/blind_test_songs",
        data=data,
        headers={
            "apikey": KEY, "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=ignore-duplicates",
        },
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        return len(result)
    except urllib.error.HTTPError as e:
        print(f"  Insert error {e.code}: {e.read().decode()[:200]}")
        return 0

# Song data: (title, artist, group_slug, year, is_title_track, gender, generation, chorus, wrongs)
ALL_SONGS = [
    # ── BTS ──
    ("Dope", "BTS", "bts", 2015, True, "bg", "3rd", 50, ["I NEED U", "Run", "Fire"]),
    ("I NEED U", "BTS", "bts", 2015, True, "bg", "3rd", 52, ["Dope", "Run", "Save ME"]),
    ("Save ME", "BTS", "bts", 2016, True, "bg", "3rd", 46, ["Fire", "I NEED U", "Run"]),
    ("Danger", "BTS", "bts", 2014, True, "bg", "3rd", 55, ["War of Hormone", "Boy In Luv", "N.O"]),
    ("War of Hormone", "BTS", "bts", 2014, True, "bg", "3rd", 50, ["Danger", "Boy In Luv", "Just One Day"]),
    ("Just One Day", "BTS", "bts", 2014, True, "bg", "3rd", 48, ["War of Hormone", "Danger", "N.O"]),
    ("No More Dream", "BTS", "bts", 2013, True, "bg", "3rd", 52, ["N.O", "We Are Bulletproof Pt.2", "No"]),
    ("N.O", "BTS", "bts", 2013, True, "bg", "3rd", 48, ["No More Dream", "We Are Bulletproof Pt.2", "Boy In Luv"]),
    ("Permission to Dance", "BTS", "bts", 2021, True, "bg", "3rd", 50, ["Butter", "Dynamite", "Life Goes On"]),
    ("Dionysus", "BTS", "bts", 2019, False, "bg", "3rd", 55, ["IDOL", "MIC Drop", "Anpanman"]),
    ("Anpanman", "BTS", "bts", 2018, False, "bg", "3rd", 50, ["Go Go", "IDOL", "Dionysus"]),
    ("Go Go", "BTS", "bts", 2017, False, "bg", "3rd", 48, ["Anpanman", "MIC Drop", "DNA"]),
    ("Silver Spoon", "BTS", "bts", 2016, False, "bg", "3rd", 50, ["Fire", "Save ME", "Dope"]),
    # ── BLACKPINK ──
    ("Playing With Fire", "BLACKPINK", "blackpink", 2016, True, "gg", "3rd", 52, ["Stay", "BOOMBAYAH", "Whistle"]),
    ("Stay", "BLACKPINK", "blackpink", 2016, False, "gg", "3rd", 46, ["Playing With Fire", "Whistle", "BOOMBAYAH"]),
    ("Forever Young", "BLACKPINK", "blackpink", 2018, False, "gg", "3rd", 50, ["DDU-DU DDU-DU", "Really", "As If It's Your Last"]),
    ("Pretty Savage", "BLACKPINK", "blackpink", 2020, False, "gg", "3rd", 48, ["Lovesick Girls", "How You Like That", "Crazy Over You"]),
    ("Ready For Love", "BLACKPINK", "blackpink", 2022, True, "gg", "3rd", 50, ["Pink Venom", "Shut Down", "Typa Girl"]),
    # ── TWICE ──
    ("LIKE OOH-AHH", "TWICE", "twice", 2015, True, "gg", "3rd", 48, ["Cheer Up", "TT", "Knock Knock"]),
    ("SIGNAL", "TWICE", "twice", 2017, True, "gg", "3rd", 50, ["TT", "Likey", "Knock Knock"]),
    ("Likey", "TWICE", "twice", 2017, True, "gg", "3rd", 48, ["TT", "SIGNAL", "Heart Shaker"]),
    ("Heart Shaker", "TWICE", "twice", 2017, True, "gg", "3rd", 46, ["Likey", "SIGNAL", "What is Love?"]),
    ("Dance The Night Away", "TWICE", "twice", 2018, True, "gg", "3rd", 50, ["What is Love?", "YES or YES", "FANCY"]),
    ("YES or YES", "TWICE", "twice", 2018, True, "gg", "3rd", 48, ["Dance The Night Away", "What is Love?", "FANCY"]),
    ("Alcohol-Free", "TWICE", "twice", 2021, True, "gg", "3rd", 52, ["Scientist", "I CAN'T STOP ME", "MORE & MORE"]),
    ("Scientist", "TWICE", "twice", 2021, True, "gg", "3rd", 50, ["Alcohol-Free", "The Feels", "ICON"]),
    ("The Feels", "TWICE", "twice", 2021, True, "gg", "3rd", 46, ["Scientist", "Alcohol-Free", "I CAN'T STOP ME"]),
    ("KNOCK KNOCK", "TWICE", "twice", 2017, True, "gg", "3rd", 48, ["TT", "Cheer Up", "SIGNAL"]),
    ("Talk that Talk", "TWICE", "twice", 2022, True, "gg", "3rd", 50, ["ICON", "Scientist", "Alcohol-Free"]),
    # ── Stray Kids ──
    ("District 9", "Stray Kids", "stray-kids", 2018, True, "bg", "4th", 48, ["My Pace", "Hellevator", "MIROH"]),
    ("My Pace", "Stray Kids", "stray-kids", 2018, True, "bg", "4th", 50, ["District 9", "MIROH", "Side Effects"]),
    ("Side Effects", "Stray Kids", "stray-kids", 2019, True, "bg", "4th", 52, ["MIROH", "Levanter", "Double Knot"]),
    ("Levanter", "Stray Kids", "stray-kids", 2019, True, "bg", "4th", 48, ["Side Effects", "MIROH", "Double Knot"]),
    ("CASE 143", "Stray Kids", "stray-kids", 2022, True, "bg", "4th", 46, ["MANIAC", "S-Class", "Thunderous"]),
    ("Christmas EveL", "Stray Kids", "stray-kids", 2021, True, "bg", "4th", 50, ["Thunderous", "MANIAC", "Back Door"]),
    ("Double Knot", "Stray Kids", "stray-kids", 2019, True, "bg", "4th", 48, ["Side Effects", "MIROH", "Levanter"]),
    ("Hellevator", "Stray Kids", "stray-kids", 2017, True, "bg", "4th", 55, ["District 9", "My Pace", "MIROH"]),
    ("Lose My Breath", "Stray Kids", "stray-kids", 2024, True, "bg", "4th", 46, ["LALALALA", "S-Class", "MANIAC"]),
    # ── EXO ──
    ("Wolf", "EXO", "exo", 2013, True, "bg", "3rd", 55, ["Growl", "Mama", "Overdose"]),
    ("Ko Ko Bop", "EXO", "exo", 2017, True, "bg", "3rd", 50, ["Power", "Tempo", "Love Shot"]),
    ("Power", "EXO", "exo", 2017, True, "bg", "3rd", 48, ["Ko Ko Bop", "Tempo", "Love Shot"]),
    ("Love Me Right", "EXO", "exo", 2015, True, "bg", "3rd", 52, ["Call Me Baby", "Overdose", "Growl"]),
    ("Lucky One", "EXO", "exo", 2016, True, "bg", "3rd", 50, ["Monster", "Lotto", "Love Me Right"]),
    ("Lotto", "EXO", "exo", 2016, True, "bg", "3rd", 48, ["Lucky One", "Monster", "Ko Ko Bop"]),
    ("Cream Soda", "EXO", "exo", 2023, True, "bg", "3rd", 50, ["Love Shot", "Tempo", "Obsession"]),
    # ── SEVENTEEN ──
    ("Pretty U", "SEVENTEEN", "seventeen", 2016, True, "bg", "3rd", 48, ["Very Nice", "Adore U", "Mansae"]),
    ("CLAP", "SEVENTEEN", "seventeen", 2017, True, "bg", "3rd", 50, ["Very Nice", "Don't Wanna Cry", "THANKS"]),
    ("THANKS", "SEVENTEEN", "seventeen", 2018, True, "bg", "3rd", 52, ["CLAP", "Oh My!", "Don't Wanna Cry"]),
    ("Left & Right", "SEVENTEEN", "seventeen", 2020, True, "bg", "3rd", 46, ["Home", "Fear", "Rock with you"]),
    ("Rock with you", "SEVENTEEN", "seventeen", 2021, True, "bg", "3rd", 48, ["Left & Right", "HOT", "Super"]),
    ("Adore U", "SEVENTEEN", "seventeen", 2015, True, "bg", "3rd", 50, ["Mansae", "Pretty U", "Very Nice"]),
    ("Mansae", "SEVENTEEN", "seventeen", 2015, True, "bg", "3rd", 48, ["Adore U", "Pretty U", "Very Nice"]),
    ("HIT", "SEVENTEEN", "seventeen", 2019, True, "bg", "3rd", 46, ["Fear", "Home", "Left & Right"]),
    ("Fear", "SEVENTEEN", "seventeen", 2019, True, "bg", "3rd", 55, ["Home", "HIT", "Left & Right"]),
    ("Home", "SEVENTEEN", "seventeen", 2019, True, "bg", "3rd", 52, ["Fear", "HIT", "Left & Right"]),
    # ── (G)I-DLE ──
    ("HANN", "(G)I-DLE", "g-i-dle", 2018, True, "gg", "4th", 50, ["LATATA", "Senorita", "Oh my god"]),
    ("Senorita", "(G)I-DLE", "g-i-dle", 2019, True, "gg", "4th", 48, ["HANN", "LATATA", "Uh-Oh"]),
    ("DUMDi DUMDi", "(G)I-DLE", "g-i-dle", 2020, True, "gg", "4th", 46, ["Oh my god", "HWAA", "LATATA"]),
    ("Super Lady", "(G)I-DLE", "g-i-dle", 2024, True, "gg", "4th", 50, ["Queencard", "TOMBOY", "Fate"]),
    ("Fate", "(G)I-DLE", "g-i-dle", 2024, True, "gg", "4th", 48, ["Super Lady", "Klaxon", "Queencard"]),
    ("Klaxon", "(G)I-DLE", "g-i-dle", 2024, True, "gg", "4th", 50, ["Fate", "Super Lady", "Queencard"]),
    # ── IVE ──
    ("Kitsch", "IVE", "ive", 2023, False, "gg", "4th", 48, ["LOVE DIVE", "After LIKE", "I AM"]),
    ("Accendio", "IVE", "ive", 2024, True, "gg", "4th", 50, ["Heya", "LOVE DIVE", "Baddie"]),
    ("Heya", "IVE", "ive", 2024, True, "gg", "4th", 46, ["Accendio", "I AM", "LOVE DIVE"]),
    # ── LE SSERAFIM ──
    ("Blue Flame", "LE SSERAFIM", "le-sserafim", 2022, False, "gg", "4th", 50, ["FEARLESS", "ANTIFRAGILE", "UNFORGIVEN"]),
    ("Crazy", "LE SSERAFIM", "le-sserafim", 2025, True, "gg", "4th", 48, ["Smart", "EASY", "Perfect Night"]),
    # ── NewJeans ──
    ("Cookie", "NewJeans", "newjeans", 2022, False, "gg", "4th", 46, ["Hype Boy", "Attention", "Hurt"]),
    ("How Sweet", "NewJeans", "newjeans", 2024, True, "gg", "4th", 48, ["Bubble Gum", "Super Shy", "ETA"]),
    ("Bubble Gum", "NewJeans", "newjeans", 2024, False, "gg", "4th", 46, ["How Sweet", "Super Shy", "Ditto"]),
    ("Supernatural", "NewJeans", "newjeans", 2024, True, "gg", "4th", 50, ["Right Now", "How Sweet", "Super Shy"]),
    # ── ITZY ──
    ("In the morning", "ITZY", "itzy", 2021, True, "gg", "4th", 48, ["LOCO", "WANNABE", "DALLA DALLA"]),
    ("CHESHIRE", "ITZY", "itzy", 2022, True, "gg", "4th", 46, ["SNEAKERS", "LOCO", "CAKE"]),
    ("BORN TO BE", "ITZY", "itzy", 2024, True, "gg", "4th", 50, ["CAKE", "UNTOUCHABLE", "SNEAKERS"]),
    # ── Red Velvet ──
    ("Ice Cream Cake", "Red Velvet", "red-velvet", 2015, True, "gg", "3rd", 50, ["Dumb Dumb", "Red Flavor", "Rookie"]),
    ("Dumb Dumb", "Red Velvet", "red-velvet", 2015, True, "gg", "3rd", 48, ["Ice Cream Cake", "Russian Roulette", "Rookie"]),
    ("Russian Roulette", "Red Velvet", "red-velvet", 2016, True, "gg", "3rd", 46, ["Dumb Dumb", "Rookie", "Red Flavor"]),
    ("Rookie", "Red Velvet", "red-velvet", 2017, True, "gg", "3rd", 50, ["Russian Roulette", "Red Flavor", "Peek-A-Boo"]),
    ("Power Up", "Red Velvet", "red-velvet", 2018, True, "gg", "3rd", 48, ["Bad Boy", "Psycho", "Peek-A-Boo"]),
    ("Queendom", "Red Velvet", "red-velvet", 2021, True, "gg", "3rd", 50, ["Psycho", "Bad Boy", "Feel My Rhythm"]),
    ("Cosmic", "Red Velvet", "red-velvet", 2024, True, "gg", "3rd", 48, ["Chill Kill", "Queendom", "Feel My Rhythm"]),
    # ── aespa ──
    ("Black Mamba", "aespa", "aespa", 2020, True, "gg", "4th", 50, ["Next Level", "Savage", "Supernova"]),
    ("Girls", "aespa", "aespa", 2022, True, "gg", "4th", 52, ["Savage", "Next Level", "Dreams Come True"]),
    ("Spicy", "aespa", "aespa", 2023, True, "gg", "4th", 48, ["Drama", "Supernova", "Girls"]),
    ("Drama", "aespa", "aespa", 2023, True, "gg", "4th", 50, ["Spicy", "Supernova", "Next Level"]),
    ("Armageddon", "aespa", "aespa", 2024, True, "gg", "4th", 48, ["Supernova", "Whiplash", "Drama"]),
    ("Whiplash", "aespa", "aespa", 2024, True, "gg", "4th", 50, ["Armageddon", "Supernova", "Drama"]),
    # ── TXT ──
    ("CROWN", "TXT", "txt", 2019, True, "bg", "4th", 48, ["Cat & Dog", "Run Away", "Blue Hour"]),
    ("Run Away", "TXT", "txt", 2019, True, "bg", "4th", 50, ["CROWN", "Can't You See Me?", "Blue Hour"]),
    ("Blue Hour", "TXT", "txt", 2020, True, "bg", "4th", 48, ["Run Away", "Can't You See Me?", "0X1=LOVESONG"]),
    ("Good Boy Gone Bad", "TXT", "txt", 2022, True, "bg", "4th", 46, ["Sugar Rush Ride", "0X1=LOVESONG", "Back for More"]),
    # ── ENHYPEN ──
    ("Given-Taken", "ENHYPEN", "enhypen", 2020, True, "bg", "4th", 50, ["Drunk-Dazed", "Tamed-Dashed", "Polaroid Love"]),
    ("Drunk-Dazed", "ENHYPEN", "enhypen", 2021, True, "bg", "4th", 48, ["Given-Taken", "Tamed-Dashed", "Bite Me"]),
    ("Tamed-Dashed", "ENHYPEN", "enhypen", 2021, True, "bg", "4th", 46, ["Drunk-Dazed", "Given-Taken", "Polaroid Love"]),
    ("Polaroid Love", "ENHYPEN", "enhypen", 2022, False, "bg", "4th", 50, ["Tamed-Dashed", "Drunk-Dazed", "Given-Taken"]),
    ("Future Perfect", "ENHYPEN", "enhypen", 2022, True, "bg", "4th", 48, ["Bite Me", "Sweet Venom", "Drunk-Dazed"]),
    ("XO", "ENHYPEN", "enhypen", 2024, True, "bg", "4th", 46, ["Bite Me", "Sweet Venom", "No Doubt"]),
    # ── ATEEZ ──
    ("Say My Name", "ATEEZ", "ateez", 2019, True, "bg", "4th", 50, ["HALA HALA", "Wave", "WONDERLAND"]),
    ("Wave", "ATEEZ", "ateez", 2019, True, "bg", "4th", 48, ["Say My Name", "WONDERLAND", "Answer"]),
    ("WONDERLAND", "ATEEZ", "ateez", 2019, True, "bg", "4th", 52, ["Wave", "Say My Name", "Answer"]),
    ("Answer", "ATEEZ", "ateez", 2020, True, "bg", "4th", 50, ["INCEPTION", "Fireworks", "WONDERLAND"]),
    ("INCEPTION", "ATEEZ", "ateez", 2020, True, "bg", "4th", 48, ["Answer", "Fireworks", "Deja Vu"]),
    ("The Real", "ATEEZ", "ateez", 2021, True, "bg", "4th", 46, ["Fireworks", "Deja Vu", "Eternal Sunshine"]),
    ("HALAZIA", "ATEEZ", "ateez", 2022, True, "bg", "4th", 55, ["Guerrilla", "BOUNCY", "Crazy Form"]),
    ("Crazy Form", "ATEEZ", "ateez", 2023, True, "bg", "4th", 48, ["BOUNCY", "HALAZIA", "Guerrilla"]),
    # ── SHINee ──
    ("Replay", "SHINee", "shinee", 2008, True, "bg", "2nd", 48, ["Ring Ding Dong", "Lucifer", "Hello"]),
    ("Hello", "SHINee", "shinee", 2010, True, "bg", "2nd", 50, ["Lucifer", "Ring Ding Dong", "Replay"]),
    ("Sherlock", "SHINee", "shinee", 2012, True, "bg", "2nd", 52, ["Dream Girl", "Everybody", "Lucifer"]),
    ("Dream Girl", "SHINee", "shinee", 2013, True, "bg", "2nd", 48, ["Sherlock", "Everybody", "Lucifer"]),
    ("Everybody", "SHINee", "shinee", 2013, True, "bg", "2nd", 50, ["Dream Girl", "Sherlock", "View"]),
    ("View", "SHINee", "shinee", 2015, True, "bg", "2nd", 48, ["Everybody", "1 of 1", "Good Evening"]),
    ("Don't Call Me", "SHINee", "shinee", 2021, True, "bg", "2nd", 50, ["Atlantis", "View", "Good Evening"]),
    ("Atlantis", "SHINee", "shinee", 2021, True, "bg", "2nd", 48, ["Don't Call Me", "View", "Good Evening"]),
    # ── Girls' Generation ──
    ("Into The New World", "Girls' Generation", None, 2007, True, "gg", "2nd", 50, ["Gee", "Kissing You", "Oh!"]),
    ("Oh!", "Girls' Generation", None, 2010, True, "gg", "2nd", 48, ["Gee", "Run Devil Run", "The Boys"]),
    ("Run Devil Run", "Girls' Generation", None, 2010, True, "gg", "2nd", 52, ["Oh!", "Gee", "The Boys"]),
    ("Mr. Taxi", "Girls' Generation", None, 2011, True, "gg", "2nd", 48, ["The Boys", "Gee", "I Got a Boy"]),
    ("FOREVER 1", "Girls' Generation", None, 2022, True, "gg", "2nd", 50, ["Gee", "I Got a Boy", "The Boys"]),
    # ── GOT7 ──
    ("Just Right", "GOT7", "got7", 2015, True, "bg", "3rd", 48, ["If You Do", "Hard Carry", "Never Ever"]),
    ("If You Do", "GOT7", "got7", 2015, True, "bg", "3rd", 52, ["Just Right", "Hard Carry", "Never Ever"]),
    ("Hard Carry", "GOT7", "got7", 2016, True, "bg", "3rd", 50, ["Just Right", "If You Do", "Never Ever"]),
    ("Never Ever", "GOT7", "got7", 2017, True, "bg", "3rd", 48, ["Hard Carry", "You Are", "Lullaby"]),
    ("Lullaby", "GOT7", "got7", 2018, True, "bg", "3rd", 50, ["Never Ever", "Eclipse", "You Are"]),
    ("Eclipse", "GOT7", "got7", 2019, True, "bg", "3rd", 52, ["Lullaby", "Not By The Moon", "Never Ever"]),
    # ── MAMAMOO ──
    ("Um Oh Ah Yeh", "MAMAMOO", "mamamoo", 2015, True, "gg", "3rd", 48, ["You're the Best", "Decalcomanie", "Mr. Ambiguous"]),
    ("You're the Best", "MAMAMOO", "mamamoo", 2016, True, "gg", "3rd", 50, ["Um Oh Ah Yeh", "Decalcomanie", "Yes I Am"]),
    ("Decalcomanie", "MAMAMOO", "mamamoo", 2016, True, "gg", "3rd", 48, ["You're the Best", "Starry Night", "Yes I Am"]),
    ("Starry Night", "MAMAMOO", "mamamoo", 2018, True, "gg", "3rd", 50, ["Egotistic", "Decalcomanie", "gogobebe"]),
    ("Egotistic", "MAMAMOO", "mamamoo", 2018, True, "gg", "3rd", 48, ["Starry Night", "gogobebe", "HIP"]),
    ("gogobebe", "MAMAMOO", "mamamoo", 2019, True, "gg", "3rd", 46, ["Egotistic", "HIP", "Starry Night"]),
    ("HIP", "MAMAMOO", "mamamoo", 2019, True, "gg", "3rd", 48, ["gogobebe", "AYA", "Dingga"]),
    ("AYA", "MAMAMOO", "mamamoo", 2020, True, "gg", "3rd", 52, ["HIP", "Dingga", "gogobebe"]),
    # ── NCT 127 ──
    ("Cherry Bomb", "NCT 127", "nct-127", 2017, True, "bg", "3rd", 50, ["Regular", "Simon Says", "Superhuman"]),
    ("Regular", "NCT 127", "nct-127", 2018, True, "bg", "3rd", 48, ["Cherry Bomb", "Simon Says", "Kick It"]),
    ("Kick It", "NCT 127", "nct-127", 2020, True, "bg", "3rd", 50, ["Sticker", "2 Baddies", "Regular"]),
    ("Sticker", "NCT 127", "nct-127", 2021, True, "bg", "3rd", 52, ["Kick It", "Favorite", "2 Baddies"]),
    ("2 Baddies", "NCT 127", "nct-127", 2022, True, "bg", "3rd", 48, ["Sticker", "Kick It", "Ay-Yo"]),
    # ── NCT DREAM ──
    ("BOOM", "NCT DREAM", "nct-dream", 2019, True, "bg", "4th", 48, ["We Go Up", "Hot Sauce", "Hello Future"]),
    ("Hot Sauce", "NCT DREAM", "nct-dream", 2021, True, "bg", "4th", 50, ["BOOM", "Hello Future", "Glitch Mode"]),
    ("Hello Future", "NCT DREAM", "nct-dream", 2021, True, "bg", "4th", 48, ["Hot Sauce", "BOOM", "Glitch Mode"]),
    ("Glitch Mode", "NCT DREAM", "nct-dream", 2022, True, "bg", "4th", 50, ["Hello Future", "Candy", "Hot Sauce"]),
    ("Candy", "NCT DREAM", "nct-dream", 2022, True, "bg", "4th", 46, ["Glitch Mode", "Hello Future", "Smoothie"]),
    ("Smoothie", "NCT DREAM", "nct-dream", 2024, True, "bg", "4th", 48, ["Candy", "Glitch Mode", "Broken Melodies"]),
    # ── MONSTA X ──
    ("Hero", "MONSTA X", "monsta-x", 2015, True, "bg", "3rd", 50, ["Trespass", "All In", "Fighter"]),
    ("Beautiful", "MONSTA X", "monsta-x", 2017, True, "bg", "3rd", 52, ["Dramarama", "Jealousy", "Hero"]),
    ("Dramarama", "MONSTA X", "monsta-x", 2017, True, "bg", "3rd", 48, ["Beautiful", "Jealousy", "Shoot Out"]),
    ("Shoot Out", "MONSTA X", "monsta-x", 2018, True, "bg", "3rd", 46, ["Dramarama", "Alligator", "Follow"]),
    ("Love Killa", "MONSTA X", "monsta-x", 2020, True, "bg", "3rd", 50, ["Follow", "Shoot Out", "Gambler"]),
    # ── BIGBANG ──
    ("Haru Haru", "BIGBANG", "bigbang", 2008, True, "bg", "2nd", 55, ["Lies", "Fantastic Baby", "Bang Bang Bang"]),
    ("Lies", "BIGBANG", "bigbang", 2007, True, "bg", "2nd", 50, ["Haru Haru", "Fantastic Baby", "Last Dance"]),
    ("Bang Bang Bang", "BIGBANG", "bigbang", 2015, True, "bg", "2nd", 48, ["Fantastic Baby", "FXXK IT", "Loser"]),
    ("FXXK IT", "BIGBANG", "bigbang", 2016, True, "bg", "2nd", 50, ["Last Dance", "Bang Bang Bang", "Loser"]),
    ("Loser", "BIGBANG", "bigbang", 2015, True, "bg", "2nd", 52, ["Bang Bang Bang", "BAE BAE", "FXXK IT"]),
    ("BAE BAE", "BIGBANG", "bigbang", 2015, True, "bg", "2nd", 50, ["Loser", "Bang Bang Bang", "Fantastic Baby"]),
    ("Still Life", "BIGBANG", "bigbang", 2022, True, "bg", "2nd", 55, ["Haru Haru", "Last Dance", "Loser"]),
    # ── 2NE1 ──
    ("I Am the Best", "2NE1", "2ne1", 2011, True, "gg", "2nd", 48, ["Fire", "I Don't Care", "Lonely"]),
    ("Fire", "2NE1", "2ne1", 2009, True, "gg", "2nd", 46, ["I Am the Best", "I Don't Care", "Go Away"]),
    ("I Don't Care", "2NE1", "2ne1", 2009, True, "gg", "2nd", 50, ["Fire", "I Am the Best", "Lonely"]),
    ("Lonely", "2NE1", "2ne1", 2011, True, "gg", "2nd", 52, ["I Am the Best", "Missing You", "Come Back Home"]),
    ("Come Back Home", "2NE1", "2ne1", 2014, True, "gg", "2nd", 55, ["Missing You", "Lonely", "I Am the Best"]),
    # ── NMIXX ──
    ("O.O", "NMIXX", "nmixx", 2022, True, "gg", "4th", 50, ["DICE", "Love Me Like This", "DASH"]),
    ("DICE", "NMIXX", "nmixx", 2022, True, "gg", "4th", 48, ["O.O", "Love Me Like This", "Party O'Clock"]),
    ("Love Me Like This", "NMIXX", "nmixx", 2023, True, "gg", "4th", 46, ["DICE", "O.O", "DASH"]),
    ("DASH", "NMIXX", "nmixx", 2024, True, "gg", "4th", 48, ["Love Me Like This", "O.O", "See that?"]),
    # ── STAYC ──
    ("ASAP", "STAYC", "stayc", 2021, True, "gg", "4th", 46, ["SO BAD", "STEREOTYPE", "RUN2U"]),
    ("STEREOTYPE", "STAYC", "stayc", 2021, True, "gg", "4th", 48, ["ASAP", "RUN2U", "SO BAD"]),
    ("RUN2U", "STAYC", "stayc", 2022, True, "gg", "4th", 50, ["STEREOTYPE", "ASAP", "Teddy Bear"]),
    ("Teddy Bear", "STAYC", "stayc", 2023, True, "gg", "4th", 46, ["RUN2U", "Bubble", "ASAP"]),
    # ── TREASURE ──
    ("JIKJIN", "TREASURE", "treasure", 2022, True, "bg", "4th", 48, ["BOY", "HELLO", "BONA BONA"]),
    ("HELLO", "TREASURE", "treasure", 2023, True, "bg", "4th", 50, ["JIKJIN", "BONA BONA", "BOY"]),
    ("BONA BONA", "TREASURE", "treasure", 2023, True, "bg", "4th", 46, ["HELLO", "JIKJIN", "I LOVE YOU"]),
    # ── Solo artists ──
    ("Good Day", "IU", "iu", 2010, True, "solo_female", "2nd", 55, ["You & I", "Palette", "BBIBBI"]),
    ("Palette", "IU", "iu", 2017, True, "solo_female", "2nd", 50, ["BBIBBI", "Blueming", "eight"]),
    ("BBIBBI", "IU", "iu", 2018, True, "solo_female", "2nd", 48, ["Palette", "Blueming", "Celebrity"]),
    ("Blueming", "IU", "iu", 2019, True, "solo_female", "2nd", 46, ["BBIBBI", "eight", "Celebrity"]),
    ("eight", "IU", "iu", 2020, True, "solo_female", "2nd", 50, ["Blueming", "Celebrity", "Lilac"]),
    ("Celebrity", "IU", "iu", 2021, True, "solo_female", "2nd", 48, ["Lilac", "eight", "Blueming"]),
    ("Lilac", "IU", "iu", 2021, True, "solo_female", "2nd", 52, ["Celebrity", "eight", "Love Wins All"]),
    ("Love Wins All", "IU", "iu", 2024, True, "solo_female", "2nd", 50, ["Lilac", "Shopper", "Celebrity"]),
    ("Seven", "Jungkook", "jungkook", 2023, True, "solo_male", "3rd", 46, ["3D", "Standing Next to You", "Dreamers"]),
    ("Standing Next to You", "Jungkook", "jungkook", 2023, True, "solo_male", "3rd", 50, ["Seven", "3D", "GOLDEN"]),
    ("3D", "Jungkook", "jungkook", 2023, True, "solo_male", "3rd", 48, ["Seven", "Standing Next to You", "GOLDEN"]),
    ("Like Crazy", "Jimin", "jimin", 2023, True, "solo_male", "3rd", 50, ["Set Me Free Pt.2", "MUSE", "Who"]),
    ("Set Me Free Pt.2", "Jimin", "jimin", 2023, True, "solo_male", "3rd", 48, ["Like Crazy", "Who", "MUSE"]),
    ("Who", "Jimin", "jimin", 2024, True, "solo_male", "3rd", 46, ["Like Crazy", "MUSE", "Set Me Free Pt.2"]),
    ("Slow Dancing", "V", "v-bts", 2023, True, "solo_male", "3rd", 52, ["Love Me Again", "Rainy Days", "FRI(END)S"]),
    ("Love Me Again", "V", "v-bts", 2023, True, "solo_male", "3rd", 48, ["Slow Dancing", "Rainy Days", "FRI(END)S"]),
    ("FRI(END)S", "V", "v-bts", 2024, True, "solo_male", "3rd", 46, ["Slow Dancing", "Love Me Again", "Rainy Days"]),
    ("APT.", "ROSE", "rose", 2024, True, "solo_female", "3rd", 46, ["On The Ground", "number one girl", "toxic till the end"]),
    ("On The Ground", "ROSE", "rose", 2021, True, "solo_female", "3rd", 52, ["Gone", "APT.", "number one girl"]),
    ("Gone", "ROSE", "rose", 2021, True, "solo_female", "3rd", 50, ["On The Ground", "APT.", "number one girl"]),
    ("SOLO", "Jennie", "jennie", 2018, True, "solo_female", "3rd", 48, ["You & Me", "Mantra", "SOLO"]),
    ("Mantra", "Jennie", "jennie", 2024, True, "solo_female", "3rd", 46, ["SOLO", "You & Me", "Mantra"]),
    ("MONEY", "Lisa", None, 2021, True, "solo_female", "3rd", 48, ["LALISA", "Rockstar", "New Woman"]),
    ("Rockstar", "Lisa", None, 2024, True, "solo_female", "3rd", 46, ["MONEY", "LALISA", "New Woman"]),
    ("Gashina", "Sunmi", "sunmi", 2017, True, "solo_female", "2nd", 48, ["Heroine", "Siren", "pporappippam"]),
    ("Heroine", "Sunmi", "sunmi", 2018, True, "solo_female", "2nd", 50, ["Gashina", "Siren", "Tail"]),
    ("Siren", "Sunmi", "sunmi", 2018, True, "solo_female", "2nd", 46, ["Gashina", "Heroine", "Lalalay"]),
    ("pporappippam", "Sunmi", "sunmi", 2020, True, "solo_female", "2nd", 52, ["Tail", "Gashina", "Heroine"]),
    ("Gotta Go", "Chungha", "chungha", 2019, True, "solo_female", "3rd", 48, ["Snapping", "Play", "Bicycle"]),
    ("Snapping", "Chungha", "chungha", 2019, True, "solo_female", "3rd", 50, ["Gotta Go", "Play", "Bicycle"]),
    ("Bubble Pop!", "HyunA", "hyuna", 2011, True, "solo_female", "2nd", 46, ["RED", "Babe", "I'm Not Cool"]),
    ("I'm Not Cool", "HyunA", "hyuna", 2021, True, "solo_female", "2nd", 48, ["Bubble Pop!", "Babe", "RED"]),
    ("I", "Taeyeon", "taeyeon", 2015, True, "solo_female", "2nd", 55, ["Rain", "Fine", "INVU"]),
    ("INVU", "Taeyeon", "taeyeon", 2022, True, "solo_female", "2nd", 50, ["I", "Fine", "Rain"]),
    ("Eyes, Nose, Lips", "Taeyang", "taeyang", 2014, True, "solo_male", "2nd", 52, ["VIBE", "Wedding Dress", "Only Look At Me"]),
    ("VIBE", "Taeyang", "taeyang", 2023, True, "solo_male", "2nd", 46, ["Eyes, Nose, Lips", "Shoong!", "Wedding Dress"]),
    ("Gangnam Style", "PSY", "psy", 2012, True, "solo_male", "2nd", 42, ["Gentleman", "DADDY", "That That"]),
    ("Gentleman", "PSY", "psy", 2013, True, "solo_male", "2nd", 48, ["Gangnam Style", "DADDY", "That That"]),
    ("That That", "PSY", "psy", 2022, True, "solo_male", "2nd", 46, ["Gangnam Style", "Gentleman", "DADDY"]),
    ("Any Song", "Zico", "zico", 2020, True, "solo_male", "3rd", 46, ["SPOT!", "Any Song", "Zico"]),
    ("SPOT!", "Zico", "zico", 2024, True, "solo_male", "3rd", 48, ["Any Song", "SPOT!", "Zico"]),
    # ── More groups ──
    ("LOVE SCENARIO", "iKON", "ikon", 2018, True, "bg", "3rd", 48, ["KILLING ME", "Goodbye Road", "MY TYPE"]),
    ("KILLING ME", "iKON", "ikon", 2018, True, "bg", "3rd", 46, ["LOVE SCENARIO", "Goodbye Road", "Why Why Why"]),
    ("Really Really", "WINNER", "winner", 2017, True, "bg", "3rd", 48, ["EVERYDAY", "MILLIONS", "LOVE ME LOVE ME"]),
    ("EVERYDAY", "WINNER", "winner", 2018, True, "bg", "3rd", 50, ["Really Really", "MILLIONS", "AH YEAH"]),
    ("You Were Beautiful", "DAY6", "day6", 2017, True, "bg", "3rd", 55, ["Congratulations", "Zombie", "Time of Our Life"]),
    ("Zombie", "DAY6", "day6", 2020, True, "bg", "3rd", 50, ["You Were Beautiful", "Time of Our Life", "Welcome to the Show"]),
    ("Welcome to the Show", "DAY6", "day6", 2024, True, "bg", "3rd", 48, ["Zombie", "You Were Beautiful", "Days Gone By"]),
    ("Shine", "PENTAGON", "pentagon", 2018, True, "bg", "3rd", 46, ["Daisy", "Do or Not", "Feelin' Like"]),
    ("Daisy", "PENTAGON", "pentagon", 2020, True, "bg", "3rd", 50, ["Shine", "Do or Not", "Feelin' Like"]),
    ("No Air", "THE BOYZ", "the-boyz", 2018, True, "bg", "4th", 48, ["Reveal", "THRILL RIDE", "MAVERICK"]),
    ("Reveal", "THE BOYZ", "the-boyz", 2020, True, "bg", "4th", 50, ["No Air", "THRILL RIDE", "MAVERICK"]),
    ("THRILL RIDE", "THE BOYZ", "the-boyz", 2021, True, "bg", "4th", 46, ["Reveal", "MAVERICK", "No Air"]),
    ("MAVERICK", "THE BOYZ", "the-boyz", 2021, True, "bg", "4th", 48, ["THRILL RIDE", "Reveal", "WHISPER"]),
    ("Dumhdurum", "Apink", "apink", 2020, True, "gg", "3rd", 48, ["NoNoNo", "LUV", "Remember"]),
    ("LUV", "Apink", "apink", 2014, True, "gg", "3rd", 50, ["NoNoNo", "Dumhdurum", "Remember"]),
    ("Alone", "SISTAR", "sistar", 2012, True, "gg", "2nd", 48, ["Touch My Body", "I Like That", "SHAKE IT"]),
    ("Touch My Body", "SISTAR", "sistar", 2014, True, "gg", "2nd", 46, ["Alone", "SHAKE IT", "I Like That"]),
    ("SHAKE IT", "SISTAR", "sistar", 2015, True, "gg", "2nd", 48, ["Touch My Body", "Alone", "I Like That"]),
    ("Nobody", "Wonder Girls", "wonder-girls", 2008, True, "gg", "2nd", 46, ["Tell Me", "Like This", "Why So Lonely"]),
    ("Tell Me", "Wonder Girls", "wonder-girls", 2007, True, "gg", "2nd", 48, ["Nobody", "Like This", "So Hot"]),
    ("Roly-Poly", "T-ARA", "t-ara", 2011, True, "gg", "2nd", 46, ["Lovey-Dovey", "Bo Peep Bo Peep", "Number Nine"]),
    ("Lovey-Dovey", "T-ARA", "t-ara", 2012, True, "gg", "2nd", 48, ["Roly-Poly", "Bo Peep Bo Peep", "Number Nine"]),
    ("Mister", "KARA", "kara", 2009, True, "gg", "2nd", 44, ["Lupin", "Step", "WHEN I MOVE"]),
    ("Step", "KARA", "kara", 2011, True, "gg", "2nd", 48, ["Mister", "Lupin", "WHEN I MOVE"]),
    ("Electric Shock", "f(x)", "fx", 2012, True, "gg", "2nd", 48, ["NU ABO", "Rum Pum Pum Pum", "4 Walls"]),
    ("4 Walls", "f(x)", "fx", 2015, True, "gg", "2nd", 52, ["Electric Shock", "Rum Pum Pum Pum", "Red Light"]),
    ("Bad Girl Good Girl", "miss A", "miss-a", 2010, True, "gg", "2nd", 46, ["Hush", "Only You", "Goodbye Baby"]),
    ("Hush", "miss A", "miss-a", 2013, True, "gg", "2nd", 50, ["Bad Girl Good Girl", "Only You", "Goodbye Baby"]),
    # ── BTOB ──
    ("Missing You", "BTOB", "btob", 2017, True, "bg", "3rd", 55, ["Beautiful Pain", "Only One for Me", "WOW"]),
    ("Beautiful Pain", "BTOB", "btob", 2018, True, "bg", "3rd", 52, ["Missing You", "Only One for Me", "Outsider"]),
    # ── AKMU ──
    ("Love Lee", "AKMU", "akmu", 2023, True, "mixed", "3rd", 46, ["HAPPENING", "RE-BYE", "200%"]),
    ("HAPPENING", "AKMU", "akmu", 2020, True, "mixed", "3rd", 48, ["Love Lee", "DINOSAUR", "RE-BYE"]),
    # ── Dreamcatcher ──
    ("Odd Eye", "Dreamcatcher", "dreamcatcher", 2021, True, "gg", "3rd", 50, ["Scream", "BONVOYAGE", "Deja Vu"]),
    ("Scream", "Dreamcatcher", "dreamcatcher", 2020, True, "gg", "3rd", 52, ["Odd Eye", "Deja Vu", "YOU AND I"]),
    # ── Kep1er ──
    ("WA DA DA", "Kep1er", "kep1er", 2022, True, "gg", "4th", 46, ["Up!", "Giddy", "MVSK"]),
    ("Up!", "Kep1er", "kep1er", 2022, True, "gg", "4th", 48, ["WA DA DA", "Giddy", "Straight Line"]),
]

# Process in batches
BATCH_SIZE = 30
total_inserted = 0
total_skipped = 0
total_failed = 0

for batch_start in range(0, len(ALL_SONGS), BATCH_SIZE):
    batch = ALL_SONGS[batch_start:batch_start + BATCH_SIZE]
    rows = []

    for title, artist, group_slug, year, is_tt, gender, gen, chorus, wrongs in batch:
        # Search for YouTube ID
        yt_id = search_yt(artist, title)
        if not yt_id:
            print(f"  SKIP: {artist} - {title} (no YT ID found)")
            total_failed += 1
            continue

        if yt_id in EXISTING:
            total_skipped += 1
            continue

        EXISTING.add(yt_id)

        gid = GROUP_IDS.get(group_slug) if group_slug else None

        rows.append({
            "title": title,
            "artist": artist,
            "group_id": gid,
            "youtube_id": yt_id,
            "year": year,
            "is_title_track": is_tt,
            "gender": gender,
            "generation": gen,
            "clip_intro": 0,
            "clip_chorus": chorus,
            "clip_verse": None,
            "clip_bridge": None,
            "wrong_answers": wrongs,
            "status": "active",
        })

        time.sleep(0.1)  # Be nice to YouTube

    if rows:
        inserted = insert_batch(rows)
        total_inserted += inserted
        print(f"Batch {batch_start//BATCH_SIZE + 1}: inserted {inserted}, skipped {total_skipped}")

    sys.stdout.flush()

print(f"\n=== DONE ===")
print(f"Inserted: {total_inserted}")
print(f"Skipped (dupe): {total_skipped}")
print(f"Failed (no YT): {total_failed}")
print(f"Total in DB should be: {102 + total_inserted}")
