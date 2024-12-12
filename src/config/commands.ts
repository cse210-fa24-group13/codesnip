import * as vscode from 'vscode';
import { Snippet } from '../interface/snippet';
import { SnippetsProvider } from '../provider/snippetsProvider';
import { UIUtility } from "../utility/uiUtility";
import { EditSnippet } from '../views/editSnippet';
import { Labels } from "./labels";
import { StringUtility } from '../utility/stringUtility';
import axios from 'axios';
import { AuthService } from '../service/authService';


export const enum CommandsConsts {
	miscRequestWSConfig = "miscCmd.requestWSConfig",
	commonOpenPage = "extension.openPage",
	// common commands across global & ws
	commonOpenSnippet = "globalSnippetsCmd.openSnippet",
	commonOpenSnippetInTerminal = "globalSnippetsCmd.openSnippetInTerminal",
	commonCopySnippetToClipboard = "globalSnippetsCmd.copySnippetToClipboard",
	commonAddSnippet = "commonSnippetsCmd.addSnippet",
	commonAddSnippetFromClipboard = "commonSnippetsCmd.addSnippetFromClipboard",
	commonAddSnippetFolder = "commonSnippetsCmd.addSnippetFolder",
	// global commands
	globalAddSnippet = "globalSnippetsCmd.addSnippet",
	globalAddSnippetFromClipboard = "globalSnippetsCmd.addSnippetFromClipboard",
	globalAddSnippetFolder = "globalSnippetsCmd.addSnippetFolder",
	globalEditSnippet = "globalSnippetsCmd.editSnippet",
	globalEditSnippetFolder = "globalSnippetsCmd.editSnippetFolder",
	globalDeleteSnippet = "globalSnippetsCmd.deleteSnippet",
	globalDeleteSnippetFolder = "globalSnippetsCmd.deleteSnippetFolder",
	globalMoveSnippetUp = "globalSnippetsCmd.moveSnippetUp",
	globalMoveSnippetDown = "globalSnippetsCmd.moveSnippetDown",
	globalFixSnippets = "globalSnippetsCmd.fixSnippets",
	globalExportSnippets = "globalSnippetsCmd.exportSnippets",
	globalImportSnippets = "globalSnippetsCmd.importSnippets",
	globalSortSnippets = "globalSnippetsCmd.sortSnippets",
	globalSortAllSnippets = "globalSnippetsCmd.sortAllSnippets",
	// ws commands
	wsAddSnippet = "wsSnippetsCmd.addSnippet",
	wsAddSnippetFromClipboard = "wsSnippetsCmd.addSnippetFromClipboard",
	wsAddSnippetFolder = "wsSnippetsCmd.addSnippetFolder",
	wsEditSnippet = "wsSnippetsCmd.editSnippet",
	wsEditSnippetFolder = "wsSnippetsCmd.editSnippetFolder",
	wsDeleteSnippet = "wsSnippetsCmd.deleteSnippet",
	wsDeleteSnippetFolder = "wsSnippetsCmd.deleteSnippetFolder",
	wsMoveSnippetUp = "wsSnippetsCmd.moveSnippetUp",
	wsMoveSnippetDown = "wsSnippetsCmd.moveSnippetDown",
	wsFixSnippets = "wsSnippetsCmd.fixSnippets",
	wsSortSnippets = "wsSnippetsCmd.sortSnippets",
	wsSortAllSnippets = "wsSnippetsCmd.sortAllSnippets",
}

/**
 * Creates or updates a GitHub Gist with the provided snippet details.
 * If the `update` parameter is provided and true, the snippet is updated; otherwise, a new snippet is created.
 * @param name - The name of the snippet.
 * @param text - The content of the snippet.
 * @param description - The description for the snippet.
 * @param visibility - The visibility of the snippet, either "Public" or "Private".
 * @param update - Optional flag indicating whether to update an existing snippet (default is undefined).
 * @returns The Gist ID of the created or updated snippet.
 */
//Code to create Gists on GitHub
export async function createSnippet(
    name: string,
    text: string,
    description: string,
    visibility: string,
    update?: boolean | undefined
) {
    const gistPayload = {
        description,
        public: visibility === "Public",
        files: {
            [name]: {
                content: text,
            },
        },
    };

    const session = await AuthService.getGitHubSession();
    try {
        const response = await axios.post("https://api.github.com/gists", gistPayload, {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
        });

        // Extracting the gist ID from the response
        const gistId = response.data.id;
        if(update === true)
        {
            vscode.window.showInformationMessage(`Snippet updated successfully! Gist ID: ${gistId}`);
        }
        else
        {
            vscode.window.showInformationMessage(`Snippet created successfully! Gist ID: ${gistId}`);
        }
        return gistId;
    } catch (error: any) {
        vscode.window.showErrorMessage(
            `Error creating snippet: ${error?.response?.data?.message || error.message || "Unknown error"}`
        );
    }
}

/**
 * Updates an existing GitHub Gist with new content and details.
 * @param gistId - The ID of the Gist to be updated.
 * @param name - The new name for the snippet file.
 * @param oldName - The old name of the snippet file that will be replaced.
 * @param text - The new content of the snippet.
 * @param description - The new description of the Gist.
 * @returns The updated Gist data.
 */
//Code to update Gists on GitHub
export async function updateGist(
    gistId: string| undefined,
    name: string,
    oldName: string,
    text: string| undefined,
    description: string| undefined,
) {
    const gistPayload = {
        description,
        files: {
            [oldName] : {
                "filename": name,
                "content": text,
            },
        },
    };

    const session = await AuthService.getGitHubSession(); // Assuming AuthService handles authentication
    try {
        const response = await axios.patch(
            `https://api.github.com/gists/${gistId}`,
            gistPayload,
            {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        vscode.window.showInformationMessage(
            `Gist updated successfully! Updated Gist ID: ${response.data.id}`
        );

        return response.data; 
    } catch (error: any) {
        vscode.window.showErrorMessage(
            `Error updating gist: ${error?.response?.data?.message || error.message || "Unknown error"}`
        );
        throw error;
    }
}

/**
 * Deletes an existing GitHub Gist.
 * @param gistId - The ID of the Gist to be deleted.
 * @param update - A flag to determine whether the deletion is part of an update. If not, a success message is shown.
 * @returns A promise that resolves when the deletion is complete.
 */
//Code to delete Gists on GitHub
export async function deleteGist(gistId: string|undefined, update?: boolean|undefined): Promise<void> {
    const session = await AuthService.getGitHubSession(); 
    try {
        await axios.delete(`https://api.github.com/gists/${gistId}`, {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
        });
        if(update !== true)
        {
            vscode.window.showInformationMessage(`Snippet deleted successfully! Gist ID: ${gistId}`);
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(
            `Error deleting gist: ${error?.response?.data?.message || error.message || "Unknown error"}`
        );
    }
}
/**
 * A function to add a snippet, allowing users to input snippet details and choose where to save it.
 * @param allLanguages - An array of available programming languages.
 * @param snippetsProvider - Provider for managing global snippets.
 * @param wsSnippetsProvider - Provider for managing workspace-specific snippets.
 * @param workspaceSnippetsAvailable - A flag indicating whether workspace-specific snippets are available.
 */
export async function commonAddSnippet(allLanguages: any[], snippetsProvider: SnippetsProvider, 
	wsSnippetsProvider: SnippetsProvider, workspaceSnippetsAvailable: boolean) {
	var text: string | undefined;
	var languageExt = '';

	const editor = vscode.window.activeTextEditor;
	// if no editor is open or editor has no text, get value from user
	if (!editor || editor.document.getText(editor.selection) === "") {
		// get snippet name
		text = await UIUtility.requestSnippetValue();
		if (!text || text.length === 0) {
			return;
		}
	} else {
		text = editor.document.getText(editor.selection);
		let language = allLanguages.find(l => l.id === editor.document.languageId);
		// if language is different than plaintext
		if (language && language.id !== 'plaintext') {
			languageExt = language.extension;
		}
		
		if (text.length === 0) {
			vscode.window.showWarningMessage(Labels.noTextSelected);
			return;
		}
	}
	// get snippet name
	const name = await UIUtility.requestSnippetName();
	if (name === undefined || name === "") {
		vscode.window.showWarningMessage(Labels.snippetNameErrorMsg);
		return;
	}
	if (text === undefined || text === "") {
		vscode.window.showWarningMessage(Labels.snippetValueErrorMsg);
		return;
	}

	const description = await UIUtility.requestDescription();

    if (!description) {
        vscode.window.showWarningMessage(Labels.snippetDescriptionErrorMsg);
        return;
    }

    const visibility = await vscode.window.showQuickPick(["Public", "Private"], {
        canPickMany: false,
        placeHolder: Labels.snippetVisibilityPrompt
    });

    if (!visibility) {
        vscode.window.showWarningMessage(Labels.snippetVisibilityErrorMsg);
        return;
    }

	// request where to save snippets if ws is available
	if (workspaceSnippetsAvailable) {
		const targetView = await UIUtility.requestTargetSnippetsView();
		// no value chosen
		if (!targetView) {
			vscode.window.showWarningMessage(Labels.noViewTypeSelected);
		} else if (targetView === Labels.globalSnippets) {
			snippetsProvider.addSnippet(name, text, Snippet.rootParentId, languageExt);		
		} else if (targetView === Labels.wsSnippets) {
			wsSnippetsProvider.addSnippet(name, text, Snippet.rootParentId, languageExt);
		}
	} else {
		snippetsProvider.addSnippet(name, text, Snippet.rootParentId, languageExt);
	}
}

/**
 * A function to add a new snippet based on user input, including snippet details and language.
 * The snippet is then created as a Gist on GitHub and added to the snippets provider.
 * 
 * @param allLanguages - An array of available programming languages.
 * @param snippetsExplorer - The TreeView that displays snippets.
 * @param snippetsProvider - The provider responsible for managing snippets.
 * @param node - The currently selected node (if any), used when the command is invoked via the context menu.
 */
export async function addSnippet(
    allLanguages: any[],
    snippetsExplorer: vscode.TreeView<Snippet>,
    snippetsProvider: SnippetsProvider,
    node: any
) {
    let text: string | undefined;
    let languageExt = '';

    const editor = vscode.window.activeTextEditor;

    // If no editor is open or the editor has no text, get the value from the user
    if (!editor || editor.document.getText(editor.selection) === "") {
        text = await UIUtility.requestSnippetValue();
        if (!text || text.length === 0) {
            return;
        }
    } else {
        text = editor.document.getText(editor.selection);
        const language = allLanguages.find(l => l.id === editor.document.languageId);
        // If language is different from plaintext
        if (language && language.id !== 'plaintext') {
            languageExt = language.extension;
        }
        if (text.length === 0) {
            vscode.window.showWarningMessage(Labels.noTextSelected);
            return;
        }
    }

    // Get snippet name
    const name = await UIUtility.requestSnippetName();
    if (!name) {
        vscode.window.showWarningMessage(Labels.snippetNameErrorMsg);
        return;
    }

    if (!text) {
        vscode.window.showWarningMessage(Labels.snippetValueErrorMsg);
        return;
    }

    const description = await UIUtility.requestDescription();
    if (!description) {
        vscode.window.showWarningMessage(Labels.snippetDescriptionErrorMsg);
        return;
    }

    const visibility = await vscode.window.showQuickPick(["Public", "Private"], {
        canPickMany: false,
        placeHolder: Labels.snippetVisibilityPrompt,
    });

    if (!visibility) {
        vscode.window.showWarningMessage(Labels.snippetVisibilityErrorMsg);
        return;
    }

    // Create the gist and get the gistId
    try {
        const gistId = await createSnippet(name, text, description, visibility);

        // When triggering the command with right-click, the parameter node will be tested
        // If the command is invoked via the menu popup, the node will be the highlighted node
        if (snippetsExplorer.selection.length === 0 && !node) {
            snippetsProvider.addSnippet(name, text, Snippet.rootParentId, description, languageExt, gistId);
        } else {
            const selectedItem = node ? node : snippetsExplorer.selection[0];
            if (selectedItem.folder && selectedItem.folder === true) {
                snippetsProvider.addSnippet(name, text, selectedItem.id, description, languageExt, gistId);
            } else {
                snippetsProvider.addSnippet(
                    name,
                    text,
                    selectedItem.parentId ?? Snippet.rootParentId,
                    description,
                    languageExt,
                    gistId
                );
            }
        }

        vscode.window.showInformationMessage(`Snippet created successfully with Gist ID: ${gistId}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating snippet`);
    }
}

/**
 * A function to add a new snippet from the clipboard content. It prompts the user for the snippet name,
 * description, and visibility, then creates the snippet as a Gist on GitHub and adds it to the snippets provider.
 * 
 * @param snippetsProvider - The provider responsible for managing global snippets.
 * @param wsSnippetsProvider - The provider responsible for managing workspace-specific snippets.
 * @param workspaceSnippetsAvailable - A boolean flag indicating whether workspace snippets are available.
 */
export async function commonAddSnippetFromClipboard(
    snippetsProvider: SnippetsProvider,
    wsSnippetsProvider: SnippetsProvider,
    workspaceSnippetsAvailable: boolean
) {
    const clipboardContent = await vscode.env.clipboard.readText();
    if (!clipboardContent || clipboardContent.trim() === "") {
        vscode.window.showWarningMessage(Labels.noClipboardContent);
        return;
    }

    // Get snippet name
    const name = await UIUtility.requestSnippetName();
    if (!name) {
        vscode.window.showWarningMessage(Labels.snippetNameErrorMsg);
        return;
    }

    const description = await UIUtility.requestDescription();
    if (!description) {
        vscode.window.showWarningMessage(Labels.snippetDescriptionErrorMsg);
        return;
    }

    const visibility = await vscode.window.showQuickPick(["Public", "Private"], {
        canPickMany: false,
        placeHolder: Labels.snippetVisibilityPrompt,
    });

    if (!visibility) {
        vscode.window.showWarningMessage(Labels.snippetVisibilityErrorMsg);
        return;
    }

    try {
        // Create the gist and get the gistId
        const gistId = await createSnippet(name, clipboardContent, description, visibility);

        // Determine where to save the snippet
        if (workspaceSnippetsAvailable) {
            const targetView = await UIUtility.requestTargetSnippetsView();

            if (!targetView) {
                vscode.window.showWarningMessage(Labels.noViewTypeSelected);
                return;
            }

            if (targetView === Labels.globalSnippets) {
                snippetsProvider.addSnippet(name, clipboardContent, Snippet.rootParentId, description, undefined, gistId);
            } else if (targetView === Labels.wsSnippets) {
                wsSnippetsProvider.addSnippet(name, clipboardContent, Snippet.rootParentId, description, undefined, gistId);
            }
        } else {
            snippetsProvider.addSnippet(name, clipboardContent, Snippet.rootParentId, description, undefined, gistId);
        }

        vscode.window.showInformationMessage(`Snippet created successfully with Gist ID: ${gistId}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating snippet: `);
    }
}

/**
 * A function to add a new snippet folder. It prompts the user for the folder name, 
 * then determines where to save the folder (global or workspace snippets) if workspace snippets are available.
 * 
 * @param snippetsProvider - The provider responsible for managing global snippet folders.
 * @param wsSnippetsProvider - The provider responsible for managing workspace-specific snippet folders.
 * @param workspaceSnippetsAvailable - A boolean flag indicating whether workspace snippets are available.
 */
export async function commonAddSnippetFolder(snippetsProvider: SnippetsProvider, wsSnippetsProvider: SnippetsProvider, workspaceSnippetsAvailable: boolean) {
	// get snippet name
	const name = await UIUtility.requestSnippetFolderName();
	if (name === undefined || name === "") {
		vscode.window.showWarningMessage(Labels.snippetFolderNameErrorMsg);
		return;
	}

	// request where to save snippets if ws is available
	if (workspaceSnippetsAvailable) {
		const targetView = await UIUtility.requestTargetSnippetsView();
		// no value chosen
		if (!targetView) {
			vscode.window.showWarningMessage(Labels.noViewTypeSelected);
		} else if (targetView === Labels.globalSnippets) {
			snippetsProvider.addSnippetFolder(name, Snippet.rootParentId);
		} else if (targetView === Labels.wsSnippets) {
			wsSnippetsProvider.addSnippetFolder(name, Snippet.rootParentId);
		}
	} else {
		snippetsProvider.addSnippetFolder(name, Snippet.rootParentId);
	}
}

/**
 * A function to add a new snippet folder. It prompts the user for the folder name, 
 * and depending on the context (whether invoked via right-click or the menu), 
 * it determines where the folder should be added.
 * 
 * @param snippetsExplorer - The explorer responsible for displaying the snippet folders.
 * @param snippetsProvider - The provider responsible for managing snippet folders.
 * @param node - The selected node, which can be a folder or a snippet item.
 */
export async function addSnippetFolder(snippetsExplorer: vscode.TreeView<Snippet>, snippetsProvider: SnippetsProvider, node: any) {
	// get snippet name
	const name = await UIUtility.requestSnippetFolderName();
	if (name === undefined || name === "") {
		vscode.window.showWarningMessage(Labels.snippetFolderNameErrorMsg);
		return;
	}
	// When triggering the command with right-click the parameter node of type Tree Node will be tested.
	// When the command is invoked via the menu popup, this node will be the highlighted node, and not the selected node, the latter will undefined.
	if (snippetsExplorer.selection.length === 0 && !node) {
		snippetsProvider.addSnippetFolder(name, Snippet.rootParentId);
	} else {
		const selectedItem = node ? node : snippetsExplorer.selection[0];
		if (selectedItem.folder && selectedItem.folder === true) {
			snippetsProvider.addSnippetFolder(name, selectedItem.id);
		} else {
			snippetsProvider.addSnippetFolder(name, selectedItem.parentId ?? Snippet.rootParentId);
		}
	}
}

/**
 * Function to edit an existing snippet. It checks if the snippet has a property for syntax resolution, 
 * and if not, it sets the default value to `false`. After that, it creates and shows a webview 
 * for editing the snippet.
 * 
 * @param context - The extension context, used for managing the lifecycle of the webview.
 * @param snippet - The snippet object to be edited.
 * @param snippetsProvider - The provider responsible for managing the snippets.
 */
export function editSnippet(context: vscode.ExtensionContext, snippet: Snippet, snippetsProvider: SnippetsProvider) {	
	if (snippet.resolveSyntax === undefined) {
		// 3.1 update: disable syntax resolving by default if property is not yet defined in JSON
		snippet.resolveSyntax = false;
	}
	// Create and show a new webview for editing snippet
	new EditSnippet(context, snippet, snippetsProvider);
}

/**
 * Function to export snippets to a specified file. It prompts the user with a file save dialog, 
 * and upon selecting a destination, it uses the `snippetsProvider` to export the snippets to the selected file.
 * 
 * @param snippetsProvider - The provider responsible for managing and exporting snippets.
 */
export async function exportSnippets(snippetsProvider: SnippetsProvider) {
	// get snippet destination
	vscode.window.showSaveDialog(
		{
			filters: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'JSON': ['json']
			},
			title: 'Export Snippets',
			saveLabel: 'Export'
		}
	).then(fileUri => {
		if (fileUri && fileUri.fsPath) {
			snippetsProvider.exportSnippets(fileUri.fsPath);
		}
	});
}

/**
 * Function to import snippets from a selected JSON file. 
 * It shows an open file dialog, and upon selecting a file, 
 * it prompts the user for confirmation before importing the snippets.
 * 
 * @param snippetsProvider - The provider responsible for managing and importing snippets.
 */
export async function importSnippets(snippetsProvider: SnippetsProvider) {
	// get snippets destination
	vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
		filters: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'JSON': ['json']
		},
		openLabel: 'Import',
		title: 'Import Snippets'
	}).then(fileUris => {
		if (fileUris && fileUris[0] && fileUris[0].fsPath) {
			vscode.window.showWarningMessage(
				Labels.snippetImportRequestConfirmation,
				...[Labels.importSnippets, Labels.discardImport])
				.then(selection => {
					switch (selection) {
						case Labels.importSnippets:
							if (snippetsProvider.importSnippets(fileUris[0].fsPath)) {
								snippetsProvider.fixLastId();
								vscode.window.showInformationMessage(Labels.snippetsImported);
							} else {
								vscode.window.showErrorMessage(Labels.snippetsNotImported);
							}
						case Labels.discardImport:
							break;
					}
				});
		}
	});
}

/**
 * Function to troubleshoot and fix snippet issues, such as duplicates and corrupted snippets.
 * Displays a progress indicator and a confirmation dialog to the user.
 * 
 * @param snippetsProvider - The provider responsible for managing snippets.
 */
export async function fixSnippets(snippetsProvider: SnippetsProvider) {
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Window,
		cancellable: false,
		title: 'Scanning Snippets'
	}, async (progress) => {
		progress.report({  increment: 0 });
		vscode.window
			.showInformationMessage(Labels.troubleshootConfirmation, Labels.troubleshootProceed, Labels.troubleshootCancel)
			.then(answer => {
				if (answer === Labels.troubleshootProceed) {
					let results = snippetsProvider.fixSnippets();
					vscode.window.showInformationMessage(
						(results[0] > 0 || results[1] > 0) 
						? Labels.troubleshootResultsDone + ' '
							+ (results[0] > 0 ? StringUtility.formatString(Labels.troubleshootResultsDuplicate, results[0].toString()) : '')
							+ (results[1] > 0 ? ( ' ' + StringUtility.formatString(Labels.troubleshootResultsCorrupted, results[1].toString())) : '')
						: Labels.troubleshootResultsOk
					);
				}
			});
		progress.report({ increment: 100 });
	});
}