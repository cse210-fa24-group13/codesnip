"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditSnippet = void 0;
const editView_1 = require("./editView");
class EditSnippet extends editView_1.EditView {
    constructor(context, _snippet, _snippetsProvider) {
        super(context, _snippet, 'editSnippet', 'file', 'Edit Snippet');
        this._snippet = _snippet;
        this._snippetsProvider = _snippetsProvider;
    }
    handleReceivedMessage(message) {
        switch (message.command) {
            case 'edit-snippet':
                const { label, prefix, language, description, value, resolveSyntax } = message.data;
                // call provider only if there is data change
                if (label !== undefined) {
                    this._snippet.label = label;
                }
                if (value !== undefined) {
                    this._snippet.value = value;
                }
                this._snippet.language = language;
                this._snippet.description = description;
                this._snippet.prefix = prefix;
                // test against undefined so we don't mess with variable's state if user introduces an explicit value 'false'
                if (resolveSyntax !== undefined) {
                    this._snippet.resolveSyntax = resolveSyntax;
                }
                this._snippetsProvider.editSnippet(this._snippet);
                this._panel.dispose();
                return;
        }
    }
}
exports.EditSnippet = EditSnippet;
//# sourceMappingURL=editSnippet.js.map