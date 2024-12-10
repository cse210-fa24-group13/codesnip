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
    test('AddSnippetFolder adds a folder correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const name = 'New Folder';
        const parentId = 1;
        // Act
        snippetsProvider.addSnippetFolder(name, parentId);
        // Assert
        const allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets.length, 1);
        assert.strictEqual(allSnippets[0].label, name);
        assert.strictEqual(allSnippets[0].folder, true);
    }));
    test('editSnippet/Folder edits a snippet/folder correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const updatedSnippetfile = {
            id: 1,
            label: 'Updated Snippet',
            value: 'Updated Content',
            folder: false,
            children: [],
        };
        const updatedSnippetfolder = {
            id: 2,
            label: 'Updated Folder',
            value: 'New Value',
            folder: true,
            children: [],
        };
        snippetsProvider.addSnippet("Old Snippet", "Old Content", 1);
        snippetsProvider.addSnippetFolder("Old Folder", 1);
        // Act
        snippetsProvider.editSnippet(updatedSnippetfile);
        snippetsProvider.editSnippetFolder(updatedSnippetfolder);
        // Assert
        const allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets[0].label, 'Updated Snippet');
        assert.deepStrictEqual(allSnippets[0].value, 'Updated Content');
        assert.strictEqual(allSnippets[1].label, 'Updated Folder');
        assert.deepStrictEqual(allSnippets[1].value, undefined); // Value should remain unchanged for folders
    }));
    test('editSnippet/Folder should not edit an unexisting snippet/folder', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const updatedSnippetfile = {
            id: 3,
            label: 'Updated Snippet',
            value: 'Updated Content',
            folder: false,
            children: [],
        };
        const updatedSnippetfolder = {
            id: 4,
            label: 'Updated Folder',
            value: 'New Value',
            folder: true,
            children: [],
        };
        snippetsProvider.addSnippet("Old Snippet", "Old Content", 1);
        snippetsProvider.addSnippetFolder("Old Folder", 1);
        // Act
        snippetsProvider.editSnippet(updatedSnippetfile);
        snippetsProvider.editSnippetFolder(updatedSnippetfolder);
        // Assert
        const allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets[0].label, "Old Snippet");
        assert.deepStrictEqual(allSnippets[0].value, "Old Content");
        assert.strictEqual(allSnippets[1].label, "Old Folder");
        assert.strictEqual(allSnippets[1].folder, true);
        assert.deepStrictEqual(allSnippets[1].value, undefined);
    }));
    test('moveSnippetDown moves down a snippet correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const newSnippet1 = {
            id: 1,
            label: 'First Snippet',
            value: 'First Content',
            folder: false,
            children: []
        };
        const newSnippet2 = {
            id: 2,
            label: 'Second Snippet',
            value: 'Second Content',
            children: [],
            folder: false
        };
        snippetsProvider.addSnippet("First Snippet", "Fisrt Content", 1);
        snippetsProvider.addSnippet("Second Snippet", "Second Content", 1);
        // Act
        snippetsProvider.moveSnippetDown(newSnippet1);
        // Assert
        const allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets[0].id, 2);
        assert.strictEqual(allSnippets[1].id, 1);
    }));
    test('moveSnippetUp moves up a snippet correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const newSnippet1 = {
            id: 1,
            label: 'First Snippet',
            value: 'First Content',
            folder: false,
            children: []
        };
        const newSnippet2 = {
            id: 2,
            label: 'Second Snippet',
            value: 'Second Content',
            children: [],
            folder: false
        };
        snippetsProvider.addSnippet("First Snippet", "Fisrt Content", 1);
        snippetsProvider.addSnippet("Second Snippet", "Second Content", 1);
        // Act
        snippetsProvider.moveSnippetUp(newSnippet2);
        // Assert
        const allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets[0].id, 2);
        assert.strictEqual(allSnippets[1].id, 1);
    }));
    test('moveSnippetDown/Up should not move a snippet when out of bound', () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        const newSnippet1 = {
            id: 1,
            label: 'First Snippet',
            value: 'First Content',
            folder: false,
            children: []
        };
        const newSnippet2 = {
            id: 2,
            label: 'Second Snippet',
            value: 'Second Content',
            children: [],
            folder: false
        };
        snippetsProvider.addSnippet("First Snippet", "Fisrt Content", 1);
        snippetsProvider.addSnippet("Second Snippet", "Second Content", 1);
        // Act
        snippetsProvider.moveSnippetDown(newSnippet2);
        // Assert
        const allSnippets = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets[0].id, 1);
        assert.strictEqual(allSnippets[1].id, 2);
        // Act
        snippetsProvider.moveSnippetUp(newSnippet1);
        // Assert
        const allSnippets1 = yield snippetsProvider.getChildren();
        assert.strictEqual(allSnippets1[0].id, 1);
        assert.strictEqual(allSnippets1[1].id, 2);
    }));
});
//# sourceMappingURL=snippetProvider.test.js.map