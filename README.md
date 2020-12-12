Open a group of files with 1 command or Key binding.

By definig one or more groups of file paths you can open together with 1 Key binding.

# Extension Settings

* `fileGroup.groups`: Definition of the different groups. It is an object with the following fields:
    * the key for the group can have any name
    * the parameters for each group are
        * `files`: an array with the full file paths, OS versions

A good location to store this is in the User `settings.json`. This will not influence your team members.

If you store this in the WorkspaceFolder settings there are 2 cases:

* you have opened 1 folder ==> it can be in `.vscode/settings.json`
* you have opened a Multi Root Workspace ==> use the `name.code-workspace` file,<br/>
  because the loading needs to happen independent of a current file open

# How to use

An example `settings.json`:

```json
    "fileGroup.groups": {
      "1": {
        "files": [
          "C:\\Projects\\project1\\Tutorial.md",
          "C:\\Projects\\project2\\API.md"
        ]
      },
      "2": {
        "files": [
          "C:\\Projects\\project2\\Tutorial.md",
          "C:\\Projects\\project3\\Reference.md"
        ]
      }
```

# Keybindings

The command `fileGroup.openGroup` can be bind to a Key combo to open a named group in a possible Column, number 1 to 9 (split editor).

The `args` property is an object with the fields:

* `group`: the name of the group to open
* `column`: [Optional column](https://code.visualstudio.com/api/references/vscode-api#ViewColumn) to open the files in (default: current Active Column)

If you choose the Column Beside (-2) each file will be opened in a separate Column. If you choose a Column that does not exist yet the files will be put in separate groups until there is a group with that Column number.

An eample keybinding:

```json
  {
    "key": "ctrl+shift+f1", // or any other combo
    "command": "fileGroup.openGroup",
    "args": { "group": "1", "column": 2 }
  }
```

## Predefined keybindings

For groups "1", "2", .... , "9", "0" there is a predefined key binding.

* for Windows and Linux it is `Ctrl+Alt+number`, like `Ctrl+Alt+3`
* for macOS it is `Cmd+Alt+number`, like `Cmd+Alt+3`

The files will be opened in the current Active Column.

# TODO

* Add files to a group with the Editor context menu and File Explorer context menu
* Remove files from a group with the Editor context menu and File Explorer context menu
* a quick pick list of the currently defined groups with label/detail/description
* support relative file paths, but which workspaceFolder to use