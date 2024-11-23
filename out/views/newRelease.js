"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewRelease = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const mustache = require("mustache");
class NewRelease {
    constructor(context) {
        this._viewType = 'newRelease';
        this._iconName = 'file';
        const title = 'Snippets — What\'s New';
        const version = context.extension.packageJSON.version;
        this._panel = vscode.window.createWebviewPanel(this._viewType, title, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: true
        }, {
            retainContextWhenHidden: true,
            enableCommandUris: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, NewRelease.viewsFolder))]
        });
        this._panel.iconPath = {
            light: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'icons', 'light', `${this._iconName}.svg`)),
            dark: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'icons', 'dark', `${this._iconName}.svg`))
        };
        const htmlTemplate = path.join(context.extensionPath, NewRelease.viewsFolder, `${this._viewType}.html`);
        this._panel.webview.html = mustache.render(fs.readFileSync(htmlTemplate).toString(), {
            cspSource: this._panel.webview.cspSource,
            resetCssUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, NewRelease.viewsFolder, 'css', 'reset.css'))),
            cssUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, NewRelease.viewsFolder, 'css', 'vscode-custom.css'))),
            title: title,
            version: version
        });
    }
}
exports.NewRelease = NewRelease;
NewRelease.viewsFolder = 'views';
//# sourceMappingURL=newRelease.js.map