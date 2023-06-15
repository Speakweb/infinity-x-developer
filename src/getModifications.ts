
export type FilePath = string;

export interface Content {
    startLine: number;
    contents: string[];

}

export interface RelevantFile {
    path: FilePath;
    content: Content[];
}

export type Input = RelevantFile[];
export type Output = RelevantFile[];

const getModificationsPrompt = ({files, request}: { files: RelevantFile[], request: string }) => `
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

