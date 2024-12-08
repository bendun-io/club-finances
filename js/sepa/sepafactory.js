
const gen00800202 = require('./generator.008.002.02');
const gen00800102 = require('./generator.008.001.02');

const getSepaGenerator = (format) => {
    switch(format) {
        case "008.001.02":
            return gen00800102.sepaGenerator;
        case "008.002.02":
            return gen00800202.sepaGenerator;
        default: throw new Error("Unknown SEPA format!");
    }
}

module.exports = {getSepaGenerator};