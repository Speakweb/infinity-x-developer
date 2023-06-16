export function replacePatchLineRange(startLine: number, endLine: number, patch: string): string {
    const lines = patch.split('\n');
    const headerRegex = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/;

    let originalLength = 0;
    let newLength = 0;
    let modifiedPatch = '';
    let foundHeader = false;

    for (let line of lines) {
        if (headerRegex.test(line) && !foundHeader) {
            let match = line.match(headerRegex);
            originalLength = match ? parseInt(match[2]) : 0;
            newLength = match ? parseInt(match[4]) : 0;

            line = line.replace(headerRegex, `@@ -${startLine},${originalLength} +${startLine},${newLength} @@`);
            foundHeader = true;
        }
        modifiedPatch += line + '\n';
    }

    return modifiedPatch;
}