
let states = ['noExcelFileSelected', 'loadingFile', 'selectedExcelFile'];
let currentState = 0;
let excelFilename = null;
let selectedBankAccount = null;

window.init = () => {
    document.getElementById('excelFile').addEventListener('change', onFileChange);
    document.getElementById('createSepaFileButton').addEventListener('click', createSepaFile);
    document.getElementById(states[currentState]).style.display = 'block';

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

const nextStep = () => {
    document.getElementById(states[currentState]).style.display = 'none';
    currentState++;
    document.getElementById(states[currentState]).style.display = 'block';
}

window.transactionCollection = {};


const createSepaFile = (data) => {
    // create a file to download
    let file = new Blob([generateSeptaData(selectedBankAccount, window.transactionCollection.excelData)], { type: 'text/xml' });

    // if the excelFilename is null, use the current date

    let fileInfo = new Date().toISOString().split('T')[0];
    fileInfo += "-" + excelFilename.split('.')[0];

    // create a download link
    let url = URL.createObjectURL(file);
    let a = document.createElement('a');
    a.href = url;
    a.download = `sammelueberweisung_${fileInfo}.xml`;
    document.body.appendChild(a);

    // programmatically click the link to trigger the download
    a.click();

    // cleanup: remove the link after triggering the download
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const onFileChange = async (event) => {
    // get the array position of 'loadingFile' in states
    currentState = states.indexOf('noExcelFileSelected');

    // select id loadingFile and set display to block
    nextStep();

    const fileHandle = event.target.files[0];
    excelFilename = fileHandle.name;
    // console.log('fileHandle: ', fileHandle);
    // window.transactionCollection.loadExcelFile(fileHandle);
    const content = await window.storage.loadExcelFile(fileHandle.path);
    window.transactionCollection.excelData = content.slice(1);

    // for every row in content addTableRow, skip the first as it is the header
    clearTable();
    window.transactionCollection.totalRowData = { num: content.length - 1, amount: 0.0 };
    for (let i = 1; i < content.length; i++) {
        addTableRow(i, content[i]);
        window.transactionCollection.totalRowData.amount += parseFloat(content[i].amount);
    }
    addTotalRow(window.transactionCollection.totalRowData);

    nextStep();
}

const addTotalRow = (data) => {
    document.getElementById('excelTable').innerHTML += `
    <tr id="totalRow">
        <td></td>
        <td></td>
        <td>Rechnungen</td>
        <td>${data.num}</td>
        <td>Summe</td>
        <td>${data.amount}</td>
        <td></td>
    </tr>`;
}

const clearTable = () => {
    document.getElementById('excelTable').innerHTML = `
        <tr>
            <th>ID</th>
            <th>IBAN</th>
            <th>BIC</th>
            <th>Empfänger</th>
            <th>Verwendungszweck</th>
            <th>Betrag</th>
            <th>Aktion</th>
        </tr>`
}

const addTableRow = (id, data) => {
    document.getElementById('excelTable').innerHTML += `
    <tr id="${id}">
        <td>${data.id}</td>
        <td>${data.iban}</td>
        <td>${data.bic}</td>
        <td>${data.recipient}</td>
        <td>${data.purpose}</td>
        <td>${data.amount}</td>
        <td><button class="btn btn-danger">Löschen</button></td>
    </tr>
    `;
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// sepa helper methods

const generateSeptaData = (senderAccount, rows) => {
    // Generate your data here. This is just an example.
    let count = 0;
    let controlSum = 0;
    let rowData = [];

    for(let row of rows) {
        count++;
        controlSum += parseFloat(row.amount);
        rowData.push(sepaRowData(row));
    }

    return sepaStart(count,senderAccount.accountName) +
        sepaGetHeader(controlSum, count, senderAccount) +
        rowData.join('') +
        sepaEnd();
}

const sepaStart = (count, accountName) => {
    let timestamp = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
    <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.002.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.002.03 pain.001.002.03.xsd">
        <CstmrCdtTrfInitn>
        <GrpHdr>
                <MsgId>Message-ID-4711</MsgId>
                <CreDtTm>${timestamp}</CreDtTm>
                <NbOfTxs>${count}</NbOfTxs>
                <InitgPty>
                    <Nm>${accountName}</Nm>
                </InitgPty>
            </GrpHdr>
    `;
}

const sepaEnd = () => {
    return `</PmtInf></CstmrCdtTrfInitn></Document>`;
}

const sepaRowData = (row) => {
    // row ID was fixed "ROUNDTABLE" in the other case
    let iban = row.iban.replace(/\s/g, '');
    return `<CdtTrfTxInf>
        <PmtId>
            <EndToEndId>${row.id}</EndToEndId>
        </PmtId>
        <Amt>
            <InstdAmt Ccy="EUR">${parseFloat(row.amount).toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
            <FinInstnId>
                <BIC>${row.bic}</BIC>
            </FinInstnId>
        </CdtrAgt>
        <Cdtr>
            <Nm>${row.recipient}</Nm>
        </Cdtr>
        <CdtrAcct>
            <Id>
                <IBAN>${iban}</IBAN>
            </Id>
        </CdtrAcct>
        <RmtInf>
            <Ustrd>${row.purpose}</Ustrd>
        </RmtInf>
    </CdtTrfTxInf>`;
}

const sepaGetHeader = (controlSum, count, senderAccount) => {
    let timestamp = new Date().toISOString();
    let iban = senderAccount.iban.replace(/\s/g, '');


    return `<PmtInf>
    <PmtInfId>Payment-Information-ID-4711</PmtInfId>
    <PmtMtd>TRF</PmtMtd>
    <BtchBookg>true</BtchBookg>
    <NbOfTxs>${count}</NbOfTxs>
    <CtrlSum>${parseFloat(controlSum).toFixed(2)}</CtrlSum>
    <PmtTpInf>
        <SvcLvl>
            <Cd>SEPA</Cd>
        </SvcLvl>
    </PmtTpInf>
    <ReqdExctnDt>${timestamp}</ReqdExctnDt>
    <Dbtr>
        <Nm>${senderAccount.accountName}</Nm>
    </Dbtr>
    <DbtrAcct>
        <Id>
            <IBAN>${iban}</IBAN>
        </Id>
    </DbtrAcct>
    <DbtrAgt>
        <FinInstnId>
            <BIC>${senderAccount.bic}</BIC>
        </FinInstnId>
    </DbtrAgt>
    <ChrgBr>SLEV</ChrgBr>`;

}