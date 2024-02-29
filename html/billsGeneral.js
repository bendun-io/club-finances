let selectedBankAccount = null;
let billData = null;
const storeBillData = (data) => {
    billData = data;
}
let bankAccountMapping = {};

window.init = () => {
    document.getElementById('createBill').addEventListener('click', createBill);

    document.getElementById('billingExcel').addEventListener('change', 
        (event) => { onFileChange(event, storeBillData);  });

    document.getElementById('bankAccount').addEventListener('change', function(event) {
        selectedBankAccount = bankAccountMapping[event.target.value];
    });

    // for every bankaccount in the settings add a selection in bankAccount select
    window.storage.loadSettings().then(
        (settings) => {
            for (let bankAccount of settings.bankDetails) {

                bankAccountMapping[bankAccount.accountName] = bankAccount;
                if(selectedBankAccount == null) {
                    selectedBankAccount = bankAccount;
                }
                document.getElementById('bankAccount').innerHTML += `
                <option value="${bankAccount.accountName}">${bankAccount.accountName}</option>
                `;
            }
        }
    );
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
            createAndStoreSepa(folderPath);
        }
    );
}

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

const getEmptyBill = (clubId) => {
    return {
        clubId: clubId,
        members: []
    }
}

const createAndStoreSepa = async (folderPath) => {
    var billMetaData = {
        rtbankaccount: selectedBankAccount,
        accountName: selectedBankAccount.accountName,
        iban: selectedBankAccount.iban,
        bic: selectedBankAccount.bic,
        gleaubigerId: selectedBankAccount.gleaubigerId
    };

    updateCurrentTask("Erstelle SEPA Datei(en)");
    var bills = billData; // remove first element
    bills.shift();
    await storage.createSepaFiles(folderPath, billMetaData, bills);
    finishTask();

    removeCurrentTask();
}

const validateData = () => {
    if( billData == null ) {
        alert('Bitte wähle zuerst die Excel Dateien aus!');
        return false;
    }
    if( selectedBankAccount == null) {
        alert('Bitte wähle zuerst ein Bankkonto aus!');
        return false;
    }
    return true;
}

const onFileChange = async (event, process) => {
    const fileHandle = event.target.files[0];
    excelFilename = fileHandle.name;
    const content = await window.storage.loadExcelFile(fileHandle.path);
    process(content);
    // window.transactionCollection.excelData = content.slice(1);
}