"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const stringUtility_1 = require("../../utility/stringUtility");
suite('StringUtility Tests', () => {
    suite('formatString', () => {
        test('should format a string with values', () => {
            const formatted = stringUtility_1.StringUtility.formatString('Hello, {0}!', 'John');
            assert.strictEqual(formatted, 'Hello, John!');
        });
        test('should handle multiple placeholders', () => {
            const formatted = stringUtility_1.StringUtility.formatString('{0} likes {1}.', 'Alice', 'chocolate');
            assert.strictEqual(formatted, 'Alice likes chocolate.');
        });
        test('should handle missing values', () => {
            const formatted = stringUtility_1.StringUtility.formatString('Hello, {0}!');
            assert.strictEqual(formatted, 'Hello, {0}!');
        });
    });
    suite('isBlank', () => {
        test('should return true for an empty string', () => {
            const result = stringUtility_1.StringUtility.isBlank('');
            assert.strictEqual(result, true);
        });
        test('should return true for a string with only whitespace', () => {
            const result = stringUtility_1.StringUtility.isBlank('   ');
            assert.strictEqual(result, true);
        });
        test('should return false for a non-empty string', () => {
            const result = stringUtility_1.StringUtility.isBlank('Hello, world!');
            assert.strictEqual(result, false);
        });
        test('should return false for a string with leading/trailing whitespace', () => {
            const result = stringUtility_1.StringUtility.isBlank('   Hello, world!   ');
            assert.strictEqual(result, false);
        });
    });
});
//# sourceMappingURL=stringUtility.test.js.map