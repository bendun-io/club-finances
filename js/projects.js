const fs = require('fs');
const path = require('path');
const os = require('os');

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

module.exports = { getProjects };