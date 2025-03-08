/**
 * Steam OSINT
 * 
 * This script provides Open Source Intelligence (OSINT) tools for Steam users and games.
 * It can check game ownership, track playtime, view user profiles, and more.
 * It requires a Steam Web API key which you can get from: https://steamcommunity.com/dev/apikey
 */

// Configuration - Update these values
const STEAM_API_KEY = ''; // Add your Steam Web API key
const APP_ID = ''; // Replace with the Steam AppID of the game you want to check

// Script properties to store progress
const PROPERTY_LAST_PROCESSED_ROW = 'lastProcessedRow';
const PROPERTY_CURRENT_SHEET_ID = 'currentSheetId';

/**
 * Creates a custom menu in the Google Sheet when it opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Steam OSINT')
    // Game Ownership submenu
    .addSubMenu(ui.createMenu('Game Ownership')
      .addItem('Check Game Ownership', 'checkGameOwnership')
      .addItem('Resume Interrupted Check', 'resumeGameOwnershipCheck')
      .addItem('Reset Progress Tracker', 'resetProgressTracker'))
    // Game Info submenu
    .addSubMenu(ui.createMenu('Game Info')
      .addItem('Find Game AppID', 'findGameAppId')
      .addItem('Get Game Details', 'getGameDetails'))
    // User Info submenu
    .addSubMenu(ui.createMenu('User Info')
      .addItem('Get User Profile', 'getUserProfile')
      .addItem('Get User Game Count', 'getUserGameCount'))
    // Utilities submenu
    .addSubMenu(ui.createMenu('Utilities')
      .addItem('Convert SteamID Format', 'convertSteamIDFormat')
      .addItem('Validate Steam API Key', 'validateAPIKey')
      .addItem('About/Help', 'showAboutDialog'))
    .addToUi();
}

/**
 * Resets the progress tracker to allow starting fresh
 */
function resetProgressTracker() {
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty(PROPERTY_LAST_PROCESSED_ROW);
  properties.deleteProperty(PROPERTY_CURRENT_SHEET_ID);
  
  SpreadsheetApp.getUi().alert('Progress tracker has been reset. You can now start a new check from the beginning.');
}

/**
 * Main function to check game ownership for Steam IDs in the active sheet
 */
function checkGameOwnership() {
  // Reset progress tracker to start fresh
  resetProgressTracker();
  
  // Start the check from row 1 (after header)
  processGameOwnership(1);
}

/**
 * Resume checking game ownership from where it was interrupted
 */
function resumeGameOwnershipCheck() {
  const properties = PropertiesService.getScriptProperties();
  const lastProcessedRow = parseInt(properties.getProperty(PROPERTY_LAST_PROCESSED_ROW));
  const savedSheetId = properties.getProperty(PROPERTY_CURRENT_SHEET_ID);
  
  if (!lastProcessedRow || !savedSheetId) {
    SpreadsheetApp.getUi().alert('No saved progress found. Please start a new check.');
    return;
  }
  
  const currentSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (currentSheet.getSheetId().toString() !== savedSheetId) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'Different Sheet Detected',
      'You are now on a different sheet than the one you started with. Do you want to continue on this sheet instead?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.NO) {
      ui.alert('Please switch to the original sheet and try again.');
      return;
    }
    
    // Update the sheet ID if continuing on a new sheet
    properties.setProperty(PROPERTY_CURRENT_SHEET_ID, currentSheet.getSheetId().toString());
  }
  
  // Resume from the next row after the last processed one
  const nextRow = lastProcessedRow + 1;
  ui.alert(`Resuming from row ${nextRow}`);
  processGameOwnership(nextRow);
}

/**
 * Process game ownership starting from a specific row
 * 
 * @param {number} startRow - The row to start processing from (1-indexed, after header)
 */
function processGameOwnership(startRow) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Save the current sheet ID for resuming later
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(PROPERTY_CURRENT_SHEET_ID, sheet.getSheetId().toString());
  
  // Find the columns for Steam ID and results
  let steamIdColIndex = -1;
  let resultColIndex = -1;
  let recentPlaytimeColIndex = -1;
  let totalPlaytimeColIndex = -1;
  
  // Check the header row to find our columns
  for (let i = 0; i < values[0].length; i++) {
    const header = values[0][i].toString().toLowerCase();
    if (header.includes('steam') && (header.includes('id') || header.includes('64'))) {
      steamIdColIndex = i;
    }
    if (header.includes('owns game') || header.includes('game ownership')) {
      resultColIndex = i;
    }
    if (header.includes('recent playtime') || header.includes('playtime_2weeks')) {
      recentPlaytimeColIndex = i;
    }
    if (header.includes('total playtime') || header.includes('playtime_forever')) {
      totalPlaytimeColIndex = i;
    }
  }
  
  // If we didn't find a Steam ID column, ask the user which column to use
  if (steamIdColIndex === -1) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'Steam ID Column',
      'Enter the column letter that contains Steam IDs:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      const colLetter = response.getResponseText().toUpperCase();
      steamIdColIndex = columnLetterToIndex(colLetter);
    } else {
      return; // User cancelled
    }
  }
  
  // If we didn't find a result column, create one
  if (resultColIndex === -1) {
    resultColIndex = values[0].length;
    sheet.getRange(1, resultColIndex + 1).setValue('Owns Game');
  }
  
  // If we didn't find playtime columns, create them
  if (recentPlaytimeColIndex === -1) {
    recentPlaytimeColIndex = values[0].length + (resultColIndex === values[0].length ? 1 : 0);
    sheet.getRange(1, recentPlaytimeColIndex + 1).setValue('Recent Playtime (hours)');
  }
  
  if (totalPlaytimeColIndex === -1) {
    totalPlaytimeColIndex = values[0].length + 
      (resultColIndex === values[0].length ? 1 : 0) + 
      (recentPlaytimeColIndex === values[0].length + (resultColIndex === values[0].length ? 1 : 0) ? 1 : 0);
    sheet.getRange(1, totalPlaytimeColIndex + 1).setValue('Total Playtime (hours)');
  }
  
  // Create a progress indicator
  const totalRows = values.length - 1; // Exclude header
  const remainingRows = totalRows - startRow + 1;
  
  if (remainingRows <= 0) {
    SpreadsheetApp.getUi().alert('No rows to process. Check completed!');
    return;
  }
  
  // Show a progress dialog
  const ui = SpreadsheetApp.getUi();
  ui.alert(`Processing ${remainingRows} rows. This may take some time. Click OK to begin.`);
  
  // Process each row starting from startRow
  for (let row = startRow; row < values.length; row++) {
    const steamId = values[row][steamIdColIndex].toString().trim();
    
    // Skip empty cells
    if (!steamId) {
      // Update progress tracker even for skipped rows
      properties.setProperty(PROPERTY_LAST_PROCESSED_ROW, row.toString());
      continue;
    }
    
    try {
      // Get game data including ownership and playtime
      const gameData = getGameData(steamId, APP_ID);
      
      // Update the result cells immediately after checking each user
      sheet.getRange(row + 1, resultColIndex + 1).setValue(gameData.ownsGame ? 'Yes' : 'No');
      
      // Update playtime cells
      if (gameData.ownsGame) {
        // Convert minutes to hours with 1 decimal place
        const recentPlaytimeHours = gameData.recentPlaytime > 0 ? 
          Math.round(gameData.recentPlaytime / 6) / 10 : 0; // Convert minutes to hours
        const totalPlaytimeHours = gameData.totalPlaytime > 0 ? 
          Math.round(gameData.totalPlaytime / 6) / 10 : 0; // Convert minutes to hours
        
        sheet.getRange(row + 1, recentPlaytimeColIndex + 1).setValue(recentPlaytimeHours);
        sheet.getRange(row + 1, totalPlaytimeColIndex + 1).setValue(totalPlaytimeHours);
      } else {
        // If user doesn't own the game, set playtime to 0 or empty
        sheet.getRange(row + 1, recentPlaytimeColIndex + 1).setValue('');
        sheet.getRange(row + 1, totalPlaytimeColIndex + 1).setValue('');
      }
      
      // Update the progress tracker after each successful check
      properties.setProperty(PROPERTY_LAST_PROCESSED_ROW, row.toString());
    } catch (error) {
      // Handle errors
      sheet.getRange(row + 1, resultColIndex + 1).setValue('Error: ' + error.message);
      sheet.getRange(row + 1, recentPlaytimeColIndex + 1).setValue('');
      sheet.getRange(row + 1, totalPlaytimeColIndex + 1).setValue('');
      
      // Still update the progress tracker even for error rows
      properties.setProperty(PROPERTY_LAST_PROCESSED_ROW, row.toString());
    }
    
    // Add a small delay to avoid hitting API rate limits
    Utilities.sleep(200);
    
    // Check if we've been running too long (to avoid timeout)
    if ((row - startRow + 1) % 20 === 0) {
      // Every 20 rows, check if we should continue or pause
      const timeElapsed = (row - startRow + 1) * 0.2; // Approximate time in seconds
      const percentComplete = Math.round(((row - startRow + 1) / remainingRows) * 100);
      
      // If we've been running for more than 4 minutes, suggest pausing
      if (timeElapsed > 240) {
        const continueResponse = ui.alert(
          'Continue Processing?',
          `Processed ${row - startRow + 1} of ${remainingRows} rows (${percentComplete}%). ` +
          'Continue processing or pause to avoid timeout?',
          ui.ButtonSet.YES_NO
        );
        
        if (continueResponse === ui.Button.NO) {
          ui.alert(
            'Processing Paused',
            `Processed up to row ${row}. You can resume later using the "Resume Interrupted Check" option.`,
            ui.ButtonSet.OK
          );
          return;
        }
      }
    }
  }
  
  // Clear progress tracker when complete
  resetProgressTracker();
  
  SpreadsheetApp.getUi().alert('Game ownership check completed!');
}

/**
 * Gets game data including ownership and playtime information
 * 
 * @param {string} steamId - The Steam ID of the user
 * @param {string} appId - The Steam AppID of the game
 * @return {Object} - Object containing ownership and playtime data
 */
function getGameData(steamId, appId) {
  // Initialize result object
  const result = {
    ownsGame: false,
    recentPlaytime: 0,
    totalPlaytime: 0
  };
  
  // First check if the user owns the game using GetOwnedGames
  const ownedGamesUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`;
  
  try {
    // Make the API request
    const response = UrlFetchApp.fetch(ownedGamesUrl);
    const data = JSON.parse(response.getContentText());
    
    // Check if the response contains game data
    if (!data.response || !data.response.games) {
      // This could mean the profile is private or the user doesn't own any games
      return result;
    }
    
    // Check if the specific game is in the user's library
    const games = data.response.games;
    for (let i = 0; i < games.length; i++) {
      if (games[i].appid.toString() === appId.toString()) {
        result.ownsGame = true;
        result.totalPlaytime = games[i].playtime_forever || 0;
        result.recentPlaytime = games[i].playtime_2weeks || 0;
        break;
      }
    }
    
    // If we found the game and have both playtime values, return the result
    if (result.ownsGame && result.recentPlaytime !== undefined) {
      return result;
    }
    
    // If we found the game but don't have recent playtime, check GetRecentlyPlayedGames
    if (result.ownsGame) {
      const recentGamesUrl = `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`;
      
      const recentResponse = UrlFetchApp.fetch(recentGamesUrl);
      const recentData = JSON.parse(recentResponse.getContentText());
      
      if (recentData.response && recentData.response.games) {
        const recentGames = recentData.response.games;
        for (let i = 0; i < recentGames.length; i++) {
          if (recentGames[i].appid.toString() === appId.toString()) {
            result.recentPlaytime = recentGames[i].playtime_2weeks || 0;
            break;
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

/**
 * Helper function to convert a column letter to a zero-based index
 * 
 * @param {string} letter - The column letter (e.g., 'A', 'B', 'AA')
 * @return {number} - The zero-based column index
 */
function columnLetterToIndex(letter) {
  let column = 0;
  const length = letter.length;
  
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  
  return column - 1; // Convert to zero-based index
}

/**
 * Utility function to get a specific Steam AppID by game name
 * This can be run manually to find the AppID of a game
 */
function findGameAppId() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Find Game AppID',
    'Enter the name of the game:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const gameName = response.getResponseText();
    const url = `https://api.steampowered.com/ISteamApps/GetAppList/v2/`;
    
    try {
      const response = UrlFetchApp.fetch(url);
      const data = JSON.parse(response.getContentText());
      const apps = data.applist.apps;
      
      // Search for games that match the name
      const matches = apps.filter(app => 
        app.name.toLowerCase().includes(gameName.toLowerCase())
      );
      
      if (matches.length > 0) {
        let message = 'Found these potential matches:\n\n';
        matches.slice(0, 10).forEach(app => {
          message += `${app.name}: ${app.appid}\n`;
        });
        
        if (matches.length > 10) {
          message += `\n...and ${matches.length - 10} more matches.`;
        }
        
        ui.alert('Game AppID Results', message, ui.ButtonSet.OK);
      } else {
        ui.alert('No matches found for "' + gameName + '"');
      }
    } catch (error) {
      ui.alert('Error: ' + error.message);
    }
  }
}

/**
 * Gets detailed information about a game
 */
function getGameDetails() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Get Game Details',
    'Enter the AppID of the game:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const appId = response.getResponseText().trim();
    
    if (!appId || isNaN(parseInt(appId))) {
      ui.alert('Error', 'Please enter a valid AppID (numbers only).', ui.ButtonSet.OK);
      return;
    }
    
    try {
      // Steam Store API endpoint for game details
      const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
      const response = UrlFetchApp.fetch(url);
      const data = JSON.parse(response.getContentText());
      
      if (data[appId] && data[appId].success) {
        const gameData = data[appId].data;
        
        // Create a message with game details
        let message = `Game: ${gameData.name}\n\n`;
        message += `Type: ${gameData.type}\n`;
        message += `Release Date: ${gameData.release_date ? gameData.release_date.date : 'Unknown'}\n`;
        message += `Developers: ${gameData.developers ? gameData.developers.join(', ') : 'Unknown'}\n`;
        message += `Publishers: ${gameData.publishers ? gameData.publishers.join(', ') : 'Unknown'}\n\n`;
        
        if (gameData.price_overview) {
          message += `Price: ${gameData.price_overview.final_formatted}\n`;
        }
        
        message += `\nStore Page: https://store.steampowered.com/app/${appId}/`;
        
        ui.alert('Game Details', message, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', 'Could not find game details. The AppID may be invalid or the game may not be available in the Steam store.', ui.ButtonSet.OK);
      }
    } catch (error) {
      ui.alert('Error', `Failed to get game details: ${error.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Gets basic profile information for a Steam user
 */
function getUserProfile() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Get User Profile',
    'Enter the SteamID64 of the user:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const steamId = response.getResponseText().trim();
    
    if (!steamId || steamId.length < 17) {
      ui.alert('Error', 'Please enter a valid SteamID64 (17-digit number).', ui.ButtonSet.OK);
      return;
    }
    
    try {
      // Steam API endpoint for user summary
      const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
      const response = UrlFetchApp.fetch(url);
      const data = JSON.parse(response.getContentText());
      
      if (data.response && data.response.players && data.response.players.length > 0) {
        const player = data.response.players[0];
        
        // Create a message with user details
        let message = `Username: ${player.personaname}\n\n`;
        message += `Profile URL: ${player.profileurl}\n`;
        message += `Profile Visibility: ${getPrivacyStatus(player.communityvisibilitystate)}\n`;
        
        if (player.realname) {
          message += `Real Name: ${player.realname}\n`;
        }
        
        if (player.loccountrycode) {
          message += `Country: ${player.loccountrycode}\n`;
        }
        
        if (player.timecreated) {
          const accountCreated = new Date(player.timecreated * 1000);
          message += `Account Created: ${accountCreated.toLocaleDateString()}\n`;
        }
        
        ui.alert('User Profile', message, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', 'Could not find user profile. The SteamID may be invalid.', ui.ButtonSet.OK);
      }
    } catch (error) {
      ui.alert('Error', `Failed to get user profile: ${error.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Gets the number of games owned by a Steam user
 */
function getUserGameCount() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Get User Game Count',
    'Enter the SteamID64 of the user:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const steamId = response.getResponseText().trim();
    
    if (!steamId || steamId.length < 17) {
      ui.alert('Error', 'Please enter a valid SteamID64 (17-digit number).', ui.ButtonSet.OK);
      return;
    }
    
    try {
      // Steam API endpoint for owned games
      const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`;
      const response = UrlFetchApp.fetch(url);
      const data = JSON.parse(response.getContentText());
      
      if (data.response && data.response.game_count !== undefined) {
        const gameCount = data.response.game_count;
        const games = data.response.games || [];
        
        // Calculate total playtime across all games
        let totalPlaytime = 0;
        if (games.length > 0) {
          totalPlaytime = games.reduce((sum, game) => sum + (game.playtime_forever || 0), 0);
        }
        
        // Convert minutes to hours
        const totalPlaytimeHours = Math.round(totalPlaytime / 60);
        
        let message = `Games Owned: ${gameCount}\n`;
        message += `Total Playtime: ${totalPlaytimeHours} hours\n\n`;
        
        // Find most played games if available
        if (games.length > 0) {
          const sortedGames = [...games].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
          message += "Top 5 Most Played Games:\n";
          
          // We need to get game names since the API only returns appIDs
          for (let i = 0; i < Math.min(5, sortedGames.length); i++) {
            const game = sortedGames[i];
            const playHours = Math.round(game.playtime_forever / 60);
            message += `${i+1}. AppID ${game.appid}: ${playHours} hours\n`;
          }
        }
        
        ui.alert('User Game Library', message, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', 'Could not get game count. The profile may be private or the SteamID may be invalid.', ui.ButtonSet.OK);
      }
    } catch (error) {
      ui.alert('Error', `Failed to get game count: ${error.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Helper function to convert privacy state number to readable text
 */
function getPrivacyStatus(visibilityState) {
  switch(visibilityState) {
    case 1: return 'Private';
    case 2: return 'Friends Only';
    case 3: return 'Public';
    default: return 'Unknown';
  }
}

/**
 * Utility to convert between different SteamID formats
 */
function convertSteamIDFormat() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Convert SteamID Format',
    'This feature helps convert between different SteamID formats.\n' +
    'Currently, this is a placeholder for future functionality.\n\n' +
    'For now, you can use online converters like:\n' +
    '- https://steamid.io\n' +
    '- https://steamidfinder.com',
    ui.ButtonSet.OK
  );
}

/**
 * Validates the Steam API key
 */
function validateAPIKey() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Test the API key with a simple request
    const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=76561197960435530`;
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (data.response && data.response.players) {
      ui.alert('Success', 'Your Steam API key is valid and working correctly.', ui.ButtonSet.OK);
    } else {
      ui.alert('Warning', 'The API key may not be valid. The response did not contain the expected data.', ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('Error', `API key validation failed: ${error.message}. The key may be invalid or there might be a connection issue.`, ui.ButtonSet.OK);
  }
}

/**
 * Shows information about the script
 */
function showAboutDialog() {
  const ui = SpreadsheetApp.getUi();
  const message = 
    'Steam OSINT\n' +
    'Version 2.0.0\n\n' +
    'This script provides Open Source Intelligence (OSINT) tools for Steam users and games.\n\n' +
    'Features:\n' +
    '- Check game ownership for multiple Steam IDs\n' +
    '- Track recent and total playtime\n' +
    '- View detailed user profiles\n' +
    '- Analyze game libraries and playtime statistics\n' +
    '- Get detailed game information\n' +
    '- Find game AppIDs\n' +
    '- Resume interrupted operations\n\n' +
    'For help or to report issues, please refer to the README documentation.\n\n' +
    'This script uses the Steam Web API and requires a valid API key.';
  
  ui.alert('About Steam OSINT', message, ui.ButtonSet.OK);
} 
