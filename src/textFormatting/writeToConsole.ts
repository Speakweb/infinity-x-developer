import vscode from "vscode";

export function writeToConsole(outputString: any, consoleName: string = "Console Output") {
    let console = vscode.window.createOutputChannel(consoleName);
    console.appendLine(outputString.toString());
    console.show();
}

module.exports = {
    writeToConsole
}