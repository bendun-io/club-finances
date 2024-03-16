const updateCurrentTask = (currentTask) => {
    document.getElementById("currentTask").style.display = "block";
    document.getElementById("currentTask").innerText = currentTask;
}

const removeCurrentTask = () => { // make style display none
    document.getElementById("currentTask").style.display = "none";
}

const finishTask = (finished) => {
    var toAdd = finished;
    if (toAdd == null) {
        toAdd = document.getElementById("currentTask").innerText;
    }
    // Create new li-dom eleemnt and add it to the list
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(toAdd));
    document.getElementById("finishedTasks").appendChild(li);
}

module.exports = { updateCurrentTask, removeCurrentTask, finishTask };