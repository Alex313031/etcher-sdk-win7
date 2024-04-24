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
exports.ProgressBlockWriteStream = exports.BlockWriteStream = void 0;
const direct_io_1 = require("@ronomon/direct-io");
const _debug = require("debug");
const stream_1 = require("stream");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const progress_1 = require("./source-destination/progress");
const utils_1 = require("./utils");
const debug = _debug('etcher:writer:block-write-stream');
class BlockWriteStream extends stream_1.Writable {
    constructor({ destination, highWaterMark, delayFirstBuffer = false, maxRetries = 5, }) {
        super({ objectMode: true, highWaterMark });
        this.bytesWritten = 0;
        this.position = 0;
        this.destination = destination;
        this.delayFirstBuffer = delayFirstBuffer;
        this.maxRetries = maxRetries;
    }
    async writeBuffer(buffer, position) {
        await (0, errors_1.retryOnTransientError)(async () => {
            await this.destination.write(buffer, 0, buffer.length, position);
        }, this.maxRetries, constants_1.RETRY_BASE_TIMEOUT);
    }
    async __write(buffer) {
        const unlock = await buffer.rlock();
        debug('_write', buffer.length, this.position, this.bytesWritten);
        try {
            // Keep the first buffer in memory and write it once the rest has been written.
            // This is to prevent Windows from mounting the device while we flash it.
            if (this.delayFirstBuffer && this.firstBuffer === undefined) {
                this.firstBuffer = (0, direct_io_1.getAlignedBuffer)(buffer.length, buffer.alignment);
                buffer.copy(this.firstBuffer);
            }
            else {
                await this.writeBuffer(buffer, this.position);
                this.bytesWritten += buffer.length;
            }
            this.position += buffer.length;
        }
        finally {
            unlock();
        }
    }
    _write(buffer, _encoding, callback) {
        (0, utils_1.asCallback)(this.__write(buffer), callback);
    }
    async __final() {
        debug('_final');
        if (this.firstBuffer) {
            try {
                await this.writeBuffer(this.firstBuffer, 0);
                this.bytesWritten += this.firstBuffer.length;
            }
            catch (error) {
                this.destroy();
                throw error;
            }
        }
    }
    /**
     * @summary Write buffered data before a stream ends, called by stream internals
     */
    _final(callback) {
        (0, utils_1.asCallback)(this.__final(), callback);
    }
}
exports.BlockWriteStream = BlockWriteStream;
exports.ProgressBlockWriteStream = (0, progress_1.makeClassEmitProgressEvents)(BlockWriteStream, 'bytesWritten', 'bytesWritten');
//# sourceMappingURL=block-write-stream.js.map