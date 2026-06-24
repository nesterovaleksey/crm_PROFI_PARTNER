import XLSX from 'xlsx';

const workbook = XLSX.readFile('11.05-17.05.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headers = rows[0];
console.log('=== HEADERS ===');
headers.forEach((h, i) => console.log(`  [${i}] ${h}`));

console.log('\n=== ALL DRIVER ROWS ===');
const nameIdx = headers.findIndex(h => h && h.toString().includes('Imię'));
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[nameIdx]) continue;
  const name = row[nameIdx].toString().trim();
  if (['Suma', 'Razem', 'Podsumowanie'].includes(name) || name.includes('brutto') || name.includes('BRUTTO')) continue;
  console.log(`\nDriver: ${name}`);
  headers.forEach((h, j) => {
    if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
      console.log(`  ${h}: ${row[j]}`);
    }
  });
}

