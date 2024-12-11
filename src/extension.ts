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
    context.subscriptions.push(
        vscode.commands.registerCommand('snippets.fetchFromGithub', async () => {
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
                
                // Use for...of to handle asynchronous operations sequentially
                for (const gist of fetchDataResponse) {
                    let gistInfo = await axios.get(`https://api.github.com/gists/${gist.id}`, {
                        headers: { Authorization: `Bearer ${session.accessToken}` }
                    });
                    gistsList.push(gistInfo.data);
                }
            
                // Now you can safely use forEach on gistsList after waiting for fetchDataResponse to finish
                gistsList.forEach((gist: any) => {
                    for (const fileName in gist.files) {
                    // for (let [fileName, value] of gist.files) {
                        snippetsProvider.addSnippet(fileName, gist.files[fileName].content, Snippet.rootParentId, gist.description, undefined, gist.id);
                    }
                });
                refreshUI();
            } else {
                vscode.window.showErrorMessage('GitHub session could not be opened.');
            }
        })                
    );
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
    }
    //** common logic **//

    async function fetchData(token:any) {
        try {
            const response = await axios.get('https://api.github.com/gists',
                {
                    headers: {
                                Authorization: `Bearer ${token}`,
                            }
                }
            );
  
            const data = response.data;



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
                vscode.window.showInformationMessage(
                    `Authenticated as ${session.account.label}`
                );
            } catch (error) {
                console.error('Authentication Error:', error);
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
        panel = vscode.window.createWebviewPanel(
            'webviewFirstPage', // Identifies the webview panel (type)
            'Snippets Page', // Title
            vscode.ViewColumn.One, // Where to show the webview (first editor group)
            {
                enableScripts: true, // Allow JavaScript in the webview
            }
        );

        refreshWebUI(panel);
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
                    await vscode.commands.executeCommand('snippets.fetchFromGithub');
                    vscode.window.showInformationMessage(`Data fetched!`);
                    refreshWebUI(panel);
                } catch (error:any) {
                    vscode.window.showErrorMessage(error.message);
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
                <li class="card" data-description="${snippet.description || ''}">
                    <div class="bottom">
                        <h4 class="heads">${snippet.label}</h4>
                        <div class="row">
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" width="16.25"
                                viewBox="0 0 448 512">
                                <path fill="white"
                                    d="M280 64l40 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 128C0 92.7 28.7 64 64 64l40 0 9.6 0C121 27.5 153.3 0 192 0s71 27.5 78.4 64l9.6 0zM64 112c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-320c0-8.8-7.2-16-16-16l-16 0 0 24c0 13.3-10.7 24-24 24l-88 0-88 0c-13.3 0-24-10.7-24-24l0-24-16 0zm128-8a24 24 0 1 0 0-48 24 24 0 1 0 0 48z" />
                            </svg>
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" width="16.25"
                                viewBox="0 0 496 512">
                                <path fill="white"
                                    d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
                            </svg>
                        </div>
                    </div>
                    <div class="top">
                        <pre>${code}</pre>
                    </div>
                </li>`;

        });

        if (panel === undefined) {
            return;
        }
        
        // Set HTML content for the snippets page
        panel.webview.html = `
            <html>

<head>
    <style>
        @import url('https://fonts.googleapis.com/css?family=Quicksand&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&family=Victor+Mono:ital,wght@0,100..700;1,100..700&display=swap');

        body {
            --background-color: #091525;
            --primary-color: #0a2851;
            --secondary-color: #1E3E62;
            --black: #1E1E1E;
        }

        body {
            font-family: Arial, sans-serif;
            color: var(--black);
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
        }

        #nav {
            ul {
                list-style-type: none;
                display: flex;
                flex-direction: row;
            }

            h3 {
                margin: 0;
            }

            padding: 0.1em 1.5em;
            top: 0;
            width: calc(100% - 1.5em * 2);
            height: 3.5em;
            display: flex;
            font-size: 16px;
            flex-flow: row wrap;
            justify-content: space-around;
            /* list-style-type: none; */
            align-items: center;
            margin: 0;
            /* padding: 0; */
            /* border-bottom: solid 1px white; */
            color: white;
            font-family: Quicksand;
            /* background-color: var(--primary-color); */
        }

        #nav li {
            margin: auto 2em;
            font-weight: 700;
            font-size: 1.2em;
        }

        #cards {
            margin: 0 auto;
            padding: 0;
            /* height: 100%; */
            width: 68em;
            list-style-type: none;
            display: grid;
            row-gap: 1em;
            grid-template-columns: 1fr 1fr;
        }

        .card {
            display: flex;
            flex-direction: column;
            flex: 50%;
            height: 20em;
            overflow: hidden;

            position: relative;
            width: 96%;
            text-wrap: wrap;
            white-space: break-word;  
            width: 34em;
            margin: 1em 0.5em 0 0.5em;
            border-radius: 0.3em;

            p {
                position: relative;
                width: 96%;
                text-wrap: wrap;
                white-space: break-spaces;
            }

            pre {
                text-wrap: wrap;
                width: 90%;
            }

            width: 34em;
            /* padding: 1em; */
            /* display: flex; */
            margin: 1em 0.5em 0 0.5em;
            /* border: solid; */
            border-radius: 0.3em;
            /* overflow: scroll; */
        }

        .heads {
            font-weight: 600;
            white-space: pre-wrap;
            text-wrap: wrap;
            margin: 0;
            position: relative;
            display: block;
        }

        .top {
            background-color: var(--secondary-color);
            height: calc(100% - 2em);
            width: calc(100% - 2em);
            color: white;
            font-family: Victor Mono;
            display: flex;
            padding: 1em;
            text-wrap: wrap;
            overflow: hidden;  
            
            pre {
                font-size: 0.86em;
                font-family: Victor Mono;
                position: relative;
                font-weight: 200;
                margin: 0;
                display: flex;
                text-wrap: wrap;
                width: 100%;
                white-space: pre-wrap; 
                overflow: hidden;  
            }
        }


        .row {
            display: flex;
            gap: 0.5em;
        }

        .bottom {
            padding: 0.3em 1em;
            height: 14%;
            width: calc(100% - 2em);
            color: white;
            display: flex;
            justify-content: space-between;
            /* font-family: Victor Mono; */
            border-bottom: solid 1px #1e71e3;
            display: flex;
            /* font-weight: 200; */
            font-family: Quicksand;
            align-items: center;
            background-color: var(--primary-color);
        }

        .arrow {
            position: relative;
            display: inline-block;
            background: white;
            width: 3px;
            height: 17px;
            transform: rotate(40deg) translate(-30%);
        }

        .arrow2 {
            position: relative;
            display: inline-block;
            transform: rotate(-40deg) translate(60%);
            /* transform: rotateY(60deg) ; */
            background: white;
            width: 3px;
            height: 17px;
        }

        .arrowf {
            /* padding-top: 30px; */
            flex-grow: 0.2;
            height: 100%;
            /* width: 100%; */
            position: relative;
            /* align-self: flex-start; */
            justify-content: flex-start;
            display: inline-block;
            left: 0;
            transform: rotate(-90deg) translateX(47%);
            /* padding: 20px; */
            /* padding-left: 20px; */
        }

        .side-links {
            flex-grow: 5;
            display: flex;
            gap: 1.5em;
            align-items: center;

            h3 {
                font-weight: 600;
            }

            /* align-self: flex-end; */
            justify-content: flex-end;
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
            border: 1px solid var(--primary - color);
            border-radius: 0.5em;
        }

        #submit-button,
        #close-button {
            padding: 0.5em 1em;
            font-size: 1em;
            background-color: var(--primary - color);
            color: white;
            border: none;
            border-radius: 0.5em;
            cursor: pointer;
            margin: 0.5em;
        }

        #submit-button:hover,
        #close-button:hover {
            background-color: var(--secondary - color);
        }
    </style>
</head>

<body>

    <nav id="nav">
        <!-- <ul> -->
        <div class="arrowf">
            <span class="arrow"></span>
            <span class="arrow2"></span>
        </div>

        <div style="flex-grow: 2;display: flex;justify-content: center; align-items: center;height: 100%;">
            <h2 style="margin-right: 1.2em; text-align: center;">CodeSnip</h2>
            <div style="text-align: center;padding-left: 0.7em;padding-bottom: 0.1em;display: flex;align-items: center;position: relative;width: calc(100% - 2em);height: 55%; background-color: white; border-radius: 2em; color: black;">
                <input type="text" id="searchInput" placeholder="Search snippets..." 
                    style="width: 100%; padding: 0.5em; border: none; border-radius: 2em; background: transparent; font-family: Quicksand;">
            </div>
        </div>

        <div class="side-links">
            <div id="join-room">Join Room</div>
            <div style="background-color:#278EA5; padding: 0.3em 0.6em; border-radius: 0.3em;">
                <h3>
                    Login to VSCode
                </h3>
            </div>
            <!-- <div style="display: flex; align-items: center; justify-content: center; width: 2.3em; height: 2.3em; background-color: white; border-radius: 100%;"></div> -->
        </div>
        </ul>
    </nav>



    <ul id="cards">
        ${snippetsHtml}
    </ul>


        <div id="overlay"> </div>
        <div class="modal" id="popup-modal">
            <div class="modal-header"> Join a Room </div>
            <input type="text" id="input-box" placeholder="Enter room code..." />
            <div class="modal-footer">
                <button id="submit-button"> Submit </button>
                <button id="close-button"> Close </button>
            </div>
            <div id="response-text">
                </div> <!-- This will display the submitted text -->
                </div>
                <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js">
                </script>

                <script>
                    const searchInput = document.getElementById('searchInput');
                    searchInput.addEventListener('input', (e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        const cards = document.querySelectorAll('.card');
                        cards.forEach(card => {
                            const label = card.querySelector('.heads').textContent.toLowerCase();
                            const description = card.getAttribute('data-description')?.toLowerCase() || '';
                            const isVisible = label.includes(searchTerm) || description.includes(searchTerm);
                            card.style.display = isVisible ? '' : 'none';
                        });
                    });
                </script>



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

                                console.log("THE URL IS", url);
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
