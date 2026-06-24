import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

try {
  const filePath = path.join(process.cwd(), '11.05-17.05.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = rawRows[0];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const nameVal = row[0];
    if (nameVal && nameVal.toString().trim().toLowerCase().includes('ivan volovikov')) {
      console.log('---RAW ROW---');
      row.forEach((cell, idx) => {
        console.log(`[${idx}] ${headers[idx]}: "${cell}"`);
      });
      console.log('---RAW ROW_END---');
    }
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
