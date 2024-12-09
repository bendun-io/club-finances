const builder = require('xmlbuilder');
const { generateRandomString, sanitizeIBAN, isValidBill, transformAmount } = require('./helper');

const generate = (billSpec, billList) => {
    // compute date in the form 2024-01-19T12:19:23
    var date = new Date();
    var dateStr = date.toISOString().split('T')[0];
    var timeStr = date.toTimeString().split(' ')[0];
    var creationDate = dateStr + 'T' + timeStr;

    var numValidBills = 0;
    var chkSum = 0;
    for(var i = 0; i < billList.length; i++) {
        var validityCheck = isValidBill(billList[i]);
        if(!validityCheck.result) {
            continue;
        }
        numValidBills += 1;
        chkSum += billList[i]['amount'];
    }

    //

    var root = builder.create('Document');
    root.attribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
    root.attribute('xsi:schemaLocation', 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02 pain.008.002.02.xsd');
    root.attribute('xmlns', 'urn:iso:std:iso:20022:tech:xsd:pain.008.002.02');

    var CstmrDrctDbtInitn = root.ele('CstmrDrctDbtInitn');
    var GrpHdr = CstmrDrctDbtInitn.ele('GrpHdr');
    GrpHdr.ele('MsgId', "CLUBSEPA 1.0 " + creationDate);
    GrpHdr.ele('CreDtTm', creationDate);
    GrpHdr.ele('NbOfTxs', numValidBills);
    var InitgPty = GrpHdr.ele('InitgPty');
    InitgPty.ele('Nm', billSpec['accountName']);
    var PmtInf = CstmrDrctDbtInitn.ele('PmtInf');
    PmtInf.ele('PmtInfId', generateRandomString(20)); // just a unique id
    PmtInf.ele('PmtMtd', 'DD');
    PmtInf.ele('NbOfTxs', numValidBills);
    PmtInf.ele('CtrlSum', transformAmount(chkSum));
    var PmtTpInf = PmtInf.ele('PmtTpInf');
    var SvcLvl = PmtTpInf.ele('SvcLvl');
    SvcLvl.ele('Cd', 'SEPA');
    var LclInstrm = PmtTpInf.ele('LclInstrm');
    LclInstrm.ele('Cd', 'CORE');
    PmtTpInf.ele('SeqTp', 'FRST');
    PmtInf.ele('ReqdColltnDt', dateStr);
    var Cdtr = PmtInf.ele('Cdtr');
    Cdtr.ele('Nm', billSpec['accountName']);
    var CdtrAcct = PmtInf.ele('CdtrAcct');
    var Id = CdtrAcct.ele('Id');
    Id.ele('IBAN', sanitizeIBAN(billSpec['iban']));
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

    for(var i = 0; i < billList.length; i++) {
        var validityCheck = isValidBill(billList[i]);
        if(!validityCheck.result) {
            continue;
        }
        addPaymentInfo(PmtInf, billSpec, billList[i]);
    }

    return root;
};

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
    dbtId.ele('IBAN', sanitizeIBAN(bill['iban']));

    var RmtInf = DrctDbtTxInf.ele('RmtInf');
    RmtInf.ele('Ustrd', bill['purpose']);

    return bill['amount'];
}

const sepaGenerator = {
    generate: generate
};

module.exports = { sepaGenerator };