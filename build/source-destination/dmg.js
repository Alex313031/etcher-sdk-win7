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
exports.DmgSource = void 0;
const udif_1 = require("@balena/udif");
const source_destination_1 = require("./source-destination");
const source_source_1 = require("./source-source");
const block_transform_stream_1 = require("../block-transform-stream");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const shared_1 = require("../sparse-stream/shared");
const sparse_transform_stream_1 = require("../sparse-stream/sparse-transform-stream");
class DmgSource extends source_source_1.SourceSource {
    constructor(source) {
        super(source);
    }
    async canCreateReadStream() {
        return true;
    }
    async canCreateSparseReadStream() {
        return true;
    }
    async createReadStream({ start = 0, end, alignment, numBuffers, } = {}) {
        if (start !== 0) {
            throw new errors_1.NotCapable();
        }
        const stream = await this.image.createReadStream(end);
        return block_transform_stream_1.BlockTransformStream.alignIfNeeded(stream, alignment, numBuffers);
    }
    async createSparseReadStream({ alignment, numBuffers, } = {}) {
        const blocks = await this.getBlocks();
        const stream = Object.assign(await this.image.createSparseReadStream(), {
            blocks,
        });
        if (alignment !== undefined) {
            const transform = new sparse_transform_stream_1.ProgressSparseTransformStream({
                blocks,
                chunkSize: constants_1.CHUNK_SIZE,
                alignment,
                numBuffers,
            });
            stream.on('error', transform.emit.bind(transform, 'error'));
            stream.pipe(transform);
            return transform;
        }
        else {
            return stream;
        }
    }
    async getBlocks() {
        const result = [];
        for (const blk of this.image.resourceFork.blkx) {
            const childBlocks = blk.map.blocks.filter((b) => DmgSource.mappedBlockTypes.includes(b.type));
            if (childBlocks.length === 0) {
                continue;
            }
            let checksumType;
            let checksum;
            if (blk.map.checksum.type === udif_1.CHECKSUM_TYPE.CRC32) {
                checksumType = 'crc32';
                checksum = blk.map.checksum.value;
            }
            const blocks = [];
            result.push({ checksumType, checksum, blocks });
            let lastBlock;
            for (const childBlk of childBlocks) {
                const offset = (blk.map.sectorNumber + childBlk.sectorNumber) * udif_1.SECTOR_SIZE;
                const length = childBlk.sectorCount * udif_1.SECTOR_SIZE;
                if (lastBlock === undefined) {
                    // First iteration of the loop
                    lastBlock = { offset, length };
                }
                else if (lastBlock.offset + lastBlock.length === offset) {
                    // Last block and this block are adjacent, increase last block's length
                    lastBlock.length += length;
                }
                else {
                    // Last block and this block are not adjacent:
                    blocks.push(lastBlock);
                    lastBlock = { offset, length };
                }
            }
            // ! because we know lastBlock can't be undefined
            blocks.push(lastBlock);
        }
        return result;
    }
    async _getMetadata() {
        const blocks = await this.getBlocks();
        const blockmappedSize = (0, shared_1.blocksLength)(blocks);
        const compressedSize = (await this.source.getMetadata()).size;
        const size = await this.image.getUncompressedSize();
        return { blocks, blockmappedSize, compressedSize, size };
    }
    async _open() {
        await super._open();
        this.image = new udif_1.Image({
            size: (await this.source.getMetadata()).size,
            createReadStream: async (start, end) => {
                return await this.source.createReadStream({ start, end });
            },
        });
        await this.image.ready;
    }
}
exports.DmgSource = DmgSource;
DmgSource.mappedBlockTypes = [
    udif_1.BLOCK.ZEROFILL,
    udif_1.BLOCK.RAW,
    udif_1.BLOCK.UDCO,
    udif_1.BLOCK.UDZO,
    udif_1.BLOCK.UDBZ,
    udif_1.BLOCK.LZFSE,
];
DmgSource.requiresRandomReadableSource = true;
DmgSource.mimetype = 'application/x-apple-diskimage';
source_destination_1.SourceDestination.register(DmgSource);
//# sourceMappingURL=dmg.js.map