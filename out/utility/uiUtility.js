"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIUtility = void 0;
const vscode = require("vscode");
class UIUtility {
    static requestSnippetFromUser(savedSnippets) {
        return __awaiter(this, void 0, void 0, function* () {
            const arr = savedSnippets.map(s => {
                var _a, _b;
                return {
                    label: s.label,
                    detail: (_b = (_a = s.value) === null || _a === void 0 ? void 0 : _a.slice(0, 75)) !== null && _b !== void 0 ? _b : "",
                    value: s
                };
            });
            const selection = yield vscode.window.showQuickPick(arr, {
                placeHolder: "Select the snippet you want to open ..." /* Labels.insertSnippetName */,
                matchOnDetail: true
            });
            if (!selection ||
                !selection.value) {
                return;
            }
            // refer to selected snippet
            return selection.value;
        });
    }
    static requestSnippetValue() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield vscode.window.showInputBox({
                prompt: "Snippet Value" /* Labels.snippetValuePrompt */,
                placeHolder: "An example: <div>my cool div</div> ..." /* Labels.snippetValuePlaceholder */,
                validateInput: text => {
                    return text === "" ? "Snippet value should not be empty." /* Labels.snippetValueValidationMsg */ : null;
                }
            });
        });
    }
    static requestSnippetName() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield vscode.window.showInputBox({
                prompt: "Snippet Name" /* Labels.snippetNamePrompt */,
                placeHolder: "Custom Navbar, CSS Alert Style, etc. (append extension like .js to create JavaScript snippet)" /* Labels.snippetNamePlaceholder */,
                validateInput: text => {
                    return text === "" ? "Snippet name should not be empty." /* Labels.snippetNameValidationMsg */ : null;
                }
            });
        });
    }
    static requestSnippetFolderName() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield vscode.window.showInputBox({
                prompt: "Snippet Folder Name" /* Labels.snippetNameFolderPrompt */,
                placeHolder: "Some examples: Alerts, JS Snippets, etc." /* Labels.snippetNameFolderPlaceholder */,
                validateInput: text => {
                    return text === "" ? "Folder name should not be empty." /* Labels.snippetFolderNameValidationMsg */ : null;
                }
            });
        });
    }
    static requestTargetSnippetsView() {
        return __awaiter(this, void 0, void 0, function* () {
            const selection = yield vscode.window.showQuickPick(["Global Snippets" /* Labels.globalSnippets */, "Workspace Snippets" /* Labels.wsSnippets */], {
                placeHolder: "Select where to save the new snippet ..." /* Labels.viewType */,
                matchOnDetail: true
            });
            if (!selection) {
                return;
            }
            // refer to selected snippet
            return selection;
        });
    }
}
exports.UIUtility = UIUtility;
UIUtility.getLanguageNamesWithExtensions = () => vscode.extensions.all
    .map(i => { var _a, _b; return (_b = (_a = i.packageJSON) === null || _a === void 0 ? void 0 : _a.contributes) === null || _b === void 0 ? void 0 : _b.languages; })
    .filter(i => i)
    .reduce((a, b) => a.concat(b), [])
    .filter(i => { var _a, _b; return 0 < ((_b = (_a = i.aliases) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0); })
    .map(i => {
    var _a, _b;
    return {
        id: i === null || i === void 0 ? void 0 : i.id,
        alias: (_a = i === null || i === void 0 ? void 0 : i.aliases) === null || _a === void 0 ? void 0 : _a[0],
        extension: (_b = i === null || i === void 0 ? void 0 : i.extensions) === null || _b === void 0 ? void 0 : _b[0]
    };
});
//# sourceMappingURL=uiUtility.js.map