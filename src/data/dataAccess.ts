import { Snippet } from "../interface/snippet";

/**
 * This class holds constant values related to data access, such as the default root element for snippets.
 */
export class DataAccessConsts {
    /**
     * Static constant for the default root element (initial 'snippets' folder), with predefined properties.
     * @type {Snippet}
     */
    public static readonly defaultRootElement: Snippet = { 
        id: 1,                // ID of the root element
        parentId: -1,         // Parent ID (-1 indicates it's a root element)
        label: 'snippets',    // Label name for the root element
        lastId: 1,            // The last ID used in the snippet
        folder: true,         // Specifies that this is a folder, not a regular snippet
        children: []          // Initially, the root folder has no children
    };
}

/**
 * Interface for data access operations related to snippets.
 */
export interface DataAccess {
    /**
     * Method to check if the current data (snippet/folder) has no child elements.
     * @returns {boolean} True if the current element has no children.
     */
    hasNoChild(): boolean;

    /**
     * Method to load and return the root snippet or data structure.
     * @returns {Snippet} The loaded snippet or root element.
     */
    load(): Snippet;

    /**
     * Method to save the provided snippet data.
     * @param {Snippet} data The snippet data to be saved.
     */
    save(data: Snippet): void;
}