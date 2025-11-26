#!/bin/bash
# Download Halo 2 Medal and Weapon Images
# Run this script in your website's root directory

echo "Creating asset directories..."
mkdir -p assets/medals
mkdir -p assets/weapons

echo "Downloading Medal Images..."

# Multi-kills
curl -L "https://halo.wiki.gallery/images/9/94/H2V_Achievement_Double_Kill.png" -o "assets/medals/double_kill.png"
curl -L "https://halo.wiki.gallery/images/4/4e/H2V_Achievement_Triple_Kill.png" -o "assets/medals/triple_kill.png"
curl -L "https://halo.wiki.gallery/images/a/ab/H2V_Achievement_Killtacular.png" -o "assets/medals/killtacular.png"
curl -L "https://halo.wiki.gallery/images/c/ca/H2V_Achievement_Killing_Frenzy.png" -o "assets/medals/killing_frenzy.png"
curl -L "https://halo.wiki.gallery/images/3/36/H2V_Achievement_Killtrocity.png" -o "assets/medals/killtrocity.png"
curl -L "https://halo.wiki.gallery/images/0/05/H2V_Achievement_Killimanjaro.png" -o "assets/medals/killimanjaro.png"

# Spree medals
curl -L "https://halo.wiki.gallery/images/e/e5/H2V_Achievement_Killing_Spree.png" -o "assets/medals/killing_spree.png"
curl -L "https://halo.wiki.gallery/images/9/90/H2V_Achievement_Running_Riot.png" -o "assets/medals/running_riot.png"
curl -L "https://halo.wiki.gallery/images/8/89/H2V_Achievement_Rampage.png" -o "assets/medals/rampage.png"
curl -L "https://halo.wiki.gallery/images/f/f5/H2V_Achievement_Untouchable.png" -o "assets/medals/untouchable.png"
curl -L "https://halo.wiki.gallery/images/f/f2/H2V_Achievement_Overkill.png" -o "assets/medals/overkill.png"

# Special kills
curl -L "https://halo.wiki.gallery/images/d/d3/H2V_Achievement_Beat_Down.png" -o "assets/medals/beat_down.png"
curl -L "https://halo.wiki.gallery/images/8/8b/H2V_Achievement_Bone_Cracker.png" -o "assets/medals/bone_cracker.png"
curl -L "https://halo.wiki.gallery/images/0/02/H2V_Achievement_Sniper_Kill.png" -o "assets/medals/sniper_kill.png"
curl -L "https://halo.wiki.gallery/images/6/66/H2V_Achievement_Grenade_Stick.png" -o "assets/medals/grenade_stick.png"
curl -L "https://halo.wiki.gallery/images/a/a9/H2V_Achievement_Splatter.png" -o "assets/medals/splatter.png"
curl -L "https://halo.wiki.gallery/images/3/34/H2V_Achievement_Carjacking.png" -o "assets/medals/carjacking.png"

# Flag objectives
curl -L "https://halo.wiki.gallery/images/3/3e/H2V_Achievement_Flag_Taken.png" -o "assets/medals/flag_taken.png"
curl -L "https://halo.wiki.gallery/images/2/26/H2V_Achievement_Flag_Score.png" -o "assets/medals/flag_score.png"
curl -L "https://halo.wiki.gallery/images/0/04/H2V_Achievement_Flag_Returned.png" -o "assets/medals/flag_returned.png"
curl -L "https://halo.wiki.gallery/images/0/04/H2V_Achievement_Flag_Carrier_Kill.png" -o "assets/medals/flag_carrier_kill.png"

# Bomb objectives
curl -L "https://halo.wiki.gallery/images/a/a7/H2V_Achievement_Bomb_Planted.png" -o "assets/medals/bomb_planted.png"
curl -L "https://halo.wiki.gallery/images/3/30/H2V_Achievement_Bomb_Carrier_Kill.png" -o "assets/medals/bomb_carrier_kill.png"

echo "Downloading Weapon Images..."

# UNSC Weapons
curl -L "https://halo.wiki.gallery/images/thumb/2/29/H2A_BattleRifle.png/300px-H2A_BattleRifle.png" -o "assets/weapons/battle_rifle.png"
curl -L "https://halo.wiki.gallery/images/thumb/3/31/H2_M6C_Magnum_Pistol.png/224px-H2_M6C_Magnum_Pistol.png" -o "assets/weapons/magnum.png"
curl -L "https://halo.wiki.gallery/images/thumb/b/b6/H2A_Shotgun_Render.png/300px-H2A_Shotgun_Render.png" -o "assets/weapons/shotgun.png"
curl -L "https://halo.wiki.gallery/images/thumb/8/8a/H2A_SMG.png/300px-H2A_SMG.png" -o "assets/weapons/smg.png"
curl -L "https://halo.wiki.gallery/images/thumb/d/dc/H2A_SniperRifle.png/300px-H2A_SniperRifle.png" -o "assets/weapons/sniper_rifle.png"
curl -L "https://halo.wiki.gallery/images/thumb/5/5c/H2A_RocketLauncher.png/300px-H2A_RocketLauncher.png" -o "assets/weapons/rocket_launcher.png"
curl -L "https://halo.wiki.gallery/images/thumb/a/a5/H2A_-_Frag.png/200px-H2A_-_Frag.png" -o "assets/weapons/frag_grenade.png"

# Covenant Weapons
curl -L "https://halo.wiki.gallery/images/thumb/4/42/H2A_PlasmaPistol.png/250px-H2A_PlasmaPistol.png" -o "assets/weapons/plasma_pistol.png"
curl -L "https://halo.wiki.gallery/images/thumb/c/c7/H2A_PlasmaRifle.png/300px-H2A_PlasmaRifle.png" -o "assets/weapons/plasma_rifle.png"
curl -L "https://halo.wiki.gallery/images/thumb/e/e1/H2A_Carbine.png/300px-H2A_Carbine.png" -o "assets/weapons/carbine.png"
curl -L "https://halo.wiki.gallery/images/thumb/5/54/H2A_Needler.png/250px-H2A_Needler.png" -o "assets/weapons/needler.png"
curl -L "https://halo.wiki.gallery/images/thumb/2/21/H2A_BeamRifle.png/300px-H2A_BeamRifle.png" -o "assets/weapons/beam_rifle.png"
curl -L "https://halo.wiki.gallery/images/thumb/7/71/H2A_BruteShot.png/300px-H2A_BruteShot.png" -o "assets/weapons/brute_shot.png"
curl -L "https://halo.wiki.gallery/images/thumb/9/99/H2A_EnergySword.png/250px-H2A_EnergySword.png" -o "assets/weapons/energy_sword.png"
curl -L "https://halo.wiki.gallery/images/thumb/d/d0/H2A_-_Plasma.png/200px-H2A_-_Plasma.png" -o "assets/weapons/plasma_grenade.png"
curl -L "https://halo.wiki.gallery/images/thumb/0/04/H2A_SentinelBeam.png/300px-H2A_SentinelBeam.png" -o "assets/weapons/sentinel_beam.png"

echo ""
echo "Download complete! Check assets/medals/ and assets/weapons/ for the images."
echo "If any images are missing or broken, visit https://www.halopedia.org and manually download them."
