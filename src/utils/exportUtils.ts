import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports data to an Excel file (XLSX).
 * @param data Array of objects representing the data.
 * @param fileName Name of the file to be saved.
 * @param sheetName Name of the worksheet.
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exports data to a neat PDF file.
 * @param headers Array of strings for the table headers.
 * @param data Array of arrays representing the row data.
 * @param fileName Name of the file to be saved.
 * @param title Title to display at the top of the PDF.
 */
export const exportToPDF = (headers: string[], data: any[][], fileName: string, title: string) => {
    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Add Date
    const dateStr = new Date().toLocaleString();
    doc.text(`Exported on: ${dateStr}`, 14, 30);

    // Generate Table
    autoTable(doc, {
        head: [headers],
        body: data,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [16, 126, 85], textColor: 255 }, // Brand Green
        styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`${fileName}.pdf`);
};

/**
 * Utility to convert an object array to a 2D array for PDF export.
 */
export const prepareDataForPDF = (data: any[], keys: string[]) => {
    return data.map(item => keys.map(key => {
        const val = item[key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && val.toDate) return val.toDate().toLocaleString();
        return String(val);
    }));
};
