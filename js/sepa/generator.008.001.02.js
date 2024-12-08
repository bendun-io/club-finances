const builder = require('xmlbuilder');
const { generateRandomString, sanitizeIBAN, isValidBill, transformAmount } = require('./helper');

const generate = (billSpec, billList) => {

    var root = sepaFactory.getSepaGenerator("008.002.02").generate(billSpec, billList);


    return root;
};

const sepaGenerator = {
    generate: generate
};

module.exports = { sepaGenerator };