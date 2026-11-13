import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const columns = [...html.matchAll(/<div class="portfolio-column">([\s\S]*?)<\/div>/g)]
  .map(match => [...match[1].matchAll(/<figure class="([^"]+)">\s*<img[^>]+src="([^"]+)"/g)]
    .map(photo => ({ landscape: photo[1].includes('is-landscape'), src: photo[2] })));

assert.equal(columns.length, 4, 'Das Portfolio benötigt vier Spalten.');
const composition = column => ({
  portraits: column.filter(photo => !photo.landscape).length,
  landscapes: column.filter(photo => photo.landscape).length,
  gaps: column.length - 1,
});
for (const column of columns) {
  assert(column.length > 0);
  assert.deepEqual(composition(column), composition(columns[0]),
    'Bündige Unterkante: Jede Spalte benötigt dieselbe Anzahl Hochformate, Querformate und Abstände.');
  for (const photo of column) assert(existsSync(new URL(photo.src, root)), photo.src);
  for (let i = 1; i < column.length; i++) assert.notEqual(column[i].src, column[i - 1].src);
}
console.log('Portfolio geprüft: gleiche Formatzusammensetzung und Spaltenhöhen, alle Bilddateien vorhanden.');
