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
exports.SingleUseStreamSource = void 0;
const source_destination_1 = require("./source-destination");
const errors_1 = require("../errors");
const stream_limiter_1 = require("../stream-limiter");
class SingleUseStreamSource extends source_destination_1.SourceDestination {
    constructor(stream) {
        super();
        this.stream = stream;
        this.used = false;
    }
    async canCreateReadStream() {
        return !this.used;
    }
    async createReadStream({ start = 0, end, } = {}) {
        if (this.used) {
            throw new errors_1.NotCapable('Single use source stream already used');
        }
        if (start !== 0) {
            throw new errors_1.NotCapable("Can't seek in a single use stream");
        }
        let stream = this.stream;
        if (end !== undefined) {
            stream = new stream_limiter_1.StreamLimiter(stream, end + 1);
        }
        this.used = true;
        return stream;
    }
}
exports.SingleUseStreamSource = SingleUseStreamSource;
//# sourceMappingURL=single-use-stream-source.js.map