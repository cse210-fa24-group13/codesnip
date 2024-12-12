export class StringUtility {
    /**
     * Formats a string by replacing placeholders with values.
     * The placeholders are in the format `{0}`, `{1}`, etc., 
     * and the corresponding values are passed in the `val` array.
     * 
     * @param {string} str - The string to format, containing placeholders.
     * @param {...string[]} val - The values to replace the placeholders with.
     * @returns {string} - The formatted string with values inserted.
     */
    static formatString(str: string, ...val: string[]): string {
        for (let index = 0; index < val.length; index++) {
            str = str.replace(`{${index}}`, val[index]);
        }
        return str;
    }

    /**
     * Checks if a string is blank (either null, undefined, or contains only whitespace).
     * 
     * @param {string} str - The string to check.
     * @returns {boolean} - Returns true if the string is blank, otherwise false.
     */
    static isBlank(str: string): boolean {
        return (!str || /^\s*$/.test(str));
    }
}