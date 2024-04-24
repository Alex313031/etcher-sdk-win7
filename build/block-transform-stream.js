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
exports.BlockTransformStream = void 0;
const stream_1 = require("stream");
const aligned_lockable_buffer_1 = require("./aligned-lockable-buffer");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
class BlockTransformStream extends stream_1.Transform {
    constructor({ chunkSize, alignment, numBuffers = 2, }) {
        super({ objectMode: true, highWaterMark: numBuffers - 1 });
        this.bytesRead = 0;
        this.bytesWritten = 0;
        this.currentBufferPosition = 0;
        this.alignedReadableState = new aligned_lockable_buffer_1.AlignedReadableState(chunkSize, alignment, numBuffers);
    }
    __flush() {
        this.unlockCurrentBuffer();
        if (this.currentBufferPosition !== this.currentBuffer.length) {
            this.push(this.currentBuffer.slice(0, this.currentBufferPosition));
        }
        else {
            this.push(this.currentBuffer);
        }
        this.bytesWritten += this.currentBufferPosition;
        this.currentBufferPosition = 0;
    }
    async pushChunk(chunk) {
        if (chunk.length === 0) {
            return;
        }
        // Get an aligned buffer and lock it when starting or when the last aligned buffer was just flushed
        if (this.currentBufferPosition === 0) {
            this.currentBuffer = this.alignedReadableState.getCurrentBuffer();
            this.unlockCurrentBuffer = await this.currentBuffer.lock();
        }
        // Copy the current chunk into the current aligned buffer
        const lengthToCopy = Math.min(chunk.length, this.currentBuffer.length - this.currentBufferPosition);
        chunk.copy(this.currentBuffer, this.currentBufferPosition, 0, lengthToCopy);
        this.currentBufferPosition += lengthToCopy;
        this.bytesRead += lengthToCopy;
        // If the current aligned buffer is full, push it
        if (this.currentBufferPosition === this.currentBuffer.length) {
            this.__flush();
        }
        // If the chunk did not fit in the last aligned buffer, copy the remaining part into the next aligned buffer
        if (lengthToCopy < chunk.length) {
            await this.pushChunk(chunk.slice(lengthToCopy));
        }
    }
    _transform(chunk, _encoding, callback) {
        (0, utils_1.asCallback)(this.pushChunk(chunk), callback);
    }
    _flush(callback) {
        try {
            this.__flush();
            callback();
        }
        catch (error) {
            callback(error);
        }
    }
    static alignIfNeeded(stream, alignment, numBuffers) {
        if (alignment === undefined) {
            return stream;
        }
        const transform = new BlockTransformStream({
            chunkSize: constants_1.CHUNK_SIZE,
            alignment,
            numBuffers,
        });
        stream.on('error', transform.emit.bind(transform, 'error'));
        stream.pipe(transform);
        return transform;
    }
}
exports.BlockTransformStream = BlockTransformStream;
//# sourceMappingURL=block-transform-stream.js.map