import AnsiToHtml from "ansi-to-html";

export function formatDiffText(diffText: string): string {
    const ansiToHtml = new AnsiToHtml();
    const lines = diffText.split('\n');
    let formattedDiff = '';

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('+')) {
            formattedDiff += `<span class="added">${ansiToHtml.toHtml(line)}</span>\n`;
        } else if (line.startsWith('-')) {
            formattedDiff += `<span class="removed">${ansiToHtml.toHtml(line)}</span>\n`;
        } else {
            formattedDiff += `${ansiToHtml.toHtml(line)}\n`;
        }
    }

    return formattedDiff;
}