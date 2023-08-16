# INFINITY X DEVELOPER README

## Console Output Guide ( DEVELOPER USE ONLY )
### Usage
   Import writeToConsole from `textFormatting/writeToConsole.ts`
   Call the function `writeToConsole( outputstring: "TEXT_TO_OUTPUT", consoleName: "CONSOLE_NAME")` with the following variable(s).
   *Note: `consoleName`  is optional and has a default value.*

### Viewing console output
1. Click on “Terminal” in the top left quadrant of the screen.
2. Select “New Terminal” from the drop-down menu.
3. Select “OUTPUT” in the window that pops up at the bottom of the screen.
4. Open the dropdown menu in the top left of the “OUTPUT” window.
5. If a console name was specified, select that name. Otherwise, select “Console Output”.

## Global State Variables Guide
### Register command
   Open your extension’s `package.json` file.
   If the "contributes" field doesn't exist, add it to your `package.json`:

   ```json
   "contributes": {
       "commands": [
           {
               "command": "extension.VSCGlobalStateEditor",
               "title": "Edit Global State Variables"
           }
       ]
   }
   ```
### Add keybinding
  Press `CTRL + SHIFT + M`
  Search for `Preferences: Open Keyboard Shortcuts (JSON)`
  Paste the following into the array inside keybindings.json:
   ```json
  {
   "key": "YOUR_KEYBINDING_HERE",
   "command": "extension.VSCGlobalStateEditor"
  }
   ```
   Example key binding: `ctrl+shift+alt+y`