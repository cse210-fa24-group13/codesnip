"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringUtility = void 0;
class StringUtility {
    static formatString(str, ...val) {
        for (let index = 0; index < val.length; index++) {
            str = str.replace(`{${index}}`, val[index]);
        }
        return str;
    }
    static isBlank(str) {
        return (!str || /^\s*$/.test(str));
    }
}
exports.StringUtility = StringUtility;
//# sourceMappingURL=stringUtility.js.map