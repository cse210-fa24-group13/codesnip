"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditView = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const mustache = require("mustache");
const uiUtility_1 = require("../utility/uiUtility");
class EditView {
    constructor(context, snippet, viewType, // 'editSnippetFolder'
    iconName, title // 'Edit Folder'
    ) {
        this._panel = vscode.window.createWebviewPanel(viewType, // Identifies the type of the webview. Used internally
        `${title} [${snippet.label}]`, // Title of the panel displayed to the user
        {
            viewColumn: vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            preserveFocus: true
        }, {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableCommandUris: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder))]
        });
        this._panel.iconPath = {
            light: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'icons', 'light', `${iconName}.svg`)),
            dark: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'icons', 'dark', `${iconName}.svg`))
        };
        const htmlTemplate = path.join(context.extensionPath, EditView.viewsFolder, `${viewType}.html`);
        this._panel.webview.html = mustache.render(fs.readFileSync(htmlTemplate).toString(), {
            cspSource: this._panel.webview.cspSource,
            resetCssUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder, 'css', 'reset.css'))),
            cssUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder, 'css', 'vscode-custom.css'))),
            jsUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder, 'js', `${viewType}.js`))),
            snippet: snippet,
            docsUrl: EditView.docsUrl,
            expertMode: vscode.workspace.getConfiguration(EditView.snippetsConfigKey).get("expertMode"),
            languages: uiUtility_1.UIUtility.getLanguageNamesWithExtensions()
        });
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => this.handleReceivedMessage(message), undefined, context.subscriptions);
    }
}
exports.EditView = EditView;
EditView.snippetsConfigKey = "snippets";
EditView.docsUrl = "https://code.visualstudio.com/docs/editor/userdefinedsnippets#_snippet-syntax";
EditView.viewsFolder = 'views';
//# sourceMappingURL=editView.js.map