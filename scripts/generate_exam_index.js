import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXAMS_DIR = path.join(PROJECT_ROOT, 'static/data/exams');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'static/data/exam_index.json');

const CATEGORY_ORDER = ['공법', '민사법', '형사법'];

function scanExams() {
    console.log(`Scanning exams in: ${EXAMS_DIR}`);

    if (!fs.existsSync(EXAMS_DIR)) {
        console.error(`Error: Directory not found: ${EXAMS_DIR}`);
        process.exit(1);
    }

    const rounds = fs.readdirSync(EXAMS_DIR).filter(file => {
        return fs.statSync(path.join(EXAMS_DIR, file)).isDirectory();
    });

    const examIndex = [];

    for (const round of rounds) {
        // Skip if not a valid round directory convention if needed
        const roundDir = path.join(EXAMS_DIR, round);
        const files = fs.readdirSync(roundDir).filter(f => f.endsWith('.json'));

        if (files.length === 0) continue;

        let examYear = '';
        let examTitle = '';
        let examType = 'official';

        const subjects = [];

        for (const file of files) {
            const filePath = path.join(roundDir, file);
            try {
                // Read binary to check for BOM or encoding weirdness
                const buffer = fs.readFileSync(filePath);

                // Debug log for first file of first round
                if (examIndex.length === 0 && subjects.length === 0) {
                    console.log(`[DEBUG] Reading ${file} in ${round}`);
                    console.log(`[DEBUG] Hex start: ${buffer.subarray(0, 20).toString('hex')}`);
                }

                let content = buffer.toString('utf-8');

                // Strip BOM
                if (content.charCodeAt(0) === 0xFEFF) {
                    content = content.slice(1);
                }

                let data;
                try {
                    data = JSON.parse(content);
                } catch (jsonErr) {
                    console.error(`JSON Syntax Error in ${round}/${file}: ${jsonErr.message}`);
                    console.error(`First 50 chars: ${content.substring(0, 50)}`);
                    continue;
                }

                if (!examYear && data.year) examYear = data.year.toString();
                if (!examTitle && data.exam_title) examTitle = data.exam_title;

                const category = data.subject_category || file.replace('.json', '');
                const questionCount = data.questions ? data.questions.length : 0;

                const taxonomyStats = {};
                if (data.questions) {
                    data.questions.forEach(q => {
                        if (q.subjects) {
                            q.subjects.forEach(s => {
                                taxonomyStats[s] = (taxonomyStats[s] || 0) + 1;
                            });
                        }
                    });
                }

                subjects.push({
                    category: category,
                    questionCount: questionCount,
                    taxonomy_stats: taxonomyStats,
                    path: `data/exams/${round}/${file}`.replace(/\\/g, '/')
                });

            } catch (e) {
                console.error(`Error processing ${filePath}:`, e.message);
            }
        }

        subjects.sort((a, b) => {
            return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        });

        if (subjects.length > 0) {
            examIndex.push({
                round: round,
                year: examYear,
                type: examType,
                exam_title: examTitle || `${round} 변호사시험`,
                subjects: subjects
            });
        }
    }

    examIndex.sort((a, b) => {
        const numA = parseInt(a.round.replace(/[^0-9]/g, ''));
        const numB = parseInt(b.round.replace(/[^0-9]/g, ''));
        return numB - numA;
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(examIndex, null, 2), 'utf-8');
    console.log(`Successfully generated index with ${examIndex.length} exams.`);
}

scanExams();
