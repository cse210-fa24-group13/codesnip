import fs = require('fs');
import * as path from 'path';
import { Snippet } from '../interface/snippet';
import { DataAccess, DataAccessConsts } from './dataAccess';

/**
 * Class that implements the `DataAccess` interface to manage data using a file-based storage system.
 * It reads and writes data in JSON format from/to a file.
 */
export class FileDataAccess implements DataAccess {
    /**
     * The file extension for the data file.
     * @type {string}
     */
    static dataFileExt = '.json';

    /**
     * The name of the data file (default is 'data.json').
     * @type {string}
     */
    private static dataFileName = `data${FileDataAccess.dataFileExt}`;

    /**
     * The encoding to be used when reading and writing the file.
     * @private
     * @type {BufferEncoding}
     */
    private _encoding: BufferEncoding = "utf-8"; // fs.readFileSync() takes BufferEncoding instead of string

    /**
     * The path of the data file.
     * @private
     * @type {string}
     */
    private _dataFile: string;

    /**
     * Creates an instance of `FileDataAccess`.
     * @param {string} dataFile - The path to the data file.
     */
    constructor(dataFile: string) {
        this._dataFile = dataFile;
    }

    /**
     * Checks if the current data file has any children in the root element.
     * @returns {boolean} True if the root element has no children.
     */
    hasNoChild(): boolean {
        const rootElt = this.load();
        return rootElt.hasOwnProperty('children') && !rootElt.children || rootElt.children.length === 0;
    }

    /**
     * Sets the path of the data file.
     * @param {string} dataFile - The new data file path.
     */
    setDataFile(dataFile: string) {
        this._dataFile = dataFile;
    }

    /**
     * Checks if a string is blank (empty or contains only whitespace).
     * @param {string} str - The string to check.
     * @returns {boolean} True if the string is blank.
     */
    isBlank(str: string): boolean {
        return (!str || /^\s*$/.test(str));
    }

    /**
     * Loads the data from the data file. If the file does not exist or is empty, the default root element is saved and returned.
     * @returns {any} The parsed data from the file.
     */
    load(): any {
        if (!fs.existsSync(this._dataFile)) {
            this.save(DataAccessConsts.defaultRootElement);
        }
        let rawData = fs.readFileSync(this._dataFile, this._encoding);
        
        if (this.isBlank(rawData)) {
            this.save(DataAccessConsts.defaultRootElement);
        }

        rawData = fs.readFileSync(this._dataFile, this._encoding);
        return JSON.parse(rawData);
    }

    /**
     * Saves the given snippet data to the data file.
     * @param {Snippet} data - The snippet data to save.
     */
    save(data: Snippet): void {
        fs.writeFileSync(this._dataFile, JSON.stringify(data));
    }

    /**
     * Resolves the filename of the data file based on a given folder path.
     * @param {string} folderPath - The path of the folder.
     * @returns {string} The full path of the data file.
     */
    static resolveFilename(folderPath: string): string {
        return path.join(folderPath, FileDataAccess.dataFileName);
    }
}