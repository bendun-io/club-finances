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


const htmlErrorString = "<b style='color: red;'>MISSING</b>";
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

    // Calculate bill properties
    bill["total"] = bill["amount"];
    bill["totalNet"] = (bill["amount"] / (1 + bill["taxrate"])).toFixed(2);
    bill["taxvalue"] = bill["total"] - bill["totalNet"];

    // only string formatting after this point
    bill["total"] = transformAmount(bill["total"]);
    bill["totalNet"] = transformAmount(bill["totalNet"]);
    bill["taxvalue"] = transformAmount(bill["taxvalue"]);
    bill["positions"] = ""; // "<tr><td>1</td><td>1<td>" + bill["position"] + "</td><td>" + bill["totalNet"]  + "</td><td>" + bill["totalNet"]  + "</td></tr>";
    bill["taxrate"] = formatTaxRate(bill["taxrate"]);

    await page.evaluate((billSpec, bill, htmlErrorString) => {
        let content = document.documentElement.innerHTML;
    
        content = content.replaceAll("###GLAEUBIGERID###", billSpec["gleaubigerId"] ?? htmlErrorString)
            .replaceAll("###ORG_NAME###", billSpec["accountName"] ?? htmlErrorString)
            .replaceAll("###ORG_IBAN###", billSpec["iban"] ?? htmlErrorString)
            .replaceAll("###ORG_BIC###", billSpec["bic"] ?? htmlErrorString)
            .replaceAll("###ORG_BANK###", billSpec["bank"] ?? htmlErrorString)
            .replaceAll("###OrgName###", billSpec["orgname"] ?? htmlErrorString)
            .replaceAll("###Treasurer###", billSpec["treasurer_name"] ?? htmlErrorString)
            .replaceAll("###TreasurerRole###", billSpec["treasurer_role"] ?? htmlErrorString)
            .replaceAll("###TreasurerStreet###", billSpec["treasurer_street"] ?? htmlErrorString)
            .replaceAll("###TreasurerPostal###", billSpec["treasurer_postal"] ?? htmlErrorString)
            .replaceAll("###TreasurerCity###", billSpec["treasurer_city"] ?? htmlErrorString)
            .replaceAll("###TreasurerEmail###", billSpec["treasurer_email"] ?? htmlErrorString)
            .replaceAll("###TreasurerPhone###", billSpec["treasurer_phone"] ?? htmlErrorString)
            ;

            
        content = content.replaceAll("###BillNumber###", bill["billnumber"] ?? htmlErrorString)
            .replaceAll("###POSITIONS###", bill["positions"] ?? htmlErrorString)
            .replaceAll("###POSITION_DESC###", bill["position"] ?? htmlErrorString)
            .replaceAll("###POSITION_TOTAL###", bill['totalNet'] ?? htmlErrorString)
            .replaceAll("###BillDate###", bill['billdate'] ?? htmlErrorString)
            .replaceAll("###SEPAMANDAT###", bill["mandateId"] ?? htmlErrorString)
            .replaceAll("###Description###", bill["description"] ?? htmlErrorString)
            .replaceAll("###ClubRecipient###", bill["recipient_club"] ?? htmlErrorString)
            .replaceAll("###NameRecipient###", bill["recipient_name"] ?? htmlErrorString)
            .replaceAll("###StreetRecipient###", bill["recipient_street"] ?? htmlErrorString)
            .replaceAll("###AddressRecipient###", bill["recipient_address"] ?? htmlErrorString)
            .replaceAll("###TOTAL_NET###", bill["totalNet"] ?? htmlErrorString)
            .replaceAll("###TAXRATE###", bill["taxrate"] ?? htmlErrorString)
            .replaceAll("###TAXVALUE###", bill["taxvalue"] ?? htmlErrorString)
            .replaceAll("###TOTAL###", bill["total"] ?? htmlErrorString)
            ;

        document.documentElement.innerHTML = content;
    }, billSpec, bill, htmlErrorString);

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
    // compute date in the form 2024-01-19T12:19:23
    var date = new Date();
    var dateStr = date.toISOString().split('T')[0];
    var timeStr = date.toTimeString().split(' ')[0];
    var creationDate = dateStr + 'T' + timeStr;

    // compute the checksum
    var chkSum = 0;
    for(var i = 0; i < billList.length; i++) {
        if(!isValidBill(billList[i])) {
            continue;
        }
        chkSum += billList[i]['amount'];
    }

    var root = builder.create('Document');
    root.attribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
    root.attribute('xsi:schemaLocation', 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02 pain.008.002.02.xsd');
    root.attribute('xmlns', 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02');

    var CstmrDrctDbtInitn = root.ele('CstmrDrctDbtInitn');
    var GrpHdr = CstmrDrctDbtInitn.ele('GrpHdr');
    GrpHdr.ele('MsgId', "CLUBSEPA 1.0 " + creationDate);
    GrpHdr.ele('CreDtTm', creationDate);
    GrpHdr.ele('NbOfTxs', billList.length);
    var InitgPty = GrpHdr.ele('InitgPty');
    InitgPty.ele('Nm', billSpec['accountName']);
    var PmtInf = CstmrDrctDbtInitn.ele('PmtInf');
    PmtInf.ele('PmtInfId', generateRandomString(20)); // just a unique id
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
    var prvtId = id.ele('PrvtId');
    var othr = prvtId.ele('Othr');
    othr.ele('Id', billSpec['gleaubigerId']);
    var schmeNm = othr.ele('SchmeNm');
    schmeNm.ele('Prtry', 'SEPA');

    var invalidBills = [];
    for(var i = 0; i < billList.length; i++) {
        var validityCheck = isValidBill(billList[i]);
        if(!validityCheck.result) {
            invalidBills.push({
                bill: billList[i],
                iban: validityCheck.iban ? "ok" : "bad",
                bic: validityCheck.bic ? "ok" : "bad",
            });
            continue;
        }
        addPaymentInfo(PmtInf, billSpec, billList[i]);
    }
    
    var xmlString = root.end({ pretty: true});
    // Assuming folderPath is a string representing the directory where you want to save the file
    var filePath = path.join(folderPath, 'sepa.xml');
    fs.writeFileSync(filePath, xmlString);

    if(invalidBills.length > 0) {
        var invalidBillsPath = path.join(folderPath, 'invalidBills.json');
        fs.writeFileSync(invalidBillsPath, JSON.stringify(invalidBills, null, 2));
    }
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
    PmtId.ele('EndToEndId', generateRandomString(25)); // bill['id']
    
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

function generateRandomString(length) {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

const formatTaxRate = (taxrate) => {
    return (taxrate*100) + " %";
}

const transformAmount = (amount) => {
    return (amount/100).toFixed(2);
}

const transformIban = (iban) => {
    // remove everything that is not a number or a letter
    return iban.replace(/[^a-zA-Z0-9]/g, '');
}

function isValidBill(bill) {
    return {
        result: isValidIban(bill.iban) && isValidBic(bill.bic),
        iban: isValidIban(bill.iban),
        bic: isValidBic(bill.bic)
    }
}

function isValidIban(iban) {
    var ibanRegex = /^([A-Z]{2})(\d{2})([A-Z\d]{1,30})$/;
    var match = iban.match(ibanRegex);
    if (match) {
        var country = match[1];
        var checksum = match[2];
        var bban = match[3];
        var numericIban = (bban + country + checksum).toUpperCase();
        numericIban = numericIban.replace(/[A-Z]/g, function(letter) {
            return letter.charCodeAt(0) - 55;
        });
        var remainder = BigInt(numericIban) % 97n;
        return remainder === 1n;
    } else {
        return false;
    }
}

function isValidBic(bic) {
    var bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    return bicRegex.test(bic);
}

module.exports = { createBillFolder, storeBillData, createBillPdf, createSepaFiles };