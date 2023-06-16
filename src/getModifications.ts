import * as fs from "fs";
import * as vscode from "vscode";

export interface Content {
    startLine: number;
    contents: string[];

}

export interface RelevantFile {
    path: string;
    content: Content[];
}
export type Output = RelevantFile[];

export type Input = RelevantFile[];
export const editFiles = async (output: Output): Promise<void> => {
    const textEditorMap: Map<string, vscode.TextEditor> = new Map();

    for (const file of output) {
        if (!fs.existsSync(file.path)) {
            throw new Error(`File not found: ${file.path}`);
        }

        let editor: vscode.TextEditor | undefined = textEditorMap.get(file.path);

        if (!editor) {
            const uri = vscode.Uri.file(file.path);
            const document = await vscode.workspace.openTextDocument(uri);
            editor = await vscode.window.showTextDocument(document);
            textEditorMap.set(file.path, editor);
        }

        const edit = new vscode.WorkspaceEdit();

        for (const content of file.content) {
            const start = new vscode.Position(content.startLine, 0);
            const end = new vscode.Position(content.startLine + content.contents.length, 0);

            const linesToReplace = new vscode.Range(start, end);
            const newText = content.contents.join('\n');

            edit.replace(editor.document.uri, linesToReplace, newText);
        }

        await vscode.workspace.applyEdit(edit);
    }
};

export const getModificationsPrompt = ({files, request}: { files: RelevantFile[], request: string }) => `
You are an excellent developer who follows best coding practices.  You will receive input in the shapes described below and then will call the "modifyCode" function with your modifications.

The end of this system message will contain typescript types named Input and Output. 

Your input is a list of files, and the relevant lines you need for this modification.

Your output is a list of files you'd like to change, and the line numbers and content you'd like to change them to.  
The output contents are allowed to be bigger or smaller than the input contents.  The modifyCode function will handle the details of inserting or deleting lines.

export type FilePath = string;

export interface Content {
    startLine: number;
    contents: string[];
}

export interface File {
    path: FilePath;
    content: Content[];
}

The input to this is defined as follows
 
export type Input = RelevantFile[];

Your output, which should be 

export type Output = RelevantFile[];

${JSON.stringify({files, request})}
`;

