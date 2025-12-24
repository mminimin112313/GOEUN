import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const INDEX_FILE = path.join(PROJECT_ROOT, 'static/data/exam_index.json');
const MASTER_CODES_FILE = path.join(PROJECT_ROOT, 'static/data/taxonomy/master_codes.json');

console.log('Loading data...');
const examIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
const masterCodes = JSON.parse(fs.readFileSync(MASTER_CODES_FILE, 'utf-8'));

console.log(`Loaded ${examIndex.length} exams.`);
console.log(`Loaded ${Object.keys(masterCodes).length} taxonomy codes.`);

// === Mock Taxonomy Service Logic ===
function getDescendantCodes(code) {
    const results = [];
    for (const key of Object.keys(masterCodes)) {
        if (key === code || key.startsWith(code + '_')) {
            results.push(key);
        }
    }
    if (!results.includes(code)) results.push(code);
    return results;
}

// === Test 1: Verify Hierarchy ===
const PARENT_CODE = "CIV_01"; // Generic Civil Law
const descendants = getDescendantCodes(PARENT_CODE);
console.log(`\nTest 1: Hierarchy for ${PARENT_CODE}`);
console.log(`Found ${descendants.length} descendant codes.`);
if (descendants.includes("CIV_01_01_01") && descendants.includes("CIV_01")) {
    console.log("PASS: Hierarchy expansion looks correct.");
} else {
    console.error("FAIL: Missing expected children.");
}

// === Test 2: Filter Simulation ===
console.log(`\nTest 2: Filter Simulation`);
// Pick an exam that has CIV_01_XX_XX questions
const targetExam = examIndex.find(e => e.subjects.some(s => s.taxonomy_stats));
if (!targetExam) {
    console.error("FAIL: No exams with taxonomy stats found.");
} else {
    const subjectData = targetExam.subjects.find(s => s.category === '민사법'); // Civil Law file
    if (subjectData) {
        console.log(`Checking ${targetExam.round} ${subjectData.category}`);
        // In the real app, we load questions. Here we check taxonomy_stats from index.
        const stats = subjectData.taxonomy_stats;
        console.log("Stats:", JSON.stringify(stats, null, 2));

        // Let's see if we can "hit" these questions by filtering for a parent
        // Find a code in stats that is deep
        const deepCode = Object.keys(stats).find(k => k.split('_').length >= 3);
        if (deepCode) {
            const parts = deepCode.split('_');
            const parent = parts.slice(0, 2).join('_'); // CIV_01

            console.log(`Selected deep code: ${deepCode} (Count: ${stats[deepCode]})`);
            console.log(`Parent: ${parent}`);

            const expanded = getDescendantCodes(parent);
            if (expanded.includes(deepCode)) {
                console.log(`PASS: Filtering by ${parent} WOULD include ${deepCode}.`);
            } else {
                console.error(`FAIL: ${parent} expansion did NOT include ${deepCode}.`);
            }
        } else {
            console.log("SKIP: No deep codes found in this exam subject.");
        }
    } else {
        console.log("SKIP: No Civil Law data in this exam.");
    }
}
