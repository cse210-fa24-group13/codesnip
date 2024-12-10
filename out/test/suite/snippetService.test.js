"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const snippetService_1 = require("../../service/snippetService");
const fs = require("fs");
const path = require("path");
suite('SnippetService Tests', () => {
    // Mock the DataAccess and Memento objects for testing
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
    // Mock the Memento object for testing
    class MockMemento {
        constructor() {
            this.storage = {};
        }
        keys() {
            throw new Error('Method not implemented.');
        }
        get(key, defaultValue) {
            var _a;
            return (_a = this.storage[key]) !== null && _a !== void 0 ? _a : defaultValue;
        }
        update(key, value) {
            this.storage[key] = value;
            return Promise.resolve();
        }
    }
    let snippetService;
    setup(() => {
        // Create a new instance of SnippetService with mock DataAccess and Memento objects
        const mockDataAccess = new MockDataAccess();
        snippetService = new snippetService_1.SnippetService(mockDataAccess);
    });
    test('AddSnippet adds a snippet correctly', () => {
        // Arrange
        const newSnippet = {
            id: 2,
            label: 'New Snippet',
            children: [],
        };
        // Act
        snippetService.addSnippet(newSnippet);
        // Assert
        const allSnippets = snippetService.getAllSnippets();
        assert.strictEqual(allSnippets.length, 1);
        assert.strictEqual(allSnippets[0].label, 'New Snippet');
    });
    test('RemoveSnippet removes a snippet correctly', () => {
        // Arrange
        const newSnippet = {
            id: 2,
            label: 'New Snippet',
            children: [],
        };
        snippetService.addSnippet(newSnippet);
        // Act
        snippetService.removeSnippet(newSnippet);
        // Assert
        const allSnippets = snippetService.getAllSnippets();
        assert.strictEqual(allSnippets.length, 0);
    });
    test('updateSnippet updates a snippet correctly', () => {
        // Arrange
        const newSnippetfile = {
            id: 2,
            label: 'Old Snippet',
            value: 'Old Content',
            folder: false,
            children: []
        };
        const newSnippetfolder = {
            id: 3,
            label: 'Folder',
            value: 'Folder Value',
            folder: true,
            children: []
        };
        const updatedSnippetfile = {
            id: 2,
            label: 'Updated Snippet',
            value: 'Updated Content',
            folder: false,
            children: [],
        };
        const updatedSnippetfolder = {
            id: 3,
            label: 'Updated Folder',
            value: 'New Value', // Should not overwrite folder value
            folder: true,
            children: [],
        };
        snippetService.addSnippet(newSnippetfile);
        snippetService.addSnippet(newSnippetfolder);
        // Act
        snippetService.updateSnippet(updatedSnippetfile);
        snippetService.updateSnippet(updatedSnippetfolder);
        // Assert
        const allSnippets = snippetService.getAllSnippetsAndFolders();
        assert.strictEqual(allSnippets[0].label, 'Updated Snippet');
        assert.deepStrictEqual(allSnippets[0].value, 'Updated Content');
        assert.strictEqual(allSnippets[1].label, 'Updated Folder');
        assert.deepStrictEqual(allSnippets[1].value, 'Folder Value'); // Value should remain unchanged for folders
    });
    test('updateSnippet should not update an unexisting snippet', () => {
        // Arrange
        const newSnippetfile = {
            id: 2,
            label: 'Old Snippet',
            value: 'Old Content',
            folder: false,
            children: []
        };
        const updatedSnippetfile = {
            id: 3,
            label: 'Updated Snippet',
            value: 'Updated Content',
            folder: false,
            children: [],
        };
        snippetService.addSnippet(newSnippetfile);
        // Act
        snippetService.updateSnippet(updatedSnippetfile);
        // Assert
        const allSnippets = snippetService.getAllSnippetsAndFolders();
        assert.strictEqual(allSnippets[0].label, 'Old Snippet');
        assert.deepStrictEqual(allSnippets[0].value, 'Old Content');
    });
    test('overrideSnippetId changes a snippet id correctly', () => {
        // Arrange
        const newSnippet1 = {
            id: 2,
            label: 'First Snippet',
            value: 'First Content',
            folder: false,
            children: []
        };
        const newSnippet2 = {
            id: 3,
            label: 'Second Snippet',
            value: 'Second Content',
            children: [],
            folder: false
        };
        snippetService.addSnippet(newSnippet1);
        snippetService.addSnippet(newSnippet2);
        // Act
        snippetService.overrideSnippetId(newSnippet2);
        // Assert
        const allSnippets = snippetService.getAllSnippets();
        assert.strictEqual(allSnippets[1].id, snippetService.incrementLastId() - 1);
    });
    test('moveSnippet moves down a snippet correctly', () => {
        // Arrange
        const newSnippet1 = {
            id: 2,
            label: 'First Snippet',
            value: 'First Content',
            folder: false,
            children: []
        };
        const newSnippet2 = {
            id: 3,
            label: 'Second Snippet',
            value: 'Second Content',
            children: [],
            folder: false
        };
        snippetService.addSnippet(newSnippet1);
        snippetService.addSnippet(newSnippet2);
        // Act
        snippetService.moveSnippet(newSnippet1, 1);
        // Assert
        const allSnippets = snippetService.getAllSnippets();
        assert.strictEqual(allSnippets[0].id, 3);
        assert.strictEqual(allSnippets[1].id, 2);
    });
    test('moveSnippet moves up a snippet correctly', () => {
        // Arrange
        const newSnippet1 = {
            id: 2,
            label: 'First Snippet',
            value: 'First Content',
            folder: false,
            children: []
        };
        const newSnippet2 = {
            id: 3,
            label: 'Second Snippet',
            value: 'Second Content',
            children: [],
            folder: false
        };
        snippetService.addSnippet(newSnippet1);
        snippetService.addSnippet(newSnippet2);
        // Act
        snippetService.moveSnippet(newSnippet2, -1);
        // Assert
        const allSnippets = snippetService.getAllSnippets();
        assert.strictEqual(allSnippets[0].id, 3);
        assert.strictEqual(allSnippets[1].id, 2);
    });
    test('moveSnippet should not move a snippet when out of bound', () => {
        // Arrange
        const newSnippet1 = {
            id: 2,
            label: 'First Snippet',
            value: 'First Content',
            folder: false,
            children: []
        };
        const newSnippet2 = {
            id: 3,
            label: 'Second Snippet',
            value: 'Second Content',
            children: [],
            folder: false
        };
        snippetService.addSnippet(newSnippet1);
        snippetService.addSnippet(newSnippet2);
        // Act
        snippetService.moveSnippet(newSnippet1, 5);
        // Assert
        const allSnippets = snippetService.getAllSnippets();
        assert.strictEqual(allSnippets[0].id, 2);
        assert.strictEqual(allSnippets[1].id, 3);
    });
    test('Sort Snippet\'s children based on their labels', () => {
        const newSnippet = {
            id: 2,
            label: 'Parent Snippet',
            folder: true,
            children: [{ id: 3, label: 'C', children: [] },
                { id: 4, label: 'A', children: [] },
                { id: 5, label: 'B', children: [] }
            ],
        };
        snippetService.addSnippet(newSnippet);
        snippetService.sortSnippets(newSnippet);
        assert.strictEqual(newSnippet.children[0].label, 'A');
        assert.strictEqual(newSnippet.children[1].label, 'B');
        assert.strictEqual(newSnippet.children[2].label, 'C');
    });
    test('Sort all snippets and their childern based on their labels', () => {
        const parentA = {
            id: 2,
            label: 'Parent A',
            folder: true,
            parentId: 1,
            children: [{ id: 3, label: 'C', children: [] },
                { id: 4, label: 'A', children: [] },
                { id: 5, label: 'B', children: [] }
            ],
        };
        const parentB = {
            id: 6,
            label: 'Parent B',
            folder: true,
            parentId: 1,
            children: [{ id: 7, label: 'E', children: [] },
                { id: 8, label: 'D', children: [] },
                { id: 9, label: 'F', children: [] }
            ],
        };
        const parentC = {
            id: 10,
            label: 'Parent C',
            folder: true,
            parentId: 1,
            children: []
        };
        snippetService.addSnippet(parentA);
        snippetService.addSnippet(parentC);
        snippetService.addSnippet(parentB);
        snippetService.sortAllSnippets();
        let rootChildern = snippetService.getRootChildren();
        assert.strictEqual(rootChildern[0].label, 'Parent A');
        assert.strictEqual(rootChildern[1].label, 'Parent B');
        assert.strictEqual(rootChildern[2].label, 'Parent C');
        assert.strictEqual(parentA.children[0].label, 'A');
        assert.strictEqual(parentA.children[1].label, 'B');
        assert.strictEqual(parentA.children[2].label, 'C');
        assert.strictEqual(parentB.children[0].label, 'D');
        assert.strictEqual(parentB.children[1].label, 'E');
        assert.strictEqual(parentB.children[2].label, 'F');
    });
    test('export snippets', () => {
        // Create a temporary test data file for testing
        const testDataFile = path.join(__dirname, "testData.json");
        const parentA = {
            id: 2,
            label: 'Parent A',
            folder: true,
            children: [{ id: 3, label: 'C', children: [] },
                { id: 4, label: 'A', children: [] },
                { id: 5, label: 'B', children: [] }
            ],
        };
        snippetService.addSnippet(parentA);
        snippetService.exportSnippets(testDataFile, parentA.id);
        assert.strictEqual(fs.existsSync(testDataFile), true);
        // Clean up the temporary test data file after each test
        if (fs.existsSync(testDataFile)) {
            fs.unlinkSync(testDataFile);
        }
    });
});
//# sourceMappingURL=snippetService.test.js.map