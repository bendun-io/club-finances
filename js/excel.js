const ExcelJS = require('exceljs');


const loadExcelFile = async (path) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);

    const worksheet = workbook.worksheets[0];
    let jsonData = [];

    worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
        let rowJson = {};
        row.eachCell({ includeEmpty: false }, function(cell, colNumber) {
            rowJson[worksheet.getRow(1).getCell(colNumber).value] = cell.value;
        });
        jsonData.push(rowJson);
    });

    return jsonData;
}

module.exports = { loadExcelFile };