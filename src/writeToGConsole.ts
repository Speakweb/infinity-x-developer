import vscode from "vscode";

function writeToGConsole(outputString: string, consoleName: string = "Console Output") {
    let console = vscode.window.createOutputChannel(consoleName);
    console.appendLine(outputString);
}