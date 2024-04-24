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
exports.CompressedSource = exports.getRootStream = exports.isSourceTransform = void 0;
const path_1 = require("path");
const errors_1 = require("../errors");
const stream_limiter_1 = require("../stream-limiter");
const source_source_1 = require("./source-source");
function isSourceTransform(stream) {
    return stream.sourceStream !== undefined;
}
exports.isSourceTransform = isSourceTransform;
function getRootStream(stream) {
    while (isSourceTransform(stream)) {
        stream = stream.sourceStream;
    }
    return stream;
}
exports.getRootStream = getRootStream;
class CompressedSource extends source_source_1.SourceSource {
    async getSize() {
        return;
    }
    async canCreateReadStream() {
        return true;
    }
    async createReadStream({ emitProgress = false, start = 0, end, } = {}) {
        if (start !== 0) {
            throw new errors_1.NotCapable();
        }
        const stream = await this.source.createReadStream({ emitProgress });
        // as any because we need to add the sourceStream property
        const transform = this.createTransform();
        stream.pipe(transform);
        transform.sourceStream = stream;
        if (end !== undefined) {
            const limiter = new stream_limiter_1.StreamLimiter(transform, end + 1);
            limiter.sourceStream = transform;
            limiter.on('finish', () => {
                // Ignore EBADF errors after this:
                // We might be still reading the source stream from a closed fd
                stream.on('error', (err) => {
                    if (err.code !== 'EBADF') {
                        throw err;
                    }
                });
            });
            return limiter;
        }
        return transform;
    }
    async getSizeFromPartitionTable() {
        try {
            const partitions = await this.getPartitionTable();
            if (partitions !== undefined) {
                const lastByte = Math.max(...partitions.partitions.map(({ offset, size }) => offset + size));
                if (lastByte !== -Infinity) {
                    return lastByte;
                }
            }
        }
        catch (error) {
            // noop
        }
    }
    async _getMetadata() {
        const sourceMetadata = await this.source.getMetadata();
        const compressedSize = sourceMetadata.compressedSize || sourceMetadata.size;
        const size = await this.getSize();
        let name;
        if (sourceMetadata.name !== undefined) {
            name = (0, path_1.basename)(sourceMetadata.name, (0, path_1.extname)(sourceMetadata.name));
        }
        return {
            isCompressed: true,
            name,
            size: size === null || size === void 0 ? void 0 : size.size,
            compressedSize,
            isSizeEstimated: size === null || size === void 0 ? void 0 : size.isEstimated,
        };
    }
}
exports.CompressedSource = CompressedSource;
//# sourceMappingURL=compressed-source.js.map