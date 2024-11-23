"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const fileDataAccess_1 = require("../../data/fileDataAccess");
suite('FileDataAccess Tests', () => {
    // Create a temporary test data file for testing
    const testDataFile = path.join(__dirname, 'testData.json');
    // Create a temporary root element for testing
    const testRootElement = {
        id: 1,
        label: 'Root',
        children: [],
    };
    let fileDataAccess;
    setup(() => {
        // Create a new instance of FileDataAccess with the test data file
        fileDataAccess = new fileDataAccess_1.FileDataAccess(testDataFile);
    });
    teardown(() => {
        // Clean up the temporary test data file after each test
        if (fs.existsSync(testDataFile)) {
            fs.unlinkSync(testDataFile);
        }
    });
    test('hasNoChild returns true when there are no children', () => {
        // Arrange: Save the test root element with no children
        fileDataAccess.save(testRootElement);
        // Act: Call the hasNoChild method
        const result = fileDataAccess.hasNoChild();
        // Assert: Check if it returns true
        assert.strictEqual(result, true);
    });
    test('hasNoChild returns false when there are children', () => {
        // Arrange: Save the test root element with children
        const rootWithChildren = {
            id: 1,
            label: 'Root',
            children: [{ id: 2, label: 'Child', children: [] }],
        };
        fileDataAccess.save(rootWithChildren);
        // Act: Call the hasNoChild method
        const result = fileDataAccess.hasNoChild();
        // Assert: Check if it returns false
        assert.strictEqual(result, false);
    });
});
//# sourceMappingURL=fileDataAccess.test.js.map