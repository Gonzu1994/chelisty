// scripts/build-checklists-from-xlsx.mjs
import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'

// === KONFIGURACJA ===
// Jeśli dane nie są w pierwszym arkuszu, wpisz jego nazwę:
const SHEET_NAME = null; // np. 'Arkusz1' albo pozostaw null

// Kolumny wg liter (A=1, B=2...), ale my użyjemy liter bezpośrednio.
const COLS = {
  location: 'L',   // tytuł checklisty (grupowanie)
  question: 'R',   // treść pytania
  areaHint: 'N',   // jeśli zawiera "Wydma 33" → Budki
};

// Wejście/wyjście:
const INPUT_XLSX = path.join(process.cwd(), 'data', 'source.xlsx'); // zmień na 'source.xls' jeśli tak masz
const OUTPUT_JSON = path.join(process.cwd(), 'data', 'checklists.json');

// --- pomocnicze ---
function colLetterToIndex(letter) {
  // A→0, B→1, ... Z→25, AA→26 itd.
  let result = 0;
  for (const ch of letter) {
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return result - 1;
}

function getCell(ws, row, colLetter) {
  const col = colLetterToIndex(colLetter);
  // xlsx utils: ws['!ref'] ma zakres, ale prościej użyjemy encode_cell
  const cellAddr = xlsx.utils.encode_cell({ r: row, c: col });
  return ws[cellAddr]?.v ?? '';
}

function normalizeText(s) {
  return String(s || '').trim();
}

function areaFromRow(areaHintCell) {
  const hint = normalizeText(areaHintCell).toLowerCase();
  if (hint.includes('wydma 33')) return 'Budki';
  return 'Restauracja';
}

function makeId(prefix, title) {
  const slug = normalizeText(title)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40);
  return `${prefix}_${slug || 'list'}`.toUpperCase();
}

try {
  if (!fs.existsSync(INPUT_XLSX)) {
    console.error(`Brak pliku: ${INPUT_XLSX}`);
    process.exit(1);
  }

  const wb = xlsx.readFile(INPUT_XLSX, { cellDates: false });
  const wsName = SHEET_NAME ?? wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  if (!ws) {
    console.error(`Nie znaleziono arkusza "${wsName}". Dostępne: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }

  // Ustalamy zakres arkusza i iterujemy od 2. wiersza (1. to zwykle nagłówki,
  // ale nawet jeśli nie – i tak pominiemy puste).
  const range = xlsx.utils.decode_range(ws['!ref']);
  const output = { Restauracja: [], Budki: [], Hotel: [] };

  // Grupowanie: area → locationTitle → { id, title, questions[] }
  const buckets = {
    Restauracja: new Map(),
    Budki: new Map(),
  };

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const location = normalizeText(getCell(ws, r, COLS.location));
    const question = normalizeText(getCell(ws, r, COLS.question));
    const hint = getCell(ws, r, COLS.areaHint);

    // pomiń puste wiersze
    if (!question && !location) continue;
    if (!question) continue; // bez pytania nie ma sensu

    const area = areaFromRow(hint);
    const map = buckets[area];

    if (!map.has(location)) {
      map.set(location, {
        id: makeId(area === 'Budki' ? 'BUDKI' : 'RESTAURACJA', location),
        title: location || (area === 'Budki' ? 'Budka' : 'Lista'),
        questions: [],
      });
    }
    const group = map.get(location);
    group.questions.push({
      id: `Q${group.questions.length + 1}`,
      text: question,
      type: 'yesno', // default – w razie potrzeby dodamy inne typy
    });
  }

  // Przepisz mapy do tablic wynikowych
  output.Restauracja = Array.from(buckets.Restauracja.values());
  output.Budki = Array.from(buckets.Budki.values());
  // Hotel zostawiamy pusty, chyba że wprowadzimy regułę podobną do powyższych.

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✔ Wygenerowano: ${OUTPUT_JSON}`);
} catch (e) {
  console.error('Błąd generowania:', e);
  process.exit(1);
}
