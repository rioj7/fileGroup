const vscode = require('vscode');
const path = require('path');

const extensionShortName = 'fileGroup';
const isString = obj => typeof obj === 'string';
const isArray = obj => Array.isArray(obj);
const isObject = obj => (typeof obj === 'object') && !isArray(obj);
const getProperty = (obj, prop, deflt) => { return obj.hasOwnProperty(prop) ? obj[prop] : deflt; };

class FileGroupProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.content = {};
  }
  refresh() {
    this._onDidChangeTreeData.fire(0);
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    if (element === undefined) {
      let config = vscode.workspace.getConfiguration(extensionShortName);
      let groups = config.get('groups'); // there is always default value: {}
      let groupItems = [];
      this.content = {};
      for (const prop in groups) {
        if (!groups.hasOwnProperty(prop)) { continue; }
        this.content[prop] = [].concat(getProperty(groups[prop], 'files', []));
        groupItems.push(new FileGroupItem({label_uri: prop, contextValue:'fgGroup'}, vscode.TreeItemCollapsibleState.Collapsed))
      }
      return Promise.resolve(groupItems);
    }
    return Promise.resolve(this.content[element.label].map(x => new FileGroupItem({label_uri: vscode.Uri.file(x), contextValue:'fgFile'})));
  }
}
class FileGroupItem extends vscode.TreeItem {
  constructor(itemObj, collapsibleState) {
    super(itemObj.label_uri, collapsibleState);
    this.iconPath = undefined;
    this.description = true; // use resource URI
    this.contextValue = itemObj.contextValue; // used for menu entries
  }
}

function activate(context) {
  // async function updateConfiguration(value, target) {
  //   // vscode.ConfigurationTarget.Workspace
  //   await vscode.workspace.getConfiguration().update(section, value, target);
  // }
  const fileGroupProvider = new FileGroupProvider();
  vscode.window.registerTreeDataProvider('fileGroup', fileGroupProvider);
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.refreshView', () => {
    fileGroupProvider.refresh();
  }) );
  function splitViewColumn() {
    let editor = vscode.window.activeTextEditor;
    let viewColumn = 1;
    if (editor) { viewColumn = editor.viewColumn === 1 ? 2 : 1; }
    return viewColumn;
  }
  async function openFiles(files, column) {
    const openFile = filePath => new Promise((resolve, reject) => {
      vscode.window.showTextDocument(vscode.Uri.file(filePath), { preview: false, viewColumn: column }).then( editor => { resolve(true); },
        error => { vscode.window.showErrorMessage(String(error)); reject(error); });
    });
    for (const file of files) { await openFile(file).catch( () => {} ); }  // VSC loads files sequencially
  }
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.openGroupColActive', (...args) => {
    vscode.commands.executeCommand('fileGroup.openGroup', { group: args[0].label, column: -1 });
  }) );
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.openGroupColSplit', (...args) => {
    vscode.commands.executeCommand('fileGroup.openGroup', { group: args[0].label, column: splitViewColumn() });
  }) );
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.openGroupColSide', (...args) => {
    vscode.commands.executeCommand('fileGroup.openGroup', { group: args[0].label, column: -2 });
  }) );
  for (let i = 1; i < 5; ++i) {
    context.subscriptions.push(vscode.commands.registerCommand(`fileGroup.openGroupCol${i}`, (...args) => {
      vscode.commands.executeCommand('fileGroup.openGroup', { group: args[0].label, column: i });
    }) );
  }
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
    await openFiles(group.files, column);
  }) );
  async function openFgFile(filePath, column) {
    return openFiles([filePath], column)
  }
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.openFileColActive', async (...args) => {
    await openFgFile(args[0].resourceUri.fsPath, -1 );
  }) );
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.openFileColSplit', async (...args) => {
    await openFgFile(args[0].resourceUri.fsPath, splitViewColumn() );
  }) );
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.openFileColSide', async (...args) => {
    await openFgFile(args[0].resourceUri.fsPath, -2 );
  }) );
  for (let i = 1; i < 5; ++i) {
    context.subscriptions.push(vscode.commands.registerCommand(`fileGroup.openFileCol${i}`, async (...args) => {
      await openFgFile(args[0].resourceUri.fsPath, i );
    }) );
  }
  function getScripts() {
    let config = vscode.workspace.getConfiguration(extensionShortName);
    let scripts = config.get('scripts'); // there is always default value: {}
    let found = [];
    for (const name in scripts) {
      if (Object.hasOwnProperty.call(scripts, name)) {
        found.push( {name, config: scripts[name]} );
      }
    }
    return found;
  }
  function checkScripts() {
    vscode.commands.executeCommand('setContext', 'fileGroup:hasScripts', getScripts().length > 0);
  }
  function removeLast(src, part) {
    let pos = src.lastIndexOf(part);
    if (pos !== -1) { src = src.substring(0, pos); }
    if (src.endsWith('/')) { src = src.substring(0, src.length-1); }
    return src;
  }
  /** @param {vscode.Uri} fileUri */
  function substVariables(v, fileUri) {
    if (fileUri === undefined) { return v; }
    let filePath = fileUri.fsPath;
    let fileBasename = fileUri.path;
    let pos = fileBasename.lastIndexOf('/');
    if (pos !== -1) { fileBasename = fileBasename.substring(pos+1); }
    let fileBasenameNoExtension = fileBasename;
    let fileExtname = '';
    pos = fileBasename.lastIndexOf('.');
    if (pos !== -1) {
      fileBasenameNoExtension = fileBasename.substring(0, pos);
      fileExtname = fileBasename.substring(pos);
    }
    let fileDirname = removeLast(filePath, fileBasename);
    let relativeFile = 'Unknown';
    let fileWorkspaceFolder = 'Unknown';
    let workspaceURI = vscode.workspace.getWorkspaceFolder(fileUri).uri;
    if (workspaceURI) {
      fileWorkspaceFolder = workspaceURI.fsPath;
      if (fileUri.fsPath.indexOf(fileWorkspaceFolder) === 0) { relativeFile = fileUri.fsPath.substring(fileWorkspaceFolder.length+1); }
    }
    let relativeFileDirname = removeLast(relativeFile, fileBasename);
    v = v.replace(/\$\{fileBasename\}/g, fileBasename);
    v = v.replace(/\$\{fileBasenameNoExtension\}/g, fileBasenameNoExtension);
    v = v.replace(/\$\{fileExtname\}/g, fileExtname);
    v = v.replace(/\$\{relativeFile\}/g, relativeFile);
    v = v.replace(/\$\{relativeFileDirname\}/g, relativeFileDirname);
    v = v.replace(/\$\{file\}/g, filePath);
    v = v.replace(/\$\{fileDirname\}/g, fileDirname);
    v = v.replace(/\$\{fileWorkspaceFolder\}/g, fileWorkspaceFolder);
    return v;
  }
  /** @param {vscode.Uri} uri */
  function processVariables(v, uri) {
    if (isArray(v)) { return v.map(e => processVariables(e, uri)); }
    if (isObject(v)) {
      let v1 = {};
      Object.keys(v).forEach(p => { v1[p] = processVariables(v[p], uri); });
      return v1;
    }
    if (isString(v)) { return substVariables(v, uri); }
    return v;
  }
  /** @param {Array} sequence @param {vscode.Uri} [uri] */
  function processStep(step, sequence, uri) {
    let command = getProperty(step, 'command');
    let args = getProperty(step, 'args');
    if (command === undefined) { return; }
    if (args === undefined) {
      sequence.push(command)
      return;
    }
    args = processVariables(args, uri);
    sequence.push({command, args});
  }
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration( async configevent => {
    if (configevent.affectsConfiguration(extensionShortName)) { checkScripts(); }
  }));
  checkScripts();
  let recentlyUsedScript = [];
  // https://stackoverflow.com/a/70307717/9938317  All selected files from explorer context menu
  context.subscriptions.push(vscode.commands.registerCommand('fileGroup.script', async (...args) => {
    if (!args) { return; }
    let scripts = getScripts();
    if (scripts.length == 0) {
      vscode.window.showInformationMessage('no script found');
      return;
    }
    if (args.length === 1) {  // from keybinding
      return;
    }
    let scriptKey = await new Promise(resolve => {
      let qpItems = [];
      for (const scr of scripts) {
        let {name, config} = scr;
        let label = getProperty(config, 'label', name);
        let description = getProperty(config, 'description');
        let detail = getProperty(config, 'detail');
        qpItems.push( { idx: qpItems.length, scriptKey: name, label, description, detail } );
      }
      const sortIndex = a => {
        let idx = recentlyUsedScript.findIndex( e => e === a.scriptKey );
        return idx >= 0 ? idx : recentlyUsedScript.length + a.idx;
      };
      qpItems.sort( (a, b) => sortIndex(a) - sortIndex(b) );
      resolve(vscode.window.showQuickPick(qpItems)
        .then( item => {
          if (item) {
            let scriptKey = item.scriptKey;
            recentlyUsedScript = [scriptKey].concat(recentlyUsedScript.filter( e => e !== scriptKey ));
          }
          return item;
      }));
    }).then( item => {
      if (isString(item)) return item;
      return item ? item.scriptKey : undefined;
    });
    if (scriptKey === undefined) { return; }
    let scriptConfig = scripts.find( e => e.name === scriptKey ).config;
    let script = getProperty(scriptConfig, 'script');
    if (script === undefined || !isArray(script) || script.length === 0) { return; }
    let fileURIs = args[1].slice(); // shallow copy
    let sequence = [];
    let argsMulticommand = {};
    argsMulticommand.sequence = sequence;
    let interval = getProperty(scriptConfig, 'interval');
    if (interval !== undefined) { argsMulticommand.interval = interval; }
    for (const step of script) {
      let fileprop = getProperty(step, 'file');
      let flags = getProperty(step, 'flags');
      if (fileprop !== undefined) {
        let [count,regex] = fileprop.split(';');
        if (count === '') {
          vscode.window.showInformationMessage('unknown file count, valid: "all" or a number');
          return;
        }
        let [number,keep] = count.split(':');
        keep = keep === 'keep';
        if (number === 'all') { number = fileURIs.length; }
        number = Number(number);
        if (regex === undefined || regex === '') { regex = '.*'; }
        regex = new RegExp(regex, flags);
        let fileUseURI = fileURIs.filter(f => regex.test(f.path)).slice(0, number);
        fileUseURI.forEach(uri => { processStep(step, sequence, uri); });
        if (!keep) {
          fileURIs = fileURIs.filter( e => fileUseURI.every( f => f.path !== e.path) );
        }
      } else {
        processStep(step, sequence);
      }
    }
    vscode.commands.executeCommand('extension.multiCommand.execute', argsMulticommand);
  }) );
};

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
