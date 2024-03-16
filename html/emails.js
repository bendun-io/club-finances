// const { updateCurrentTask, removeCurrentTask, finishTask } = require('./includes/progresspanel.js');
// const progressPanel = require('./includes/progresspanel.js');

// const updateCurrentTask = progressPanel.updateCurrentTask;
// const removeCurrentTask = progressPanel.removeCurrentTask;
// const finishTask = progressPanel.finishTask;

const generateBillFileName = (bill) => {
    return 'bill-' + bill['id'] + '.pdf';
}

let selectedFolderPath = null;
let billData = null;
const storeBillData = (data) => {
    billData = data;
    console.log(billData[1]);
    updateMailingInfo();
}
let folderData = null;

window.init = () => {
    document.getElementById('sendTestMail').addEventListener('click', sendTestEmail);
    document.getElementById('sendMails').addEventListener('click', sendEmails);
    document.getElementById('billingExcel').addEventListener('change',
        (event) => { onFileChange(event, storeBillData); });

    document.getElementById('receiverFolder').addEventListener('click', function () {
        window.storage.selectFolder().then(
            (selectedFolder) => {
                updateReceiverFolder(selectedFolder);
            }
        );
    });

    window.storage.loadSettings().then(
        (settings) => {
            // update infos
            var infoPart = document.getElementById("emailInfo");
            infoPart.appendChild(document.createTextNode("Aus den Einstellungen:"));
            let ul = document.createElement('ul');
            infoPart.appendChild(ul);
            ul.appendChild(document.createElement('li')).textContent = "Absender: " + settings.orgname + " <" + settings.email.account + ">";
            ul.appendChild(document.createElement('li')).textContent = "Antwort an: " + settings.treasurer_name + " <" + settings.treasurer_email + ">";
        }
    );
    updateMailingInfo();
}

const updateReceiverFolder = (event) => {
    folderData = event;
    document.getElementById('receiverFolderSelected').innerText = folderData?.path ?? "Kein Ordner ausgewählt";
    updateMailingInfo();
}

const emptyExample = "Keine Daten vorhanden.";

const updateMailingInfo = () => {
    var example = document.getElementById('example');

    if (billData == null || billData.length < 2) {
        example.innerHTML = emptyExample;
        return;
    }

    var billExample = billData[1];
    var message = "Beispiel: " + (billExample.recipient_name ?? "<b style='color: red;'>kein Name</b>")
        + " (" + (billExample.recipient_email ?? "<b style='color: red;'>keine Email</b>")
        + ")";
    var filename = generateBillFileName(billExample);
    var attachement = getAttachementForBill(billExample);

    if (attachement == null) {
        message += " - <b>Kein Anhang gefunden!</b>";
    } else {
        message += " - Anhang: " + filename;
    }
    example.innerHTML = message;
}

const getAttachementForBill = (bill) => {
    if (folderData == null) {
        return null;
    }
    var filename = generateBillFileName(bill);

    for(let i = 0; i < folderData.files.length; i++) {
        if (folderData.files[i].endsWith(filename)) {
            return folderData.files[i];
        }
    }
    return null;
}

const sendTestEmail = async () => {
    var email = document.getElementById('testmail').value;
    if (email == null || email.length < 5) {
        alert('Bitte gib eine Email Adresse ein!');
        return;
    }
    var attachment = {
        filename: 'rechnung.pdf',
        path: getAttachementForBill(billData[1]) ?? null
    }
    var attachments = attachment.path != null ? [attachment] : [];

    options = {
        email: email,
        subject: "[TEST] " + getSubject(),
        message: getContent(),
        attachments: attachments,
        cc: getCc()
    }

    await window.email.sendEmail(options);
    document.getElementById('sendMails').disabled = false;
}

const sendEmail = async (bill) => {
    var email = bill.recipient_email;
    if (email == null || email.length < 5) {
        addToErrors("Keine Email Adresse für " + bill.recipient_name);
        return;
    }
    var attachment = {
        filename: 'rechnung-'+bill['id']+'.pdf',
        path: getAttachementForBill(bill) ?? null
    }
    var attachments = attachment.path != null ? [attachment] : [];

    options = {
        email: email,
        subject: getSubject(),
        message: getContent(),
        attachments: attachments,
        cc: getCc()
    }

    await window.email.sendEmail(options);
}

const sendEmails = async () => {
    document.getElementById("progressPanel").style.display = "block";
    updateCurrentTask("Validiere Datenverfügbarkeit");
    if ( billData == null ) { // || folderData == null NO NEED TO ALWAYS SEND ATTACHMENTS
        alert('Bitte wähle zuerst die Excel Datei aus!');
        finishTask();
        return;
    }
    finishTask();

    // row 0 is the header
    for(var i=1; i<billData.length; i++) {
        updateCurrentTask("Versende Rechnung (" + i + "/" + (billData.length-1) + ")");
        await sendEmail(billData[i]);
    }
    finishTask("Rechnungen versandt");
    
    removeCurrentTask();
}

const getSubject = () => document.getElementById('subject').value;
const getContent = () => document.getElementById('body').value;
const getCc = () => document.getElementById('cc').value.trim().split(';');


//////////////// Helper functions ///////////////////////

var errors = [];
const addToErrors = (errorMessage) => {
    errors.push(errorMessage);
    document.getElementById("errorPanel").style.display = "block";
    document.getElementById("errorlog").value = errors.join("\r\n");
}


const onFileChange = async (event, process) => {
    const fileHandle = event.target.files[0];
    excelFilename = fileHandle.name;
    const content = await window.storage.loadExcelFile(fileHandle.path);
    process(content);
    // window.transactionCollection.excelData = content.slice(1);
}