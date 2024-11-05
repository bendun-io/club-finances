const ExcelJS = require('exceljs');
const { dialog } = require('electron');

// https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogwindow-options
const fileFilters = [
    { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
    { name: 'All Files', extensions: ['*'] }
]

const selectExcelFile = () => {
    return dialog.showOpenDialog({ properties: ['openFile'], filters: fileFilters });
}

const loadExcelFile = async (path) => {
    const workbook = new ExcelJS.Workbook();
    console.log(path);
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

module.exports = { loadExcelFile, selectExcelFile };