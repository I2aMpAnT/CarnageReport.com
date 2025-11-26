# Download Halo 2 Medal and Weapon Images (PowerShell)
# Run this script in your website's root directory

Write-Host "Creating asset directories..."
New-Item -ItemType Directory -Force -Path "assets\medals" | Out-Null
New-Item -ItemType Directory -Force -Path "assets\weapons" | Out-Null

Write-Host "Downloading Medal Images..."

# Multi-kills
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/9/94/H2V_Achievement_Double_Kill.png" -OutFile "assets\medals\double_kill.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/4/4e/H2V_Achievement_Triple_Kill.png" -OutFile "assets\medals\triple_kill.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/a/ab/H2V_Achievement_Killtacular.png" -OutFile "assets\medals\killtacular.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/c/ca/H2V_Achievement_Killing_Frenzy.png" -OutFile "assets\medals\killing_frenzy.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/3/36/H2V_Achievement_Killtrocity.png" -OutFile "assets\medals\killtrocity.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/0/05/H2V_Achievement_Killimanjaro.png" -OutFile "assets\medals\killimanjaro.png"

# Spree medals
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/e/e5/H2V_Achievement_Killing_Spree.png" -OutFile "assets\medals\killing_spree.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/9/90/H2V_Achievement_Running_Riot.png" -OutFile "assets\medals\running_riot.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/8/89/H2V_Achievement_Rampage.png" -OutFile "assets\medals\rampage.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/f/f5/H2V_Achievement_Untouchable.png" -OutFile "assets\medals\untouchable.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/f/f2/H2V_Achievement_Overkill.png" -OutFile "assets\medals\overkill.png"

# Special kills
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/d/d3/H2V_Achievement_Beat_Down.png" -OutFile "assets\medals\beat_down.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/8/8b/H2V_Achievement_Bone_Cracker.png" -OutFile "assets\medals\bone_cracker.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/0/02/H2V_Achievement_Sniper_Kill.png" -OutFile "assets\medals\sniper_kill.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/6/66/H2V_Achievement_Grenade_Stick.png" -OutFile "assets\medals\grenade_stick.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/a/a9/H2V_Achievement_Splatter.png" -OutFile "assets\medals\splatter.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/3/34/H2V_Achievement_Carjacking.png" -OutFile "assets\medals\carjacking.png"

# Flag objectives
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/3/3e/H2V_Achievement_Flag_Taken.png" -OutFile "assets\medals\flag_taken.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/2/26/H2V_Achievement_Flag_Score.png" -OutFile "assets\medals\flag_score.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/0/04/H2V_Achievement_Flag_Returned.png" -OutFile "assets\medals\flag_returned.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/0/04/H2V_Achievement_Flag_Carrier_Kill.png" -OutFile "assets\medals\flag_carrier_kill.png"

# Bomb objectives
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/a/a7/H2V_Achievement_Bomb_Planted.png" -OutFile "assets\medals\bomb_planted.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/3/30/H2V_Achievement_Bomb_Carrier_Kill.png" -OutFile "assets\medals\bomb_carrier_kill.png"

Write-Host "Downloading Weapon Images..."

# UNSC Weapons
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/2/29/H2A_BattleRifle.png/300px-H2A_BattleRifle.png" -OutFile "assets\weapons\battle_rifle.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/3/31/H2_M6C_Magnum_Pistol.png/224px-H2_M6C_Magnum_Pistol.png" -OutFile "assets\weapons\magnum.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/b/b6/H2A_Shotgun_Render.png/300px-H2A_Shotgun_Render.png" -OutFile "assets\weapons\shotgun.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/8/8a/H2A_SMG.png/300px-H2A_SMG.png" -OutFile "assets\weapons\smg.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/d/dc/H2A_SniperRifle.png/300px-H2A_SniperRifle.png" -OutFile "assets\weapons\sniper_rifle.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/5/5c/H2A_RocketLauncher.png/300px-H2A_RocketLauncher.png" -OutFile "assets\weapons\rocket_launcher.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/a/a5/H2A_-_Frag.png/200px-H2A_-_Frag.png" -OutFile "assets\weapons\frag_grenade.png"

# Covenant Weapons
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/4/42/H2A_PlasmaPistol.png/250px-H2A_PlasmaPistol.png" -OutFile "assets\weapons\plasma_pistol.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/c/c7/H2A_PlasmaRifle.png/300px-H2A_PlasmaRifle.png" -OutFile "assets\weapons\plasma_rifle.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/e/e1/H2A_Carbine.png/300px-H2A_Carbine.png" -OutFile "assets\weapons\carbine.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/5/54/H2A_Needler.png/250px-H2A_Needler.png" -OutFile "assets\weapons\needler.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/2/21/H2A_BeamRifle.png/300px-H2A_BeamRifle.png" -OutFile "assets\weapons\beam_rifle.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/7/71/H2A_BruteShot.png/300px-H2A_BruteShot.png" -OutFile "assets\weapons\brute_shot.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/9/99/H2A_EnergySword.png/250px-H2A_EnergySword.png" -OutFile "assets\weapons\energy_sword.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/d/d0/H2A_-_Plasma.png/200px-H2A_-_Plasma.png" -OutFile "assets\weapons\plasma_grenade.png"
Invoke-WebRequest -Uri "https://halo.wiki.gallery/images/thumb/0/04/H2A_SentinelBeam.png/300px-H2A_SentinelBeam.png" -OutFile "assets\weapons\sentinel_beam.png"

Write-Host ""
Write-Host "Download complete! Check assets\medals\ and assets\weapons\ for the images."
Write-Host "If any images are missing or broken, visit https://www.halopedia.org and manually download them."
