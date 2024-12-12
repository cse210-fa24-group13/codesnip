import { Memento } from 'vscode';
import { Snippet } from '../interface/snippet';
import { DataAccess, DataAccessConsts } from './dataAccess';

/**
 * MementoDataAccess class to handle snippets data storage in Memento.
 * Implements the {@link DataAccess} interface.
 */
export class MementoDataAccess implements DataAccess {
    /** Prefix for storing snippets in the Memento. */
    static snippetsMementoPrefix = "snippetsData";

    /** Instance of {@link StorageManager} to manage data storage. */
    private _storageManager: StorageManager;

    /**
     * Constructor to initialize the MementoDataAccess with a Memento.
     * @param memento The {@link Memento} instance used for storage.
     */
    constructor(memento: Memento) {
        this._storageManager = new StorageManager(memento);
    }

    /**
     * Checks if the root element has any children.
     * @returns {boolean} True if there are no children, false otherwise.
     */
    hasNoChild(): boolean {
        let rootElt = this._storageManager.getValue<Snippet>(MementoDataAccess.snippetsMementoPrefix) || DataAccessConsts.defaultRootElement;
        return !rootElt.children || rootElt.children.length === 0;
    }

    /**
     * Loads the stored snippets data from Memento.
     * @returns {Snippet} The loaded snippets data.
     */
    load(): Snippet {
        let rawData = this._storageManager.getValue<Snippet>(MementoDataAccess.snippetsMementoPrefix) || DataAccessConsts.defaultRootElement;

        if (rawData === DataAccessConsts.defaultRootElement) {
            this.save(rawData);
        }

        return rawData;
    }

    /**
     * Saves the given {@link Snippet} data to the Memento storage.
     * @param data The {@link Snippet} data to save.
     */
    save(data: Snippet): void {
        this._storageManager.setValue<Snippet>(MementoDataAccess.snippetsMementoPrefix, data);
    }
}

/**
 * A helper class for managing the storage of snippets data in the Memento.
 */
class StorageManager {

    /** @param storage The {@link Memento} instance used for managing the storage. */
    constructor(private storage: Memento) { }

    /**
     * Retrieves a value from storage based on the provided key.
     * @param key The key for the value to retrieve.
     * @returns The value corresponding to the key, or undefined if not found.
     */
    public getValue<T>(key: string): T | undefined {
        return this.storage.get<T | undefined>(key, undefined);
    }

    /**
     * Sets a value in the storage.
     * @param key The key for the value to set.
     * @param value The value to store.
     */
    public setValue<T>(key: string, value: T): void {
        this.storage.update(key, value);
    }
}
