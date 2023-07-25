import vscode from "vscode";
import * as DiffMatchPatch from "diff-match-patch";
import {TrimBeforeAtSign} from "../textFormatting/trimBeforeAtSign";
import fs from "fs";
import {join, resolve} from "path";

export function applyGitDiffToActiveEditor(gitDiff: string, editor: vscode.TextEditor) {
    try {
        const {document} = editor;
        const content = document.getText();

        const dmp = new DiffMatchPatch.diff_match_patch();
        const extractedUDFFromGitDiff = TrimBeforeAtSign(gitDiff);
        const fixLineEndings = extractedUDFFromGitDiff//.replace(/\r\n|\r|\n/g, '\n');
        const patches = dmp.patch_fromText(fixLineEndings);
        const [newContent, _] = dmp.patch_apply(patches, content);

        const folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
        //vscode.window.showInformationMessage("Current Working DIR: " + process.cwd());
        //vscode.window.showInformationMessage("Current folder path: " + folderPath!);

        if (!fs.existsSync(join(folderPath, "DMPDebug"))) {
            fs.mkdirSync(resolve(join(folderPath, "DMPDebug")))
        }
        fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "DMPPatch.txt")), join("Patch -\n", fixLineEndings))
        fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "NewContent.txt")), join("New Contant -\n", newContent))
        fs.writeFileSync(resolve(join(folderPath, "DMPDebug", "OldContent.txt")), join("Old Content -\n", content))

        const couldNotApplyPatch = _.some(v => !v);
        if (couldNotApplyPatch) {
            throw new Error(`Could not apply patch ${fixLineEndings}`);
        }

        const thenable = editor.edit((editBuilder) => {
            const range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(content.length)
            );
            editBuilder.replace(range, newContent);
            console.log(fixLineEndings);
        }).then((success) => {
            if (success) {
                vscode.window.showInformationMessage('Git diff applied successfully');
            } else {
                vscode.window.showErrorMessage('Failed to apply git diff');
            }
        });
        console.log(thenable);
    } catch (e) {
        console.error(e);
    }
}