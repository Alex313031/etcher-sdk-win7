"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressSparseWriteStream = exports.SparseWriteStream = void 0;
const direct_io_1 = require("@ronomon/direct-io");
const stream_1 = require("stream");
const aligned_lockable_buffer_1 = require("../aligned-lockable-buffer");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const progress_1 = require("../source-destination/progress");
const utils_1 = require("../utils");
class SparseWriteStream extends stream_1.Writable {
    constructor({ destination, highWaterMark, firstBytesToKeep = 0, maxRetries = 5, }) {
        super({ objectMode: true, highWaterMark });
        this.bytesWritten = 0;
        this._firstChunks = [];
        this.destination = destination;
        this.firstBytesToKeep = firstBytesToKeep;
        this.maxRetries = maxRetries;
    }
    async writeChunk(chunk, flushing = false) {
        await (0, errors_1.retryOnTransientError)(async () => {
            this.position = chunk.position;
            await this.destination.write(chunk.buffer, 0, chunk.buffer.length, chunk.position);
            if (!flushing) {
                this.position += chunk.buffer.length;
                this.bytesWritten += chunk.buffer.length;
            }
        }, this.maxRetries, constants_1.RETRY_BASE_TIMEOUT);
    }
    copyChunk(chunk) {
        if ((0, aligned_lockable_buffer_1.isAlignedLockableBuffer)(chunk.buffer)) {
            const buffer = (0, direct_io_1.getAlignedBuffer)(chunk.buffer.length, chunk.buffer.alignment);
            chunk.buffer.copy(buffer);
            return { position: chunk.position, buffer };
        }
        else {
            return chunk;
        }
    }
    async __write(chunk) {
        const unlock = (0, aligned_lockable_buffer_1.isAlignedLockableBuffer)(chunk.buffer)
            ? await chunk.buffer.rlock()
            : undefined;
        try {
            // Keep the first blocks in memory and write them once the rest has been written.
            // This is to prevent Windows from mounting the device while we flash it.
            if (chunk.position < this.firstBytesToKeep) {
                const end = chunk.position + chunk.buffer.length;
                if (end <= this.firstBytesToKeep) {
                    this._firstChunks.push(this.copyChunk(chunk));
                    this.position = chunk.position + chunk.buffer.length;
                    this.bytesWritten += chunk.buffer.length;
                }
                else {
                    const difference = this.firstBytesToKeep - chunk.position;
                    this._firstChunks.push(this.copyChunk({
                        position: chunk.position,
                        buffer: chunk.buffer.slice(0, difference),
                    }));
                    this.position = this.firstBytesToKeep;
                    this.bytesWritten += difference;
                    const remainingBuffer = chunk.buffer.slice(difference);
                    await this.writeChunk({
                        position: this.firstBytesToKeep,
                        buffer: remainingBuffer,
                    });
                }
            }
            else {
                await this.writeChunk(chunk);
            }
        }
        finally {
            unlock === null || unlock === void 0 ? void 0 : unlock();
        }
    }
    _write(chunk, _enc, callback) {
        (0, utils_1.asCallback)(this.__write(chunk), callback);
    }
    async __final() {
        try {
            for (const chunk of this._firstChunks) {
                await this.writeChunk(chunk, true);
            }
        }
        catch (error) {
            this.destroy();
            throw error;
        }
    }
    /**
     * @summary Write buffered data before a stream ends, called by stream internals
     */
    _final(callback) {
        (0, utils_1.asCallback)(this.__final(), callback);
    }
}
exports.SparseWriteStream = SparseWriteStream;
exports.ProgressSparseWriteStream = (0, progress_1.makeClassEmitProgressEvents)(SparseWriteStream, 'bytesWritten', 'position');
//# sourceMappingURL=sparse-write-stream.js.map