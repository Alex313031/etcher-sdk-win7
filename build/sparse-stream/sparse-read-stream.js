"use strict";
/*
 * Copyright 2019 balena.io
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
exports.SparseReadStream = void 0;
const stream_1 = require("stream");
const aligned_lockable_buffer_1 = require("../aligned-lockable-buffer");
const shared_1 = require("./shared");
class SparseReadStream extends stream_1.Readable {
    constructor({ source, blocks, chunkSize, verify, generateChecksums, alignment, numBuffers = 2, }) {
        super({ objectMode: true, highWaterMark: numBuffers - 1 });
        this.positionInBlock = 0;
        this.source = source;
        this.blocks = blocks;
        this.chunkSize = chunkSize;
        if (alignment !== undefined) {
            this.alignedReadableState = new aligned_lockable_buffer_1.AlignedReadableState(chunkSize, alignment, numBuffers);
        }
        this.stateIterator = (0, shared_1.createSparseReaderStateIterator)(blocks, verify, generateChecksums);
        this.nextBlock();
    }
    async _read() {
        try {
            this.push(await this.__read());
        }
        catch (error) {
            this.emit('error', error);
            this.push(null);
        }
    }
    nextBlock() {
        this.state = this.stateIterator.next().value;
        this.positionInBlock = 0;
    }
    async __read() {
        var _a;
        if (this.state === undefined) {
            // No current block means we're done reading
            return null;
        }
        const length = Math.min(this.chunkSize, this.state.subBlock.length - this.positionInBlock);
        const buffer = this.alignedReadableState !== undefined
            ? this.alignedReadableState.getCurrentBuffer().slice(0, length)
            : Buffer.allocUnsafe(length);
        const unlock = (0, aligned_lockable_buffer_1.isAlignedLockableBuffer)(buffer)
            ? await buffer.lock()
            : undefined;
        try {
            await this.source.read(buffer, 0, length, this.state.subBlock.offset + this.positionInBlock);
            (_a = this.state.hasher) === null || _a === void 0 ? void 0 : _a.update(buffer);
        }
        finally {
            unlock === null || unlock === void 0 ? void 0 : unlock();
        }
        const chunk = {
            buffer,
            position: this.state.subBlock.offset + this.positionInBlock,
        };
        this.positionInBlock += length;
        if (this.positionInBlock === this.state.subBlock.length) {
            this.nextBlock();
        }
        return chunk;
    }
}
exports.SparseReadStream = SparseReadStream;
//# sourceMappingURL=sparse-read-stream.js.map