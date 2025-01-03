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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APITool = void 0;
const axios_1 = __importDefault(require("axios"));
class APITool {
    constructor(name, description, apiUrl) {
        this.name = name;
        this.description = description;
        this.apiUrl = apiUrl;
    }
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.get(this.apiUrl + input);
                if (typeof response.data === 'string') {
                    return response.data;
                }
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    return `API Error: ${axiosError.message} (Status: ${(_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status})`;
                }
                return `API Error: ${error}`;
            }
        });
    }
}
exports.APITool = APITool;
