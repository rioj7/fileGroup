const vscode = require('vscode');
const path = require('path');

function activate(context) {
  const extensionShortName = 'fileGroup';
  const isObject = obj => typeof obj === 'object';
  const getProperty = (obj, prop, deflt) => { return obj.hasOwnProperty(prop) ? obj[prop] : deflt; };
  // async function updateConfiguration(value, target) {
  //   // vscode.ConfigurationTarget.Workspace
  //   await vscode.workspace.getConfiguration().update(section, value, target);
  // }
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.openGroup', async (args) => {
    let groupName = undefined;
    let column = vscode.ViewColumn.Active;
    if (args == undefined) {
      // TODO quickpick to get group number
      groupName = "1";
    } else {
      groupName = args.group;
      column = getProperty(args, 'column', column);
    }
    if (groupName == undefined) { return; }
    let config = vscode.workspace.getConfiguration(extensionShortName);
    let groups = config.get('groups'); // there is always default value: {}
    let group = getProperty(groups, groupName);
    if (!group) {
      vscode.window.showInformationMessage(`group not found: ${groupName}`);
      return;
    }
    const openFile = filePath => new Promise(resolve => {
      vscode.window.showTextDocument(vscode.Uri.file(filePath), { preview: false, viewColumn: column }).then( editor => { resolve(true); },
        error => { vscode.window.showErrorMessage(String(error)); });
    });
    await Promise.all(group.files.map(openFile));
  }) );
};

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
