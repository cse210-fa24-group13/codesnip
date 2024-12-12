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

    // Function that fetches all the gists associated with user from github
    context.subscriptions.push(
        vscode.commands.registerCommand('snippets.fetchFromGithub', async () => {
            let candidates = snippetService.getAllSnippets();
            for (const candidate of candidates) {
                snippetService.removeSnippetLocally(candidate);
            }

            const session = await vscode.authentication.getSession('github', ['gist'], { createIfNone: true });

            if (session) {
                let gistsList: any = [];
                try {
                    const response = await axios.get('https://api.github.com/gists', {
                            headers: { Authorization: `Bearer ${session.accessToken}`}                             
                        }
                    );
                    let fetchDataResponse = response.data
                    
                    for (const gist of fetchDataResponse) {
                        let gistInfo = await axios.get(`https://api.github.com/gists/${gist.id}`, {
                            headers: { Authorization: `Bearer ${session.accessToken}` }
                        });
                        gistsList.push(gistInfo.data);
                    }
                
                    gistsList.forEach((gist: any) => {
                        for (const fileName in gist.files) {
                            snippetsProvider.addSnippet(fileName, gist.files[fileName].content, Snippet.rootParentId, gist.description, undefined, gist.id);
                        }
                    });
                    refreshUI();
                    
                } catch (error) {
                    // Handle errors
                    vscode.window.showErrorMessage('Error fetching the gists');
                    console.error(error);
                }
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
            'Snippets HomePage', 
            vscode.ViewColumn.One, // Where to show the webview (first editor group)
            {
                enableScripts: true, // Allow JavaScript in the webview
            }
        );

        refreshWebUI(panel);
        //function that responds to communication from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'createSnippets') {
                try {
                    const session = await AuthService.getGitHubSession();
                    if (session) {
                        let gistInfo = await axios.get(message.apiUrl, {
                            headers: { Authorization: `Bearer ${session.accessToken}` }
                        });
                        const tasks = Object.keys(gistInfo.data.files).map(async (fileName) => {
                            await commands.createSnippet(
                                fileName,
                                gistInfo.data.files[fileName].content,
                                gistInfo.data.description,
                                'Public'
                            );
                            vscode.window.showInformationMessage(`Snippet created for ${fileName}`);
                        });
                        await Promise.all(tasks);
                        await vscode.commands.executeCommand('snippets.fetchFromGithub');
                        vscode.window.showInformationMessage(`Data fetched!`);
                        refreshWebUI(panel);
                        //Send message confirming that all operations have been completed
                        panel.webview.postMessage({ command: 'operationComplete' });
                    }
                    else {
                        vscode.window.showErrorMessage('GitHub session could not be opened.');
                    }
                } catch (error:any) {
                    vscode.window.showErrorMessage(`Failed to create snippet: ${error.message}`);
                    panel.webview.postMessage({
                        command: 'operationError',
                        error: error.message,
                    });
                }
            }
        });
        
        snippetsProvider.setUIFunction(() => refreshWebUI(panel));
    }

    function refreshWebUI(panel: vscode.WebviewPanel) {
        try {
            const htmlPath = vscode.Uri.file(
                path.join(context.extensionPath, 'src', 'views', 'snippetsPage.html')
            );
            const stylePath = vscode.Uri.file(
                path.join(context.extensionPath, 'src', 'views', 'styles.css')
            );
            const scriptPath = vscode.Uri.file(
                path.join(context.extensionPath, 'src', 'views', 'script.js')
            );
    
            const styleUri = panel.webview.asWebviewUri(stylePath);
            const scriptUri = panel.webview.asWebviewUri(scriptPath);
            
            let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
            
            htmlContent = htmlContent
                .replace(/\${webview\.cspSource}/g, panel.webview.cspSource)
                .replace(/\${styleUri}/g, styleUri.toString())
                .replace(/\${scriptUri}/g, scriptUri.toString());
    
            const snippets = snippetService.getAllSnippets();
            let snippetsHtml = '';
            snippets.forEach((snippet, index) => {
                if (snippet.value !== undefined) {
                  const code = snippet.value
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/'/g, "&#39;")
                    .replace(/"/g, "&quot;");                                    
                    
                snippetsHtml += `
            <li class="card">
                <div class="bottom">
                    <!-- <div style="border-radius: 0.3em;padding: 0.1em 1.4em; background-color: blue; width: max-content;display: flex; align-items: center;margin: 0;"> -->
                    <h4 class="heads">${snippet.label}</h4>

                    <div class="row">
                        <button class="clipboard" title="Copy Code Snippet" onclick="copyToClipboard(\`${code}\`, \`${index}\`, 'code')">
                            <span class="tooltiptext" id="tooltip-${index}"></span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" width="16.25"
                                viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
                                <path fill="white"
                                    d="M280 64l40 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 128C0 92.7 28.7 64 64 64l40 0 9.6 0C121 27.5 153.3 0 192 0s71 27.5 78.4 64l9.6 0zM64 112c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l256 0c8.8 0 16-7.2 16-16l0-320c0-8.8-7.2-16-16-16l-16 0 0 24c0 13.3-10.7 24-24 24l-88 0-88 0c-13.3 0-24-10.7-24-24l0-24-16 0zm128-8a24 24 0 1 0 0-48 24 24 0 1 0 0 48z" />
                            </svg>
                        </button>
                        <button class="clipboard" title="Copy Snippet ID" onclick="copyToClipboard(\`${snippet.gistid}\`, \`${index}\`, 'gist')">
                        
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" width="16.25"
                                viewBox="0 0 496 512"><!--!Font Awesome Free 6.7.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
                                <path fill="white"
                                    d="M352 224c53 0 96-43 96-96s-43-96-96-96s-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145.4 170.2 121.9 160 96 160c-53 0-96 43-96 96s43 96 96 96c25.9 0 49.4-10.2 66.6-26.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-25.9 0-49.4 10.2-66.6 26.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C302.6 213.8 326.1 224 352 224z" />
                            </svg>
                        </button>
                    </div>
                    <!-- <br/> -->
                    <!-- </div> -->
                </div>
                <div class="top">
                    <pre>
                    ${code}
                </pre>
                </div>
            </li>`;
            }});
    
            htmlContent = htmlContent.replace('<!-- Snippets will be dynamically inserted here -->', snippetsHtml);
            panel.webview.html = htmlContent;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to load snippet template');
        }
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

    // Register the tree data providers
    vscode.window.registerTreeDataProvider('snippetsExplorer', snippetsProvider);
    vscode.window.registerTreeDataProvider('wsSnippetsExplorer', snippetsProvider);
}



export function deactivate() { }