import { promises as fs } from 'fs';
import glob from 'glob';
import * as vscode from "vscode";
function createFlagArrays(inputText: string) {
    const regex = /\*[^ ]+/g;
    return inputText.match(regex);
}

export async function addFilesToQuestion(messageText: string) {
    const globFlags = createFlagArrays(messageText) as Array<string>;
    if (globFlags.length = 0) {
        return messageText;
    }
    else {
        const extensionPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
        let fileNamesAndContents = 'These are the relevant files and their filenames: \n';
        let fileNames: string[] = [];

        for (const pattern of globFlags) {
            const files = glob.sync(extensionPath + pattern);

            for (const file of files) {
                fileNames.push(file);
                const fileContent = await fs.readFile(file, 'utf8');
                fileNamesAndContents += `Filename:\n${file}\nContents:\n${fileContent}\n\n`;
            }
        }
        return fileNamesAndContents;
    }
}

module.exports = {
    addFilesToQuestion
}