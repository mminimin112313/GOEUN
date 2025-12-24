import { base } from '$app/paths';

export interface TaxonomyNode {
    code: string;
    name: string;
    path: string;
    children?: TaxonomyNode[];
}

export type MasterCodeMap = Record<string, { subject: string; path: string }>;

class TaxonomyService {
    private masterCodes: MasterCodeMap | null = null;
    private isLoaded = false;

    async init() {
        if (this.isLoaded) return;
        try {
            const res = await fetch(`${base}/data/taxonomy/master_codes.json`);
            if (!res.ok) throw new Error('Failed to load master codes');
            this.masterCodes = await res.json();
            this.isLoaded = true;
        } catch (e) {
            console.error('[TaxonomyService] Failed to load master codes:', e);
            this.masterCodes = {};
        }
    }

    /**
     * Returns the full code list including the given code and all its descendants.
     * e.g. "CIV_01" -> ["CIV_01", "CIV_01_01", "CIV_01_01_01", ...]
     */
    getDescendantCodes(code: string): string[] {
        if (!this.masterCodes) return [code];

        const results: string[] = [];
        // Since master_codes is flat, we search for prefix matches.
        // This assumes codes are hierarchical like CIV_01 -> CIV_01_01
        for (const key of Object.keys(this.masterCodes)) {
            // Exact match or Prefix match (ensure boundary with underscore or end of string if strict)
            // Actually, for "CIV_01", we want "CIV_01_..."
            if (key === code || key.startsWith(code + '_')) {
                results.push(key);
            }
        }

        // If the code itself wasn't found (maybe it's a parent category not in master_codes leaf list),
        // we still include it as it might be used as a filter tag.
        if (!results.includes(code)) {
            results.push(code);
        }

        return results;
    }

    getName(code: string): string {
        if (!this.masterCodes) return code;
        return this.masterCodes[code]?.path.split(' > ').pop() || code;
    }

    getPath(code: string): string {
        if (!this.masterCodes) return code;
        return this.masterCodes[code]?.path || code;
    }
}

export const taxonomyService = new TaxonomyService();
