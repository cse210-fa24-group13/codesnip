import { commands, extensions } from "vscode";
import { DataAccess } from "../data/dataAccess";
import { FileDataAccess } from "../data/fileDataAccess";
import { Snippet } from "../interface/snippet";
import { updateGist,deleteGist,createSnippet } from '../config/commands';

/**
 * Service for managing snippets and interacting with data access.
 */
export class SnippetService {
    /** The root snippet object. */
    private _rootSnippet: Snippet;

    /**
     * Creates an instance of the SnippetService.
     * @param _dataAccess - The data access object used for loading and saving snippets.
     */
    constructor(private _dataAccess: DataAccess) {
        this._rootSnippet = this.loadSnippets();
    }

    // ** Static utility methods ** //

    /**
     * Recursively searches for the parent snippet by its ID in the given snippet tree.
     * @param parentId - The ID of the parent snippet to find.
     * @param currentElt - The current snippet being examined.
     * @returns The parent snippet if found, otherwise undefined.
     */
    static findParent(parentId: number, currentElt: Snippet): Snippet | undefined {
        var i, currentChild, result;

        // If the current snippet is the parent, return it
        if (parentId === currentElt.id) {
            return currentElt;
        } else {
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
    private static flatten(arr: any, result: any[] = []) {
        for (let i = 0, length = arr.length; i < length; i++) {
            const value = arr[i];
            if (value.folder === true) {
                SnippetService.flatten(value.children, result);
            } else {
                result.push(value);
            }
        }
        return result;
    }
    
    public static flattenAndKeepFolders(arr: any, result: any[] = []) {
        for (let i = 0, length = arr.length; i < length; i++) {
            const value = arr[i];
            if (value.folder === true) {
                result.push(value);
                SnippetService.flattenAndKeepFolders(value.children, result);
            } else {
                result.push(value);
            }
        }
        return result;
    }

    // private methods

    /**
     * Reorders the elements in the array by moving the element at `oldIndex` to `newIndex`.
     * @param arr - The array to reorder.
     * @param oldIndex - The current index of the element to move.
     * @param newIndex - The index where the element should be moved.
     */
    private _reorderArray(arr: Snippet[], oldIndex: number, newIndex: number) {
        if (newIndex < arr.length) {
            arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
        }
    }

    /**
     * Sorts the array of snippets in lexicographical order based on the `label` property.
     * @param arr - The array to sort.
     */
    private _sortArray(arr: Snippet[]) {
        arr.sort((a, b) => a.label.localeCompare(b.label));
    }

    /**
     * Recursively sorts the snippets and their children in lexicographical order based on the `label` property.
     * @param snippets - The array of snippets to sort, including nested children.
     */
    private _sortSnippetsAndChildren(snippets: Snippet[]) {
        this._sortArray(snippets);
        snippets.forEach((s) => {
            if (s.folder && s.children.length > 0) {
                this._sortSnippetsAndChildren(s.children);
            }
        });
    }

    /**
     * Updates the last used ID in the root snippet object.
     * @param newId - The new ID value to set as the last used ID.
     */
    private _updateLastId(newId: number): void {
        this._rootSnippet.lastId = newId;
    }

    
    // public service methods

    /**
     * Refreshes the root snippet by reloading it from the data source.
     */
    refresh(): void {
        this._rootSnippet = this.loadSnippets();
    }

    /**
     * Loads the snippets from the data source.
     * @returns The root snippet object.
     */
    loadSnippets(): Snippet {
        return this._dataAccess.load();
    }

    /**
     * Saves the current root snippet to the data source.
     */
    saveSnippets(): void {
        this._dataAccess.save(this._rootSnippet);
    }

    /**
     * Ensures that the `lastId` property in the root snippet is updated to the maximum ID found in all snippets.
     */
    fixLastId(): void{
        let snippetIds = this.getAllSnippetsAndFolders().map(s=>s.id);
        const maxId = Math.max.apply(Math, snippetIds);
        if (this._rootSnippet.lastId && this._rootSnippet.lastId < maxId) {
            this._updateLastId(maxId);
        }
    }

    /**
     * Retrieves the children of the root snippet.
     * @returns An array of snippet children.
     */
    getRootChildren(): Snippet[] {
        return this._rootSnippet.children;
    }

    /**
     * Retrieves all snippets (flattened) from the root snippet's children.
     * @returns An array of all snippets.
     */
    getAllSnippets(): Snippet[] {
        // sync snippets
        this._rootSnippet = this.loadSnippets();
        let snippets: Snippet[] = [];
        SnippetService.flatten(this._rootSnippet.children, snippets);
        return snippets;
    }

    /**
     * Retrieves all snippets and folders (flattened) from the root snippet's children.
     * @returns An array of all snippets and folders.
     */
    getAllSnippetsAndFolders(): Snippet[] {
        // sync snippets
        this._rootSnippet = this.loadSnippets();
        let snippets: Snippet[] = [];
        SnippetService.flattenAndKeepFolders(this._rootSnippet.children, snippets);
        return snippets;
    }

    /**
     * Increments and returns the next available ID for a snippet.
     * @returns The next available ID.
     */
    incrementLastId(): number {
        return (this._rootSnippet.lastId ?? 0) + 1;
    }

    /**
     * Retrieves the parent snippet by its ID.
     * @param parentId - The ID of the parent snippet.
     * @returns The parent snippet, or undefined if not found.
     */
    getParent(parentId: number | undefined): Snippet | undefined {
        return SnippetService.findParent(parentId ?? Snippet.rootParentId, this._rootSnippet);
    }

    /**
     * Converts the root snippet object to a JSON string representation.
     * @returns A JSON string of the root snippet.
     */
    compact(): string {
        return JSON.stringify(this._rootSnippet);
    }


    // snippet management services

    /**
     * Adds a new snippet to the collection and updates the last used ID.
     * @param newSnippet - The snippet to add.
     */
    addSnippet(newSnippet: Snippet): void {
        this.addExistingSnippet(newSnippet);
        this._updateLastId(newSnippet.id);
    }

    /**
     * Adds an existing snippet to the appropriate parent in the snippet collection.
     * If the parent ID is root, the snippet is added to the root's children.
     * Otherwise, the snippet is added to the parent identified by the `parentId`.
     * @param newSnippet - The snippet to add.
     */
    addExistingSnippet(newSnippet: Snippet): void {
        newSnippet.parentId === Snippet.rootParentId
            ? this._rootSnippet.children.push(newSnippet)
            : SnippetService.findParent(newSnippet.parentId ?? Snippet.rootParentId, this._rootSnippet)?.children.push(newSnippet);
    }

    /**
     * Updates an existing snippet in the collection by its ID and updates the associated Gist.
     * If the snippet is a folder, the content is not updated; otherwise, the content is updated.
     * @param snippet - The snippet to update.
     */
    async updateSnippet(snippet: Snippet): Promise<void> {
        const parentElement = SnippetService.findParent(snippet.parentId ?? Snippet.rootParentId, this._rootSnippet);
        if (parentElement) {
            const index = parentElement.children.findIndex((obj => obj.id === snippet.id));

            if (index > -1) {
                /*
                parentElement.children.map(obj =>
                    obj.id === snippet.id ? {
                        ...obj,
                        label: snippet.label,
                        // if its a folder, don't update content, use old value instead
                        // if its a snippet, update its content
                        value: [snippet.folder ? obj.value : snippet.value]
                    }
                        : obj
                );*/
                // Update the specific child object in the array
                parentElement.children[index] = {
                ...parentElement.children[index],
                label: snippet.label,
                value: snippet.folder 
                    ? parentElement.children[index].value // Keep old value for folders
                    : snippet.value, // Update value for snippets
                };
                await deleteGist(snippet.gistid,true);
                await createSnippet(snippet.label,snippet.value === undefined ? "": snippet.value,snippet.description === undefined ? "": snippet.description,"Public",true);
            };
        }
    }


    

    /**
     * Overrides the snippet's ID with a new ID and updates the snippet.
     * The last used ID is also updated after assigning the new ID to the snippet.
     * @param snippet - The snippet to update with a new ID.
     */
    overrideSnippetId(snippet: Snippet): void {
        let lastId = this.incrementLastId();
        snippet.id = lastId;
        this.updateSnippet(snippet);
        this._updateLastId(snippet.id);
    }

    /**
     * Removes a snippet from the collection and deletes its associated Gist.
     * @param snippet - The snippet to remove.
     */
    removeSnippet(snippet: Snippet): void {
        const parentElement = SnippetService.findParent(snippet.parentId ?? Snippet.rootParentId, this._rootSnippet);

        if (parentElement) {
            const index = parentElement.children.findIndex((obj => obj.id === snippet.id));

            if (index > -1) {
                parentElement?.children.splice(index, 1);
            }
        }
        deleteGist(snippet.gistid);
    }

    /**
     * Removes a snippet from the collection locally without deleting the associated Gist.
     * @param snippet - The snippet to remove.
     */
    removeSnippetLocally(snippet: Snippet): void {
        const parentElement = SnippetService.findParent(snippet.parentId ?? Snippet.rootParentId, this._rootSnippet);

        if (parentElement) {
            const index = parentElement.children.findIndex((obj => obj.id === snippet.id));

            if (index > -1) {
                parentElement?.children.splice(index, 1);
            }
        }
        //deleteGist(snippet.gistid);
    }

    /**
     * Moves a snippet by the specified offset in the list of its siblings.
     * @param snippet - The snippet to move.
     * @param offset - The offset to move the snippet by (positive or negative).
     */
    moveSnippet(snippet: Snippet, offset: number) {
        const parentElement = SnippetService.findParent(snippet.parentId ?? Snippet.rootParentId, this._rootSnippet);

        if (parentElement) {
            const index = parentElement.children.findIndex((obj => obj.id === snippet.id));

            if (index > -1 && parentElement.children) {
                this._reorderArray(parentElement.children, index, index + offset);
            }
        }
    }

    /**
     * Sorts the children of a snippet if it is a folder.
     * @param snippet - The snippet to sort.
     */
    sortSnippets(snippet: Snippet) {
        if (snippet.folder && snippet.children.length > 0) {
            this._sortArray(snippet.children);
        }
    }

    /**
     * Sorts all snippets and their children.
     */
    sortAllSnippets() {
        let snippet = this._rootSnippet;
        if (snippet.children.length > 0) {
            this._sortSnippetsAndChildren(snippet.children);
        }
    }

    /**
     * Exports snippets from a specific parent to a destination file path.
     * @param destinationPath - The path where snippets should be exported.
     * @param parentId - The parent ID to start exporting from.
     */
    exportSnippets(destinationPath: string, parentId: number) {
        const parentElement = SnippetService.findParent(parentId ?? Snippet.rootParentId, this._rootSnippet);
        if (parentElement) {
            // Save file using a destroyable instance of FileDataAccess
            new FileDataAccess(destinationPath).save(parentElement);
        }
    }

    /**
     * Imports snippets from a specified file path and replaces the current snippets.
     * A backup of the current snippets is saved before the import.
     * @param destinationPath - The path from which to import the snippets.
     */
    importSnippets(destinationPath: string) {
        // Save a backup version of current snippets next to the file to import
        this.exportSnippets(
            destinationPath.replace(FileDataAccess.dataFileExt, `_pre-import-bak${FileDataAccess.dataFileExt}`),
            Snippet.rootParentId
        );
        let newSnippets: Snippet = new FileDataAccess(destinationPath).load();
        this._rootSnippet.children = newSnippets.children;
        this._rootSnippet.lastId = newSnippets.lastId;
    }

}