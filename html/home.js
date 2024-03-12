
window.init = () => {
    // console.log('settings.js loaded');
    window.storage.getProjects().then(
        (projects) => {
            // set the projects
            projects.forEach(project => {
                addProject(project);
            });
        }
    );
}

const addProject = (project) => {
    let projectLi = document.createElement('li');
    projectLi.innerText = project?.name || 'No Name';
    document.getElementById('projects').appendChild(projectLi);
}