const fs = require('fs');
const path = require('path');

// Only allow in development
if (process.env.NODE_ENV === 'production') {
    console.log('This script is only available in development mode.');
    process.exit(1);
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Function to read and display logs
function displayLogs(logFile) {
    const filePath = path.join(logsDir, logFile);
    if (fs.existsSync(filePath)) {
        const logs = fs.readFileSync(filePath, 'utf8');
        console.log(`\n=== ${logFile} ===`);
        console.log(logs);
    } else {
        console.log(`\n=== ${logFile} does not exist yet ===`);
    }
}

// Display all logs
console.log('\nViewing all logs:');
displayLogs('combined.log');
displayLogs('error.log');
displayLogs('exceptions.log');
displayLogs('rejections.log'); 