let selectedBankAccount = null;
let memberData = null;
const storeMemberData = (data) => {
    memberData = data;
}
let bankData = null;
const storeBankData = (data) => {
    bankData = data;
}

window.init = () => {
    document.getElementById('createBill').addEventListener('click', createBill);

    document.getElementById('memberExcel').addEventListener('change', 
        (event) => { onFileChange(event, storeMemberData);  });
    document.getElementById('bankExcel').addEventListener('change', 
        (event) => { onFileChange(event, storeBankData);  
    });


    // for every bankaccount in the settings add a selection in bankAccount select
    window.storage.loadSettings().then(
        (settings) => {
            for (let bankAccount of settings.bankDetails) {
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
            createAndStoreBills(folderPath);
        }
    );
}

var errors = [];
const addToErrors = (errorMessage) => {
    errors.push(errorMessage);
    document.getElementById("errorPanel").style.display = "block";
    document.getElementById("errorlog").value = errors.join("\r\n");
}

const getEmptyBill = (clubId) => {
    return {
        clubId: clubId,
        members: []
    }
}

const createAndStoreBills = async (folderPath) => {
    var billMetaData = {
        date: document.getElementById('date').value,
        title: document.getElementById('title').value,
        position: document.getElementById('position').value,
        taxrate: document.getElementById('taxrate').value,
        rtbankaccount: selectedBankAccount
    };
    var bills = {};

    updateCurrentTask("Kombiniere Daten");
    // Aggregating members to bills
    for(let member of memberData) {
        var clubId = member['Clubnummer'];
        if(bills[clubId] == null) {
            bills[clubId] = getEmptyBill(clubId);
        }
        bills[clubId].members.push(member);
    }

    // Adding bank data to bills
    for(let bankAccount of bankData) {
        var clubId = bankAccount['Clubnummer'];
        if(bills[clubId] == null) {
            addToErrors(`Clubnummer ${clubId} nicht in Mitgliederliste gefunden!`);
            continue;
        }
        if( !bankAccount['Standard']) {
            continue;
        }
        bills[clubId].bankAccount = bankAccount;
    }
    finishTask();

    updateCurrentTask("Prüfe Kontodatenverfügbarkeit");
    // Testing if every bill has a bankAccount
    for(let clubId in bills) {
        if(bills[clubId].bankAccount == null) {
            addToErrors(`Clubnummer ${clubId} hat kein Standard Bankkonto!`);
            // remove the bill from the list
            delete bills[clubId];
        }
    }
    finishTask();

    // Creating the bill pdfs
    var i = 1;
    for(let clubId in bills) {
        updateCurrentTask("Erstelle Rechnungen PDFs (" + i + "/" + Object.keys(bills).length + ")");
        var bill = bills[clubId];
        await storage.createBillPdf(folderPath, billMetaData, bill);
        i++;
    }
    finishTask("PDF Rechnungen erstellt");

    updateCurrentTask("Erstelle SEPA Dateien");
    await storage.createSepaFiles(folderPath, billMetaData, bills);
    finishTask();

    removeCurrentTask();
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

const onFileChange = async (event, process) => {
    const fileHandle = event.target.files[0];
    excelFilename = fileHandle.name;
    const content = await window.storage.loadExcelFile(fileHandle.path);
    process(content);
    // window.transactionCollection.excelData = content.slice(1);
}