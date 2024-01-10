const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { shell } = require('electron');

const createBillFolder = () => {
    // get uuid and create a folder with that uuid in the os.homedir()
    const parentFolderPath = path.join(os.homedir(), 'clubfinance');
    // create the parentFolder if it does not exist
    if (!fs.existsSync(parentFolderPath)){
        fs.mkdirSync(parentFolderPath);
    }
    
    const timestamp = Date.now();
    const date = new Date(timestamp);
    // get the current date as year-month-day
    const folderPrefix = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    
    const uuid = folderPrefix + uuidv4();
    const folderPath = path.join(parentFolderPath, uuid);
    fs.mkdirSync(folderPath);

    // create a file called creationtime with the current timestamp in the folder
    const formattedDate = date.toLocaleString();
    const creationTimePath = path.join(folderPath, 'creationtime.txt');
    fs.writeFileSync(creationTimePath, formattedDate);

    // open the folder with the file explorer
    shell.openPath(folderPath);

    return folderPath;
}

const storeBillData = (folderPath, billData) => {
    // create a file called billData.json with the billData in the folder
    const billDataPath = path.join(folderPath, 'billData.json');
    fs.writeFileSync(billDataPath, JSON.stringify(billData, null, 2));
}

module.exports = { createBillFolder, storeBillData };