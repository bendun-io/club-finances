
function generateRandomString(length) {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

const sanitizeIBAN = (iban) => {
    // remove everything that is not a number or a letter
    return iban.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
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

const transformAmount = (amount) => {
    return (amount/100).toFixed(2);
}

module.exports = { generateRandomString, sanitizeIBAN, isValidBill, transformAmount };