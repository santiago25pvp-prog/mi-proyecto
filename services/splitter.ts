function isWhitespace(character: string | undefined): boolean {
    return Boolean(character && /\s/.test(character));
}

function isSentenceBoundary(text: string, index: number): boolean {
    const character = text[index];
    if (!/[.!?]/.test(character ?? '')) {
        return false;
    }

    const nextCharacter = text[index + 1];
    return nextCharacter === undefined || isWhitespace(nextCharacter);
}

function trimLeadingWhitespace(text: string, index: number): number {
    let cursor = index;

    while (cursor < text.length && isWhitespace(text[cursor])) {
        cursor += 1;
    }

    return cursor;
}

function findChunkEnd(text: string, start: number, targetEnd: number): number {
    const hardLimit = Math.min(targetEnd, text.length);

    for (let cursor = hardLimit; cursor > start; cursor -= 1) {
        if (isSentenceBoundary(text, cursor - 1) || isWhitespace(text[cursor - 1])) {
            return cursor;
        }
    }

    return hardLimit;
}

function findChunkStart(text: string, idealStart: number, lowerBound: number): number {
    const boundedStart = Math.max(lowerBound, idealStart);

    for (let cursor = boundedStart; cursor > lowerBound; cursor -= 1) {
        if (isSentenceBoundary(text, cursor - 1) || isWhitespace(text[cursor - 1])) {
            return trimLeadingWhitespace(text, cursor);
        }
    }

    return trimLeadingWhitespace(text, boundedStart);
}

export const textSplitter = (text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
    if (!text.trim()) {
        return [];
    }

    const safeChunkSize = Math.max(1, chunkSize);
    const safeOverlap = Math.max(0, Math.min(overlap, safeChunkSize - 1));
    const fallbackStep = Math.max(1, safeChunkSize - safeOverlap);
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const targetEnd = start + safeChunkSize;
        const chunkEnd = findChunkEnd(text, start, targetEnd);
        const chunk = text.slice(start, chunkEnd).trim();

        if (chunk) {
            chunks.push(chunk);
        }

        if (chunkEnd >= text.length) {
            break;
        }

        const idealNextStart = Math.max(0, chunkEnd - safeOverlap);
        const nextStart = findChunkStart(text, idealNextStart, start + 1);
        start = nextStart > start ? nextStart : Math.min(text.length, start + fallbackStep);
    }

    return chunks;
}
