import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXAMS_DIR = path.join(PROJECT_ROOT, 'static/data/exams');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'static/data/exam_index.json');

console.log('[START] Scanning exams...');

if (!fs.existsSync(EXAMS_DIR)) {
    console.error('[ERROR] Directory not found: ' + EXAMS_DIR);
    process.exit(1);
}

// Recursive file scanner
function scanDirectory(dir) {
    console.log('Scanning ' + dir);
    let results = [];
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        console.log(`Found ${items.length} items in ${dir}`);

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                console.log('Entering directory: ' + item.name);
                results = results.concat(scanDirectory(fullPath));
            } else if (item.name.endsWith('.json')) {
                console.log('Found JSON: ' + item.name);
                results.push(fullPath);
            } else {
                console.log('Ignored: ' + item.name);
            }
        }
    } catch (e) {
        console.error('Error scanning ' + dir + ': ' + e.message);
    }
    return results;
}

// 1. Find all JSON files
const allFiles = scanDirectory(EXAMS_DIR);
console.log('[INFO] Found ' + allFiles.length + ' JSON files.');

// 2. Process Files
const examsMap = new Map(); // Key: Round Name

allFiles.forEach(filePath => {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);

        // Derive Metadata
        const parts = filePath.split(path.sep);
        const folderName = parts[parts.length - 2];
        const fileName = parts[parts.length - 1];

        let year = data.year || "0";
        let examTitle = data.exam_title || folderName;
        let category = data.subject_category || fileName.replace('.json', '');

        // Fallback year parsing
        if (year === "0" || !year) {
            const m = examTitle.match(/20(\d{2})/);
            if (m) year = "20" + m[1];
        }

        // Determine Type
        let type = "official";
        if (examTitle.includes("모의") || folderName.includes("모") || folderName.includes("mock")) {
            type = "mock";
        }

        // Calculate Taxonomy Counts
        const taxonomyCounts = {};
        if (data.questions && Array.isArray(data.questions)) {
            data.questions.forEach(q => {
                if (Array.isArray(q.subjects)) {
                    q.subjects.forEach(code => {
                        taxonomyCounts[code] = (taxonomyCounts[code] || 0) + 1;
                    });
                }
            });
        }

        if (!examsMap.has(folderName)) {
            examsMap.set(folderName, {
                round: folderName,
                year: year,
                type: type,
                exam_title: examTitle,
                subjects: []
            });
        }

        const entry = examsMap.get(folderName);
        if (entry.year === "0" && year !== "0") entry.year = year;

        entry.subjects.push({
            category: category,
            questionCount: data.questions ? data.questions.length : 0,
            taxonomy_stats: taxonomyCounts,
            path: path.relative(path.join(PROJECT_ROOT, 'static'), filePath).replace(/\\/g, '/')
        });

    } catch (e) {
        console.error(`[WARN] Failed to process ${filePath}: ${e.message}`);
    }
});

// 3. Format Output
const output = Array.from(examsMap.values()).sort((a, b) => {
    return parseInt(b.year) - parseInt(a.year);
});

console.log('[INFO] Processed ' + output.length + ' unique exam rounds.');

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
console.log('[SUCCESS] Index saved to ' + OUTPUT_FILE);
