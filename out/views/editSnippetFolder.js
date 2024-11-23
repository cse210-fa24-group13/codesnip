"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditSnippetFolder = void 0;
const editView_1 = require("./editView");
class EditSnippetFolder extends editView_1.EditView {
    constructor(context, _snippet, _snippetsProvider) {
        super(context, _snippet, 'editSnippetFolder', 'folder', 'Edit Folder');
        this._snippet = _snippet;
        this._snippetsProvider = _snippetsProvider;
    }
    handleReceivedMessage(message) {
        switch (message.command) {
            case 'edit-folder':
                const label = message.data.label;
                const icon = message.data.icon;
                // call provider only if there is data change
                if (label) {
                    this._snippet.label = label;
                }
                this._snippet.icon = icon;
                this._snippetsProvider.editSnippetFolder(this._snippet);
                this._panel.dispose();
                return;
        }
    }
}
exports.EditSnippetFolder = EditSnippetFolder;
//# sourceMappingURL=editSnippetFolder.js.map