const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { shell } = require('electron');
const builder = require('xmlbuilder');
const puppeteer = require('puppeteer');


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

/*
 * billSpec has the following structure:
    - gleaubigerId: "XXXX"
    - orgname
    - treasurer_name
    - treasurer_role
    - treasurer_street
    - treasurer_postal
    - treasurer_city
    - treasurer_email
    - treasurer_phone

 * bill has the following structure:
    - billnumber 
    - billdate
    - mandateId
    - id
*/

const createBillPdf = async (folderPath, billSpec, bill) => {    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Assuming the HTML file is in the 'assets' directory
    await page.goto(`file://${path.join(__dirname, '..', 'assets', 'bill-template.html')}`, {waitUntil: 'networkidle0'});

    // You can modify the page content here if needed
    let backgroundPath = `file://${path.join(__dirname, '..', 'assets', 'rt-briefpapier.jpg')}`;
    await page.evaluate((billSpec, bill) => {
        let content = document.documentElement.innerHTML;
    
        content = content.replaceAll("###GLAEUBIGERID###", billSpec["gleaubigerId"])
            .replaceAll("###ORG_NAME###", billSpec["accountName"])
            .replaceAll("###ORG_IBAN###", billSpec["iban"])
            .replaceAll("###ORG_BIC###", billSpec["bic"])
            .replaceAll("###ORG_BANK###", billSpec["bank"])
            .replaceAll("###OrgName###", billSpec["orgname"])
            .replaceAll("###Treasurer###", billSpec["treasurer_name"])
            .replaceAll("###TreasurerRole###", billSpec["treasurer_role"])
            .replaceAll("###TreasurerStreet###", billSpec["treasurer_street"])
            .replaceAll("###TreasurerPostal###", billSpec["treasurer_postal"])
            .replaceAll("###TreasurerCity###", billSpec["treasurer_city"])
            .replaceAll("###TreasurerEmail###", billSpec["treasurer_email"])
            .replaceAll("###TreasurerPhone###", billSpec["treasurer_phone"])
            ;

        content = content.replaceAll("###BillNumber####", bill["billnumber"])
            .replaceAll("###POSITIONS###", bill["positions"])
            .replaceAll("###BillDate###", bill['billdate'])
            .replaceAll("###SEPAMANDAT###", bill["mandateId"])
            .replaceAll("###Description###", bill["description"])
            .replaceAll("###ClubRecipient###", bill["recipient"]["club"])
            .replaceAll("###NameRecipient###", bill["recipient"]["name"])
            .replaceAll("###StreetRecipient###", bill["recipient"]["street"])
            .replaceAll("###AddressRecipient###", bill["recipient"]["address"])
            .replaceAll("###TOTAL_NET###", bill["totalNet"])
            .replaceAll("###TAXRATE###", bill["taxrate"])
            .replaceAll("###TAXVALUE###", bill["taxvalue"])
            .replaceALl("###TOTAL###", bill["total"]);

        document.documentElement.innerHTML = content;
    }, billSpec, bill);

    var billName = 'bill-'+bill['id']+'.pdf';
    const pdfPath = path.join(folderPath, billName);
    await page.pdf({path: pdfPath, format: 'A4', printBackground: true});

    await browser.close();
}

/* Assumes that billList is an array with of bills fitting the addPayment method and 
that billSpec has the following structure:
{
    "accountName": "Round Table Deutschland",
    "iban": "XXXXXXXX",
    "bic": "XXXXX",
    "gleaubigerId": "XXXX"
}
*/
const createSepaFiles = async (folderPath, billSpec, billList) => {
    createBillPdf(folderPath, billSpec, billList[0]); // just for testing here

    // compute date in the form 2024-01-19T12:19:23
    var date = new Date();
    var dateStr = date.toISOString().split('T')[0];
    var timeStr = date.toTimeString().split(' ')[0];
    var creationDate = dateStr + 'T' + timeStr;

    // compute the checksum
    var chkSum = 0;
    for(var i = 0; i < billList.length; i++) {
        chkSum += bill['amount'];
    }

    var root = builder.create('Document', {
        'xmlns': 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02 pain.008.002.02.xsd'
    });

    var CstmrDrctDbtInitn = root.ele('CstmrDrctDbtInitn');
    var GrpHdr = CstmrDrctDbtInitn.ele('GrpHdr');
    GrpHdr.ele('MsgId', "CLUBSEPA 1.0 " + creationDate);
    GrpHdr.ele('CreDtTm', creationDate);
    GrpHdr.ele('NbOfTxs', billList.length);
    var InitgPty = GrpHdr.ele('InitgPty');
    InitgPty.ele('Nm', billSpec['accountName']);
    var PmtInf = CstmrDrctDbtInitn.ele('PmtInf');
    PmtInf.ele('PmtInfId', 'PaymentInfo1'); // just a unique id
    PmtInf.ele('PmtMtd', 'DD');
    PmtInf.ele('NbOfTxs', billList.length);
    PmtInf.ele('CtrlSum', transformAmount(chkSum));
    var PmtTpInf = PmtInf.ele('PmtTpInf');
    var SvcLvl = PmtTpInf.ele('SvcLvl');
    SvcLvl.ele('Cd', 'SEPA');
    var LclInstrm = PmtTpInf.ele('LclInstrm');
    LclInstrm.ele('Cd', 'CORE');
    PmtTpInf.ele('SeqTp', 'FRST');
    var ReqdColltnDt = PmtInf.ele('ReqdColltnDt', dateStr);
    var Cdtr = PmtInf.ele('Cdtr');
    Cdtr.ele('Nm', billSpec['accountName']);
    var CdtrAcct = PmtInf.ele('CdtrAcct');
    var Id = CdtrAcct.ele('Id');
    Id.ele('IBAN', transformIban(billSpec['iban']));
    var CdtrAgt = PmtInf.ele('CdtrAgt');
    var FinInstnId = CdtrAgt.ele('FinInstnId');
    FinInstnId.ele('BIC', billSpec['bic']);
    PmtInf.ele('ChrgBr', 'SLEV');

    var cdtrSchmeId = PmtInf.ele('CdtrSchmeId');
    var id = cdtrSchmeId.ele('Id');
    id.ele('PrvtId', 'Othr');
    var othr = id.ele('Othr');
    othr.ele('Id', billSpec['gleaubigerId']);
    var schmeNm = othr.ele('SchmeNm');
    schmeNm.ele('Prtry', 'SEPA');

    for(var i = 0; i < billList.length; i++) {
        addPaymentInfo(PmtInf, billSpec, billList[i]);
    }
    
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
- debitor: string
- iban: string
- purpose: string
*/
const addPaymentInfo = function(paymentRoot, billSpec, bill) {
    var DrctDbtTxInf = paymentRoot.ele('DrctDbtTxInf');
    
    var PmtId = DrctDbtTxInf.ele('PmtId');
    PmtId.ele('EndToEndId', bill['id']);
    
    var InstdAmt = DrctDbtTxInf.ele('InstdAmt', transformAmount(bill['amount']));
    InstdAmt.att('Ccy', 'EUR');

    var DrctDbtTx = DrctDbtTxInf.ele('DrctDbtTx');
    var MndtRltdInf = DrctDbtTx.ele('MndtRltdInf');
    MndtRltdInf.ele('MndtId', bill['mandateId']);
    MndtRltdInf.ele('DtOfSgntr', bill['date']);

    var dbtAgent = DrctDbtTxInf.ele('DbtrAgt');
    var dbtFinInstnId = dbtAgent.ele('FinInstnId');
    dbtFinInstnId.ele('BIC', bill['bic']);

    var dbt = DrctDbtTxInf.ele('Dbtr');
    dbt.ele('Nm', bill['debitor']);

    var dbtAcct = DrctDbtTxInf.ele('DbtrAcct');
    var dbtId = dbtAcct.ele('Id');
    dbtId.ele('IBAN', transformIban(bill['iban']));

    var RmtInf = DrctDbtTxInf.ele('RmtInf');
    RmtInf.ele('Ustrd', bill['purpose']);

    return bill['amount'];
}

const transformAmount = (amount) => {
    return (amount/100).toFixed(2);
}

const transformIban = (iban) => {
    // remove everything that is not a number or a letter
    return iban.replace(/[^a-zA-Z0-9]/g, '');
}

module.exports = { createBillFolder, storeBillData, createBillPdf, createSepaFiles };