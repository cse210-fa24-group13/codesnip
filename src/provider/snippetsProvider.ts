import * as vscode from 'vscode';
import * as path from 'path';
import { Snippet } from '../interface/snippet';
import { CommandsConsts } from '../config/commands';
import { SnippetService } from '../service/snippetService';
import { Labels } from '../config/labels';

/**
 * Provides snippets for the editor and manages drag-and-drop functionality.
 * Implements {@link vscode.TreeDataProvider} and {@link vscode.TreeDragAndDropController} for snippet data and interaction.
 */
export class SnippetsProvider implements vscode.TreeDataProvider<Snippet>, vscode.TreeDragAndDropController<Snippet> {
    
    /** A function that can be set externally to handle UI updates or events. */
    public fn: () => void;

    /**
     * Creates an instance of {@link SnippetsProvider} with the given snippet service and language configuration.
     * @param _snippetService The {@link SnippetService} instance for managing snippets.
     * @param _languagesConfig An array of language configurations for handling snippets.
     */
    constructor(private _snippetService: SnippetService, private _languagesConfig: any[]) {
        // Initially setting fn to an empty function
        this.fn = () => {};
    }

    /**
     * Sets a function to handle UI updates or events, typically passed from other parts of the extension.
     * @param fn The function to set for handling UI updates or events.
     */
    setUIFunction(fn: () => void): void {
        this.fn = fn;
    }

    /** 
     * The MIME types supported for drop operations in the snippets provider.
     * This is used when other items are dropped onto the provider.
     */
    dropMimeTypes: readonly string[] = ['application/vnd.code.tree.snippetsProvider'];

    /** 
     * The MIME types supported for drag operations in the snippets provider.
     * This is used when snippets are dragged from the provider.
     */
    dragMimeTypes: readonly string[] = ['text/uri-list'];

    /**
     * Handles the drag event and sets the necessary MIME type data on the dataTransfer object.
     * @param source The list of {@link Snippet} objects being dragged.
     * @param dataTransfer The {@link vscode.DataTransfer} object that holds the data being transferred during the drag.
     * @param token A {@link vscode.CancellationToken} to signal when the operation should be canceled.
     * @returns A promise that resolves when the drag operation is complete, or void if no additional action is needed.
     */
    handleDrag?(source: readonly Snippet[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
        // Set the dragged snippets on the dataTransfer object with the appropriate MIME type
        dataTransfer.set('application/vnd.code.tree.snippetsProvider', new vscode.DataTransferItem(source));
    }

    /**
 * Handles the drop event for the snippets provider, managing how snippets are moved within the tree structure.
 * 
 * This method is invoked when a user drops a snippet onto another snippet or folder.
 * It validates the drop action, handles moving snippets, and ensures that folder hierarchy constraints are respected.
 * 
 * @param target The target snippet or folder where the snippet is being dropped. If undefined, the root of the tree is considered.
 * @param dataTransfer The {@link vscode.DataTransfer} object containing the dragged data (snippets).
 * @param token A {@link vscode.CancellationToken} to cancel the operation if needed.
 * 
 * @returns A promise that resolves when the drop operation is completed or void if no action is taken.
 */
    handleDrop?(target: Snippet | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void | Thenable<void> {
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
                    if (targetParentResult?.id === transferSnippet.id) {
                        // skip operation
                        return;
                    } else if (targetParentResult) {
                        targetParent = targetParentResult;
                    } else {
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

    /**
     * Returns the {@link vscode.TreeItem} representation of the given snippet.
     * 
     * This method is used by the TreeDataProvider to convert a snippet into a tree item that can be displayed in the VSCode Tree view.
     * 
     * @param element The snippet that should be converted into a tree item.
     * @returns The {@link vscode.TreeItem} representation of the snippet.
     */
    getTreeItem(element: Snippet): vscode.TreeItem {
        return this.snippetToTreeItem(element);
    }

    /**
     * Returns the children of the given snippet, or the root-level snippets if no element is provided.
     * 
     * This method is used by the TreeDataProvider to load the children of a snippet when expanding a node in the VSCode Tree view.
     * If no snippet is provided, the root-level snippets will be returned.
     * 
     * @param element The snippet whose children should be loaded. If not provided, the root snippets will be returned.
     * @returns A promise that resolves to an array of {@link Snippet} objects, representing the children of the provided snippet or the root snippets.
     */
    getChildren(element?: Snippet): Thenable<Snippet[]> {
        if (element) {
            return Promise.resolve(element.children);
        } else {
            return Promise.resolve(this._snippetService.getRootChildren());
        }
    }

    /**
     * Event emitter that notifies the TreeDataProvider of changes to the tree data.
     * 
     * This emitter is used to notify the tree view to update whenever the data changes, such as when a snippet is added or removed.
     */
    private _onDidChangeTreeData: vscode.EventEmitter<Snippet | undefined | null | void> = new vscode.EventEmitter<Snippet | undefined | null | void>();

    /**
     * Event that is fired when the tree data changes.
     * 
     * This event is used to trigger an update of the tree view in VSCode when the data changes, such as after adding, removing, or updating a snippet.
     */
    readonly onDidChangeTreeData: vscode.Event<Snippet | undefined | null | void> = this._onDidChangeTreeData.event;

    /**
     * Refreshes the tree data by calling the refresh method of the snippet service and firing the change event.
     * 
     * This method updates the tree view to reflect any changes that may have occurred in the snippet data.
     * It is typically called when data in the snippet service is updated or refreshed.
     */
     // only read from data file
    refresh(): void {
        this._snippetService.refresh();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Saves the current state of snippets and then refreshes the tree data.
     * 
     * This method first persists the current snippets state by saving it through the snippet service, 
     * then it refreshes the tree view by calling the `refresh` method. If a callback function is provided,
     * it is executed after the sync operation.
     */
    // save state of snippets, then refresh
    sync(): void {
        this._snippetService.saveSnippets();
        this.refresh();
        if (this.fn) {
            this.fn();
        }
    }
/**
 * Adds a new snippet to the snippet service, optionally associating it with a parent and providing metadata such as a description and language extension.
 * 
 * This method first determines the file extension from the snippet name and attempts to match it with a language configuration.
 * If a matching language is found, it updates the language extension and removes the file extension from the snippet name.
 * The snippet is then added to the snippet service with a unique ID, and the state is synchronized.
 * 
 * @param name The name of the snippet, which may include a file extension.
 * @param snippet The content of the snippet.
 * @param parentId The ID of the parent snippet or folder.
 * @param description An optional description for the snippet.
 * @param languageExt An optional language extension to associate with the snippet.
 * @param gistId An optional Gist ID for the snippet, if it was shared through GitHub Gist.
 */
    addSnippet(name: string, snippet: string, parentId: number, description?: string, languageExt?: string, gistId?: string) {
        let lastId = this._snippetService.incrementLastId();

        let extStartPoint = name.lastIndexOf("\.");
        if (extStartPoint > 0 && extStartPoint < (name.length-1)) {
            let extension = name.slice(extStartPoint);
            let language = this._languagesConfig.find(l => l.extension === extension);
            if (language) {
                languageExt = language.extension;
                name = name.substring(0, extStartPoint);
            }
        }

        this._snippetService.addSnippet(
            {
                id: lastId,
                parentId: parentId,
                label: name,
                value: snippet,
                description: description,
                language: languageExt,
                children: [],
                gistid: gistId,
            }
        );
        this.sync();
    }

    /**
 * Adds a new folder for snippets to the snippet service, associating it with a parent and optionally providing an icon.
 * 
 * This method generates a new unique ID for the folder, then adds the folder to the snippet service with the given name, parent ID,
 * and optional icon. The state is then synchronized to reflect the new folder.
 * 
 * @param name The name of the folder to be added.
 * @param parentId The ID of the parent snippet or folder to which this new folder will belong.
 * @param icon An optional icon to associate with the folder, which can be displayed in the UI.
 * @returns The unique ID assigned to the newly created folder.
 */
    addSnippetFolder(name: string, parentId: number, icon?: string) {
        let lastId = this._snippetService.incrementLastId();

        this._snippetService.addSnippet(
            {
                id: lastId,
                parentId: parentId,
                label: name,
                folder: true,
                icon: icon,
                children: []
            }
        );
        this.sync();
        return lastId;
    }

        /**
     * Edits an existing snippet by updating its information in the snippet service and synchronizing the state.
     * 
     * This method updates the snippet with the provided data and ensures that the state is refreshed.
     * 
     * @param snippet The snippet to be updated.
     */
    editSnippet(snippet: Snippet) {
        this._snippetService.updateSnippet(snippet);
        this.sync();
    }

    /**
     * Edits an existing snippet folder by updating its information in the snippet service and synchronizing the state.
     * 
     * This method updates the snippet folder with the provided data and ensures that the state is refreshed.
     * 
     * @param snippet The snippet folder to be updated.
     */
    editSnippetFolder(snippet: Snippet) {
        this._snippetService.updateSnippet(snippet);
        this.sync();
    }

    /**
     * Removes a snippet from the snippet service and synchronizes the state.
     * 
     * This method deletes the snippet and updates the state to reflect the removal.
     * 
     * @param snippet The snippet to be removed.
     */
    removeSnippet(snippet: Snippet) {
        this._snippetService.removeSnippet(snippet);
        this.sync();
    }

    /**
     * Moves a snippet up in the list of snippets by adjusting its position and synchronizing the state.
     * 
     * This method changes the position of the snippet by one step upwards and ensures that the state is updated.
     * 
     * @param snippet The snippet to be moved up.
     */
    moveSnippetUp(snippet: Snippet) {
        this._snippetService.moveSnippet(snippet, -1);
        this.sync();
    }

    /**
     * Moves a snippet down in the list of snippets by adjusting its position and synchronizing the state.
     * 
     * This method changes the position of the snippet by one step downwards and ensures that the state is updated.
     * 
     * @param snippet The snippet to be moved down.
     */
    moveSnippetDown(snippet: Snippet) {
        this._snippetService.moveSnippet(snippet, 1);
        this.sync();
    }

    /**
     * Sorts the snippets in a specific folder or category and synchronizes the state.
     * 
     * This method organizes the snippets in a desired order within their category and ensures the state is refreshed.
     * 
     * @param snippet The folder or category containing the snippets to be sorted.
     */
    sortSnippets(snippet: Snippet) {
        this._snippetService.sortSnippets(snippet);
        this.sync();
    }

    /**
     * Sorts all snippets across all folders or categories and synchronizes the state.
     * 
     * This method organizes all snippets globally within the application and updates the state accordingly.
     */
    sortAllSnippets() {        
        this._snippetService.sortAllSnippets();
        this.sync();
    }

    /**
 * Converts a snippet object into a `TreeItem` for display in a VS Code tree view.
 * 
 * This method creates a `TreeItem` for a given snippet, setting its label, icon, and context value depending on whether it's a snippet or a snippet folder. 
 * It also adds additional information such as tooltips, commands, and contextual actions like reordering if applicable.
 * 
 * @param snippet The snippet object to convert into a `TreeItem`.
 * @returns A `vscode.TreeItem` that represents the snippet in the tree view.
 */
    private snippetToTreeItem(snippet: Snippet): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(
            snippet.label + (snippet.language ? snippet.language : ''),
            snippet.folder && snippet.folder === true
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );
        // dynamic context value depending on item type (snippet or snippet folder)
        // context value is used in view/item/context in 'when' condition
        if (snippet.folder && snippet.folder === true) {
            treeItem.contextValue = 'snippetFolder';
            if (snippet.icon) {
                treeItem.iconPath = new vscode.ThemeIcon(snippet.icon);
            } else {
                treeItem.iconPath = vscode.ThemeIcon.Folder;
            }
        } else {
            treeItem.tooltip = snippet.description ? `(${snippet.description})\n${snippet.value}` : `${snippet.value}`;
            treeItem.contextValue = 'snippet';
            treeItem.iconPath = vscode.ThemeIcon.File;
            treeItem.description = snippet.prefix;
            if (snippet.language) {
                treeItem.resourceUri = vscode.Uri.parse(`_${snippet.language}`);
            }
            // conditional in configuration
            treeItem.command = {
                command: CommandsConsts.commonOpenSnippet,
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
                } else if (index === 0) {
                    treeItem.contextValue = `${treeItem.contextValue}:down`;
                } else if (index === childrenCount - 1) {
                    treeItem.contextValue = `${treeItem.contextValue}:up`;
                }
            }
        }
        return treeItem;
    }

    /**
     * Exports the snippets to a specified destination path.
     * 
     * This method exports all snippets, starting from the root parent, to a given destination path.
     * After exporting, it calls the `sync()` method to ensure the snippets' state is updated.
     * 
     * @param destinationPath The path where the snippets should be exported.
     */
    exportSnippets(destinationPath: string) {
        this._snippetService.exportSnippets(destinationPath, Snippet.rootParentId);
        this.sync();
    }

    /**
     * Imports snippets from a specified source path.
     * 
     * This method imports snippets from a given destination path and returns whether the import was successful. 
     * It checks if the root element has children after the import, returning true if there are children.
     * After importing, it calls the `sync()` method to update the snippets' state.
     * 
     * @param destinationPath The path from which to import snippets.
     * @returns A boolean indicating whether the import was successful (i.e., if the root element has children after import).
     */
    importSnippets(destinationPath: string): boolean {
        this._snippetService.importSnippets(destinationPath);
        this.sync();
        const parentElt = this._snippetService.getParent(undefined);
        return parentElt !== undefined && parentElt.children!== undefined && parentElt.children.length > 0;
    }

    /**
     * Fixes the last used snippet ID.
     * 
     * This method ensures that the last ID used for a snippet is fixed by calling the `fixLastId` method on the snippet service.
     */
    fixLastId(): void {
        this._snippetService.fixLastId();
    }
    /**
     * Fixes corrupted and duplicate snippets within the system.
     * 
     * This method performs the following operations:
     * 1. Fixes the last used snippet ID.
     * 2. Identifies and fixes corrupted snippets with duplicate IDs by overriding their IDs.
     * 3. Moves non-folder snippets (with children) into a newly created folder and fixes their parent-child relationships.
     * 4. Synchronizes the system state after fixing duplicates and corrupted snippets.
     * 
     * @returns An array containing two numbers: the count of fixed duplicate snippets and the count of corrupted snippets.
     */
    fixSnippets() : number[] {
        let duplicateCount = 0;
        let corruptedCount = 0;
        // fix last id
        this._snippetService.fixLastId();
        let snippets = this._snippetService.getAllSnippetsAndFolders();
        // get all folders ids
        var idsSet = snippets.map(s => s.id);
        var duplicateIds = idsSet.filter((item, idx) =>  idsSet.indexOf(item) !== idx);

        for (const duplicateId of duplicateIds) {
            // get snippets with duplicate id and no children
            // test on children count instead of folder property as the latter may be undefined (that's the root cause)
            let corruptedSnippets = snippets.filter(s=>s.id === duplicateId && s.children.length === 0);
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
        var nonFolderSnippets = 
            this._snippetService.getAllSnippetsAndFolders().filter(s=> !s.folder && s.children.length > 0);
        
        if (nonFolderSnippets.length > 0) {
            // create folder for extracted snippets
            const folderId = this.addSnippetFolder(Labels.troubleshootFolder, Snippet.rootParentId, 'warning');
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
                let unorganizedSnippets: Snippet[] = [];
                SnippetService.flattenAndKeepFolders(targetFolder.children, unorganizedSnippets);
                for (const s of unorganizedSnippets.filter(s=>s.children.length === 0)) {
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