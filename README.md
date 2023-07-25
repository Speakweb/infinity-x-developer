### INFINITY X DEVELOPER README ###

# Console Output Guide - #

    function writeToGConsole(outputString: string, consoleName: string = "Console Output"){
    let console = vscode.window.createOutputChannel(consoleName);
    console.appendLine(outputString);
    }

    To use function -
        call `writeToConsole() with onw or two variables
        outputString is the string that you want logged into conosole
        consoleName is the name under which the function will display outputString

    To view console output - 
        click on "Terminal" in the top left quadrant of the screen
        select "New Terminal" form the drop-down menu
        select "OUTPUT" in the window that pops up in the bottom of the screen
        open the dropdown menu in the top left of the "OUTPUT" window
            if a console name was specified, select that name
            if not, select "Console Output"