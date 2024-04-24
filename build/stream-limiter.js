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
exports.StreamLimiter = void 0;
const stream_1 = require("stream");
const zlib = require("zlib");
const compressed_source_1 = require("./source-destination/compressed-source");
class StreamLimiter extends stream_1.Transform {
    constructor(stream, maxBytes) {
        super();
        this.stream = stream;
        this.maxBytes = maxBytes;
        this.stream.on('error', this.emit.bind(this, 'error'));
        this.stream.pipe(this);
    }
    _transform(buffer, _encoding, callback) {
        var _a, _b, _c, _d, _e, _f;
        const length = Math.min(buffer.length, this.maxBytes);
        if (length > 0) {
            this.push(buffer.slice(0, length));
        }
        this.maxBytes -= length;
        if (this.maxBytes === 0) {
            (_b = (_a = this.stream).unpipe) === null || _b === void 0 ? void 0 : _b.call(_a, this);
            this.push(null);
            this.emit('finish');
            // Emit an 'end' event on the root stream because we want to stop reporting progress events on it.
            (0, compressed_source_1.getRootStream)(this.stream).emit('end');
            // TODO: maybe we don't need to try to close / destroy the stream ?
            // We could let it be destroyed later when there is no more references to it.
            // avoid https://github.com/nodejs/node/issues/15625
            // @ts-ignore zlib.Gunzip exists
            if (!(this.stream instanceof zlib.Gunzip)) {
                // @ts-ignore
                (_d = (_c = this.stream).close) === null || _d === void 0 ? void 0 : _d.call(_c);
            }
            // avoid `stream.push() after EOF`
            if (this.stream.constructor.name !== 'JSLzmaStream') {
                // @ts-ignore
                (_f = (_e = this.stream).destroy) === null || _f === void 0 ? void 0 : _f.call(_e);
            }
        }
        callback();
    }
}
exports.StreamLimiter = StreamLimiter;
//# sourceMappingURL=stream-limiter.js.map