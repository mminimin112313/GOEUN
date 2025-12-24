import type { QuizRecord, CategoryNode } from '$lib/types';

export interface StatNode {
    id: string;
    name: string;
    total: number;
    correct: number;
    accuracy: number;
    children: StatNode[];
    isExpanded?: boolean;
}

/**
 * Calculates hierarchical statistics for a subject.
 * Aggregates data from children up to parents.
 */
export function calculateHierarchyStats(
    history: QuizRecord[],
    categories: CategoryNode[],
    subjectId: string
): StatNode[] {
    // 1. Filter history for this subject
    // Robust check: matches subjectId (civil_law) or subject (민법) or whatever is in the record
    const relevantHistory = history.filter(h =>
        h.subjectId === subjectId || h.subject === subjectId
    );

    // 2. Recursive function to build nodes
    function buildNode(cat: CategoryNode): StatNode {
        const node: StatNode = {
            id: cat.id,
            name: cat.name,
            total: 0,
            correct: 0,
            accuracy: 0,
            children: []
        };

        // Process children first (Bottom-up aggregation for some approaches, but here we scan history for each node)
        // Actually, it's better to scan history once map it, but for simplicity and robustness with "startsWith" logic:

        // A. If has sub-categories, recurse
        if (cat.subcategories && cat.subcategories.length > 0) {
            node.children = cat.subcategories.map(sub => buildNode(sub));

            // Aggregation: Sum children's stats?
            // "Parents" usually encompass children. 
            // BUT, questions might be tagged ONLY with Child ID.
            // If we rely purely on children sum, what if a question is tagged with Parent ID directly?
            // Safety: Let's calculate THIS node's stats by scanning history for "startsWith(node.id)" or "includes(node.id)"
            // This covers both direct assignment and child assignment.
        }

        // B. Calculate stats for THIS node (inclusive of children)
        let nTotal = 0;
        let nCorrect = 0;

        relevantHistory.forEach(h => {
            // Filter questions in this session that match this category
            const matchingQs = h.questions.filter(q =>
                q.tag_ids.includes(cat.id) || q.tag_ids.some(tid => tid.startsWith(cat.id))
            );

            if (matchingQs.length > 0) {
                nTotal += matchingQs.length;
                // Calculate correct
                matchingQs.forEach(q => {
                    // Find index in session
                    const idx = h.questions.findIndex(oq => oq.id === q.id);
                    if (idx !== -1 && h.answers[idx] === q.answer) {
                        nCorrect++;
                    }
                });
            }
        });

        node.total = nTotal;
        node.correct = nCorrect;
        node.accuracy = nTotal === 0 ? 0 : Math.round((nCorrect / nTotal) * 100);

        return node;
    }

    // 3. Build tree
    return categories.map(cat => buildNode(cat));
}
