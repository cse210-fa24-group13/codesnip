import * as vscode from 'vscode';
import { Labels } from '../config/labels';
import { Snippet } from '../interface/snippet';

export class UIUtility {
    /**
     * Prompts the user to select a snippet from a list of saved snippets.
     * 
     * @param {Snippet[]} savedSnippets - The list of saved snippets to choose from.
     * @returns {Promise<Snippet | undefined>} - A Promise that resolves to the selected snippet, or undefined if no selection is made.
     */
    static async requestSnippetFromUser(savedSnippets: Snippet[]): Promise<Snippet | undefined> {
        interface CustomQuickPickItem extends vscode.QuickPickItem {
            label: string;
            detail: string,
            value: Snippet
        }

        const arr: CustomQuickPickItem[] = savedSnippets.map(s => {
            return {
                label: s.label,
                detail: s.value?.slice(0, 75) ?? "",
                value: s
            };
        });

        const selection = await vscode.window.showQuickPick(arr, {
            placeHolder: Labels.insertSnippetName,
            matchOnDetail: true
        });

        if (!selection ||
            !selection.value) {
            return;
        }

        // refer to selected snippet
        return selection.value;
    }

    /**
     * Prompts the user to enter the value for a snippet.
     * 
     * @returns {Promise<string | undefined>} - A Promise that resolves to the entered snippet value, or undefined if canceled.
     */
    static async requestSnippetValue(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: Labels.snippetValuePrompt,
            placeHolder: Labels.snippetValuePlaceholder,
            validateInput: text => {
                return text === "" ? Labels.snippetValueValidationMsg : null;
            }
        });
    }

    /**
     * Prompts the user to enter the name for a snippet.
     * 
     * @returns {Promise<string | undefined>} - A Promise that resolves to the entered snippet name, or undefined if canceled.
     */
    static async requestSnippetName(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: Labels.snippetNamePrompt,
            placeHolder: Labels.snippetNamePlaceholder,
            validateInput: text => {
                return text === "" ? Labels.snippetNameValidationMsg : null;
            }
        });
    }

    /**
     * Prompts the user to enter a description for a snippet.
     * 
     * @returns {Promise<string | undefined>} - A Promise that resolves to the entered description, or undefined if canceled.
     */
    static async requestDescription(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: Labels.snippetDescriptionPrompt,
            placeHolder: Labels.snippetDescriptionPlaceholder,            
        });
    }

    /**
     * Prompts the user to enter the name for a snippet folder.
     * 
     * @returns {Promise<string | undefined>} - A Promise that resolves to the entered folder name, or undefined if canceled.
     */
    static async requestSnippetFolderName(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: Labels.snippetNameFolderPrompt,
            placeHolder: Labels.snippetNameFolderPlaceholder,
            validateInput: text => {
                return text === "" ? Labels.snippetFolderNameValidationMsg : null;
            }
        });
    }

    /**
     * Prompts the user to select the target snippets view (global or workspace).
     * 
     * @returns {Promise<string | undefined>} - A Promise that resolves to the selected view type, or undefined if canceled.
     */
    static async requestTargetSnippetsView(): Promise<string | undefined> {
        const selection = await vscode.window.showQuickPick([Labels.globalSnippets, Labels.wsSnippets], {
            placeHolder: Labels.viewType,
            matchOnDetail: true
        });

        if (!selection) {
            return;
        }

        // refer to selected snippet
        return selection;
	}

    /**
     * Retrieves a list of language names along with their associated extensions.
     * 
     * @returns {Array<{id: string, alias: string, extension: string}>} - A list of objects containing language ID, alias, and extension.
     */
    static getLanguageNamesWithExtensions = () => vscode.extensions.all
            .map(i => <any[]>(i.packageJSON as any)?.contributes?.languages)
            .filter(i => i)
            .reduce((a, b) => a.concat(b), [])
            .filter(i => 0 < (i.aliases?.length ?? 0))
            .map(i => {
                return {
                    id: i?.id,
                    alias: i?.aliases?.[0],
                    extension: i?.extensions?.[0]
                };
            });
}
