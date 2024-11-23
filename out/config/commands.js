"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonAddSnippet = commonAddSnippet;
exports.addSnippet = addSnippet;
exports.commonAddSnippetFromClipboard = commonAddSnippetFromClipboard;
exports.addSnippetFromClipboard = addSnippetFromClipboard;
exports.commonAddSnippetFolder = commonAddSnippetFolder;
exports.addSnippetFolder = addSnippetFolder;
exports.editSnippet = editSnippet;
exports.exportSnippets = exportSnippets;
exports.importSnippets = importSnippets;
exports.fixSnippets = fixSnippets;
const vscode = require("vscode");
const snippet_1 = require("../interface/snippet");
const uiUtility_1 = require("../utility/uiUtility");
const editSnippet_1 = require("../views/editSnippet");
const stringUtility_1 = require("../utility/stringUtility");
function commonAddSnippet(allLanguages, snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable) {
    return __awaiter(this, void 0, void 0, function* () {
        var text;
        var languageExt = '';
        const editor = vscode.window.activeTextEditor;
        // if no editor is open or editor has no text, get value from user
        if (!editor || editor.document.getText(editor.selection) === "") {
            // get snippet name
            text = yield uiUtility_1.UIUtility.requestSnippetValue();
            if (!text || text.length === 0) {
                return;
            }
        }
        else {
            text = editor.document.getText(editor.selection);
            let language = allLanguages.find(l => l.id === editor.document.languageId);
            // if language is different than plaintext
            if (language && language.id !== 'plaintext') {
                languageExt = language.extension;
            }
            if (text.length === 0) {
                vscode.window.showWarningMessage("No text was selected from active editor." /* Labels.noTextSelected */);
                return;
            }
        }
        // get snippet name
        const name = yield uiUtility_1.UIUtility.requestSnippetName();
        if (name === undefined || name === "") {
            vscode.window.showWarningMessage("Snippet must have a non-empty name." /* Labels.snippetNameErrorMsg */);
            return;
        }
        if (text === undefined || text === "") {
            vscode.window.showWarningMessage("Snippet must have a non-empty value." /* Labels.snippetValueErrorMsg */);
            return;
        }
        // request where to save snippets if ws is available
        if (workspaceSnippetsAvailable) {
            const targetView = yield uiUtility_1.UIUtility.requestTargetSnippetsView();
            // no value chosen
            if (!targetView) {
                vscode.window.showWarningMessage("No target was selected for new Snippet." /* Labels.noViewTypeSelected */);
            }
            else if (targetView === "Global Snippets" /* Labels.globalSnippets */) {
                snippetsProvider.addSnippet(name, text, snippet_1.Snippet.rootParentId, languageExt);
            }
            else if (targetView === "Workspace Snippets" /* Labels.wsSnippets */) {
                wsSnippetsProvider.addSnippet(name, text, snippet_1.Snippet.rootParentId, languageExt);
            }
        }
        else {
            snippetsProvider.addSnippet(name, text, snippet_1.Snippet.rootParentId, languageExt);
        }
    });
}
function addSnippet(allLanguages, snippetsExplorer, snippetsProvider, node) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        var text;
        var languageExt = '';
        const editor = vscode.window.activeTextEditor;
        // if no editor is open or editor has no text, get value from user
        if (!editor || editor.document.getText(editor.selection) === "") {
            // get snippet name
            text = yield uiUtility_1.UIUtility.requestSnippetValue();
            if (!text || text.length === 0) {
                return;
            }
        }
        else {
            text = editor.document.getText(editor.selection);
            let language = allLanguages.find(l => l.id === editor.document.languageId);
            // if language is different than plaintext
            if (language && language.id !== 'plaintext') {
                languageExt = language.extension;
            }
            if (text.length === 0) {
                vscode.window.showWarningMessage("No text was selected from active editor." /* Labels.noTextSelected */);
                return;
            }
        }
        // get snippet name
        const name = yield uiUtility_1.UIUtility.requestSnippetName();
        if (name === undefined || name === "") {
            vscode.window.showWarningMessage("Snippet must have a non-empty name." /* Labels.snippetNameErrorMsg */);
            return;
        }
        if (text === undefined || text === "") {
            vscode.window.showWarningMessage("Snippet must have a non-empty value." /* Labels.snippetValueErrorMsg */);
            return;
        }
        // When triggering the command with right-click the parameter node of type Tree Node will be tested.
        // When the command is invoked via the menu popup, this node will be the highlighted node, and not the selected node, the latter will undefined.
        if (snippetsExplorer.selection.length === 0 && !node) {
            snippetsProvider.addSnippet(name, text, snippet_1.Snippet.rootParentId, languageExt);
        }
        else {
            const selectedItem = node ? node : snippetsExplorer.selection[0];
            if (selectedItem.folder && selectedItem.folder === true) {
                snippetsProvider.addSnippet(name, text, selectedItem.id, languageExt);
            }
            else {
                snippetsProvider.addSnippet(name, text, (_a = selectedItem.parentId) !== null && _a !== void 0 ? _a : snippet_1.Snippet.rootParentId, languageExt);
            }
        }
    });
}
function commonAddSnippetFromClipboard(snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable) {
    return __awaiter(this, void 0, void 0, function* () {
        let clipboardContent = yield vscode.env.clipboard.readText();
        if (!clipboardContent || clipboardContent.trim() === "") {
            vscode.window.showWarningMessage("No content was found in the clipboard." /* Labels.noClipboardContent */);
            return;
        }
        // get snippet name
        const name = yield uiUtility_1.UIUtility.requestSnippetName();
        if (name === undefined || name === "") {
            vscode.window.showWarningMessage("Snippet must have a non-empty name." /* Labels.snippetNameErrorMsg */);
            return;
        }
        // request where to save snippets if ws is available
        if (workspaceSnippetsAvailable) {
            const targetView = yield uiUtility_1.UIUtility.requestTargetSnippetsView();
            // no value chosen
            if (!targetView) {
                vscode.window.showWarningMessage("No target was selected for new Snippet." /* Labels.noViewTypeSelected */);
            }
            else if (targetView === "Global Snippets" /* Labels.globalSnippets */) {
                snippetsProvider.addSnippet(name, clipboardContent, snippet_1.Snippet.rootParentId);
            }
            else if (targetView === "Workspace Snippets" /* Labels.wsSnippets */) {
                wsSnippetsProvider.addSnippet(name, clipboardContent, snippet_1.Snippet.rootParentId);
            }
        }
        else {
            snippetsProvider.addSnippet(name, clipboardContent, snippet_1.Snippet.rootParentId);
        }
    });
}
function addSnippetFromClipboard(snippetsExplorer, snippetsProvider, node) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        let clipboardContent = yield vscode.env.clipboard.readText();
        if (!clipboardContent || clipboardContent.trim() === "") {
            vscode.window.showWarningMessage("No content was found in the clipboard." /* Labels.noClipboardContent */);
            return;
        }
        // get snippet name
        const name = yield uiUtility_1.UIUtility.requestSnippetName();
        if (name === undefined || name === "") {
            vscode.window.showWarningMessage("Snippet must have a non-empty name." /* Labels.snippetNameErrorMsg */);
            return;
        }
        // When triggering the command with right-click the parameter node of type Tree Node will be tested.
        // When the command is invoked via the menu popup, this node will be the highlighted node, and not the selected node, the latter will undefined.
        if (snippetsExplorer.selection.length === 0 && !node) {
            snippetsProvider.addSnippet(name, clipboardContent, snippet_1.Snippet.rootParentId);
        }
        else {
            const selectedItem = node ? node : snippetsExplorer.selection[0];
            if (selectedItem.folder && selectedItem.folder === true) {
                snippetsProvider.addSnippet(name, clipboardContent, selectedItem.id);
            }
            else {
                snippetsProvider.addSnippet(name, clipboardContent, (_a = selectedItem.parentId) !== null && _a !== void 0 ? _a : snippet_1.Snippet.rootParentId);
            }
        }
    });
}
function commonAddSnippetFolder(snippetsProvider, wsSnippetsProvider, workspaceSnippetsAvailable) {
    return __awaiter(this, void 0, void 0, function* () {
        // get snippet name
        const name = yield uiUtility_1.UIUtility.requestSnippetFolderName();
        if (name === undefined || name === "") {
            vscode.window.showWarningMessage("Snippet folder must have a non-empty name." /* Labels.snippetFolderNameErrorMsg */);
            return;
        }
        // request where to save snippets if ws is available
        if (workspaceSnippetsAvailable) {
            const targetView = yield uiUtility_1.UIUtility.requestTargetSnippetsView();
            // no value chosen
            if (!targetView) {
                vscode.window.showWarningMessage("No target was selected for new Snippet." /* Labels.noViewTypeSelected */);
            }
            else if (targetView === "Global Snippets" /* Labels.globalSnippets */) {
                snippetsProvider.addSnippetFolder(name, snippet_1.Snippet.rootParentId);
            }
            else if (targetView === "Workspace Snippets" /* Labels.wsSnippets */) {
                wsSnippetsProvider.addSnippetFolder(name, snippet_1.Snippet.rootParentId);
            }
        }
        else {
            snippetsProvider.addSnippetFolder(name, snippet_1.Snippet.rootParentId);
        }
    });
}
function addSnippetFolder(snippetsExplorer, snippetsProvider, node) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // get snippet name
        const name = yield uiUtility_1.UIUtility.requestSnippetFolderName();
        if (name === undefined || name === "") {
            vscode.window.showWarningMessage("Snippet folder must have a non-empty name." /* Labels.snippetFolderNameErrorMsg */);
            return;
        }
        // When triggering the command with right-click the parameter node of type Tree Node will be tested.
        // When the command is invoked via the menu popup, this node will be the highlighted node, and not the selected node, the latter will undefined.
        if (snippetsExplorer.selection.length === 0 && !node) {
            snippetsProvider.addSnippetFolder(name, snippet_1.Snippet.rootParentId);
        }
        else {
            const selectedItem = node ? node : snippetsExplorer.selection[0];
            if (selectedItem.folder && selectedItem.folder === true) {
                snippetsProvider.addSnippetFolder(name, selectedItem.id);
            }
            else {
                snippetsProvider.addSnippetFolder(name, (_a = selectedItem.parentId) !== null && _a !== void 0 ? _a : snippet_1.Snippet.rootParentId);
            }
        }
    });
}
function editSnippet(context, snippet, snippetsProvider) {
    if (snippet.resolveSyntax === undefined) {
        // 3.1 update: disable syntax resolving by default if property is not yet defined in JSON
        snippet.resolveSyntax = false;
    }
    // Create and show a new webview for editing snippet
    new editSnippet_1.EditSnippet(context, snippet, snippetsProvider);
}
function exportSnippets(snippetsProvider) {
    return __awaiter(this, void 0, void 0, function* () {
        // get snippet destination
        vscode.window.showSaveDialog({
            filters: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'JSON': ['json']
            },
            title: 'Export Snippets',
            saveLabel: 'Export'
        }).then(fileUri => {
            if (fileUri && fileUri.fsPath) {
                snippetsProvider.exportSnippets(fileUri.fsPath);
            }
        });
    });
}
function importSnippets(snippetsProvider) {
    return __awaiter(this, void 0, void 0, function* () {
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
                vscode.window.showWarningMessage("All your global snippets will be replaced with the imported ones (except for workspace snippets)! Do you want to proceed ? (A backup file of your snippets will be saved in case of a rollback)." /* Labels.snippetImportRequestConfirmation */, ...["Import data" /* Labels.importSnippets */, "Discard import" /* Labels.discardImport */])
                    .then(selection => {
                    switch (selection) {
                        case "Import data" /* Labels.importSnippets */:
                            if (snippetsProvider.importSnippets(fileUris[0].fsPath)) {
                                snippetsProvider.fixLastId();
                                vscode.window.showInformationMessage("Snippets imported. Kept a backup of old snippets next to the imported file in case of a rollback." /* Labels.snippetsImported */);
                            }
                            else {
                                vscode.window.showErrorMessage("Snippets weren't imported. Please check the file content or redo a proper export/import (A copy of your old snippets was saved next to the recently imported file)" /* Labels.snippetsNotImported */);
                            }
                        case "Discard import" /* Labels.discardImport */:
                            break;
                    }
                });
            }
        });
    });
}
function fixSnippets(snippetsProvider) {
    return __awaiter(this, void 0, void 0, function* () {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            cancellable: false,
            title: 'Scanning Snippets'
        }, (progress) => __awaiter(this, void 0, void 0, function* () {
            progress.report({ increment: 0 });
            vscode.window
                .showInformationMessage("This will scan your snippets and fix any issues with them, it may change your data structure (not their content). A backup is always recommended." /* Labels.troubleshootConfirmation */, "Proceed" /* Labels.troubleshootProceed */, "Cancel" /* Labels.troubleshootCancel */)
                .then(answer => {
                if (answer === "Proceed" /* Labels.troubleshootProceed */) {
                    let results = snippetsProvider.fixSnippets();
                    vscode.window.showInformationMessage((results[0] > 0 || results[1] > 0)
                        ? "Troubleshooting done !" /* Labels.troubleshootResultsDone */ + ' '
                            + (results[0] > 0 ? stringUtility_1.StringUtility.formatString("Cleaned {0} duplicate IDs." /* Labels.troubleshootResultsDuplicate */, results[0].toString()) : '')
                            + (results[1] > 0 ? (' ' + stringUtility_1.StringUtility.formatString("Moved {0} corrupted snippets to special folder (check last folder in your list)." /* Labels.troubleshootResultsCorrupted */, results[1].toString())) : '')
                        : "Troubleshooting done ! Nothing wrong with your snippets \u2714" /* Labels.troubleshootResultsOk */);
                }
            });
            progress.report({ increment: 100 });
        }));
    });
}
//# sourceMappingURL=commands.js.map