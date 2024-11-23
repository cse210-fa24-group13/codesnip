"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Snippet = void 0;
class Snippet {
    constructor(id, label, children, folder, parentId, value) {
        this.id = id;
        this.label = label;
        this.folder = folder;
        this.children = children;
        this.parentId = parentId;
        this.value = value;
    }
}
exports.Snippet = Snippet;
Snippet.rootParentId = 1;
//# sourceMappingURL=snippet.js.map