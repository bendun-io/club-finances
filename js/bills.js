const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { shell } = require('electron');
// const builder = require('xmlbuilder');
const puppeteer = require('puppeteer');
const validator = require('xsd-schema-validator');

const sepaFactory = require("./sepa/sepafactory");
const { isValidBill, transformAmount } = require("./sepa/helper");

const storeBillData = (folderPath, billData) => {
    // create a file called billData.json with the billData in the folder
    const billDataPath = path.join(folderPath, 'billData.json');
    fs.writeFileSync(billDataPath, JSON.stringify(billData, null, 2));
}

const formatBillDate = (date) => {	
    try {
        var dateObj = new Date(date);
        // format the object to show DD.MM.YYYY
        return dateObj.getDate() + '.' + (dateObj.getMonth() + 1) + '.' + dateObj.getFullYear();
    } catch (error) {
        console.log(error);
        return date;
    }
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

    try {
        bill['menge'] = bill['menge'].toFixed(0) ?? 1;
    } catch {
        bill['menge'] = 1;
    }
    bill['singleNet'] = bill['totalNet'] / bill['menge'];

    // only string formatting after this point
    bill["total"] = transformAmount(bill["total"]);
    bill["totalNet"] = transformAmount(bill["totalNet"]);
    bill["taxvalue"] = transformAmount(bill["taxvalue"]);
    bill['singleNet'] = transformAmount(bill['singleNet']);
    bill["positions"] = ""; // "<tr><td>1</td><td>1<td>" + bill["position"] + "</td><td>" + bill["totalNet"]  + "</td><td>" + bill["totalNet"]  + "</td></tr>";
    bill["taxrate"] = formatTaxRate(bill["taxrate"]);

    bill['billdate'] = formatBillDate(bill['billdate']);

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
            .replaceAll("###POSITION_AMOUNT###", bill["menge"] ?? 1)
            .replaceAll("###POSITIONS###", bill["positions"] ?? htmlErrorString)
            .replaceAll("###POSITION_DESC###", bill["position"] ?? htmlErrorString)
            .replaceAll("###POSITION_SINGLE###", bill['singleNet'] ?? htmlErrorString)
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

    var billName = generateBillFileName(bill);
    const pdfPath = path.join(folderPath, billName);
    await page.pdf({path: pdfPath, format: 'A4', printBackground: true});

    await browser.close();
}

const generateBillFileName = (bill) => {
    return 'bill-' + bill['id'] + '.pdf';
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
    // compute the checksum
    var invalidBills = [];
    for(var i = 0; i < billList.length; i++) {
        var validityCheck = isValidBill(billList[i]);
        if(!validityCheck.result) {
            invalidBills.push({
                bill: billList[i],
                iban: validityCheck.iban ? "ok" : "bad",
                bic: validityCheck.bic ? "ok" : "bad",
            });
        }
    }

    // replace test by the spec to generate
    var root = sepaFactory.getSepaGenerator("008.002.02").generate(billSpec, billList);
    var xmlString = root.end({ pretty: true});
    // Assuming folderPath is a string representing the directory where you want to save the file
    var filePath = path.join(folderPath, 'sepa.xml');
    fs.writeFileSync(filePath, xmlString);
    
    if(invalidBills.length > 0) {
        var invalidBillsPath = path.join(folderPath, 'invalidBills.json');
        fs.writeFileSync(invalidBillsPath, JSON.stringify(invalidBills, null, 2));
    }

    // test sepa file
    var sepaValidity = await checkSepaValidity(filePath);
    return sepaValidity;
}

const formatTaxRate = (taxrate) => {
    return (taxrate*100).toFixed(0) + " %";
}

async function validateXmlAgainstXsd(xsdPath, xmlPath) {
    const xsdFileName = path.basename(xsdPath);

    try {
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');

        var rslt =  await validator.validateXML(xmlContent, xsdPath);
        
        // Validate XML against XSD
        const isValid = rslt.valid;
        if (isValid) {
            return {
                valid: true,
                schema: xsdFileName,
                result: rslt.result,
                errors: []
            };
        } else {
            return {
                valid: false,
                schema: xsdFileName,
                result: rslt.result,
                errors: rslt.messages
            };
        }
    } catch (error) {
        // console.log(error);
        return {
            valid: false,
            schema: xsdFileName,
            result: error.result,
            errors: error.messages
        };
    }
}

async function checkSepaValidity(sepaPath) {
    const xsdList = [
        '001.001.03',
        '001.003.03',
        // '001.001.09', 
        '008.001.02', 
        '008.003.02',
        // '008.001.08',
        '008.002.02' // not accepted by bank any more
    ];
    var results = [];
    var anyValid = false;
    var validSchema = null;
    for(const xsd of xsdList) {
        const xsdPath = path.join(__dirname, '..', 'schemas', `pain.${xsd}.xsd`);
        const result = await validateXmlAgainstXsd(xsdPath, sepaPath);
        if (result.valid) {
            anyValid = true;
            validSchema = result.schema;
        }
        results.push(result);
    }
    return {
        valid: anyValid,
        schema: validSchema,
        results: results
    };
}

module.exports = { storeBillData, createBillPdf, createSepaFiles, generateBillFileName, checkSepaValidity };