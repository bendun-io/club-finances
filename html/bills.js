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
    if(! validateData() ) {
        return;
    }
    // Create the bill folder
    const billFolder = window.storage.createBillFolder();
    billFolder.then(
        (folderPath) => {
            alert(folderPath);
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

const onFileChange = async (event, process) => {
    const fileHandle = event.target.files[0];
    excelFilename = fileHandle.name;
    const content = await window.storage.loadExcelFile(fileHandle.path);
    process(content);
    // window.transactionCollection.excelData = content.slice(1);
}