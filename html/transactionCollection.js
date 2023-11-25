
window.init = () => {
    document.getElementById('excelFile').addEventListener('change', onFileChange);
    document.getElementById('createSepaFileButton').addEventListener('click', createSepaFile);
}


window.transactionCollection = {};

const createSepaFile = (data) => {
    console.log('createSepaFile');
    // TODO implement
}

const onFileChange = async (event) => {
    // select id loadingFile and set display to block
    document.getElementById('loadingFile').style.display = 'block';
    document.getElementById('noExcelFileSelected').style.display = 'none';

    const fileHandle = event.target.files[0];
    // console.log('fileHandle: ', fileHandle);
    // window.transactionCollection.loadExcelFile(fileHandle);
    const content = await window.storage.loadExcelFile(fileHandle.path);
    window.transactionCollection.excelData = content;

    // for every row in content addTableRow, skip the first as it is the header
    clearTable();
    window.transactionCollection.totalRowData = {num: content.length - 1, amount: 0.0};
    for (let i = 1; i < content.length; i++) {
        addTableRow(i, content[i]);
        window.transactionCollection.totalRowData.amount += parseFloat(content[i].amount);
    }
    addTotalRow(window.transactionCollection.totalRowData);

    // await sleep of 3 seconds
    document.getElementById('loadingFile').style.display = 'none';
    document.getElementById('selectedExcelFile').style.display = 'block';
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