import vscode from "vscode";

export function writeToConsole(outputString: any, consoleName: string = "Console Output") {
    let console = vscode.window.createOutputChannel(consoleName);
    console.appendLine(outputString.toString());
}
module.exports = {
    writeToConsole
}