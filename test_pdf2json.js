
const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser(this, 1);
pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
    const text = pdfParser.getRawTextContent();
    const lines = text.split('\r\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log('Extracted lines:', lines.slice(0, 5));
});

const buffer = fs.readFileSync('kartu_temp/Kartu Peserta UTBK Banin/Almer prodigy.pdf');
pdfParser.parseBuffer(buffer);

