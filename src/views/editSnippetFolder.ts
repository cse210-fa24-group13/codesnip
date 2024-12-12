import * as vscode from 'vscode';
import { Snippet } from '../interface/snippet';
import { SnippetsProvider } from '../provider/snippetsProvider';
import { EditView } from './editView';

/**
 * Class responsible for editing a snippet folder.
 * Extends from `EditView` to provide functionality for editing snippet folders.
 */
export class EditSnippetFolder extends EditView {
    /**
     * Creates an instance of the EditSnippetFolder class.
     * 
     * @param {vscode.ExtensionContext} context - The extension context.
     * @param {Snippet} _snippet - The snippet folder to be edited.
     * @param {SnippetsProvider} _snippetsProvider - The provider used to edit the snippet folder.
     */
    constructor(
        context: vscode.ExtensionContext, 
        private _snippet: Snippet, 
        private _snippetsProvider: SnippetsProvider
    ) {
        super(
            context,
            _snippet,
            'editSnippetFolder',
            'folder',
            'Edit Folder'
        );
    }

    /**
     * Handles the received message and processes commands to edit the snippet folder.
     * 
     * @param {any} message - The received message, typically containing command and data.
     * @returns {any} - The result of handling the message, if any.
     */
    handleReceivedMessage(message: any): any {
        switch (message.command) {
            case 'edit-folder':
                const label = message.data.label;
                const icon = message.data.icon;
                // call provider only if there is data change
                if (label) {
                    this._snippet.label = label;
                }
                this._snippet.icon = icon;

                // Edit the snippet folder using the snippets provider
                this._snippetsProvider.editSnippetFolder(this._snippet);

                // Dispose the panel after editing
                this._panel.dispose();
                return;
        }
    }
}
