import * as vscode from 'vscode';
import { Snippet } from '../interface/snippet';
import { SnippetsProvider } from '../provider/snippetsProvider';
import { EditView } from './editView';

/**
 * Class responsible for editing a snippet.
 * Extends from `EditView` to provide functionality for editing snippets.
 */
export class EditSnippet extends EditView {
    /**
     * Creates an instance of the EditSnippet class.
     * 
     * @param {vscode.ExtensionContext} context - The extension context.
     * @param {Snippet} _snippet - The snippet to be edited.
     * @param {SnippetsProvider} _snippetsProvider - The provider used to edit the snippet.
     */
    constructor(
        context: vscode.ExtensionContext,
        private _snippet: Snippet,
        private _snippetsProvider: SnippetsProvider
    ) {
        super(
            context,
            _snippet,
            'editSnippet',
            'file',
            'Edit Snippet'
        );
    }

    /**
     * Handles the received message and processes commands to edit the snippet.
     * 
     * @param {any} message - The received message, typically containing command and data.
     * @returns {any} - The result of handling the message, if any.
     */
    handleReceivedMessage(message: any): any {
        switch (message.command) {
            case 'edit-snippet':
                const { label, prefix, language, description, value, resolveSyntax } = message.data;
                
                // Call provider only if there is data change
                if (label !== undefined) {
                    this._snippet.label = label;
                }
                if (value !== undefined) {
                    this._snippet.value = value;
                }
                this._snippet.language = language;
                this._snippet.description = description;
                this._snippet.prefix = prefix;

                // Test against undefined so we don't mess with variable's state if user introduces an explicit value 'false'
                if (resolveSyntax !== undefined) {
                    this._snippet.resolveSyntax = resolveSyntax;
                }

                // Edit the snippet using the snippets provider
                this._snippetsProvider.editSnippet(this._snippet);

                // Dispose the panel after editing
                this._panel.dispose();
                return;
        }
    }
}

