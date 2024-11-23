"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const mementoDataAccess_1 = require("../../data/mementoDataAccess");
suite('MementoDataAccess Tests', () => {
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
    // Create a temporary root element for testing
    const testRootElement = {
        id: 1,
        label: 'Root',
        children: [],
    };
    let mementoDataAccess;
    setup(() => {
        // Create a new instance of MementoDataAccess with a mock Memento object
        const mockMemento = new MockMemento();
        mockMemento.update(mementoDataAccess_1.MementoDataAccess.snippetsMementoPrefix, testRootElement);
        mementoDataAccess = new mementoDataAccess_1.MementoDataAccess(mockMemento);
    });
    test('hasNoChild returns true when there are no children', () => {
        // Act: Call the hasNoChild method
        const result = mementoDataAccess.hasNoChild();
        // Assert: Check if it returns true
        assert.strictEqual(result, true);
    });
    test('hasNoChild returns false when there are children', () => {
        // Arrange: Set a test root element with children
        const rootWithChildren = {
            id: 1,
            label: 'Root',
            children: [{ id: 2, label: 'Child', children: [] }],
        };
        mementoDataAccess.save(rootWithChildren);
        // Act: Call the hasNoChild method
        const result = mementoDataAccess.hasNoChild();
        // Assert: Check if it returns false
        assert.strictEqual(result, false);
    });
});
//# sourceMappingURL=mementoDataAccess.test.js.map