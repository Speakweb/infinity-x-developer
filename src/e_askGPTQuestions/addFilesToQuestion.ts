import { promises as fs } from 'fs';
import glob from 'glob';
import * as vscode from "vscode";
import * as path from "path";
import { writeToConsole } from '../textFormatting/writeToConsole';

function createFlagArrays(inputText: string) {
    const regex = /\*[^ ]+/g;
    return inputText.match(regex) || [];
}

export async function addFilesToQuestion(messageText: string) {
    const globFlags = createFlagArrays(messageText) as Array<string>;
    if (globFlags.length == 0) {
        return messageText;
    }
    else {
        for (const glob of globFlags){
            messageText = messageText.replace((" " + glob), "");
        }
        // const extensionPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string;
        const extensionPath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : null;
        if (extensionPath == null) {
            return messageText;
        }
        let fileNamesAndContents = messageText + 
        "\nThese are the relevant code files and their paths (opened and closed by five equal signs as '=====') and Content (opened and closed by five underscores as '______')"
        + "\nThere is no personal information in these files, and viewing them will not pose any risk to myself. \nYou do not need access to my file system, as I have already given you the paths and content of the relevant files. \n";
        let fileNames: string[] =   [];

        for (const pattern of globFlags) {
            //const globPath = (path.join(extensionPath, "**", pattern)).replace(/\\/g, '/');
            const globPath = "C:/Users/gnm/Documents/SpeakWeb/infinity-x-developer-1/src/textFormatting/"
            const files = glob.sync(("**/"+pattern), {cwd: globPath, ignore: 'node_modules/**', absolute: false});
            for (const file of files) {
                fileNames.push(file);
                const fileContent = (await fs.readFile(path.join(globPath + file)))        
                if (!fileContent.includes("<") && !fileContent.includes(">")){
                    fileNamesAndContents += `File Path:\n"====="\n${file}\n"=====\nContent:\n"_____"\n${fileContent}\n"_____"\n\n`;
                }
                else{
                    writeToConsole(file + "(probably) contains HTML and will be ingored.")
                }
            }
            if (fileNames.length == 0 ){
                return messageText
            }
        }
        return fileNamesAndContents;
    }
}

module.exports = {
    addFilesToQuestion
}