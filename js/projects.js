const fs = require('fs');
const path = require('path');
const os = require('os');
const { dialog, shell } = require('electron');
const { v4: uuidv4 } = require('uuid');


const createProjectFolder = () => {
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

const getProjects = () => {
    const parentFolderPath = path.join(os.homedir(), 'clubfinance');
    const projects = fs.readdirSync(parentFolderPath);
    // test if the project is a folder
    var validProjects = [];
    projects.forEach(project => {
        const projectPath = path.join(parentFolderPath, project);
        const stats = fs.statSync(projectPath);
        if (stats.isDirectory()) {
            validProjects.push({name: project});
        }
    });
    return validProjects;
}


const selectFolder = async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        const files = fs.readdirSync(folderPath);
        const filePaths = files.map(file => path.join(folderPath, file));
        
        return {path: folderPath, files: filePaths};
    }
    return null;
}

module.exports = { getProjects, createProjectFolder, selectFolder };