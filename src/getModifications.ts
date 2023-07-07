import * as fs from "fs";
import * as vscode from "vscode";
let console = vscode.window.createOutputChannel("Console Output");

function writeToGConsole(outputString: string){
    console.appendLine(outputString);
}
export interface Content {
    startLine: number;
    contents: string[];

}
export interface Input{
    relevantFile: RelevantFile[];
}
export type Output = outputInside[]

export type outputInside = {
  path: string;
  insertions: {
      startLine: number
      content: string[]
  }[];
  deletions: number[];
}

// const dummyOutput = [{path: '/home/anton/test/test.cpp', insertions: [{startLine: 1, content: ["asd123", "567789"]}], deletions: [1]}]
export interface RelevantFile {
    path: string;
    content: Content[];
}
  
  // Helper function to count the number of deleted lines before a given line
  const countDeletedLinesBefore = (output: Output, line: number) => {
    let count = 0;
    for (const file of output){
      for (const deletionLine of file.deletions){
        if (deletionLine < line){
          count +=1
        };
      }
    }
    return count;
  };
  
  // Helper function to count the number of added lines before a given line
  const countAddedLinesBefore = (output: any, line: number) => {
    let count = 0;
    for (const file of output){
      for (const insertionLine of file.insertions){
        if (insertionLine < line){
          count +=1
        };
      }
    }
    return count;
  };
  
  // Helper function to delete lines in a text editor
const deleteLines = (edit: vscode.WorkspaceEdit, editor: { document: any; edit: (arg0: (editBuilder: { insert: (arg0: vscode.Position, arg1: string) => void; }) => void) => void; }, lines: any[]) => {
  const selections = lines.map((line) => new vscode.Selection(line - 1, 0, line, 0));
  selections.forEach((selection) => {
    edit.delete(editor.document.uri, selection);
  });
  };
  
  // Helper function to insert lines in a text editor, accounting for line deletions and insertions
  const insertLines = (edit: vscode.WorkspaceEdit, editor: { document: any; edit: (arg0: (editBuilder: { insert: (arg0: vscode.Position, arg1: string) => void; }) => void) => void; }, startLine: number, content: any[], output: any) => {
    const deletedLinesBeforeStart = countDeletedLinesBefore(output, startLine);
    const addedLinesBeforeStart = countAddedLinesBefore(output, startLine);
    const adjustedStartLine = startLine - deletedLinesBeforeStart + addedLinesBeforeStart;
    const position = new vscode.Position(adjustedStartLine - 1, 0);
    const text = content.join('\n') + '\n';
    edit.insert(editor.document.uri, position, text);
  };
  
  export const editFiles = async (output: Output) => {
    try{const textEditorMap = new Map();
  
      for (const file of output) {
        if (!fs.existsSync(file.path)) {
          throw new Error(`File not found: ${file.path}`);
        }
    
        let editor = textEditorMap.get(file.path);
    
        if (!editor) {
          const uri = vscode.Uri.file(file.path);
          const document = await vscode.workspace.openTextDocument(uri);
          editor = await vscode.window.showTextDocument(document);
          textEditorMap.set(file.path, editor);
        }
    
        const edit = new vscode.WorkspaceEdit();
        
        // Delete lines
        file.deletions.forEach((line) => {
          deleteLines(edit, editor, [line]);
          writeToGConsole("Deleting line" + line)
        });
        // Insert lines
        file.insertions.forEach((insertion) => {
          insertLines(edit, editor, insertion.startLine, insertion.content, output);
          writeToGConsole("Inserting " + insertion.content + " on line " + insertion.startLine)
        });
        
      
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage("Changes applied!");
      }}catch(error){
        vscode.window.showInformationMessage("There was an error encountered: \n" + (error as any).message);
      }
    
  };
  

export const getModificationsPrompt = ({files, request}: { files: RelevantFile[], request: string }) => `
You are an excellent developer who follows best coding practices.  
You will receive input in the shapes described below and then will call the "modifyCode" function with your modifications.  
You must call "modifyCode", or return an error.  You cannot return a plaintext description of changes.

The end of this system message will contain typescript types named Input and Output. 

Your input is a list of files, and the relevant lines you need for this modification.

Your output is a list of insertions and deletions of type Output.
Both insertions and deletions contain a startLine, and insertions containins an array of strings, where each element is one line insertion.

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
 
export interface Input{
    relevantFile: RelevantFile[];
}

Your output, which should be 

export type Output = {
    path: string;
    insertions: {
        startLine: string
        content: string[]
    }[];
    deletions: Number[];
}[]
}

${JSON.stringify({files, request})}
`;

