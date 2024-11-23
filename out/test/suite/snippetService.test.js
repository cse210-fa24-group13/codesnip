"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const snippetService_1 = require("../../service/snippetService");
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
});
//# sourceMappingURL=snippetService.test.js.map