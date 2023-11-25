const fs = require('fs');
const path = require('path');
const os = require('os');

const saveSettings = (settings) => { 
    console.log("MAIN:" + JSON.stringify(settings));

    // Define the path to the settings file
    const settingsPath = path.join(os.homedir(), '.clubFinanceSettings.json');

    // Write the settings to the file
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    return 0;
}

const loadSettings = () => {
    // Define the path to the settings file
    const settingsPath = path.join(os.homedir(), '.clubFinanceSettings.json');

    // Check if the file exists
    if (fs.existsSync(settingsPath)) {
        // Read the file and parse it as JSON
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        return settings;
    } else {
        // If the file doesn't exist, return an empty object or default settings
        return {};
    }
}

module.exports = { saveSettings, loadSettings };