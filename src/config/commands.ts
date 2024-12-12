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

//Code to create Gists on GitHub
export async function createSnippet(
    name: string,
    text: string,
    description: string,
    visibility: string
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
        vscode.window.showInformationMessage(`Snippet created successfully! Gist ID: ${gistId}`);
        return gistId;
    } catch (error: any) {
        vscode.window.showErrorMessage(
            `Error creating snippet: ${error?.response?.data?.message || error.message || "Unknown error"}`
        );
    }
}

//Code to update Gists on GitHub
export async function updateGist(
    gistId: string| undefined,
    name: string,
    text: string| undefined,
    description: string| undefined,
) {
    const gistPayload = {
        description,
        files: {
            [name]: {
                content: text,
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

//Code to delete Gists on GitHub
export async function deleteGist(gistId: string|undefined): Promise<void> {
    const session = await AuthService.getGitHubSession(); 
    try {
        await axios.delete(`https://api.github.com/gists/${gistId}`, {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
        });
        vscode.window.showInformationMessage(`Gist ${gistId} deleted successfully.`);
    } catch (error: any) {
        vscode.window.showErrorMessage(
            `Error deleting gist: ${error?.response?.data?.message || error.message || "Unknown error"}`
        );
    }
}

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

export function editSnippet(context: vscode.ExtensionContext, snippet: Snippet, snippetsProvider: SnippetsProvider) {	
	if (snippet.resolveSyntax === undefined) {
		// 3.1 update: disable syntax resolving by default if property is not yet defined in JSON
		snippet.resolveSyntax = false;
	}
	// Create and show a new webview for editing snippet
	new EditSnippet(context, snippet, snippetsProvider);
}

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