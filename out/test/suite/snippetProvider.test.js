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
const assert = require("assert");
const snippetsProvider_1 = require("../../provider/snippetsProvider");
const snippetService_1 = require("../../service/snippetService");
suite('SnippetsProvider Tests', () => {
    let snippetsProvider;
    class MockDataAccess {
        constructor() {
            this._data = {
                id: 1,
                label: 'Root',
                children: [],
            };
        }
        hasNoChild() {
            return !this._data.children || this._data.children.length === 0;
        }
        load() {
            return this._data;
        }
        save(data) {
            this._data = data;
        }
    }
    // Mock the SnippetService for testing
    class MockSnippetService extends snippetService_1.SnippetService {
        constructor() {
            super(new MockDataAccess()); // Pass null and empty array for constructor arguments
        }
        // Mock the methods you need for testing
        refresh() {
            // Mock the refresh method
        }
        sync() {
            // Mock the sync method
        }
    }
    setup(() => {
        // Create a new instance of SnippetsProvider with a mock SnippetService
        snippetsProvider = new snippetsProvider_1.SnippetsProvider(new MockSnippetService(), []);
    });
    test('AddSnippet adds a snippet correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const name = 'New Snippet';
        const snippet = 'console.log("Hello, World!");';
        const parentId = 1;
        // Act
        snippetsProvider.addSnippet(name, snippet, parentId);
        // Assert
        const allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets.length, 1);
        assert.strictEqual(allSnippets[0].label, name);
        assert.strictEqual(allSnippets[0].value, snippet);
    }));
    test('RemoveSnippet removes a snippet correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const name = 'New Snippet';
        const snippet = 'console.log("Hello, World!");';
        const parentId = 1;
        snippetsProvider.addSnippet(name, snippet, parentId);
        // Act
        let allSnippets = yield snippetsProvider.getChildren();
        snippetsProvider.removeSnippet(allSnippets[0]);
        // Assert
        allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets.length, 0);
    }));
});
//# sourceMappingURL=snippetProvider.test.js.map