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
exports.BlockDevice = void 0;
const direct_io_1 = require("@ronomon/direct-io");
const fs_1 = require("fs");
const os_1 = require("os");
const block_write_stream_1 = require("../block-write-stream");
const constants_1 = require("../constants");
const diskpart_1 = require("../diskpart");
const lazy_1 = require("../lazy");
const sparse_write_stream_1 = require("../sparse-stream/sparse-write-stream");
const utils_1 = require("../utils");
const file_1 = require("./file");
/**
 * @summary Time, in milliseconds, to wait before unmounting on success
 */
const UNMOUNT_ON_SUCCESS_TIMEOUT_MS = 2000;
const WIN32_FIRST_BYTES_TO_KEEP = 64 * 1024;
class BlockDevice extends file_1.File {
    constructor({ drive, unmountOnSuccess = false, write = false, direct = true, }) {
        super({ path: drive.raw, write });
        this.emitsProgress = false;
        this.drive = drive;
        this.unmountOnSuccess = unmountOnSuccess;
        this.oDirect = direct;
        // alignment must be at most 4k
        this.alignment = Math.min(drive.blockSize || constants_1.DEFAULT_ALIGNMENT, 4 * 1024 ** 2);
    }
    getAlignment() {
        if (this.oDirect) {
            return this.alignment;
        }
    }
    getOpenFlags() {
        // tslint:disable:no-bitwise
        let flags = this.oWrite ? fs_1.constants.O_RDWR : fs_1.constants.O_RDONLY;
        if (this.oDirect) {
            flags |= fs_1.constants.O_DIRECT;
        }
        if (this.oWrite) {
            const plat = (0, os_1.platform)();
            if (plat === 'linux') {
                flags |= fs_1.constants.O_EXCL;
            }
            else if (plat === 'darwin') {
                flags |= direct_io_1.O_EXLOCK;
            }
            // TODO: use O_EXCLOCK on windows too (getting EBUSY errors with it)
        }
        // tslint:enable:no-bitwise
        return flags;
    }
    get isSystem() {
        return this.drive.isSystem;
    }
    get raw() {
        return this.drive.raw;
    }
    get device() {
        return this.drive.device;
    }
    get devicePath() {
        return this.drive.devicePath;
    }
    get description() {
        return this.drive.description;
    }
    get mountpoints() {
        return this.drive.mountpoints;
    }
    get size() {
        return this.drive.size;
    }
    async _getMetadata() {
        return {
            size: this.drive.size || undefined,
            name: this.drive.device,
        };
    }
    async canWrite() {
        return !this.drive.isReadOnly;
    }
    async canCreateWriteStream() {
        return !this.drive.isReadOnly;
    }
    async canCreateSparseWriteStream() {
        return !this.drive.isReadOnly;
    }
    async createWriteStream({ highWaterMark, } = {}) {
        const stream = new block_write_stream_1.ProgressBlockWriteStream({
            destination: this,
            delayFirstBuffer: (0, os_1.platform)() === 'win32',
            highWaterMark,
        });
        stream.on('finish', stream.emit.bind(stream, 'done'));
        return stream;
    }
    async createSparseWriteStream({ highWaterMark, } = {}) {
        const stream = new sparse_write_stream_1.ProgressSparseWriteStream({
            destination: this,
            firstBytesToKeep: (0, os_1.platform)() === 'win32' ? WIN32_FIRST_BYTES_TO_KEEP : 0,
            highWaterMark,
        });
        stream.on('finish', stream.emit.bind(stream, 'done'));
        return stream;
    }
    async _open() {
        const plat = (0, os_1.platform)();
        if (this.oWrite) {
            if (plat !== 'win32') {
                const unmountDisk = (0, lazy_1.getUnmountDisk)();
                await unmountDisk(this.drive.device);
            }
            // diskpart clean on windows
            await (0, diskpart_1.clean)(this.drive.device);
        }
        await super._open();
        if (plat === 'darwin') {
            await (0, utils_1.fromCallback)((cb) => {
                (0, direct_io_1.setF_NOCACHE)(this.fileHandle.fd, 1, cb);
            });
        }
    }
    async _close() {
        await super._close();
        // Closing a file descriptor on a drive containing mountable
        // partitions causes macOS to mount the drive. If we try to
        // unmount too quickly, then the drive might get re-mounted
        // right afterwards.
        if (this.unmountOnSuccess) {
            await (0, utils_1.delay)(UNMOUNT_ON_SUCCESS_TIMEOUT_MS);
            const unmountDisk = (0, lazy_1.getUnmountDisk)();
            await unmountDisk(this.drive.device);
        }
    }
    offsetIsAligned(offset) {
        return offset % this.alignment === 0;
    }
    alignOffsetBefore(offset) {
        return Math.floor(offset / this.alignment) * this.alignment;
    }
    alignOffsetAfter(offset) {
        return Math.ceil(offset / this.alignment) * this.alignment;
    }
    async alignedRead(buffer, bufferOffset, length, sourceOffset) {
        const start = this.alignOffsetBefore(sourceOffset);
        const end = this.alignOffsetAfter(sourceOffset + length);
        const alignedBuffer = (0, direct_io_1.getAlignedBuffer)(end - start, this.alignment);
        const { bytesRead } = await super.read(alignedBuffer, 0, alignedBuffer.length, start);
        const offset = sourceOffset - start;
        alignedBuffer.copy(buffer, bufferOffset, offset, offset + length);
        return { buffer, bytesRead: Math.min(length, bytesRead - offset) };
    }
    read(buffer, bufferOffset, length, sourceOffset) {
        if (!(this.offsetIsAligned(sourceOffset) && this.offsetIsAligned(length))) {
            return this.alignedRead(buffer, bufferOffset, length, sourceOffset);
        }
        else {
            return super.read(buffer, bufferOffset, length, sourceOffset);
        }
    }
    async alignedWrite(buffer, bufferOffset, length, fileOffset) {
        const start = this.alignOffsetBefore(fileOffset);
        const end = this.alignOffsetAfter(fileOffset + length);
        const alignedBuffer = (0, direct_io_1.getAlignedBuffer)(end - start, this.alignment);
        await super.read(alignedBuffer, 0, alignedBuffer.length, start);
        const offset = fileOffset - start;
        buffer.copy(alignedBuffer, offset, bufferOffset, length);
        await super.write(alignedBuffer, 0, alignedBuffer.length, start);
        return { buffer, bytesWritten: length };
    }
    write(buffer, bufferOffset, length, fileOffset) {
        if (!(this.offsetIsAligned(fileOffset) && this.offsetIsAligned(length))) {
            return this.alignedWrite(buffer, bufferOffset, length, fileOffset);
        }
        else {
            return super.write(buffer, bufferOffset, length, fileOffset);
        }
    }
}
exports.BlockDevice = BlockDevice;
//# sourceMappingURL=block-device.js.map