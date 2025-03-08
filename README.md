# Steam OSINT for Google Sheets

A comprehensive Open Source Intelligence (OSINT) tool for Steam users and games, integrated directly into Google Sheets.

Built with the assistance of Claude-3.7/Cursor.

## What is Steam OSINT?

Steam OSINT is a Google Apps Script that provides powerful tools for gathering and analyzing information about Steam users and games. It leverages the Steam Web API to collect data that can be used for research, community management, game analytics, and more.

## Key Features

- **Game Ownership Verification**: Check if users own specific games
- **Playtime Analysis**: Track recent and total playtime for games
- **User Profiling**: View detailed Steam user profiles
- **Game Library Analysis**: Analyze users' game collections and playtime statistics
- **Game Information**: Get detailed information about games on Steam
- **Batch Processing**: Process multiple Steam IDs in a single operation

## Setup Instructions

### 1. Get a Steam Web API Key
1. Visit https://steamcommunity.com/dev/apikey
2. Sign in with your Steam account
3. Enter a domain name (can be any domain you own, or localhost if this is for personal use)
4. Agree to the Steam Web API Terms of Use
5. Click "Register" to get your API key

### 2. Find the Steam AppID for your game
The AppID is a unique identifier for each game on Steam. You can find it by:
1. Using the built-in `findGameAppId()` function in the script
2. Looking at the URL of the game's Steam store page (e.g., for https://store.steampowered.com/app/570/Dota_2/, the AppID is 570)
3. Searching on https://steamdb.info/

### 3. Set up the Google Sheet
1. Create a new Google Sheet or use an existing one
2. Make sure it has a column with Steam IDs (64-bit format)
3. Optionally, add a header row with column names (the script will try to automatically identify columns)

### 4. Add the Script to Google Sheets
1. Open your Google Sheet
2. Click on "Extensions" > "Apps Script"
3. Delete any code in the editor and paste the entire content of `SteamOSINT.gs` (formerly SteamGameOwnershipChecker.gs)
4. Update the configuration variables at the top of the script:
   ```javascript
   const STEAM_API_KEY = 'YOUR_STEAM_API_KEY'; // Replace with your actual API key
   const APP_ID = '000000'; // Replace with the actual AppID of the game
   ```
5. Save the project (Ctrl+S or File > Save)
6. Give your project a name (e.g., "Steam OSINT")

### 5. Run the Script
1. Refresh your Google Sheet
2. You should see a new menu item called "Steam OSINT"
3. Use the dropdown menu to access various Steam-related functions
4. If prompted, authorize the script to run

## Available Tools

### Menu Structure
The script adds a comprehensive "Steam OSINT" menu with the following options:

#### Game Ownership
- **Check Game Ownership**: Checks if users own the specified game and tracks playtime
- **Resume Interrupted Check**: Continues checking from where you left off
- **Reset Progress Tracker**: Clears saved progress to start fresh

#### Game Info
- **Find Game AppID**: Helps you find the AppID for a game by name
- **Get Game Details**: Shows detailed information about a game (price, release date, etc.)

#### User Info
- **Get User Profile**: Shows basic profile information for a Steam user
- **Get User Game Count**: Shows how many games a user owns and their total playtime

#### Utilities
- **Convert SteamID Format**: Provides information about SteamID conversion
- **Validate Steam API Key**: Checks if your Steam API key is working correctly
- **About/Help**: Shows information about the script and its features

## Use Cases

### Community Management
- Verify if community members own specific games
- Track engagement through playtime analysis
- Get quick insights into user profiles

### Research and Analysis
- Gather data on game ownership across multiple users
- Analyze playtime patterns
- Compare game popularity among different user groups

### Event Management
- Verify game ownership for tournament participants
- Check eligibility for game-specific events
- Track participant engagement through playtime

## Technical Details

### Game Ownership Checking
- Checks if each Steam user owns the specified game
- Adds a "Yes" or "No" result in the "Owns Game" column

### Playtime Tracking
- Tracks recent playtime (last 2 weeks) for the specified game
- Tracks total playtime (all-time) for the specified game
- Displays playtime in hours (converted from minutes)
- Automatically creates columns for "Recent Playtime (hours)" and "Total Playtime (hours)"

### Resumable Functionality
The script includes features to handle interruptions and allow you to resume checking from where you left off:

#### Using the Resume Feature
1. If the script is interrupted (due to timeout, browser crash, etc.), you can resume by:
   - Going back to your Google Sheet
   - Clicking "Steam OSINT" > "Game Ownership" > "Resume Interrupted Check"
   - The script will automatically continue from where it left off

### Automatic Timeout Prevention
- The script monitors its running time
- After processing for about 4 minutes, it will ask if you want to continue or pause
- This helps prevent Google's 6-minute execution time limit from causing data loss

### Row-by-Row Processing
- Results are written immediately after each row is processed
- Progress is saved after each row
- If an error occurs, you'll only lose the current row being processed

## Important Notes

- **Privacy Settings**: The script can only retrieve data for users with public profiles. If a user has their profile set to private, the script will have limited access to their information.
- **Rate Limits**: The Steam Web API has rate limits. The script includes a small delay between requests to avoid hitting these limits.
- **Authorization**: When you first run the script, Google will ask you to authorize it. This is normal and required for the script to access your sheet.
- **Execution Time Limits**: Google Apps Script has a maximum execution time of 6 minutes. The script handles this by allowing you to pause and resume.
- **Playtime Format**: Playtime is displayed in hours with one decimal place (e.g., 1.5 hours instead of 90 minutes).
- **Ethical Use**: Please use this tool responsibly and respect users' privacy. Only collect data for legitimate purposes and in accordance with Steam's terms of service.

## Troubleshooting

- If you get an error about the API key, make sure you've entered it correctly in the script.
- If the script can't find the Steam ID column, it will prompt you to specify which column contains the Steam IDs.
- If a user appears not to own a game they should own, check if their Steam profile is public.
- If the "Resume" option says there's no saved progress, you may need to start a new check.
- If playtime is showing as 0 for a game the user owns, they may not have played it recently or at all.

## Steam ID Format

This script expects Steam IDs in the 64-bit format (also called SteamID64 or Community ID). These are 17-digit numbers like `76561198000000000`. If your IDs are in a different format, you'll need to convert them first. 
