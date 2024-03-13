let memberData = null;

window.init = () => {
    document.getElementById('sendTestMail').addEventListener('click', sendTestEmail);
    document.getElementById('sendMails').addEventListener('click', sendEmails);

    document.getElementById('receiverFolder').addEventListener('change', 
        (event) => { updateReceiverFolder(event);  });

    window.storage.loadSettings().then(
        (settings) => {
            // update infos
            var infoPart = document.getElementById("emailInfo");
            infoPart.appendChild(document.createTextNode("Aus den Einstellungen:"));
            let ul = document.createElement('ul');
            infoPart.appendChild(ul);
            ul.appendChild(document.createElement('li')).textContent = "Absender: " + settings.orgname + " <"+ settings.email.account +">";
            ul.appendChild(document.createElement('li')).textContent = "Antwort an: " + settings.treasurer_name + " <"+ settings.treasurer_email +">";
        }
    );
}

const updateReceiverFolder = (event) => {
}

const sendTestEmail = () => {
    document.getElementById('sendMails').disabled = false;
}

const sendEmails = () => {
}

const createBill = () => {
    document.getElementById("progressPanel").style.display = "block";

    updateCurrentTask("Validiere Datenverfügbarkeit");
    if(! validateData() ) {
        return;
    }
    finishTask();

    // Create the bill folder
    updateCurrentTask("Erstelle Rechnungsordner");
    const billFolder = window.storage.createBillFolder();
    billFolder.then(
        (folderPath) => {
            finishTask("Ordner erstellt: " + folderPath);
            createAndStoreBills(folderPath);
        }
    );
}


const validateData = () => {
    if(memberData == null || bankData == null) {
        alert('Bitte wähle zuerst die Excel Dateien aus!');
        return false;
    }
    if( selectedBankAccount == null) {
        alert('Bitte wähle zuerst ein Bankkonto aus!');
        return false;
    }
    return true;
}

//////////////// Helper functions ///////////////////////

var errors = [];
const addToErrors = (errorMessage) => {
    errors.push(errorMessage);
    document.getElementById("errorPanel").style.display = "block";
    document.getElementById("errorlog").value = errors.join("\r\n");
}

const updateCurrentTask = (currentTask) => {
    document.getElementById("currentTask").style.display = "block";
    document.getElementById("currentTask").innerText = currentTask;
}

const removeCurrentTask = () => { // make style display none
    document.getElementById("currentTask").style.display = "none";
}

const finishTask = (finished) => {
    var toAdd = finished;
    if(toAdd == null) {
        toAdd = document.getElementById("currentTask").innerText;
    }
    // Create new li-dom eleemnt and add it to the list
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(toAdd));
    document.getElementById("finishedTasks").appendChild(li);
}
