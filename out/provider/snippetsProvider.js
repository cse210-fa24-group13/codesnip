"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippetsProvider = void 0;
const vscode = require("vscode");
const snippet_1 = require("../interface/snippet");
const snippetService_1 = require("../service/snippetService");
class SnippetsProvider {
    constructor(_snippetService, _languagesConfig) {
        this._snippetService = _snippetService;
        this._languagesConfig = _languagesConfig;
        this.dropMimeTypes = ['application/vnd.code.tree.snippetsProvider'];
        this.dragMimeTypes = ['text/uri-list'];
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    handleDrag(source, dataTransfer, token) {
        dataTransfer.set('application/vnd.code.tree.snippetsProvider', new vscode.DataTransferItem(source));
    }
    handleDrop(target, dataTransfer, token) {
        const transferItem = dataTransfer.get('application/vnd.code.tree.snippetsProvider');
        // if target is undefined, that's root of tree
        if (!target) {
            target = this._snippetService.getParent(undefined);
        }
        // skip if :
        // - source is undefined
        // - target is undefined
        // - source = target
        // skip if source or target are undefined or source = target
        if (!transferItem || transferItem.value.length === 0 || !target || transferItem.value[0].id === target.id) {
            return;
        }
        const transferSnippet = transferItem.value[0];
        // if target is root of tree or target is folder, move child inside it directly
        // skip if target is already source parent
        if (target.parentId === -1 || (target.folder && target.id !== transferSnippet.parentId)) {
            // in case of moving folder to folder, don't allow moving parent folder inside child folder
            if (target.folder && transferSnippet.folder) {
                let targetInsideSource = false;
                // potential child folder
                let targetParent = target;
                while (targetParent.parentId && targetParent.parentId > -1 || !targetInsideSource) {
                    const targetParentResult = this._snippetService.getParent(targetParent.parentId);
                    if ((targetParentResult === null || targetParentResult === void 0 ? void 0 : targetParentResult.id) === transferSnippet.id) {
                        // skip operation
                        return;
                    }
                    else if (targetParentResult) {
                        targetParent = targetParentResult;
                    }
                    else {
                        break;
                    }
                }
            }
            // all good ? proceed with moving snippet to target folder
            // basically, remove it from original place and add it to the new place
            // temp delay, to be changed by concrete concurrency treatment
            // this._snippetService.getAllSnippetsAndFolders();
            this._snippetService.removeSnippet(transferSnippet);
            // compared to normal addSnippet, we don't bump up lastId here 
            // as we need to only move item and not create new one
            // --> only update parentId
            transferSnippet.parentId = target.id;
            this._snippetService.addExistingSnippet(transferSnippet);
        }
        this.sync();
    }
    getTreeItem(element) {
        return this.snippetToTreeItem(element);
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve(element.children);
        }
        else {
            return Promise.resolve(this._snippetService.getRootChildren());
        }
    }
    // only read from data file
    refresh() {
        this._snippetService.refresh();
        this._onDidChangeTreeData.fire();
    }
    // save state of snippets, then refresh
    sync() {
        this._snippetService.saveSnippets();
        this.refresh();
    }
    addSnippet(name, snippet, parentId, languageExt) {
        let lastId = this._snippetService.incrementLastId();
        let extStartPoint = name.lastIndexOf("\.");
        if (extStartPoint > 0 && extStartPoint < (name.length - 1)) {
            let extension = name.slice(extStartPoint);
            let language = this._languagesConfig.find(l => l.extension === extension);
            if (language) {
                languageExt = language.extension;
                name = name.substring(0, extStartPoint);
            }
        }
        this._snippetService.addSnippet({
            id: lastId,
            parentId: parentId,
            label: name,
            value: snippet,
            language: languageExt,
            children: []
        });
        this.sync();
    }
    addSnippetFolder(name, parentId, icon) {
        let lastId = this._snippetService.incrementLastId();
        this._snippetService.addSnippet({
            id: lastId,
            parentId: parentId,
            label: name,
            folder: true,
            icon: icon,
            children: []
        });
        this.sync();
        return lastId;
    }
    editSnippet(snippet) {
        this._snippetService.updateSnippet(snippet);
        this.sync();
    }
    editSnippetFolder(snippet) {
        this._snippetService.updateSnippet(snippet);
        this.sync();
    }
    removeSnippet(snippet) {
        this._snippetService.removeSnippet(snippet);
        this.sync();
    }
    moveSnippetUp(snippet) {
        this._snippetService.moveSnippet(snippet, -1);
        this.sync();
    }
    moveSnippetDown(snippet) {
        this._snippetService.moveSnippet(snippet, 1);
        this.sync();
    }
    sortSnippets(snippet) {
        this._snippetService.sortSnippets(snippet);
        this.sync();
    }
    sortAllSnippets() {
        this._snippetService.sortAllSnippets();
        this.sync();
    }
    snippetToTreeItem(snippet) {
        let treeItem = new vscode.TreeItem(snippet.label + (snippet.language ? snippet.language : ''), snippet.folder && snippet.folder === true
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None);
        // dynamic context value depending on item type (snippet or snippet folder)
        // context value is used in view/item/context in 'when' condition
        if (snippet.folder && snippet.folder === true) {
            treeItem.contextValue = 'snippetFolder';
            if (snippet.icon) {
                treeItem.iconPath = new vscode.ThemeIcon(snippet.icon);
            }
            else {
                treeItem.iconPath = vscode.ThemeIcon.Folder;
            }
        }
        else {
            treeItem.tooltip = snippet.description ? `(${snippet.description})\n${snippet.value}` : `${snippet.value}`;
            treeItem.contextValue = 'snippet';
            treeItem.iconPath = vscode.ThemeIcon.File;
            treeItem.description = snippet.prefix;
            if (snippet.language) {
                treeItem.resourceUri = vscode.Uri.parse(`_${snippet.language}`);
            }
            // conditional in configuration
            treeItem.command = {
                command: "globalSnippetsCmd.openSnippet" /* CommandsConsts.commonOpenSnippet */,
                arguments: [snippet],
                title: 'Open Snippet'
            };
        }
        // get parent element
        const parentElement = this._snippetService.getParent(snippet.parentId);
        if (parentElement) {
            const childrenCount = parentElement.children.length;
            // show order actions only if there is room for reorder
            if (childrenCount > 1) {
                const index = parentElement.children.findIndex((obj => obj.id === snippet.id));
                if (index > 0 && index < childrenCount - 1) {
                    treeItem.contextValue = `${treeItem.contextValue}:up&down`;
                }
                else if (index === 0) {
                    treeItem.contextValue = `${treeItem.contextValue}:down`;
                }
                else if (index === childrenCount - 1) {
                    treeItem.contextValue = `${treeItem.contextValue}:up`;
                }
            }
        }
        return treeItem;
    }
    exportSnippets(destinationPath) {
        this._snippetService.exportSnippets(destinationPath, snippet_1.Snippet.rootParentId);
        this.sync();
    }
    importSnippets(destinationPath) {
        this._snippetService.importSnippets(destinationPath);
        this.sync();
        const parentElt = this._snippetService.getParent(undefined);
        return parentElt !== undefined && parentElt.children !== undefined && parentElt.children.length > 0;
    }
    fixLastId() {
        this._snippetService.fixLastId();
    }
    fixSnippets() {
        let duplicateCount = 0;
        let corruptedCount = 0;
        // fix last id
        this._snippetService.fixLastId();
        let snippets = this._snippetService.getAllSnippetsAndFolders();
        // get all folders ids
        var idsSet = snippets.map(s => s.id);
        var duplicateIds = idsSet.filter((item, idx) => idsSet.indexOf(item) !== idx);
        for (const duplicateId of duplicateIds) {
            // get snippets with duplicate id and no children
            // test on children count instead of folder property as the latter may be undefined (that's the root cause)
            let corruptedSnippets = snippets.filter(s => s.id === duplicateId && s.children.length === 0);
            for (const cs of corruptedSnippets) {
                duplicateCount++;
                // increment last snippet Id
                this._snippetService.overrideSnippetId(cs);
            }
        }
        // sync duplicates
        if (duplicateCount > 0) {
            this.sync();
        }
        // extract snippets within non-folders snippets
        var nonFolderSnippets = this._snippetService.getAllSnippetsAndFolders().filter(s => !s.folder && s.children.length > 0);
        if (nonFolderSnippets.length > 0) {
            // create folder for extracted snippets
            const folderId = this.addSnippetFolder("UNORGANIZED SNIPPETS" /* Labels.troubleshootFolder */, snippet_1.Snippet.rootParentId, 'warning');
            snippets = this._snippetService.getAllSnippetsAndFolders();
            let targetFolder = snippets.find(s => s.id === folderId);
            if (targetFolder) {
                for (let snippet of nonFolderSnippets) {
                    while (snippet.children.length > 0) {
                        corruptedCount++;
                        // after removing an item, snippet.children gets reduced
                        let snippetChild = snippet.children.shift() || snippet.children[0];
                        // remove snippet from original place and add it to the new folder
                        this._snippetService.removeSnippet(snippetChild);
                        // compared to normal addSnippet, we don't bump up lastId here 
                        // as we need to only move item and not create new one
                        // => only update parentId
                        snippetChild.parentId = targetFolder.id;
                        this._snippetService.addExistingSnippet(snippetChild);
                    }
                }
                // fix duplicate ids
                let unorganizedSnippets = [];
                snippetService_1.SnippetService.flattenAndKeepFolders(targetFolder.children, unorganizedSnippets);
                for (const s of unorganizedSnippets.filter(s => s.children.length === 0)) {
                    // increment last snippet Id
                    this._snippetService.overrideSnippetId(s);
                }
            }
        }
        // sync corrupted
        if (corruptedCount > 0) {
            this.sync();
        }
        return new Array(duplicateCount, corruptedCount);
    }
}
exports.SnippetsProvider = SnippetsProvider;
//# sourceMappingURL=snippetsProvider.js.map