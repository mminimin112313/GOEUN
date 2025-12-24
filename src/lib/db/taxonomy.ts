/**
 * Taxonomy 처리 유틸리티
 */

import { loadTaxonomies, loadMasterCodes } from './index';
import { CATEGORY_MAP } from '../config';
import type { TaxonomyDepth1, TaxonomyFile } from '../types';

export interface FlatTaxonomyNode {
    code: string;
    name: string;
    depth: 1 | 2 | 3;
    parentCode?: string;
    path: string;
    subject: string;
}

/**
 * 카테고리에 해당하는 모든 Taxonomy를 평탄화하여 반환
 */
export async function getFlatTaxonomyForCategory(category: string): Promise<FlatTaxonomyNode[]> {
    const categoryInfo = CATEGORY_MAP[category];
    if (!categoryInfo) {
        return [];
    }

    const taxonomies = await loadTaxonomies(categoryInfo.subjects);
    const nodes: FlatTaxonomyNode[] = [];

    for (const taxonomy of taxonomies) {
        for (const d1 of taxonomy.categories) {
            // Depth 1 노드
            nodes.push({
                code: d1.depth1_code,
                name: d1.depth1_name,
                depth: 1,
                path: d1.depth1_name,
                subject: taxonomy.subject
            });

            for (const d2 of d1.depth2_items) {
                // Depth 2 노드
                nodes.push({
                    code: d2.depth2_code,
                    name: d2.depth2_name,
                    depth: 2,
                    parentCode: d1.depth1_code,
                    path: `${d1.depth1_name} > ${d2.depth2_name}`,
                    subject: taxonomy.subject
                });

                for (const d3 of d2.depth3_items) {
                    // Depth 3 노드
                    nodes.push({
                        code: d3.depth3_code,
                        name: d3.depth3_name,
                        depth: 3,
                        parentCode: d2.depth2_code,
                        path: `${d1.depth1_name} > ${d2.depth2_name} > ${d3.depth3_name}`,
                        subject: taxonomy.subject
                    });
                }
            }
        }
    }

    return nodes;
}

/**
 * 코드의 상위 계층 코드들을 반환
 * 예: CIV_01_02_03 -> ['CIV_01', 'CIV_01_02', 'CIV_01_02_03']
 */
export function getAncestorCodes(code: string): string[] {
    const parts = code.split('_');
    const ancestors: string[] = [];

    for (let i = 1; i <= parts.length; i++) {
        ancestors.push(parts.slice(0, i).join('_'));
    }

    return ancestors;
}

/**
 * 문제가 선택된 코드에 해당하는지 확인
 * - 계층적 매칭: 상위 코드 선택 시 하위도 포함
 */
export function matchesSelectedCodes(questionCodes: string[], selectedCodes: string[]): boolean {
    if (selectedCodes.length === 0) return true;

    for (const qCode of questionCodes) {
        const ancestors = getAncestorCodes(qCode);
        for (const selected of selectedCodes) {
            // 문제의 조상 코드 중 하나가 선택된 코드와 일치하거나
            // 선택된 코드가 문제 코드로 시작하면 매칭
            if (ancestors.includes(selected) || qCode.startsWith(selected)) {
                return true;
            }
        }
    }

    return false;
}
