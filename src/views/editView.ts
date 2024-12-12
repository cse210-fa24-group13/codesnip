import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as mustache from 'mustache';
import { Snippet } from '../interface/snippet';
import { UIUtility } from '../utility/uiUtility';

/**
 * Abstract class representing a view for editing a snippet or snippet folder.
 * This class manages the creation of a webview panel and handles communication with it.
 */
export abstract class EditView {
    private static snippetsConfigKey = "snippets";
    private static docsUrl = "https://code.visualstudio.com/docs/editor/userdefinedsnippets#_snippet-syntax";
    private static readonly viewsFolder: string = 'views';
    protected readonly _panel: vscode.WebviewPanel;

    /**
     * Creates an instance of the EditView class, initializing the webview panel.
     * 
     * @param {vscode.ExtensionContext} context - The extension context.
     * @param {Snippet} snippet - The snippet to be edited.
     * @param {string} viewType - The type of view (e.g., 'editSnippetFolder').
     * @param {string} iconName - The name of the icon to be used in the webview panel.
     * @param {string} title - The title of the webview panel (e.g., 'Edit Folder').
     */
    constructor(
        context: vscode.ExtensionContext,
        snippet: Snippet,
        viewType: string, // 'editSnippetFolder'
        iconName: string,
        title: string // 'Edit Folder'
        ) {
        // Create the webview panel
        this._panel = vscode.window.createWebviewPanel(
            viewType, // Identifies the type of the webview. Used internally
            `${title} [${snippet.label}]`, // Title of the panel displayed to the user
            {
                viewColumn: vscode.ViewColumn.One,  // Editor column to show the new webview panel in.
                preserveFocus: true
            },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableCommandUris: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder))]
            }
        );

        // Set the icon for the panel based on light/dark themes
        this._panel.iconPath = {
            light: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'icons', 'light', `${iconName}.svg`)),
            dark: vscode.Uri.file(path.join(__filename, '..', '..', 'resources', 'icons', 'dark', `${iconName}.svg`))
        };

        // Read the HTML template for the webview
        const htmlTemplate = path.join(context.extensionPath, EditView.viewsFolder, `${viewType}.html`);
        this._panel.webview.html = mustache.render(fs.readFileSync(htmlTemplate).toString(),
            {
                cspSource: this._panel.webview.cspSource,
                resetCssUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder, 'css', 'reset.css'))),
                cssUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder, 'css', 'vscode-custom.css'))),
                jsUri: this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, EditView.viewsFolder, 'js', `${viewType}.js`))),
                snippet: snippet,
                docsUrl: EditView.docsUrl,
                expertMode: vscode.workspace.getConfiguration(EditView.snippetsConfigKey).get("expertMode"),
                languages: UIUtility.getLanguageNamesWithExtensions()
            }
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => this.handleReceivedMessage(message),
            undefined, context.subscriptions
        );
    }

    /**
     * Abstract method to handle messages received from the webview.
     * Must be implemented in derived classes.
     * 
     * @param {any} message - The received message, typically containing a command and data.
     * @returns {any} - The result of handling the message, if any.
     */
    abstract handleReceivedMessage(message: any): any; // must be implemented in derived classes
}
