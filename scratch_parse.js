import XLSX from 'xlsx';
import path from 'path';

try {
  const filePath = path.join(process.cwd(), '11.05-17.05.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawRows.length < 2) {
    throw new Error('Файл пуст или поврежден (нет строк данных).');
  }

  // Generate headers map
  const headers = rawRows[0];
  const indexMap = {};
  headers.forEach((h, idx) => {
    if (h) indexMap[h.toString().trim()] = idx;
  });

  const getColIndex = (options) => {
    for (let opt of options) {
      if (indexMap[opt] !== undefined) return indexMap[opt];
    }
    return -1;
  };

  const uberGotowkaIdx = getColIndex(['Uber Netto\n(gotówka)', 'Uber Netto (gotówka)', 'Uber Netto (gotowka)']);
  const uberIdx = getColIndex(['Uber Netto']);
  const boltGotowkaIdx = getColIndex(['Bolt Netto (gotówka)', 'Bolt Netto (gotowka)']);
  const boltIdx = getColIndex(['Bolt Netto ', 'Bolt Netto']);
  const freenowKIdx = getColIndex(['FreeNow Netto ', 'FreeNow Netto (k)', 'FreeNow Netto k']);
  const freenowLIdx = getColIndex(['FreeNow Netto', 'FreeNow Netto (l)', 'FreeNow Netto l']);
  
  const vatIdx = indexMap['VAT'];
  const partnerIdx = indexMap['Partner'];
  const autoIdx = indexMap['Auto'];
  const korektyIdx = getColIndex(['Korekty', 'Inne']);
  const zusIdx = indexMap['ZUS'];
  
  const doWyplatyIdx = indexMap['Do wypłaty'];
  const zwrotIdx = getColIndex(['Zwrot kosztów', 'Zwrot kosztow']);
  const umowaIdx = getColIndex(['Umowa zlecenie', 'Umowa zlecenie']);

  // New columns indices
  const imieNazwiskoIdx = indexMap['Imię Nazwisko'];
  const numerTelIdx = getColIndex(['Numer Tel', 'Numer telefonu', 'Phone']);
  const emailIdx = getColIndex(['E-mail', 'Email']);
  const uberBruttoIdx = getColIndex(['Uber Brutto']);
  const boltBruttoIdx = getColIndex(['Bolt Brutto']);
  const freenowBruttoIdx = getColIndex(['FreeNow Brutto']);
  const brutto3AplIdx = getColIndex(['Brutto 3 apl']);
  const umowaNajmuIdx = getColIndex(['Umowa najmu']);

  console.log('Detected indices:', {
    imieNazwiskoIdx,
    numerTelIdx,
    emailIdx,
    uberBruttoIdx,
    boltBruttoIdx,
    freenowBruttoIdx,
    brutto3AplIdx,
    umowaNajmuIdx
  });

  const incomesToInsert = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const nameVal = row[indexMap['Imię Nazwisko']];
    if (!nameVal) continue;
    
    const driverFio = nameVal.toString().trim();
    if (['Suma', 'Razem', 'Podsumowanie', 'VAT BRUTTO', 'Imię Nazwisko'].includes(driverFio) || driverFio.toLowerCase().includes('brutto')) {
      continue;
    }

    const num = (idx) => {
      if (idx === -1 || row[idx] === undefined || row[idx] === null) return 0;
      const val = parseFloat(row[idx].toString().replace(',', '.'));
      return isNaN(val) ? 0 : val;
    };

    const txt = (idx) => {
      if (idx === -1 || row[idx] === undefined || row[idx] === null) return '';
      return row[idx].toString().trim();
    };

    incomesToInsert.push({
      period_name: '11.05-17.05 2026',
      file_name: '11.05-17.05.xlsx',
      uber_netto_gotowka: num(uberGotowkaIdx),
      uber_netto: num(uberIdx),
      bolt_netto_gotowka: num(boltGotowkaIdx),
      bolt_netto: num(boltIdx),
      freenow_netto_k: num(freenowKIdx),
      freenow_netto_l: num(freenowLIdx),
      vat: num(vatIdx),
      partner: num(partnerIdx),
      auto: num(autoIdx),
      korekty: num(korektyIdx),
      zus: num(zusIdx),
      do_wyplaty: num(doWyplatyIdx),
      zwrot_kosztow: num(zwrotIdx),
      umowa_zlecenie: num(umowaIdx),
      
      // New columns
      imie_nazwisko: txt(imieNazwiskoIdx),
      numer_tel: txt(numerTelIdx),
      email: txt(emailIdx),
      uber_brutto: num(uberBruttoIdx),
      bolt_brutto: num(boltBruttoIdx),
      freenow_brutto: num(freenowBruttoIdx),
      brutto_3_apl: num(brutto3AplIdx),
      umowa_najmu: num(umowaNajmuIdx),
    });
  }

  console.log('\nParsed first 2 records:');
  console.log(JSON.stringify(incomesToInsert.slice(0, 2), null, 2));

} catch (err) {
  console.error(err);
  process.exit(1);
}
