import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'static/data/exams/11회');

console.log(`Checking: ${TARGET}`);
if (fs.existsSync(TARGET)) {
    console.log('Exists');
    const files = fs.readdirSync(TARGET);
    console.log('Files:', files);
    files.forEach(f => {
        console.log(` - ${f}: hex=${Buffer.from(f).toString('hex')}`);
    });
} else {
    console.log('Not found');
}
