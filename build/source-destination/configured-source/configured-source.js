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
exports.ConfiguredSource = exports.SourceDisk = void 0;
const balena_image_fs_1 = require("balena-image-fs");
const _debug = require("debug");
const file_disk_1 = require("file-disk");
const partitioninfo_1 = require("partitioninfo");
const constants_1 = require("../../constants");
const errors_1 = require("../../errors");
const shared_1 = require("../../sparse-stream/shared");
const sparse_filter_stream_1 = require("../../sparse-stream/sparse-filter-stream");
const sparse_read_stream_1 = require("../../sparse-stream/sparse-read-stream");
const block_device_1 = require("../block-device");
const source_source_1 = require("../source-source");
const configure_1 = require("./configure");
const debug = _debug('etcher-sdk:configured-source');
class SourceDisk extends file_disk_1.Disk {
    constructor(source) {
        super(true, // readOnly
        true, // recordWrites
        true, // recordReads
        true);
        this.source = source;
        if (source instanceof block_device_1.BlockDevice && source.oDirect) {
            // Reads into non aligned buffers won't work in partitioninfo and file-disk
            throw new Error("Can't create a SourceDisk from a BlockDevice opened with O_DIRECT");
        }
    }
    async _getCapacity() {
        // Don't create SourceDisks with sources that do not define a size
        const size = (await this.source.getMetadata()).size;
        if (size === undefined) {
            throw new errors_1.NotCapable();
        }
        return size;
    }
    async _read(buffer, bufferOffset, length, fileOffset) {
        return await this.source.read(buffer, bufferOffset, length, fileOffset);
    }
    async _write(_buffer, _bufferOffset, _length, _fileOffset) {
        throw new Error("Can't write to a SourceDisk");
    }
    async _flush() {
        // noop
    }
}
exports.SourceDisk = SourceDisk;
class ConfiguredSource extends source_source_1.SourceSource {
    constructor({ source, // source needs to implement read and createReadStream
    shouldTrimPartitions, createStreamFromDisk, configure, checksumType = 'xxhash3', chunkSize = constants_1.CHUNK_SIZE, }) {
        super(source);
        this.shouldTrimPartitions = shouldTrimPartitions;
        this.createStreamFromDisk = createStreamFromDisk;
        this.checksumType = checksumType;
        this.chunkSize = chunkSize;
        this.disk = new SourceDisk(source);
        if (configure === 'legacy') {
            this.configure = configure_1.configure;
        }
        else {
            this.configure = configure;
        }
    }
    async getBlocks() {
        // Align ranges to this.chunkSize
        const blocks = await this.disk.getRanges(this.chunkSize);
        if (blocks.length) {
            const lastBlock = blocks[blocks.length - 1];
            const metadata = await this.source.getMetadata();
            const overflow = lastBlock.offset + lastBlock.length - metadata.size;
            if (overflow > 0) {
                lastBlock.length -= overflow;
            }
        }
        return blocks.map((block) => ({ blocks: [block] }));
    }
    async getBlocksWithChecksumType(generateChecksums) {
        let blocks = await this.getBlocks();
        if (generateChecksums) {
            blocks = blocks.map((block) => ({
                ...block,
                checksumType: this.checksumType,
            }));
        }
        return blocks;
    }
    async canRead() {
        return true;
    }
    async canCreateReadStream() {
        return true;
    }
    async canCreateSparseReadStream() {
        return true;
    }
    async read(buffer, bufferOffset, length, sourceOffset) {
        return await this.disk.read(buffer, bufferOffset, length, sourceOffset);
    }
    async createReadStream(options) {
        const imageStream = await this.source.createReadStream(options);
        const transform = this.disk.getTransformStream();
        imageStream.on('error', (err) => {
            transform.emit('error', err);
        });
        imageStream.pipe(transform);
        return transform;
    }
    async createSparseReadStreamFromDisk(generateChecksums, alignment, numBuffers = 2) {
        return new sparse_read_stream_1.SparseReadStream({
            source: this,
            blocks: await this.getBlocksWithChecksumType(generateChecksums),
            chunkSize: constants_1.CHUNK_SIZE,
            verify: false,
            generateChecksums,
            alignment,
            numBuffers,
        });
    }
    async createSparseReadStreamFromStream(generateChecksums, alignment, numBuffers = 2) {
        const stream = await this.createReadStream({
            alignment,
            numBuffers,
        });
        const transform = new sparse_filter_stream_1.SparseFilterStream({
            blocks: await this.getBlocksWithChecksumType(generateChecksums),
            verify: false,
            generateChecksums,
        });
        stream.on('error', transform.emit.bind(transform, 'error'));
        stream.pipe(transform);
        return transform;
    }
    async createSparseReadStream({ generateChecksums = false, alignment, numBuffers = 2, } = {}) {
        if (this.createStreamFromDisk) {
            return await this.createSparseReadStreamFromDisk(generateChecksums, alignment, numBuffers);
        }
        else {
            return await this.createSparseReadStreamFromStream(generateChecksums, alignment, numBuffers);
        }
    }
    async _getMetadata() {
        const sourceMetadata = await this.source.getMetadata();
        const blocks = await this.getBlocks();
        const blockmappedSize = (0, shared_1.blocksLength)(blocks);
        return { ...sourceMetadata, blocks, blockmappedSize };
    }
    async trimPartitions() {
        let partitions;
        try {
            ({ partitions } = await (0, partitioninfo_1.getPartitions)(this.disk, {
                includeExtended: false,
            }));
        }
        catch (error) {
            debug("Couldn't read partition table", error);
            return;
        }
        for (const partition of partitions) {
            try {
                await (0, balena_image_fs_1.interact)(this.disk, partition.index, async (fs) => {
                    // @ts-ignore: trim method exists for ext partitions
                    if (fs.trim !== undefined) {
                        // @ts-ignore: trim method exists for ext partitions
                        await fs.trim();
                    }
                });
            }
            catch (_a) {
                // Unsupported filesystem
            }
        }
        const discards = this.disk.getDiscardedChunks();
        const discardedBytes = discards
            .map((d) => d.end - d.start + 1)
            .reduce((a, b) => a + b, 0);
        // TODO: discarededBytes in metadata ?
        const metadata = await this.getMetadata();
        if (metadata.size !== undefined) {
            const percentage = Math.round((discardedBytes / metadata.size) * 100);
            debug(`discarded ${discards.length} chunks, ${discardedBytes} bytes, ${percentage}% of the image`);
        }
    }
    async _open() {
        await super._open();
        if (this.configure !== undefined) {
            await this.configure(this.disk);
        }
        if (this.shouldTrimPartitions) {
            await this.trimPartitions();
        }
        this.disk.recordReads = false;
    }
    async _close() {
        await super._close();
    }
}
exports.ConfiguredSource = ConfiguredSource;
//# sourceMappingURL=configured-source.js.map