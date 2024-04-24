"use strict";
/*
 * Copyright 2018 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Http = void 0;
const axios_1 = require("axios");
// Always use the node adapter (even in a browser)
// @ts-ignore
const axiosNodeAdapter = require("axios/lib/adapters/http");
const path_1 = require("path");
const querystring_1 = require("querystring");
const url_1 = require("url");
const stream_limiter_1 = require("../stream-limiter");
const source_destination_1 = require("./source-destination");
axios_1.default.defaults.adapter = axiosNodeAdapter;
class Http extends source_destination_1.SourceDestination {
    constructor({ url, avoidRandomAccess = false, axiosInstance = axios_1.default.create(), auth, }) {
        super();
        this.url = url;
        this.avoidRandomAccess = avoidRandomAccess;
        this.axiosInstance = axiosInstance;
        if (auth) {
            this.axiosInstance.defaults.auth = auth;
        }
        this.ready = this.getInfo();
    }
    async getInfo() {
        var _a, _b, _c;
        try {
            let response;
            try {
                response = await this.axiosInstance({ method: 'head', url: this.url });
            }
            catch (error) {
                // We use GET instead of HEAD as some servers will respond with a 403 to HEAD requests
                response = await this.axiosInstance({
                    method: 'get',
                    url: this.url,
                    responseType: 'stream',
                });
                response.data.destroy();
            }
            this.redirectUrl = response.request.res.responseUrl;
            this.size = parseInt(response.headers['content-length'], 10);
            if (Number.isNaN(this.size)) {
                this.size = undefined;
            }
            const regExpFilename = /filename="(?<filename>.*)"/;
            this.fileName =
                (_c = (_b = (_a = regExpFilename.exec(response.headers['content-disposition'])) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.filename) !== null && _c !== void 0 ? _c : undefined;
            this.acceptsRange = response.headers['accept-ranges'] === 'bytes';
        }
        catch (error) {
            this.error = error;
        }
    }
    async canRead() {
        await this.ready;
        if (this.error) {
            throw this.error;
        }
        return !this.avoidRandomAccess && this.acceptsRange;
    }
    async canCreateReadStream() {
        return true;
    }
    async _getMetadata() {
        await this.ready;
        if (this.error) {
            throw this.error;
        }
        const pathname = (0, url_1.parse)(this.redirectUrl).pathname;
        if (!this.fileName && pathname !== undefined && pathname !== null) {
            this.fileName = (0, path_1.basename)((0, querystring_1.unescape)(pathname));
        }
        return {
            size: this.size,
            name: this.fileName,
        };
    }
    getRange(start = 0, end) {
        // start and end are inclusive
        let range = `bytes=${start}-`;
        if (end !== undefined) {
            range += end;
        }
        return range;
    }
    async read(buffer, bufferOffset, length, sourceOffset) {
        const response = await this.axiosInstance({
            method: this.axiosInstance.defaults.method || 'get',
            url: this.redirectUrl,
            responseType: 'arraybuffer',
            headers: {
                Range: this.getRange(sourceOffset, sourceOffset + length - 1),
            },
        });
        const bytesRead = response.data.length;
        // TODO: it would be nice to avoid copying here but it would require modifying axios
        response.data.copy(buffer, bufferOffset);
        return { bytesRead, buffer };
    }
    async createReadStream({ emitProgress = false, start = 0, end, } = {}) {
        const response = await this.axiosInstance({
            method: this.axiosInstance.defaults.method || 'get',
            url: this.redirectUrl,
            headers: {
                Range: this.getRange(start, end),
            },
            responseType: 'stream',
        });
        if (emitProgress) {
            let bytes = 0;
            let lastTime = Date.now();
            response.data.on('data', (chunk) => {
                const now = Date.now();
                const length = chunk.length;
                bytes += length;
                const speed = length / ((now - lastTime) / 1000);
                lastTime = now;
                response.data.emit('progress', {
                    position: bytes,
                    bytes,
                    speed,
                });
            });
            response.data.pause();
        }
        if (end !== undefined) {
            // +1 because start and end are inclusive
            return new stream_limiter_1.StreamLimiter(response.data, end - start + 1);
        }
        return response.data;
    }
}
exports.Http = Http;
//# sourceMappingURL=http.js.map