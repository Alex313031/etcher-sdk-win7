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
exports.ProgressSparseTransformStream = exports.SparseTransformStream = void 0;
const stream_1 = require("stream");
const aligned_lockable_buffer_1 = require("../aligned-lockable-buffer");
const progress_1 = require("../source-destination/progress");
const utils_1 = require("../utils");
class SparseTransformStream extends stream_1.Transform {
    constructor({ blocks, chunkSize, alignment, numBuffers = 2, }) {
        super({ objectMode: true, highWaterMark: numBuffers - 1 });
        this.position = 0;
        this.bytesWritten = 0;
        this.blocks = blocks;
        this.alignedReadableState = new aligned_lockable_buffer_1.AlignedReadableState(chunkSize, alignment, numBuffers);
    }
    async __transform(chunk) {
        this.position = chunk.position;
        // This will fail if a chunk buffer is larger than chunkSize passed to the constructor
        let buffer = this.alignedReadableState.getCurrentBuffer();
        const unlock = await buffer.lock();
        try {
            if (chunk.buffer.length < buffer.length) {
                buffer = buffer.slice(0, chunk.buffer.length);
            }
            chunk.buffer.copy(buffer);
        }
        finally {
            unlock();
        }
        this.push({ position: chunk.position, buffer });
        this.bytesWritten += chunk.buffer.length;
        this.position += chunk.buffer.length;
    }
    _transform(chunk, _encoding, callback) {
        (0, utils_1.asCallback)(this.__transform(chunk), callback);
    }
}
exports.SparseTransformStream = SparseTransformStream;
exports.ProgressSparseTransformStream = (0, progress_1.makeClassEmitProgressEvents)(SparseTransformStream, 'bytesWritten', 'position');
//# sourceMappingURL=sparse-transform-stream.js.map