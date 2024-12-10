"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDataAccess = void 0;
const fs = require("fs");
const path = require("path");
const dataAccess_1 = require("./dataAccess");
class FileDataAccess {
    constructor(dataFile) {
        this._encoding = 'utf8';
        this._dataFile = dataFile;
    }
    hasNoChild() {
        const rootElt = this.load();
        return rootElt.hasOwnProperty('children') && !rootElt.children || rootElt.children.length === 0;
    }
    setDataFile(dataFile) {
        this._dataFile = dataFile;
    }
    isBlank(str) {
        return (!str || /^\s*$/.test(str));
    }
    load() {
        if (!fs.existsSync(this._dataFile)) {
            this.save(dataAccess_1.DataAccessConsts.defaultRootElement);
        }
        let rawData = fs.readFileSync(this._dataFile, this._encoding);
        if (this.isBlank(rawData)) {
            this.save(dataAccess_1.DataAccessConsts.defaultRootElement);
        }
        rawData = fs.readFileSync(this._dataFile, this._encoding);
        return JSON.parse(rawData);
    }
    save(data) {
        fs.writeFileSync(this._dataFile, JSON.stringify(data));
    }
    static resolveFilename(folderPath) {
        return path.join(folderPath, FileDataAccess.dataFileName);
    }
}
exports.FileDataAccess = FileDataAccess;
FileDataAccess.dataFileExt = '.json';
FileDataAccess.dataFileName = `data${FileDataAccess.dataFileExt}`;
//# sourceMappingURL=fileDataAccess.js.map