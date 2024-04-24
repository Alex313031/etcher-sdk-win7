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
exports.ProgressBlockReadStream = exports.BlockReadStream = void 0;
const stream_1 = require("stream");
const aligned_lockable_buffer_1 = require("./aligned-lockable-buffer");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const progress_1 = require("./source-destination/progress");
class BlockReadStream extends stream_1.Readable {
    constructor({ source, alignment, start = 0, end = Infinity, chunkSize = constants_1.CHUNK_SIZE, maxRetries = 5, numBuffers = 2, }) {
        super({ objectMode: true, highWaterMark: numBuffers - 1 });
        this.bytesRead = 0;
        this.source = source;
        this.alignment = alignment;
        this.bytesRead = start;
        this.end = end;
        this.chunkSize = chunkSize;
        this.maxRetries = maxRetries;
        if (alignment !== undefined) {
            this.chunkSize = Math.max(Math.floor(chunkSize / alignment) * alignment, alignment);
            this.alignedReadableState = new aligned_lockable_buffer_1.AlignedReadableState(chunkSize, alignment, numBuffers);
        }
    }
    async tryRead(buffer) {
        // Tries to read `this.maxRetries` times if the error is transient.
        return await (0, errors_1.retryOnTransientError)(async () => {
            return await this.source.read(buffer, 0, buffer.length, this.bytesRead);
        }, this.maxRetries, constants_1.RETRY_BASE_TIMEOUT);
    }
    async _read() {
        if (this.bytesRead > this.end) {
            this.push(null);
            return;
        }
        let buffer = this.alignment !== undefined
            ? this.alignedReadableState.getCurrentBuffer()
            : Buffer.allocUnsafe(this.chunkSize);
        const toRead = this.end - this.bytesRead + 1;
        if (toRead < buffer.length) {
            buffer = buffer.slice(0, toRead);
        }
        try {
            let unlock;
            if ((0, aligned_lockable_buffer_1.isAlignedLockableBuffer)(buffer)) {
                unlock = await buffer.lock();
            }
            let bytesRead;
            try {
                ({ bytesRead } = await this.tryRead(buffer));
            }
            finally {
                unlock === null || unlock === void 0 ? void 0 : unlock();
            }
            this.bytesRead += bytesRead;
            if (bytesRead !== 0) {
                this.push(buffer.slice(0, bytesRead));
            }
            else {
                this.push(null);
            }
        }
        catch (error) {
            this.emit('error', error);
        }
    }
}
exports.BlockReadStream = BlockReadStream;
exports.ProgressBlockReadStream = (0, progress_1.makeClassEmitProgressEvents)(BlockReadStream, 'bytesRead', 'bytesRead');
//# sourceMappingURL=block-read-stream.js.map