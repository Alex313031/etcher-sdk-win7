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
exports.File = exports.ProgressWriteStream = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const progress_1 = require("./progress");
const source_destination_1 = require("./source-destination");
const block_read_stream_1 = require("../block-read-stream");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const sparse_write_stream_1 = require("../sparse-stream/sparse-write-stream");
exports.ProgressWriteStream = (0, progress_1.makeClassEmitProgressEvents)(fs_1.WriteStream, 'bytesWritten', 'bytesWritten');
const READ_TRIES = 5;
const readEndMarker = Buffer.from(`not the correct data ${Math.random()}`);
class File extends source_destination_1.SourceDestination {
    constructor({ path, write = false }) {
        super();
        this.path = path;
        this.oWrite = write;
    }
    getOpenFlags() {
        return this.oWrite
            ? // tslint:disable-next-line:no-bitwise
                fs_1.constants.O_CREAT | fs_1.constants.O_RDWR
            : fs_1.constants.O_RDONLY;
    }
    async canRead() {
        return true;
    }
    async canWrite() {
        return this.oWrite;
    }
    async canCreateReadStream() {
        return true;
    }
    canCreateWriteStream() {
        return this.canWrite();
    }
    canCreateSparseWriteStream() {
        return this.canWrite();
    }
    async _getMetadata() {
        return {
            size: (await fs_1.promises.stat(this.path)).size,
            name: (0, path_1.basename)(this.path),
        };
    }
    async read(buffer, bufferOffset, length, sourceOffset) {
        // In very rare occasions (happened on Linux with node 12 reading from a block device: O_DIRECT + O_SYNC into an aligned buffer),
        // the read does not read the whole required length (up to 4KiB can be missing at the end of 1MiB reads).
        // This was checked by filling the buffer with a specific pattern before reading and looking for this pattern
        // in the buffer after the read.
        // To mitigate this, we write a specific marker at the end of the buffer before reading and retry the read if
        // it is still there after reading.
        let result;
        let tries = READ_TRIES;
        const markerPosition = bufferOffset + length - readEndMarker.length;
        if (length >= readEndMarker.length) {
            readEndMarker.copy(buffer, markerPosition);
        }
        do {
            if (tries < READ_TRIES) {
                console.warn('Incomplete read', {
                    path: this.path,
                    bufferOffset,
                    length,
                    sourceOffset,
                    bufferLength: buffer.length,
                });
            }
            result = await this.fileHandle.read(buffer, bufferOffset, length, sourceOffset);
            tries -= 1;
        } while (tries > 0 &&
            length >= readEndMarker.length &&
            result.bytesRead === length &&
            readEndMarker.compare(buffer, markerPosition, markerPosition + readEndMarker.length) === 0);
        return result;
    }
    write(buffer, bufferOffset, length, fileOffset) {
        return this.fileHandle.write(buffer, bufferOffset, length, fileOffset);
    }
    async createReadStream({ emitProgress = false, start = 0, end, alignment, numBuffers, } = {}) {
        await this.open();
        const metadata = await this.getMetadata();
        if (metadata.size !== 0) {
            // workaround for special files like /dev/zero or /dev/random
            const lastByte = metadata.size - 1;
            end = end === undefined ? lastByte : Math.min(end, lastByte);
        }
        if (emitProgress) {
            return new block_read_stream_1.ProgressBlockReadStream({
                source: this,
                alignment,
                start,
                end,
                numBuffers,
            });
        }
        else {
            return new block_read_stream_1.BlockReadStream({
                source: this,
                alignment,
                start,
                end,
                numBuffers,
            });
        }
    }
    async createWriteStream({ highWaterMark, } = {}) {
        // TODO: use SourceDestinationFs (implement write) when node 14 becomes LTS
        // @ts-ignore: @types/node is wrong about fs.WriteStream constructor: it takes 2 arguments, the first one is the file path
        const stream = new exports.ProgressWriteStream(null, {
            fd: this.fileHandle.fd,
            autoClose: false,
            highWaterMark,
        });
        stream.on('finish', stream.emit.bind(stream, 'done'));
        return stream;
    }
    async createSparseWriteStream({ highWaterMark, } = {}) {
        const stream = new sparse_write_stream_1.ProgressSparseWriteStream({
            destination: this,
            highWaterMark,
        });
        stream.on('finish', stream.emit.bind(stream, 'done'));
        return stream;
    }
    async _open() {
        await (0, errors_1.retryOnTransientError)(async () => {
            this.fileHandle = await fs_1.promises.open(this.path, this.getOpenFlags());
        }, 5, constants_1.RETRY_BASE_TIMEOUT);
    }
    async _close() {
        await this.fileHandle.close();
    }
}
exports.File = File;
//# sourceMappingURL=file.js.map