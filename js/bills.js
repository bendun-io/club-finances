const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { shell } = require('electron');
const builder = require('xmlbuilder');


const createBillFolder = () => {
    // get uuid and create a folder with that uuid in the os.homedir()
    const parentFolderPath = path.join(os.homedir(), 'clubfinance');
    // create the parentFolder if it does not exist
    if (!fs.existsSync(parentFolderPath)){
        fs.mkdirSync(parentFolderPath);
    }
    
    const timestamp = Date.now();
    const date = new Date(timestamp);
    // get the current date as year-month-day
    const folderPrefix = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    
    const uuid = folderPrefix + uuidv4();
    const folderPath = path.join(parentFolderPath, uuid);
    fs.mkdirSync(folderPath);

    // create a file called creationtime with the current timestamp in the folder
    const formattedDate = date.toLocaleString();
    const creationTimePath = path.join(folderPath, 'creationtime.txt');
    fs.writeFileSync(creationTimePath, formattedDate);

    // open the folder with the file explorer
    shell.openPath(folderPath);

    return folderPath;
}

const storeBillData = (folderPath, billData) => {
    // create a file called billData.json with the billData in the folder
    const billDataPath = path.join(folderPath, 'billData.json');
    fs.writeFileSync(billDataPath, JSON.stringify(billData, null, 2));
}

const createBillPdf = async (folderPath, billSpec, bill) => {
    await new Promise(r => setTimeout(r, 1000));
    const creationTimePath = path.join(folderPath, 'test-'+bill['clubId']+'.txt');
    var memberNum = bill['members'].length;
    fs.writeFileSync(creationTimePath, "Number: " + memberNum);
    // TODO implement the actual functionality
}

/* assumes that billSpec has the following structure:
{ "accountName": "Round Table Deutschland",
    "iban": "XXXXXXXX",
    "bic": "XXXXX",
    "id": "XXXXXXXX"
}
*/
const createSepaFiles = async (folderPath, billSpec, billList) => {
    // compute date in the form 2024-01-19T12:19:23
    var date = new Date();
    var dateStr = date.toISOString().split('T')[0];
    var timeStr = date.toTimeString().split(' ')[0];
    var creationDate = dateStr + 'T' + timeStr;

    var root = builder.create('Document');

    var CstmrDrctDbtInitn = root.ele('CstmrDrctDbtInitn', {
        'xmlns': 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02 pain.008.002.02.xsd'
    });
    var GrpHdr = CstmrDrctDbtInitn.ele('GrpHdr');
    GrpHdr.ele('MsgId', billSpec["id"]);
    GrpHdr.ele('CreDtTm', creationDate);
    GrpHdr.ele('NbOfTxs', billList.length);
    var InitgPty = GrpHdr.ele('InitgPty');
    InitgPty.ele('Nm', billSpec['accountName']);
    var PmtInf = CstmrDrctDbtInitn.ele('PmtInf');
    PmtInf.ele('PmtInfId', 'Payment Information ID');
    PmtInf.ele('PmtMtd', 'DD');
    PmtInf.ele('NbOfTxs', billList.length);
    // PmtInf.ele('CtrlSum', 'Control Sum');
    var PmtTpInf = PmtInf.ele('PmtTpInf');
    var SvcLvl = PmtTpInf.ele('SvcLvl');
    SvcLvl.ele('Cd', 'SEPA');
    var LclInstrm = PmtTpInf.ele('LclInstrm');
    LclInstrm.ele('Cd', 'CORE');
    PmtTpInf.ele('SeqTp', 'FRST');
    var ReqdColltnDt = PmtInf.ele('ReqdColltnDt', 'Collection Date');
    var Cdtr = PmtInf.ele('Cdtr');
    Cdtr.ele('Nm', billSpec['accountName']);
    var CdtrAcct = PmtInf.ele('CdtrAcct');
    var Id = CdtrAcct.ele('Id');
    Id.ele('IBAN', billSpec['iban']);
    var CdtrAgt = PmtInf.ele('CdtrAgt');
    var FinInstnId = CdtrAgt.ele('FinInstnId');
    FinInstnId.ele('BIC', billSpec['bic']);
    PmtInf.ele('ChrgBr', 'SLEV');

    var cdtrSchmeId = PmtInf.ele('CdtrSchmeId');
    var id = cdtrSchmeId.ele('Id');
    id.ele('PrvtId', 'Othr');
    var othr = id.ele('Othr');
    othr.ele('Id', 'DE98ZZZ09999999999'); // TODO use parameter
    var schmeNm = othr.ele('SchmeNm');
    schmeNm.ele('Prtry', 'SEPA');

    var chkSum = 0;
    for(var i = 0; i < billList.length; i++) {
        chkSum += addPaymentInfo(PmtInf, billSpec, billList[i]);
    }
    PmtInf.ele('CtrlSum', chkSum);

    var xmlString = root.end({ pretty: true});
    // Assuming folderPath is a string representing the directory where you want to save the file
    var filePath = path.join(folderPath, 'sepa.xml');
    fs.writeFileSync(filePath, xmlString);
}

/*
Needs bill to have the following components:
- id: string
- amount: number
- mandateId: string
- date: string
- bic: string
- name: string
- iban: string
*/
const addPaymentInfo = function(paymentRoot, billSpec, bill) {
    var DrctDbtTxInf = paymentRoot.ele('DrctDbtTxInf');
    
    var PmtId = DrctDbtTxInf.ele('PmtId');
    PmtId.ele('EndToEndId', bill['id']);
    
    var InstdAmt = DrctDbtTxInf.ele('InstdAmt', bill['amount']);
    InstdAmt.att('Ccy', 'EUR');

    var DrctDbtTx = DrctDbtTxInf.ele('DrctDbtTx');
    var MndtRltdInf = DrctDbtTx.ele('MndtRltdInf');
    MndtRltdInf.ele('MndtId', bill['mandateId']);
    MndtRltdInf.ele('DtOfSgntr', bill['date']);

    var dbtAgent = DrctDbtTxInf.ele('DbtrAgt');
    var dbtFinInstnId = dbtAgent.ele('FinInstnId');
    dbtFinInstnId.ele('BIC', bill['bic']);

    var dbt = DrctDbtTxInf.ele('Dbtr');
    dbt.ele('Nm', bill['name']);

    var dbtAcct = DrctDbtTxInf.ele('DbtrAcct');
    var dbtId = dbtAcct.ele('Id');
    dbtId.ele('IBAN', bill['iban']);

    var RmtInf = DrctDbtTxInf.ele('RmtInf');
    RmtInf.ele('Ustrd', 'Club Contribution');

    return bill['amount'];
}

module.exports = { createBillFolder, storeBillData, createBillPdf, createSepaFiles };