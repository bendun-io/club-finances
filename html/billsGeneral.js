let selectedBankAccount = null;
let billData = null;
const storeBillData = (data) => {
    billData = data;
}
let bankAccountMapping = {};
let theSettings = null;

window.init = () => {
    document.getElementById('createBill').addEventListener('click', createBill);

    document.getElementById('bankAccount').addEventListener('change', function(event) {
        selectedBankAccount = bankAccountMapping[event.target.value];
    });

    document.getElementById('fileButton').addEventListener('click', fileButtonClicked);

    // for every bankaccount in the settings add a selection in bankAccount select
    window.storage.loadSettings().then(
        (settings) => {
            theSettings = settings;

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

const fileButtonClicked = () => {
    window.fileselect.selectExcel().then(
        (data) => {
            console.log(data);
            document.getElementById('fileButtonContent').innerHTML = data.filePaths[0].split('/').pop();
            onFileChange(data.filePaths[0], storeBillData);
        });
}

const getPdfCheckmark = () => {
    return document.getElementById('createPDF').checked;
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
            createPdfAndSepa(folderPath).then(
                (validity) => {
                    if(validity.valid) {
                        finishTask("Rechnungen und SEPA Dateien erstellt");
                    } else {
                        addToErrors("Fehler beim Erstellen der Rechnungen und SEPA Dateien: " + JSON.stringify(validity.results));
                    }
                }
            );
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

const createPdfAndSepa = async (folderPath) => {
    var billMetaData = {
        rtbankaccount: selectedBankAccount,
        accountName: selectedBankAccount.accountName,
        bank: selectedBankAccount.institute,
        iban: selectedBankAccount.iban,
        bic: selectedBankAccount.bic,
        gleaubigerId: selectedBankAccount.gleaubigerId,
        orgname: theSettings.orgname,
        treasurer_name: theSettings.treasurer_name,
        treasurer_role: theSettings.treasurer_role,
        treasurer_street: theSettings.treasurer_street,
        treasurer_postal: theSettings.treasurer_postal,
        treasurer_city: theSettings.treasurer_city,
        treasurer_email: theSettings.treasurer_email,
        treasurer_phone: theSettings.treasurer_phone
    };

    var bills = billData; // remove first element
    bills.shift();
    // test if the checkmark for bills is set
    if( getPdfCheckmark() ) {
        updateCurrentTask("Erstelle Rechnungen (0/" + bills.length + ")");
        for(var i=0; i<bills.length; i++) {
            updateCurrentTask("Erstelle Rechnungen ("+(i+1)+"/" + bills.length + ")");
            await storage.createBillPdf(folderPath, billMetaData, bills[i]);
        }
        finishTask("Rechnungen erstellt: " + bills.length);
    }

    updateCurrentTask("Erstelle SEPA Datei(en)");
    var sepaRslt = await storage.createSepaFiles(folderPath, billMetaData, bills);
    console.log(sepaRslt);
    finishTask();
    var message = "SEPA getested. KEIN valides Format!";
    if(sepaRslt.valid) {
        message = "SEPA getestet und hat Format: " + sepaRslt.schema;
    }
    finishTask(message);

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

const onFileChange = async (filepath, process) => {
    //const fileHandle = event.target.files[0];
    excelFilename = filepath.split('/').pop();
    //excelFilename = fileHandle.name;
    const content = await window.storage.loadExcelFile(filepath);
    process(content);
    // window.transactionCollection.excelData = content.slice(1);
}