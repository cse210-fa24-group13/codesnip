"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const fs = require("fs");
const vscode = require("vscode");
const path = require("path");
const commands = require("./config/commands");
const snippetsProvider_1 = require("./provider/snippetsProvider");
const mementoDataAccess_1 = require("./data/mementoDataAccess");
const editSnippetFolder_1 = require("./views/editSnippetFolder");
const newRelease_1 = require("./views/newRelease");
const snippetService_1 = require("./service/snippetService");
const uiUtility_1 = require("./utility/uiUtility");
const stringUtility_1 = require("./utility/stringUtility");
const fileDataAccess_1 = require("./data/fileDataAccess");
/**
 * Activate extension by initializing views for snippets and feature commands.
 * @param context
 */
function activate(context) {
    // exact version for which show Changelog panel
    const changelogVersion = '3.1.0';
    //** variables **//
    // global settings
    const snippetsConfigKey = "snippets";
    // global config
    let snippetsPath;
    // workspace config
    const useWorkspaceFolderKey = "useWorkspaceFolder";
    const workspaceFileName = ".vscode/snippets.json";
    let workspaceSnippetsAvailable = false;
    let wsSnippetService;
    let wsSnippetsProvider;
    let wsSnippetsExplorer;
    // context config (shared between package.json and this function)
    const setContextCmd = 'setContext';
    const contextWSStateKey = "snippets.workspaceState";
    const contextWSFileAvailable = "fileAvailable";
    const contextWSFileNotAvailable = "fileNotAvailable";
    //** variables **//
    //** pre-initialization **//
    // sync global snippets
    context.globalState.setKeysForSync([mementoDataAccess_1.MementoDataAccess.snippetsMementoPrefix]);
    // get all local languages
    let allLanguages = uiUtility_1.UIUtility.getLanguageNamesWithExtensions();
    // add entry for documents not related to languages (pattern=**)
    allLanguages.push({
        id: '**',
        extension: '',
        alias: ''
    });
    // initialize global snippets
    const dataAccess = new mementoDataAccess_1.MementoDataAccess(context.globalState);
    const snippetService = new snippetService_1.SnippetService(dataAccess);
    const snippetsProvider = new snippetsProvider_1.SnippetsProvider(snippetService, allLanguages);
    let cipDisposable = {
        dispose: function () {
        }
    };
    // useful for non language related snippets
    let globalCipDisposable = {
        dispose: function () {
        }
    };
    let registerGlobalCIPSnippets = undefined;
    // make sure lastId is accurate
    snippetService.fixLastId();
    // show What's new if it's first time at current release
    const currentVersion = context.extension.packageJSON.version;
    // generate release identifier for changelog related property
    const releaseChangelogId = `skipChangelog_${currentVersion}`;
    // if the key is undefined or value is not true, show Changelog window
    if (!context.globalState.get(releaseChangelogId) && currentVersion === changelogVersion) {
        new newRelease_1.NewRelease(context);
        context.globalState.update(releaseChangelogId, true);
    }
    //** upgrade from 1.x to 2.x **//
    let oldSnippetsPath = vscode.workspace.getConfiguration('snippets').get('snippetsLocation')
        || path.join(context.globalStorageUri.fsPath, "data.json");
    if (oldSnippetsPath && fs.existsSync(oldSnippetsPath)) {
        let rawData = fs.readFileSync(oldSnippetsPath, 'utf8');
        // true if is blank
        let noData = stringUtility_1.StringUtility.isBlank(rawData);
        // request data restore only if :
        // - there are no new snippets in new location (globalState)
        // - there is an old file locally with some snippets
        if (dataAccess.hasNoChild() && !noData) {
            const migrateData = "Restore data" /* Labels.migrateData */;
            const discardData = "Discard data" /* Labels.discardData */;
            vscode.window.showWarningMessage(stringUtility_1.StringUtility.formatString("Please keep a copy of your snippets file before proceeding with the restore. Yours is located in [{0}]" /* Labels.snippetsBackupRequest */, oldSnippetsPath));
            vscode.window.showInformationMessage(stringUtility_1.StringUtility.formatString("You have some old snippets saved in [{0}], do you want to restore them ? (Original file will be saved in case of error)." /* Labels.snippetsMigrateRequest */, oldSnippetsPath), ...[migrateData, discardData])
                .then(selection => {
                switch (selection) {
                    case migrateData:
                        let oldSnippets = JSON.parse(rawData);
                        if (oldSnippets && oldSnippets.children && oldSnippets.children.length > 0) {
                            let newSnippets = dataAccess.load();
                            newSnippets.children = oldSnippets.children;
                            newSnippets.lastId = oldSnippets.lastId;
                            dataAccess.save(newSnippets);
                            snippetsProvider.sync();
                            if (dataAccess.hasNoChild() || !newSnippets.children || newSnippets.children.length !== oldSnippets.children.length) {
                                vscode.window.showErrorMessage(stringUtility_1.StringUtility.formatString("Snippets were not restored. We kept original file in [{0}]. Please reload window and try again !" /* Labels.snippetsDataNotRestored */, oldSnippetsPath));
                            }
                            else {
                                fs.rename(oldSnippetsPath, `${oldSnippetsPath}_bak`, (err) => {
                                    if (err) {
                                        vscode.window.showInformationMessage(stringUtility_1.StringUtility.formatString("Snippets restored. But couldn't rename file [{0}], please rename it manually." /* Labels.snippetsDataRestoredButFileNotRenamed */, `${oldSnippetsPath}_bak`));
                                    }
                                    else {
                                        //file removed
                                        vscode.window.showInformationMessage(stringUtility_1.StringUtility.formatString("Snippets restored. Kept original file as [{0}]." /* Labels.snippetsDataRestored */, `${oldSnippetsPath}_bak`));
                                    }
                                });
                            }
                        }
                        else {
                            vscode.window.showInformationMessage("No data was provided from file to restore." /* Labels.snippetsNoDataRestored */);
                        }
                    case discardData:
                        break;
                }
            });
        }
    }
    //** upgrade from 1.x to 2.x **//
    //** pre-initialization **//
    //** initialization **//
    // refresh windows whenever it gains focus
    // this will prevent de-sync between multiple open workspaces
    vscode.window.onDidChangeWindowState((event) => {
        if (event.focused) {
            refreshUI();
        }
    });
    // refresh UI when updating workspace setting
    vscode.workspace.onDidChangeConfiguration(event => {
        let affected = event.affectsConfiguration(`${snippetsConfigKey}.${useWorkspaceFolderKey}`);
        if (affected) {
            if (vscode.workspace.getConfiguration(snippetsConfigKey).get(useWorkspaceFolderKey)) {
                requestWSConfigSetup();
            }
            refreshUI();
        }
    });
    let snippetsExplorer = vscode.window.createTreeView('snippetsExplorer', {
        treeDataProvider: snippetsProvider,
        showCollapseAll: true,
        // Drag and Drop API binding
        // This check is for older versions of VS Code that don't have the most up-to-date tree drag and drop API
        dragAndDropController: typeof vscode.DataTransferItem === 'function' ? snippetsProvider : undefined
    });
    // refresh UI to initialize all required config for workspace panel
    requestWSConfigSetup(false);
    //** initialization **//
    //** common logic **//
    function refreshUI() {
        cipDisposable === null || cipDisposable === void 0 ? void 0 : cipDisposable.dispose();
        snippetsProvider.refresh();
        // re-check if .vscode/snippets.json is always available (use case when deleting file after enabling workspace in settings)
        requestWSConfigSetup(false);
        if (workspaceSnippetsAvailable) {
            wsSnippetsProvider.refresh();
        }
        else {
            vscode.commands.executeCommand(setContextCmd, contextWSStateKey, contextWSFileNotAvailable);
        }
        if (registerGlobalCIPSnippets) {
            registerGlobalCIPSnippets();
        }
    }
    function requestWSConfigSetup() {
        return __awaiter(this, arguments, void 0, function* (requestInput = true) {
            if (vscode.workspace.workspaceFolders && vscode.workspace.getConfiguration(snippetsConfigKey).get(useWorkspaceFolderKey)) {
                snippetsPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, workspaceFileName);
                // request creation of file `.vscode/snippets.json` if :
                // - file not found
                // - user didn't request to ignore this phase (information persisted at workspace level)
                const ignoreCreateSnippetsFileKey = "ignoreCreateSnippetsFile";
                let ignoreCreateSnippetsFile = context.workspaceState.get(ignoreCreateSnippetsFileKey);
                const snippetsPathExists = fs.existsSync(snippetsPath);
                // requestInput=true means that we user requested setup, extension will ask for user feedback if file is unavailable
                if (requestInput && !ignoreCreateSnippetsFile && !snippetsPathExists) {
                    yield vscode.window.showWarningMessage("You enabled `useWorkspaceFolder` but you have no file `snippets.json`, do you want to create it ?" /* Labels.snippetsWorkspaceCreateFileRequest */, "Create file" /* Labels.snippetsWorkspaceCreateFileRequestConfirm */, "Always ignore for this folder" /* Labels.snippetsWorkspaceCreateFileRequestIgnore */).then(selection => {
                        if (selection === "Create file" /* Labels.snippetsWorkspaceCreateFileRequestConfirm */) {
                            // create parent folder if it doesn't exist (.vscode/)
                            const snippetsPathParent = path.dirname(snippetsPath);
                            if (!fs.existsSync(snippetsPathParent)) {
                                fs.mkdirSync(snippetsPathParent);
                            }
                            // create empty file
                            fs.closeSync(fs.openSync(snippetsPath, 'w'));
                            // mark useWorkspaceFolder as enabled
                            workspaceSnippetsAvailable = true;
                        }
                        else if (selection === "Always ignore for this folder" /* Labels.snippetsWorkspaceCreateFileRequestIgnore */) {
                            // ignore at workspace level
                            context.workspaceState.update(ignoreCreateSnippetsFileKey, true);
                        }
                    });
                }
                else if (snippetsPathExists) {
                    // file already exists, just mark useWorkspaceFolder as enabled
                    workspaceSnippetsAvailable = true;
                }
                else {
                    workspaceSnippetsAvailable = false;
                }
                // finish with a boolean to detect if we're using workspaceFolder (option enabled + workspace open + snippets.json available)
                if (workspaceSnippetsAvailable) {
                    // send flag to context in order to change viewWelcome (see contributes > viewsWelcome in package.json)
                    vscode.commands.executeCommand(setContextCmd, contextWSStateKey, contextWSFileAvailable);
                    // initialize workspace snippets
                    if (!wsSnippetsExplorer) {
                        const wsDataAccess = new fileDataAccess_1.FileDataAccess(snippetsPath);
                        wsSnippetService = new snippetService_1.SnippetService(wsDataAccess);
                        wsSnippetsProvider = new snippetsProvider_1.SnippetsProvider(wsSnippetService, allLanguages);
                        wsSnippetsExplorer = vscode.window.createTreeView('wsSnippetsExplorer', {
                            treeDataProvider: wsSnippetsProvider,
                            showCollapseAll: true,
                            // Drag and Drop API binding
                            // This check is for older versions of VS Code that don't have the most up-to-date tree drag and drop API
                            dragAndDropController: typeof vscode.DataTransferItem === 'function' ? wsSnippetsProvider : undefined
                        });
                    }
                }
                else {
                    vscode.commands.executeCommand(setContextCmd, contextWSStateKey, contextWSFileNotAvailable);
                }
            }
            else {
                workspaceSnippetsAvailable = false;
            }
        });
    }
    // generic error handler for most commands
    // command: Promise<any>
    function handleCommand(callback) {
        new Promise(callback).catch(error => {
            vscode.window.showErrorMessage(stringUtility_1.StringUtility.formatString("[{0}]. You may refresh current window to fix issue." /* Labels.genericError */, error.message));
            refreshUI();
        });
    }
    //** common logic **//
    //** common commands **//
    //** COMMAND : INITIALIZE WS CONFIG **/*
    context.subscriptions.push(vscode.commands.registerCommand("miscCmd.requestWSConfig" /* commands.CommandsConsts.miscRequestWSConfig */, (_) => __awaiter(this, void 0, void 0, function* () {
        if (!vscode.workspace.workspaceFolders) {
            // can't initialize if no folder is open
            vscode.window.showWarningMessage("No open folder was found. Please open a folder first and try again." /* Labels.noOpenEditorForWSConfig */);
        }
        else {
            // check if a workspace is open and if useWorkspaceFolder is enabled
            requestWSConfigSetup();
        }
    })));
    //** COMMAND : INITIALIZE GENERIC COMPLETION ITEM PROVIDER **/*
    let triggerCharacter = vscode.workspace.getConfiguration(snippetsConfigKey).get("triggerKey");
    if (!triggerCharacter) {
        triggerCharacter = "snp"; // placeholder which is not a simple character in order to trigger IntelliSense
    }
    let globalPrefix = vscode.workspace.getConfiguration(snippetsConfigKey).get("globalPrefix");
    let camelize = vscode.workspace.getConfiguration(snippetsConfigKey).get("camelize");
    const registerCIPSnippetsList = [];
    for (const currentLanguage of allLanguages) {
        let disposable = currentLanguage.id === '**' ? globalCipDisposable : cipDisposable;
        const registerCIPSnippets = () => disposable = vscode.languages.registerCompletionItemProvider(currentLanguage.id === '**' // use pattern filter for non-language snippets
            ? [{ language: 'plaintext', scheme: 'file' }, { language: 'plaintext', scheme: 'untitled' }]
            : [{ language: currentLanguage.id, scheme: 'file' }, { language: currentLanguage.id, scheme: 'untitled' }], {
            provideCompletionItems(document, position) {
                if (!vscode.workspace.getConfiguration(snippetsConfigKey).get("showSuggestions")) {
                    return;
                }
                let isTriggeredByChar = triggerCharacter === document.lineAt(position).text.charAt(position.character - 1);
                let candidates = snippetService.getAllSnippets()
                    .filter(s => (currentLanguage.id === '**' && (s.language === currentLanguage.extension || !s.language))
                    || s.language === currentLanguage.extension);
                // append workspace snippets if WS is available
                if (workspaceSnippetsAvailable) {
                    // add suffix for all workspace items
                    candidates = candidates.concat(wsSnippetService.getAllSnippets()
                        .filter(s => s.language === currentLanguage.extension)
                        .map(elt => {
                        elt.label = `${elt.label}`;
                        elt.description = `${elt.description}__(ws)`;
                        return elt;
                    }));
                }
                return candidates.map(element => {
                    var _a;
                    return ({
                        // label = prefix or [globalPrefix]:snippetName
                        label: element.prefix
                            ? element.prefix
                            : (globalPrefix ? `${globalPrefix}:` : '')
                                + (camelize // camelize if it's set in preferences
                                    ? element.label.replace(/-/g, ' ').replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
                                        return index === 0 ? word.toLowerCase() : word.toUpperCase();
                                    }).replace(/\s+/g, '')
                                    : element.label.replace(/\n/g, '').replace(/ /g, '-')),
                        insertText: new vscode.SnippetString(element.value),
                        detail: (_a = element.description) === null || _a === void 0 ? void 0 : _a.replace("__(ws)", " (snippet from workspace)"),
                        kind: vscode.CompletionItemKind.Snippet,
                        // replace trigger character with the chosen suggestion
                        additionalTextEdits: isTriggeredByChar
                            ? [vscode.TextEdit.delete(new vscode.Range(position.with(position.line, position.character - 1), position))]
                            : []
                    });
                });
            },
        }, triggerCharacter);
        // keep reference of this special one to invoke it on refreshUI
        if (currentLanguage.id === '**') {
            registerGlobalCIPSnippets = () => disposable;
        }
        registerCIPSnippetsList.push(registerCIPSnippets);
    }
    ;
    registerCIPSnippetsList.forEach(d => context.subscriptions.push(d()));
    //** COMMAND : OPEN SNIPPET **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.openSnippet" /* commands.CommandsConsts.commonOpenSnippet */, (snippet) => __awaiter(this, void 0, void 0, function* () {
        return handleCommand(() => __awaiter(this, void 0, void 0, function* () {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage("No open editor was found." /* Labels.noOpenEditor */);
                return;
            }
            // if command is not triggered from treeView, a snippet must be selected by final user
            if (!snippet) {
                let allSnippets = snippetService.getAllSnippets();
                if (workspaceSnippetsAvailable) {
                    allSnippets = allSnippets.concat(wsSnippetService.getAllSnippets());
                }
                snippet = yield uiUtility_1.UIUtility.requestSnippetFromUser(allSnippets);
            }
            if (!snippet) {
                return;
            }
            // 3.1 update: disable syntax resolving by default if property is not yet defined in JSON
            if (snippet.resolveSyntax === undefined) {
                snippet.resolveSyntax = false;
            }
            if (snippet.resolveSyntax) {
                vscode.commands.executeCommand("editor.action.insertSnippet", { snippet: snippet.value });
            }
            else {
                editor.edit(edit => {
                    edit.insert(editor.selection.start, snippet.value);
                });
            }
            vscode.window.showTextDocument(editor.document);
        }));
    })));
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.openSnippetInTerminal" /* commands.CommandsConsts.commonOpenSnippetInTerminal */, (snippet) => __awaiter(this, void 0, void 0, function* () {
        return handleCommand(() => __awaiter(this, void 0, void 0, function* () {
            const terminal = vscode.window.activeTerminal;
            if (!terminal) {
                vscode.window.showInformationMessage("No open terminal was found." /* Labels.noOpenTerminal */);
                return;
            }
            // if command is not triggered from treeView, a snippet must be selected by final user
            if (!snippet) {
                let allSnippets = snippetService.getAllSnippets();
                if (workspaceSnippetsAvailable) {
                    allSnippets = allSnippets.concat(wsSnippetService.getAllSnippets());
                }
                snippet = yield uiUtility_1.UIUtility.requestSnippetFromUser(allSnippets);
            }
            if (!snippet) {
                return;
            }
            terminal.sendText(snippet.value, vscode.workspace.getConfiguration('snippets').get('runCommandInTerminal'));
        }));
    })));
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.copySnippetToClipboard" /* commands.CommandsConsts.commonCopySnippetToClipboard */, (snippet) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => __awaiter(this, void 0, void 0, function* () { return vscode.env.clipboard.writeText(snippet.value); })); })));
    //** COMMAND : ADD SNIPPET **/
    context.subscriptions.push(vscode.commands.registerCommand("commonSnippetsCmd.addSnippet" /* commands.CommandsConsts.commonAddSnippet */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.commonAddSnippet(allLanguages, snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable)); })));
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.addSnippet" /* commands.CommandsConsts.globalAddSnippet */, (node) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.addSnippet(allLanguages, snippetsExplorer, snippetsProvider, node)); })));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.addSnippet" /* commands.CommandsConsts.wsAddSnippet */, (node) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.addSnippet(allLanguages, wsSnippetsExplorer, wsSnippetsProvider, node)); })));
    //** COMMAND : ADD SNIPPET FROM CLIPBOARD **/
    context.subscriptions.push(vscode.commands.registerCommand("commonSnippetsCmd.addSnippetFromClipboard" /* commands.CommandsConsts.commonAddSnippetFromClipboard */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.commonAddSnippetFromClipboard(snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable)); })));
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.addSnippetFromClipboard" /* commands.CommandsConsts.globalAddSnippetFromClipboard */, (node) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.addSnippetFromClipboard(snippetsExplorer, snippetsProvider, node)); })));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.addSnippetFromClipboard" /* commands.CommandsConsts.wsAddSnippetFromClipboard */, (node) => __awaiter(this, void 0, void 0, function* () {
        return handleCommand(() => commands.addSnippetFromClipboard(wsSnippetsExplorer, wsSnippetsProvider, node));
    })));
    //** COMMAND : ADD SNIPPET FOLDER **/
    context.subscriptions.push(vscode.commands.registerCommand("commonSnippetsCmd.addSnippetFolder" /* commands.CommandsConsts.commonAddSnippetFolder */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.commonAddSnippetFolder(snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable)); })));
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.addSnippetFolder" /* commands.CommandsConsts.globalAddSnippetFolder */, (node) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.addSnippetFolder(snippetsExplorer, snippetsProvider, node)); })));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.addSnippetFolder" /* commands.CommandsConsts.wsAddSnippetFolder */, (node) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.addSnippetFolder(wsSnippetsExplorer, wsSnippetsProvider, node)); })));
    //** COMMAND : EDIT SNIPPET **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.editSnippet" /* commands.CommandsConsts.globalEditSnippet */, (snippet) => handleCommand(() => commands.editSnippet(context, snippet, snippetsProvider))));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.editSnippet" /* commands.CommandsConsts.wsEditSnippet */, (snippet) => handleCommand(() => commands.editSnippet(context, snippet, wsSnippetsProvider))));
    //** COMMAND : EDIT SNIPPET FOLDER **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.editSnippetFolder" /* commands.CommandsConsts.globalEditSnippetFolder */, (snippet) => handleCommand(() => new editSnippetFolder_1.EditSnippetFolder(context, snippet, snippetsProvider))));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.editSnippetFolder" /* commands.CommandsConsts.wsEditSnippetFolder */, (snippet) => handleCommand(() => new editSnippetFolder_1.EditSnippetFolder(context, snippet, wsSnippetsProvider))));
    //** COMMAND : REMOVE SNIPPET **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.deleteSnippet" /* commands.CommandsConsts.globalDeleteSnippet */, (snippet) => handleCommand(() => {
        if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
            vscode.window
                .showInformationMessage(`Do you really want to delete the snippet (${snippet.label}) ?`, "Yes" /* Labels.confirmationYes */, "No" /* Labels.confirmationNo */)
                .then(answer => {
                if (answer === "Yes" /* Labels.confirmationYes */) {
                    snippetsProvider.removeSnippet(snippet);
                }
            });
        }
        else {
            snippetsProvider.removeSnippet(snippet);
        }
    })));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.deleteSnippet" /* commands.CommandsConsts.wsDeleteSnippet */, (snippet) => handleCommand(() => {
        if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
            vscode.window
                .showInformationMessage(`Do you really want to delete the snippet (${snippet.label}) ?`, "Yes" /* Labels.confirmationYes */, "No" /* Labels.confirmationNo */)
                .then(answer => {
                if (answer === "Yes" /* Labels.confirmationYes */) {
                    wsSnippetsProvider.removeSnippet(snippet);
                }
            });
        }
        else {
            wsSnippetsProvider.removeSnippet(snippet);
        }
    })));
    //** COMMAND : REMOVE SNIPPET FOLDER **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.deleteSnippetFolder" /* commands.CommandsConsts.globalDeleteSnippetFolder */, (snippetFolder) => handleCommand(() => {
        if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
            vscode.window
                .showInformationMessage(`Do you really want to delete the folder (${snippetFolder.label}) ?`, "Yes" /* Labels.confirmationYes */, "No" /* Labels.confirmationNo */)
                .then(answer => {
                if (answer === "Yes" /* Labels.confirmationYes */) {
                    snippetsProvider.removeSnippet(snippetFolder);
                }
            });
        }
        else {
            snippetsProvider.removeSnippet(snippetFolder);
        }
    })));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.deleteSnippetFolder" /* commands.CommandsConsts.wsDeleteSnippetFolder */, (snippetFolder) => handleCommand(() => {
        if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
            vscode.window
                .showInformationMessage(`Do you really want to delete the folder (${snippetFolder.label}) ?`, "Yes" /* Labels.confirmationYes */, "No" /* Labels.confirmationNo */)
                .then(answer => {
                if (answer === "Yes" /* Labels.confirmationYes */) {
                    wsSnippetsProvider.removeSnippet(snippetFolder);
                }
            });
        }
        else {
            wsSnippetsProvider.removeSnippet(snippetFolder);
        }
    })));
    //** COMMAND : MOVE SNIPPET UP **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.moveSnippetUp" /* commands.CommandsConsts.globalMoveSnippetUp */, (snippet) => handleCommand(() => snippet && snippetsProvider.moveSnippetUp(snippet))));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.moveSnippetUp" /* commands.CommandsConsts.wsMoveSnippetUp */, (snippet) => handleCommand(() => snippet && wsSnippetsProvider.moveSnippetUp(snippet))));
    //** COMMAND : MOVE SNIPPET DOWN **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.moveSnippetDown" /* commands.CommandsConsts.globalMoveSnippetDown */, (snippet) => handleCommand(() => snippet && snippetsProvider.moveSnippetDown(snippet))));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.moveSnippetDown" /* commands.CommandsConsts.wsMoveSnippetDown */, (snippet) => handleCommand(() => snippet && wsSnippetsProvider.moveSnippetDown(snippet))));
    //** COMMAND : SORT SNIPPETS **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.sortSnippets" /* commands.CommandsConsts.globalSortSnippets */, (snippet) => handleCommand(() => snippetsProvider.sortSnippets(snippet))));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.sortSnippets" /* commands.CommandsConsts.wsSortSnippets */, (snippet) => handleCommand(() => wsSnippetsProvider.sortSnippets(snippet))));
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.sortAllSnippets" /* commands.CommandsConsts.globalSortAllSnippets */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => snippetsProvider.sortAllSnippets()); })));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.sortAllSnippets" /* commands.CommandsConsts.wsSortAllSnippets */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => wsSnippetsProvider.sortAllSnippets()); })));
    //** COMMAND : REFRESH **/
    context.subscriptions.push(vscode.commands.registerCommand("commonSnippetsCmd.refreshEntry", _ => refreshUI()));
    //** COMMAND : IMPORT & EXPORT **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.exportSnippets" /* commands.CommandsConsts.globalExportSnippets */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.exportSnippets(snippetsProvider)); })));
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.importSnippets" /* commands.CommandsConsts.globalImportSnippets */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.importSnippets(snippetsProvider)); })));
    //** COMMAND : TROUBLESHOOT **/
    context.subscriptions.push(vscode.commands.registerCommand("globalSnippetsCmd.fixSnippets" /* commands.CommandsConsts.globalFixSnippets */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.fixSnippets(snippetsProvider)); })));
    context.subscriptions.push(vscode.commands.registerCommand("wsSnippetsCmd.fixSnippets" /* commands.CommandsConsts.wsFixSnippets */, (_) => __awaiter(this, void 0, void 0, function* () { return handleCommand(() => commands.fixSnippets(wsSnippetsProvider)); })));
    context.subscriptions.push(vscode.languages.registerDocumentDropEditProvider('*', {
        provideDocumentDropEdits(_document, position, dataTransfer, _token) {
            return __awaiter(this, void 0, void 0, function* () {
                const dataItem = dataTransfer.get('application/vnd.code.tree.snippetsProvider');
                if (!dataItem) {
                    return;
                }
                try {
                    const text = yield dataItem.asString();
                    const parsedSource = JSON.parse(text);
                    // only accept one snippet (not a folder)
                    if ((parsedSource === null || parsedSource === void 0 ? void 0 : parsedSource.length) !== 1 || parsedSource[0].folder) {
                        return;
                    }
                    const draggedSnippet = parsedSource[0];
                    // same as open snippet command
                    if (draggedSnippet.resolveSyntax === undefined) {
                        // 3.1 update: disable syntax resolving by default if property is not yet defined in JSON
                        draggedSnippet.resolveSyntax = false;
                    }
                    if (draggedSnippet.resolveSyntax) {
                        vscode.commands.executeCommand("editor.action.insertSnippet", { snippet: draggedSnippet.value });
                    }
                    else {
                        const editor = vscode.window.activeTextEditor;
                        if (!editor) {
                            return;
                        }
                        editor.edit(edit => {
                            var _a;
                            edit.insert(position, (_a = draggedSnippet.value) !== null && _a !== void 0 ? _a : '');
                        });
                    }
                }
                catch (_a) {
                    // throws error when parsing `dataItem?.value`, just skip
                }
            });
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map