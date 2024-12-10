import { AuthService } from './service/authService';
import fs = require('fs');
import * as vscode from 'vscode';
import * as path from 'path';
import * as commands from './config/commands';
import { SnippetsProvider } from './provider/snippetsProvider';
import { MementoDataAccess } from './data/mementoDataAccess';
import { Snippet } from './interface/snippet';
import { EditSnippetFolder } from './views/editSnippetFolder';
import { NewRelease } from './views/newRelease';
import { SnippetService } from './service/snippetService';
import { UIUtility } from './utility/uiUtility';
import { StringUtility } from './utility/stringUtility';
import { Labels } from './config/labels';
import { FileDataAccess } from './data/fileDataAccess';
import axios from 'axios';
import { Session } from 'node:inspector/promises';
/**
 * Activate extension by initializing views for snippets and feature commands.
 * @param context 
 */

export function activate(context: vscode.ExtensionContext) {
    // exact version for which show Changelog panel
    const changelogVersion = '3.1.0';

    //** variables **//
    // global settings
    const snippetsConfigKey = "snippets";
    // global config
    let snippetsPath: string;
    // workspace config
    const useWorkspaceFolderKey = "useWorkspaceFolder";
    const workspaceFileName = ".vscode/snippets.json";
    let workspaceSnippetsAvailable = false;
    let wsSnippetService: SnippetService;
    let wsSnippetsProvider: SnippetsProvider;
    let wsSnippetsExplorer: vscode.TreeView<Snippet>;
    // context config (shared between package.json and this function)
    const setContextCmd = 'setContext';
    const contextWSStateKey = "snippets.workspaceState";
    const contextWSFileAvailable = "fileAvailable";
    const contextWSFileNotAvailable = "fileNotAvailable";
    //** variables **//

    //** pre-initialization **//
    // sync global snippets
    context.globalState.setKeysForSync([MementoDataAccess.snippetsMementoPrefix]);

    // get all local languages
    let allLanguages: any[] = UIUtility.getLanguageNamesWithExtensions();
    // add entry for documents not related to languages (pattern=**)
    allLanguages.push({
        id: '**',
        extension: '',
        alias: ''
    });

    // initialize global snippets
    const dataAccess = new MementoDataAccess(context.globalState);
    const snippetService = new SnippetService(dataAccess);
    const snippetsProvider = new SnippetsProvider(snippetService, allLanguages);

    let cipDisposable: { dispose(): any } = {
        dispose: function () {
        }
    };
    // useful for non language related snippets
    let globalCipDisposable: { dispose(): any } = {
        dispose: function () {
        }
    };
    let registerGlobalCIPSnippets: (() => vscode.Disposable) | undefined = undefined;


    // make sure lastId is accurate
    snippetService.fixLastId();

    // show What's new if it's first time at current release
    const currentVersion = context.extension.packageJSON.version;
    // generate release identifier for changelog related property
    const releaseChangelogId = `skipChangelog_${currentVersion}`;
    // if the key is undefined or value is not true, show Changelog window
    if (!context.globalState.get(releaseChangelogId) && currentVersion === changelogVersion) {
        new NewRelease(context);
        context.globalState.update(releaseChangelogId, true);
    }
    //** upgrade from 1.x to 2.x **//
    let oldSnippetsPath: string = vscode.workspace.getConfiguration('snippets').get('snippetsLocation')
        || path.join(context.globalStorageUri.fsPath, "data.json");
    if (oldSnippetsPath && fs.existsSync(oldSnippetsPath)) {
        let rawData = fs.readFileSync(oldSnippetsPath, 'utf8');
        // true if is blank
        let noData = StringUtility.isBlank(rawData);

        // request data restore only if :
        // - there are no new snippets in new location (globalState)
        // - there is an old file locally with some snippets
        if (dataAccess.hasNoChild() && !noData) {
            const migrateData = Labels.migrateData;
            const discardData = Labels.discardData;
            vscode.window.showWarningMessage(
                StringUtility.formatString(Labels.snippetsBackupRequest, oldSnippetsPath)
            );
            vscode.window.showInformationMessage(
                StringUtility.formatString(Labels.snippetsMigrateRequest, oldSnippetsPath),
                ...[migrateData, discardData])
                .then(selection => {
                    switch (selection) {
                        case migrateData:
                            let oldSnippets: Snippet = JSON.parse(rawData);
                            if (oldSnippets && oldSnippets.children && oldSnippets.children.length > 0) {
                                let newSnippets: Snippet = dataAccess.load();
                                newSnippets.children = oldSnippets.children;
                                newSnippets.lastId = oldSnippets.lastId;
                                dataAccess.save(newSnippets);
                                snippetsProvider.sync();
                                if (dataAccess.hasNoChild() || !newSnippets.children || newSnippets.children.length !== oldSnippets.children.length) {
                                    vscode.window.showErrorMessage(
                                        StringUtility.formatString(Labels.snippetsDataNotRestored, oldSnippetsPath)
                                    );
                                } else {
                                    fs.rename(oldSnippetsPath, `${oldSnippetsPath}_bak`, (err) => {
                                        if (err) {
                                            vscode.window.showInformationMessage(
                                                StringUtility.formatString(Labels.snippetsDataRestoredButFileNotRenamed, `${oldSnippetsPath}_bak`)
                                            );
                                        } else {
                                            //file removed
                                            vscode.window.showInformationMessage(
                                                StringUtility.formatString(Labels.snippetsDataRestored, `${oldSnippetsPath}_bak`)
                                            );
                                        }
                                    });
                                }
                            } else {
                                vscode.window.showInformationMessage(Labels.snippetsNoDataRestored);
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
        console.log('test2', event)
        if (event.focused) {
            refreshUI();
        }
    });

    // refresh UI when updating workspace setting
    vscode.workspace.onDidChangeConfiguration(event => {
        let affected = event.affectsConfiguration(`${snippetsConfigKey}.${useWorkspaceFolderKey}`);
        console.log('test');
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
        cipDisposable?.dispose();
        snippetsProvider.refresh();
        // re-check if .vscode/snippets.json is always available (use case when deleting file after enabling workspace in settings)
        requestWSConfigSetup(false);
        if (workspaceSnippetsAvailable) {
            wsSnippetsProvider.refresh();
        } else {
            vscode.commands.executeCommand(setContextCmd, contextWSStateKey, contextWSFileNotAvailable);
        }
        if (registerGlobalCIPSnippets) {
            registerGlobalCIPSnippets();
        }
    }

    async function requestWSConfigSetup(requestInput = true) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.getConfiguration(snippetsConfigKey).get(useWorkspaceFolderKey)) {
            snippetsPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, workspaceFileName);
            // request creation of file `.vscode/snippets.json` if :
            // - file not found
            // - user didn't request to ignore this phase (information persisted at workspace level)
            const ignoreCreateSnippetsFileKey = "ignoreCreateSnippetsFile";
            let ignoreCreateSnippetsFile = context.workspaceState.get<boolean>(ignoreCreateSnippetsFileKey);

            const snippetsPathExists = fs.existsSync(snippetsPath);

            // requestInput=true means that we user requested setup, extension will ask for user feedback if file is unavailable
            if (requestInput && !ignoreCreateSnippetsFile && !snippetsPathExists) {
                await vscode.window.showWarningMessage(
                    Labels.snippetsWorkspaceCreateFileRequest,
                    Labels.snippetsWorkspaceCreateFileRequestConfirm,
                    Labels.snippetsWorkspaceCreateFileRequestIgnore
                ).then(selection => {
                    if (selection === Labels.snippetsWorkspaceCreateFileRequestConfirm) {
                        // create parent folder if it doesn't exist (.vscode/)
                        const snippetsPathParent = path.dirname(snippetsPath);
                        if (!fs.existsSync(snippetsPathParent)) {
                            fs.mkdirSync(snippetsPathParent);
                        }
                        // create empty file
                        fs.closeSync(fs.openSync(snippetsPath, 'w'));
                        // mark useWorkspaceFolder as enabled
                        workspaceSnippetsAvailable = true;
                    } else if (selection === Labels.snippetsWorkspaceCreateFileRequestIgnore) {
                        // ignore at workspace level
                        context.workspaceState.update(ignoreCreateSnippetsFileKey, true);
                    }
                });
            } else if (snippetsPathExists) {
                // file already exists, just mark useWorkspaceFolder as enabled
                workspaceSnippetsAvailable = true;
            } else {
                workspaceSnippetsAvailable = false;
            }

            // finish with a boolean to detect if we're using workspaceFolder (option enabled + workspace open + snippets.json available)
            if (workspaceSnippetsAvailable) {
                // send flag to context in order to change viewWelcome (see contributes > viewsWelcome in package.json)
                vscode.commands.executeCommand(setContextCmd, contextWSStateKey, contextWSFileAvailable);

                // initialize workspace snippets
                if (!wsSnippetsExplorer) {
                    const wsDataAccess = new FileDataAccess(snippetsPath);
                    wsSnippetService = new SnippetService(wsDataAccess);
                    wsSnippetsProvider = new SnippetsProvider(wsSnippetService, allLanguages);

                    wsSnippetsExplorer = vscode.window.createTreeView('wsSnippetsExplorer', {
                        treeDataProvider: wsSnippetsProvider,
                        showCollapseAll: true,
                        // Drag and Drop API binding
                        // This check is for older versions of VS Code that don't have the most up-to-date tree drag and drop API
                        dragAndDropController: typeof vscode.DataTransferItem === 'function' ? wsSnippetsProvider : undefined
                    });
                }
            } else {
                vscode.commands.executeCommand(setContextCmd, contextWSStateKey, contextWSFileNotAvailable);
            }
        } else {
            workspaceSnippetsAvailable = false;
        }
    }

    // generic error handler for most commands
    // command: Promise<any>
    function handleCommand(callback: (...args: any[]) => any) {
        new Promise(callback).catch(error => {
            vscode.window.showErrorMessage(StringUtility.formatString(Labels.genericError, error.message));
            refreshUI();
        });
        console.log('handler', callback)
    }
    //** common logic **//

    async function fetchData(token:any) {
        try {
            console.log("HERE")
            const response = await axios.get('https://api.github.com/gists',
                {
                    headers: {
                                Authorization: `Bearer ${token}`,
                            }
                }
            );
            // console.log("RESPONSE IS",response)
  
            const data = response.data;

            // Do something with the data
            console.log("DATA IS: ",data);

            return data; // Optionally return the data
        } catch (error) {
            // Handle errors
            console.error(error);
        }
    }

    //** common commands **//
    //** COMMAND : INITIALIZE WS CONFIG **/*
    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.miscRequestWSConfig, async _ => {
        if (!vscode.workspace.workspaceFolders) {
            // can't initialize if no folder is open
            vscode.window.showWarningMessage(Labels.noOpenEditorForWSConfig);
        } else {
            // check if a workspace is open and if useWorkspaceFolder is enabled
            requestWSConfigSetup();
        }
    }));

    context.subscriptions.push(
        vscode.commands.registerCommand('snippets.testGitHubAuth', async () => {
            try {
                const session = await AuthService.getGitHubSession();
                console.log('GitHub Session:', {
                    id: session.id,
                    account: session.account,
                    scopes: session.scopes
                });
                vscode.window.showInformationMessage(
                    `Authenticated as ${session.account.label}`
                );
            } catch (error) {
                console.error('Authentication Error:', error);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('snippets.fecthFromGithub', async () => {
            let candidates = snippetService.getAllSnippets();
            for (const candidate of candidates) {
                snippetService.removeSnippetLocally(candidate);
            }



            // await fetchData();
            //pseudo
            // open a session
            // get all gists
            //for each gist
            //  create a new snippet(name,description,visibility,gistid)
            //refresh
            const session = await vscode.authentication.getSession('github', ['gist'], { createIfNone: true });

            if (session) {
                let gistsList: any = [];
                let fetchDataResponse = await fetchData(session.accessToken);
                console.log("FETCH DATA response", fetchDataResponse);
                
                // Use for...of to handle asynchronous operations sequentially
                for (const gist of fetchDataResponse) {
                    let gistInfo = await axios.get(`https://api.github.com/gists/${gist.id}`, {
                        headers: { Authorization: `Bearer ${session.accessToken}` }
                    });
                    gistsList.push(gistInfo.data);
                    console.log(gistsList.length);
                }
            
                // Now you can safely use forEach on gistsList after waiting for fetchDataResponse to finish
                console.log("GISTS LIST returned is", gistsList);
                gistsList.forEach((gist: any) => {
                    console.log("Start", gist.files);
                    for (const fileName in gist.files) {
                    // for (let [fileName, value] of gist.files) {
                        console.log(fileName);
                        snippetsProvider.addSnippet(fileName, gist.files[fileName].content, Snippet.rootParentId, gist.description, undefined, gist.id);
                        console.log("Finished");
                    }
                });
                refreshUI();
            } else {
                vscode.window.showErrorMessage('GitHub session could not be opened.');
            }
        })                
    );
    //** COMMAND : INITIALIZE GENERIC COMPLETION ITEM PROVIDER **/*

    let triggerCharacter: any = vscode.workspace.getConfiguration(snippetsConfigKey).get("triggerKey");
    if (!triggerCharacter) {
        triggerCharacter = "snp"; // placeholder which is not a simple character in order to trigger IntelliSense
    }

    let globalPrefix: any = vscode.workspace.getConfiguration(snippetsConfigKey).get("globalPrefix");
    let camelize: any = vscode.workspace.getConfiguration(snippetsConfigKey).get("camelize");

    const registerCIPSnippetsList: (() => vscode.Disposable)[] = [];

    for (const currentLanguage of allLanguages) {
        let disposable = currentLanguage.id === '**' ? globalCipDisposable : cipDisposable;
        const registerCIPSnippets = () => disposable = vscode.languages.registerCompletionItemProvider(
            currentLanguage.id === '**' // use pattern filter for non-language snippets
                ? [{ language: 'plaintext', scheme: 'file' }, { language: 'plaintext', scheme: 'untitled' }]
                : [{ language: currentLanguage.id, scheme: 'file' }, { language: currentLanguage.id, scheme: 'untitled' }]
            , {
                provideCompletionItems(document, position) {
                    if (!vscode.workspace.getConfiguration(snippetsConfigKey).get("showSuggestions")) {
                        return;
                    }
                    let isTriggeredByChar: boolean = triggerCharacter === document.lineAt(position).text.charAt(position.character - 1);
                    let candidates = snippetService.getAllSnippets()
                        .filter(s => (currentLanguage.id === '**' && (s.language === currentLanguage.extension || !s.language))
                            || s.language === currentLanguage.extension);
                    // append workspace snippets if WS is available
                    if (workspaceSnippetsAvailable) {
                        // add suffix for all workspace items
                        candidates = candidates.concat(
                            wsSnippetService.getAllSnippets()
                                .filter(s => s.language === currentLanguage.extension)
                                .map(elt => {
                                    elt.label = `${elt.label}`;
                                    elt.description = `${elt.description}__(ws)`;
                                    return elt;
                                }
                                ));
                    }

                    return candidates.map(element =>
                        <vscode.CompletionItem>{
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
                            detail: element.description?.replace("__(ws)", " (snippet from workspace)"),
                            kind: vscode.CompletionItemKind.Snippet,
                            // replace trigger character with the chosen suggestion
                            additionalTextEdits: isTriggeredByChar
                                ? [vscode.TextEdit.delete(new vscode.Range(position.with(position.line, position.character - 1), position))]
                                : []
                        });
                },
            }, triggerCharacter
        );
        // keep reference of this special one to invoke it on refreshUI
        if (currentLanguage.id === '**') {
            registerGlobalCIPSnippets = () => disposable;
        }
        registerCIPSnippetsList.push(registerCIPSnippets);
    };

    registerCIPSnippetsList.forEach(d => context.subscriptions.push(d()));

    //** COMMAND : OPEN SNIPPET **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.commonOpenSnippet,
        async (snippet) => handleCommand(async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage(Labels.noOpenEditor);
                return;
            }
            // if command is not triggered from treeView, a snippet must be selected by final user
            if (!snippet) {
                let allSnippets = snippetService.getAllSnippets();
                if (workspaceSnippetsAvailable) {
                    allSnippets = allSnippets.concat(wsSnippetService.getAllSnippets());
                }
                snippet = await UIUtility.requestSnippetFromUser(allSnippets);
            }
            if (!snippet) {
                return;
            }
            // 3.1 update: disable syntax resolving by default if property is not yet defined in JSON
            if (snippet.resolveSyntax === undefined) {
                snippet.resolveSyntax = false;
            }
            if (snippet.resolveSyntax) {
                vscode.commands.executeCommand("editor.action.insertSnippet", { snippet: snippet.value }
                );
            } else {
                editor.edit(edit => {
                    edit.insert(editor.selection.start, snippet.value);
                });
            }

            vscode.window.showTextDocument(editor.document);
        })
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.commonOpenSnippetInTerminal,
        async (snippet) => handleCommand(async () => {
            const terminal = vscode.window.activeTerminal;
            if (!terminal) {
                vscode.window.showInformationMessage(Labels.noOpenTerminal);
                return;
            }
            // if command is not triggered from treeView, a snippet must be selected by final user
            if (!snippet) {
                let allSnippets = snippetService.getAllSnippets();
                if (workspaceSnippetsAvailable) {
                    allSnippets = allSnippets.concat(wsSnippetService.getAllSnippets());
                }
                snippet = await UIUtility.requestSnippetFromUser(allSnippets);
            }
            if (!snippet) {
                return;
            }
            terminal.sendText(snippet.value, vscode.workspace.getConfiguration('snippets').get('runCommandInTerminal'));
        })
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.commonCopySnippetToClipboard,
        async (snippet) => handleCommand(async () => vscode.env.clipboard.writeText(snippet.value))
    ));


    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.commonOpenPage,
        async () => handleCommand(() => openPage(context))
    ));

    let panel: vscode.WebviewPanel;

    function openPage(context: vscode.ExtensionContext) {

        console.log("creating window");
        panel = vscode.window.createWebviewPanel(
            'webviewFirstPage', // Identifies the webview panel (type)
            'Snippets Page', // Title
            vscode.ViewColumn.One, // Where to show the webview (first editor group)
            {
                enableScripts: true, // Allow JavaScript in the webview
            }
        );

        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'createSnippet') {
                try {
                    await commands.createSnippet(
                        message.fileName,
                        message.content,
                        message.description,
                        message.visibility
                    );
                    vscode.window.showInformationMessage(`Snippet created for ${message.fileName}`);
                } catch (error:any) {
                    vscode.window.showErrorMessage(`Failed to create snippet: ${error.message}`);
                }
            }
        });

        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'fetch') {
                try {
                    const session = await vscode.authentication.getSession('github', ['gist'], { createIfNone: true });
                    await fetchData(session.accessToken)
                    vscode.window.showInformationMessage(`Data fetched!`);
                    refreshWebUI(panel);
                } catch (error:any) {
                    vscode.window.showErrorMessage(`Failed to fetch data!`);
                }
            }
        });
        
        snippetsProvider.setUIFunction(() => refreshWebUI(panel));
    }

    function refreshWebUI(panel: vscode.WebviewPanel) {
        // Get all snippets
        const snippets = snippetService.getAllSnippets(); // Assumes `getAllSnippets` returns an array of snippets
        let snippetsHtml = '';

        // Generate HTML list of snippets
        snippets.forEach((snippet, index) => {
            let code = snippet.value;
            if (code !== undefined) {
                code = code.split('<').join('&lt;').split('>').join('&gt;');
            }
            snippetsHtml += `
                <li class="card">
                    <div class="top">
                        <p><pre>${code}</pre></p>
                    </div>
                    <div class="bottom">
                        <strong>${snippet.label}</strong><br/>
                    </div>
                </li>
            `;
        });

        console.log(panel, "<- panel");

        if (panel === undefined) {
            return;
        }

        // Set HTML content for the snippets page
        panel.webview.html = `
            <html>
                <head>
                    <style>
                        body{
                            --background-color: #B0CAF3;
                            --primary-color: #657FF0;
                            --secondary-color: #7FA3F7;
                            --black: #1E1E1E;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            color: var(--black);
                            margin: 0;
                            padding: 0;
                            background-color: var(--background-color);
                        }
                        #nav{
                            top: 0;
                            width: 100%;
                            height: 6em;
                            display: flex;
                            justify-content: space-between;
                            list-style-type: none;
                            margin: 0;
                            padding: 0;
                            background-color: var(--primary-color);
                        }
                        #nav li{
                            margin: auto 2em;
                            font-weight: 700;
                            font-size: 1.2em;
                        }
                        #cards{
                            margin: 0 auto;
                            padding: 0;
                            height: full;
                            width: 62em;
                            list-style-type: none;
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                        }
                        .card {
                            flex: 50%;
                            height: 18em;
                            width: 30em;
                            /* display: flex; */
                            margin: 1em 0.5em 0 0.5em;
                            /* border: solid; */
                            border-radius: 1em;
                            overflow: hidden;
                        }
                        .modal {
                        display: none;
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 30em;
                        background-color: white;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                        border-radius: 8px;
                        padding: 2em;
                        z-index: 1000;
                        }
                        .modal.show {
                            display: block;
                        }
                        
                        .modal-header {
                        font-weight: bold;
                        margin-bottom: 1em;
                        text-align: center;
                        }
                        .modal-footer {
                            text-align: center;
                            margin-top: 1em;
                        }
                        #overlay {
                            display: none;
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(0, 0, 0, 0.5);
                            z-index: 999;
                        }
                        #input-box {
                            width: 100%;
                            padding: 0.5em;
                            margin-bottom: 1em;
                            font-size: 1em;
                            border: 1px solid var(--primary-color);
                            border-radius: 0.5em;
                        }
                        #submit-button, #close-button {
                            padding: 0.5em 1em;
                            font-size: 1em;
                            background-color: var(--primary-color);
                            color: white;
                            border: none;
                            border-radius: 0.5em;
                            cursor: pointer;
                            margin: 0.5em;
                        }
                            #submit-button:hover, #close-button:hover {
                            background-color: var(--secondary-color);
                        }

                        .top{
                            background-color: var(--secondary-color);
                            height: 60%;
                            padding: 1em;
                        }
                        .bottom{
                            padding: 1em;
                            height: 100%;
                            background-color: var(--primary-color);
                        }
                    </style>
                </head>
                <body>
                    <ul id="nav">
                        <li>Back</li>
                        <li>New Room</li>
                        <li id="join-room">Enter Gist ID to add the snippet</li>
                        <li>Search</li>
                    </ul>
                    <ul id="cards">
                        ${snippetsHtml}
                    </ul>

                    <!-- Modal Popup -->
                    <div id="overlay"></div>
                    <div class="modal" id="popup-modal">
                        <div class="modal-header">Join a Room</div>
                        <input type="text" id="input-box" placeholder="Enter room code..." />
                        <div class="modal-footer">
                            <button id="submit-button">Submit</button>
                            <button id="close-button">Close</button>
                        </div>
                        <div id="response-text"></div> <!-- This will display the submitted text -->
                    </div>
                    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

                    <script>
                        const vscode = acquireVsCodeApi();
                        // const axios = require('axios'); 
                        // import * as commands from './config/commands';

                        // Elements
                        const joinRoomButton = document.getElementById('join-room');
                        const modal = document.getElementById('popup-modal');
                        const overlay = document.getElementById('overlay');
                        const submitButton = document.getElementById('submit-button');
                        const closeButton = document.getElementById('close-button');
                        const responseText = document.getElementById('response-text');
                        const inputBox = document.getElementById('input-box');

                        // Show modal
                        joinRoomButton.addEventListener('click', () => {
                            modal.classList.add('show');
                            overlay.style.display = 'block';
                            responseText.textContent = ''; // Clear any previous response text
                            inputBox.disabled = false; // Ensure input box is enabled
                            submitButton.style.display = 'inline-block'; // Show submit button
                            closeButton.textContent = 'Close'; // Reset close button text
                        });

                        // Close modal
                        closeButton.addEventListener('click', () => {
                            modal.classList.remove('show');
                            overlay.style.display = 'none';
                            responseText.textContent = ''; // Clear text on close
                        });

                        overlay.addEventListener('click', () => {
                            modal.classList.remove('show');
                            overlay.style.display = 'none';
                            responseText.textContent = ''; // Clear text on close
                        });

                        // Handle Submit
                        submitButton.addEventListener('click', async () => {
                            const roomCode = inputBox.value;
                            // console.log('clicked');
                            if (roomCode.trim()) {
                                // Send the room code to the extension
                                // vscode.postMessage({ command: 'join-room', roomCode });

                                // Show the room code in the modal as a confirmation
                                // responseText.textContent = 'You have joined the room with code: ' + roomCode;
                                // let session = await vscode.authentication.getSession('github', ['gist'], { createIfNone: true });

                                let url = 'https://api.github.com/gists/' + roomCode;

                                console.log("THE URL IS",url);
                                // let token = 'Bearer ' + session.accessToken
                                let gistInfo = await axios.get(url, {
                                        headers: { Authorization: 'Bearer' }
                                    });
                                    console.log(gistInfo.data);
                                    // console.log(gistsList.length);
                                responseText.textContent = 'You have joined the room with code: ' + gistInfo.data.description;

                                // createSnippet()

                                for (const fileName in gistInfo.data.files) {
                                //     console.log(fileName);
                                        await vscode.postMessage({
                                            command: 'createSnippet',
                                            fileName: fileName,
                                            content: gistInfo.data.files[fileName].content,
                                            description: gistInfo.data.description,
                                            visibility: 'Public',
                                        });
                                        setTimeout(() => {
                                            vscode.postMessage({
                                            command: 'fetch'
                                            });
                                        }, 5000);
                                        
                                //     commands.createSnippet(fileName, gistInfo.data.files[fileName].content, gistInfo.data.description, 'public');
                                //     console.log("Finished");
                                }

                                


                                // Disable the input field after submission
                                inputBox.disabled = true;

                                // Hide the submit button and change the close button text
                                submitButton.style.display = 'none';
                                closeButton.textContent = 'Close';

                                // Optionally, you could wait a bit before closing the modal.
                                setTimeout(() => {
                                    modal.classList.remove('show');
                                    overlay.style.display = 'none';
                                }, 3000); // Close after 3 seconds
                            } else {
                                responseText.textContent = 'Please enter a valid room code.';
                            }
                        });
                    </script>

                </body>
            </html>
        `;
    }



    //** COMMAND : ADD SNIPPET **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.commonAddSnippet,
        async _ => handleCommand(() => commands.commonAddSnippet(allLanguages, snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable))
    ));


    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalAddSnippet,
        async (node) => handleCommand(() => commands.addSnippet(allLanguages, snippetsExplorer, snippetsProvider, node))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsAddSnippet,
        async (node) => handleCommand(() => commands.addSnippet(allLanguages, wsSnippetsExplorer, wsSnippetsProvider, node))
    ));

    //** COMMAND : ADD SNIPPET FROM CLIPBOARD **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.commonAddSnippetFromClipboard,
        async _ => handleCommand(() => commands.commonAddSnippetFromClipboard(snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable))
    ));


    //** COMMAND : ADD SNIPPET FOLDER **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.commonAddSnippetFolder,
        async _ => handleCommand(() => commands.commonAddSnippetFolder(snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalAddSnippetFolder,
        async (node) => handleCommand(() => commands.addSnippetFolder(snippetsExplorer, snippetsProvider, node))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsAddSnippetFolder,
        async (node) => handleCommand(() => commands.addSnippetFolder(wsSnippetsExplorer, wsSnippetsProvider, node))
    ));

    //** COMMAND : EDIT SNIPPET **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalEditSnippet,
        (snippet: Snippet) => handleCommand(() => commands.editSnippet(context, snippet, snippetsProvider))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsEditSnippet,
        (snippet: Snippet) => handleCommand(() => commands.editSnippet(context, snippet, wsSnippetsProvider))
    ));

    //** COMMAND : EDIT SNIPPET FOLDER **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalEditSnippetFolder,
        (snippet: Snippet) => handleCommand(() => new EditSnippetFolder(context, snippet, snippetsProvider))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsEditSnippetFolder,
        (snippet: Snippet) => handleCommand(() => new EditSnippetFolder(context, snippet, wsSnippetsProvider))
    ));

    //** COMMAND : REMOVE SNIPPET **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalDeleteSnippet,
        (snippet) => handleCommand(() => {
            if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
                vscode.window
                    .showInformationMessage(`Do you really want to delete the snippet (${snippet.label}) ?`, Labels.confirmationYes, Labels.confirmationNo)
                    .then(answer => {
                        if (answer === Labels.confirmationYes) {
                            snippetsProvider.removeSnippet(snippet);
                        }
                    });
            } else {
                snippetsProvider.removeSnippet(snippet);
            }
        })
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsDeleteSnippet,
        (snippet) => handleCommand(() => {
            if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
                vscode.window
                    .showInformationMessage(`Do you really want to delete the snippet (${snippet.label}) ?`, Labels.confirmationYes, Labels.confirmationNo)
                    .then(answer => {
                        if (answer === Labels.confirmationYes) {
                            wsSnippetsProvider.removeSnippet(snippet);
                        }
                    });
            } else {
                wsSnippetsProvider.removeSnippet(snippet);
            }
        })
    ));

    //** COMMAND : REMOVE SNIPPET FOLDER **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalDeleteSnippetFolder,
        (snippetFolder) => handleCommand(() => {
            if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
                vscode.window
                    .showInformationMessage(`Do you really want to delete the folder (${snippetFolder.label}) ?`, Labels.confirmationYes, Labels.confirmationNo)
                    .then(answer => {
                        if (answer === Labels.confirmationYes) {
                            snippetsProvider.removeSnippet(snippetFolder);
                        }
                    });
            } else {
                snippetsProvider.removeSnippet(snippetFolder);
            }
        })
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsDeleteSnippetFolder,
        (snippetFolder) => handleCommand(() => {
            if (vscode.workspace.getConfiguration('snippets').get('confirmBeforeDeletion')) {
                vscode.window
                    .showInformationMessage(`Do you really want to delete the folder (${snippetFolder.label}) ?`, Labels.confirmationYes, Labels.confirmationNo)
                    .then(answer => {
                        if (answer === Labels.confirmationYes) {
                            wsSnippetsProvider.removeSnippet(snippetFolder);
                        }
                    });
            } else {
                wsSnippetsProvider.removeSnippet(snippetFolder);
            }
        })
    ));

    //** COMMAND : MOVE SNIPPET UP **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalMoveSnippetUp,
        (snippet) => handleCommand(() => snippet && snippetsProvider.moveSnippetUp(snippet))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsMoveSnippetUp,
        (snippet) => handleCommand(() => snippet && wsSnippetsProvider.moveSnippetUp(snippet))
    ));

    //** COMMAND : MOVE SNIPPET DOWN **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalMoveSnippetDown,
        (snippet) => handleCommand(() => snippet && snippetsProvider.moveSnippetDown(snippet))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsMoveSnippetDown,
        (snippet) => handleCommand(() => snippet && wsSnippetsProvider.moveSnippetDown(snippet))
    ));

    //** COMMAND : SORT SNIPPETS **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalSortSnippets,
        (snippet) => handleCommand(() => snippetsProvider.sortSnippets(snippet))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsSortSnippets,
        (snippet) => handleCommand(() => wsSnippetsProvider.sortSnippets(snippet))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalSortAllSnippets,
        async _ => handleCommand(() => snippetsProvider.sortAllSnippets())
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsSortAllSnippets,
        async _ => handleCommand(() => wsSnippetsProvider.sortAllSnippets())
    ));

    //** COMMAND : REFRESH **/

    context.subscriptions.push(vscode.commands.registerCommand("commonSnippetsCmd.refreshEntry", _ => refreshUI()));

    //** COMMAND : IMPORT & EXPORT **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalExportSnippets,
        async _ => handleCommand(() => commands.exportSnippets(snippetsProvider))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalImportSnippets,
        async _ => handleCommand(() => commands.importSnippets(snippetsProvider))
    ));

    //** COMMAND : TROUBLESHOOT **/

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.globalFixSnippets,
        async _ => handleCommand(() => commands.fixSnippets(snippetsProvider))
    ));

    context.subscriptions.push(vscode.commands.registerCommand(commands.CommandsConsts.wsFixSnippets,
        async _ => handleCommand(() => commands.fixSnippets(wsSnippetsProvider))
    ));

    context.subscriptions.push(vscode.languages.registerDocumentDropEditProvider('*', {
        async provideDocumentDropEdits(
            _document: vscode.TextDocument,
            position: vscode.Position,
            dataTransfer: vscode.DataTransfer,
            _token: vscode.CancellationToken
        ): Promise<vscode.DocumentDropEdit | undefined> {
            const dataItem = dataTransfer.get('application/vnd.code.tree.snippetsProvider');
            if (!dataItem) {
                return;
            }
            try {
                const text = await dataItem.asString();
                const parsedSource = JSON.parse(text) as readonly Snippet[];
                // only accept one snippet (not a folder)
                if (parsedSource?.length !== 1 || parsedSource[0].folder) {
                    return;
                }
                const draggedSnippet = parsedSource[0];
                // same as open snippet command
                if (draggedSnippet.resolveSyntax === undefined) {
                    // 3.1 update: disable syntax resolving by default if property is not yet defined in JSON
                    draggedSnippet.resolveSyntax = false;
                }
                if (draggedSnippet.resolveSyntax) {
                    vscode.commands.executeCommand("editor.action.insertSnippet", { snippet: draggedSnippet.value }
                    );
                } else {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        return;
                    }
                    editor.edit(edit => {
                        edit.insert(position, draggedSnippet.value ?? '');
                    });
                }
            } catch {
                // throws error when parsing `dataItem?.value`, just skip
            }
        }
    }));

    // Get Authentication Token
    context.subscriptions.push(
        vscode.commands.registerCommand('snippets.authenticateGitHub', async () => {
            try {
                const session = await AuthService.getGitHubSession();
                vscode.window.showInformationMessage(
                    `Signed in to GitHub as ${session.account.label}`
                );
            } catch (err) {
                vscode.window.showErrorMessage(
                    'Failed to authenticate with GitHub'
                );
            }
        })
    );

    // async function createSnippetOnGist(
    //     snippetsExplorer: vscode.TreeView<Snippet>,    
    //     node: Snippet | undefined
    // ) {
    //     const session = await AuthService.getGitHubSession();
    //     if (session != null) {
    //         shareSnippetToGist(snippetsExplorer, node);
    //     } else {
    //         vscode.window.showErrorMessage(
    //             'Please make sure you are signed-in to Github'
    //         );
    //     }
    // }

    // Register the shareSnippetToGist command    
    //   context.subscriptions.push(
    //       vscode.commands.registerCommand('snippets.shareSnippetToGist', async (node: Snippet | undefined) => {
    //         await createSnippetOnGist(snippetsExplorer, node);

    //       })
    //   );

    // Register the tree data providers
    vscode.window.registerTreeDataProvider('snippetsExplorer', snippetsProvider);
    vscode.window.registerTreeDataProvider('wsSnippetsExplorer', snippetsProvider);
}



export function deactivate() { }
