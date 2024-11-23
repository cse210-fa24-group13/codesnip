"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MementoDataAccess = void 0;
const dataAccess_1 = require("./dataAccess");
class MementoDataAccess {
    constructor(memento) {
        this._storageManager = new StorageManager(memento);
    }
    hasNoChild() {
        let rootElt = this._storageManager.getValue(MementoDataAccess.snippetsMementoPrefix) || dataAccess_1.DataAccessConsts.defaultRootElement;
        return !rootElt.children || rootElt.children.length === 0;
    }
    load() {
        let rawData = this._storageManager.getValue(MementoDataAccess.snippetsMementoPrefix) || dataAccess_1.DataAccessConsts.defaultRootElement;
        if (rawData === dataAccess_1.DataAccessConsts.defaultRootElement) {
            this.save(rawData);
        }
        return rawData;
    }
    save(data) {
        this._storageManager.setValue(MementoDataAccess.snippetsMementoPrefix, data);
    }
}
exports.MementoDataAccess = MementoDataAccess;
MementoDataAccess.snippetsMementoPrefix = "snippetsData";
class StorageManager {
    constructor(storage) {
        this.storage = storage;
    }
    getValue(key) {
        return this.storage.get(key, undefined);
    }
    setValue(key, value) {
        this.storage.update(key, value);
    }
}
//# sourceMappingURL=mementoDataAccess.js.map