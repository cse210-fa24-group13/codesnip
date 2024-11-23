"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippetService = void 0;
const fileDataAccess_1 = require("../data/fileDataAccess");
const snippet_1 = require("../interface/snippet");
class SnippetService {
    constructor(_dataAccess) {
        this._dataAccess = _dataAccess;
        this._rootSnippet = this.loadSnippets();
    }
    // static utility methods
    static findParent(parentId, currentElt) {
        var i, currentChild, result;
        if (parentId === currentElt.id) {
            return currentElt;
        }
        else {
            // Use a for loop instead of forEach to avoid nested functions
            // Otherwise "return" will not work properly
            for (i = 0; i < currentElt.children.length; i++) {
                currentChild = currentElt.children[i];
                // Search in the current child
                result = this.findParent(parentId, currentChild);
                // Return the result if the node has been found
                if (result !== undefined) {
                    return result;
                }
            }
            // The node has not been found and we have no more options
            return undefined;
        }
    }
    /**
    * to be used like the following:
    * let result: any[] = [];
    * Snippet.flatten(snippetsProvider.snippets.children, result);
    * @param arr array of element
    * @param result final result
    */
    static flatten(arr, result = []) {
        for (let i = 0, length = arr.length; i < length; i++) {
            const value = arr[i];
            if (value.folder === true) {
                SnippetService.flatten(value.children, result);
            }
            else {
                result.push(value);
            }
        }
        return result;
    }
    static flattenAndKeepFolders(arr, result = []) {
        for (let i = 0, length = arr.length; i < length; i++) {
            const value = arr[i];
            if (value.folder === true) {
                result.push(value);
                SnippetService.flattenAndKeepFolders(value.children, result);
            }
            else {
                result.push(value);
            }
        }
        return result;
    }
    // private methods
    _reorderArray(arr, oldIndex, newIndex) {
        if (newIndex < arr.length) {
            arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
        }
    }
    _sortArray(arr) {
        arr.sort((a, b) => a.label.localeCompare(b.label));
    }
    _sortSnippetsAndChildren(snippets) {
        this._sortArray(snippets);
        snippets.forEach((s) => {
            if (s.folder && s.children.length > 0) {
                this._sortSnippetsAndChildren(s.children);
            }
        });
    }
    _updateLastId(newId) {
        this._rootSnippet.lastId = newId;
    }
    // public service methods
    refresh() {
        this._rootSnippet = this.loadSnippets();
    }
    loadSnippets() {
        return this._dataAccess.load();
    }
    saveSnippets() {
        this._dataAccess.save(this._rootSnippet);
    }
    fixLastId() {
        let snippetIds = this.getAllSnippetsAndFolders().map(s => s.id);
        const maxId = Math.max.apply(Math, snippetIds);
        if (this._rootSnippet.lastId && this._rootSnippet.lastId < maxId) {
            this._updateLastId(maxId);
        }
    }
    getRootChildren() {
        return this._rootSnippet.children;
    }
    getAllSnippets() {
        // sync snippets
        this._rootSnippet = this.loadSnippets();
        let snippets = [];
        SnippetService.flatten(this._rootSnippet.children, snippets);
        return snippets;
    }
    getAllSnippetsAndFolders() {
        // sync snippets
        this._rootSnippet = this.loadSnippets();
        let snippets = [];
        SnippetService.flattenAndKeepFolders(this._rootSnippet.children, snippets);
        return snippets;
    }
    incrementLastId() {
        var _a;
        return ((_a = this._rootSnippet.lastId) !== null && _a !== void 0 ? _a : 0) + 1;
    }
    getParent(parentId) {
        return SnippetService.findParent(parentId !== null && parentId !== void 0 ? parentId : snippet_1.Snippet.rootParentId, this._rootSnippet);
    }
    compact() {
        return JSON.stringify(this._rootSnippet);
    }
    // snippet management services
    addSnippet(newSnippet) {
        this.addExistingSnippet(newSnippet);
        this._updateLastId(newSnippet.id);
    }
    addExistingSnippet(newSnippet) {
        var _a, _b;
        newSnippet.parentId === snippet_1.Snippet.rootParentId
            ? this._rootSnippet.children.push(newSnippet)
            : (_b = SnippetService.findParent((_a = newSnippet.parentId) !== null && _a !== void 0 ? _a : snippet_1.Snippet.rootParentId, this._rootSnippet)) === null || _b === void 0 ? void 0 : _b.children.push(newSnippet);
    }
    updateSnippet(snippet) {
        var _a;
        const parentElement = SnippetService.findParent((_a = snippet.parentId) !== null && _a !== void 0 ? _a : snippet_1.Snippet.rootParentId, this._rootSnippet);
        if (parentElement) {
            const index = parentElement.children.findIndex((obj => obj.id === snippet.id));
            if (index > -1) {
                parentElement.children.map(obj => obj.id === snippet.id ? Object.assign(Object.assign({}, obj), { label: snippet.label, 
                    // if its a folder, don't update content, use old value instead
                    // if its a snippet, update its content
                    value: [snippet.folder ? obj.value : snippet.value] }) : obj);
            }
        }
    }
    overrideSnippetId(snippet) {
        let lastId = this.incrementLastId();
        snippet.id = lastId;
        this.updateSnippet(snippet);
        this._updateLastId(snippet.id);
    }
    removeSnippet(snippet) {
        var _a;
        const parentElement = SnippetService.findParent((_a = snippet.parentId) !== null && _a !== void 0 ? _a : snippet_1.Snippet.rootParentId, this._rootSnippet);
        if (parentElement) {
            const index = parentElement.children.findIndex((obj => obj.id === snippet.id));
            if (index > -1) {
                parentElement === null || parentElement === void 0 ? void 0 : parentElement.children.splice(index, 1);
            }
        }
    }
    moveSnippet(snippet, offset) {
        var _a;
        const parentElement = SnippetService.findParent((_a = snippet.parentId) !== null && _a !== void 0 ? _a : snippet_1.Snippet.rootParentId, this._rootSnippet);
        if (parentElement) {
            const index = parentElement.children.findIndex((obj => obj.id === snippet.id));
            if (index > -1 && parentElement.children) {
                this._reorderArray(parentElement.children, index, index + offset);
            }
        }
    }
    sortSnippets(snippet) {
        if (snippet.folder && snippet.children.length > 0) {
            this._sortArray(snippet.children);
        }
    }
    sortAllSnippets() {
        let snippet = this._rootSnippet;
        if (snippet.children.length > 0) {
            this._sortSnippetsAndChildren(snippet.children);
        }
    }
    exportSnippets(destinationPath, parentId) {
        const parentElement = SnippetService.findParent(parentId !== null && parentId !== void 0 ? parentId : snippet_1.Snippet.rootParentId, this._rootSnippet);
        if (parentElement) {
            // save file using destroyable instance of FileDataAccess
            new fileDataAccess_1.FileDataAccess(destinationPath).save(parentElement);
        }
    }
    importSnippets(destinationPath) {
        // save a backup version of current snippets next to the file to import
        this.exportSnippets(destinationPath.replace(fileDataAccess_1.FileDataAccess.dataFileExt, `_pre-import-bak${fileDataAccess_1.FileDataAccess.dataFileExt}`), snippet_1.Snippet.rootParentId);
        let newSnippets = new fileDataAccess_1.FileDataAccess(destinationPath).load();
        this._rootSnippet.children = newSnippets.children;
        this._rootSnippet.lastId = newSnippets.lastId;
    }
}
exports.SnippetService = SnippetService;
//# sourceMappingURL=snippetService.js.map