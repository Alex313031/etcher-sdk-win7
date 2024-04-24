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
exports.GZipSource = void 0;
const zlib_1 = require("zlib");
const compressed_source_1 = require("./compressed-source");
const source_destination_1 = require("./source-destination");
const ISIZE_LENGTH = 4;
class GZipSource extends compressed_source_1.CompressedSource {
    createTransform() {
        return (0, zlib_1.createGunzip)();
    }
    async getSize() {
        const sizeFromPartitionTable = await this.getSizeFromPartitionTable();
        if (await this.source.canRead()) {
            const sourceMetadata = await this.source.getMetadata();
            if (sourceMetadata.size !== undefined) {
                const { buffer } = await this.source.read(Buffer.allocUnsafe(ISIZE_LENGTH), 0, ISIZE_LENGTH, sourceMetadata.size - ISIZE_LENGTH);
                const sizeFromFooter = buffer.readUInt32LE(0);
                // The size from the gzip footer can't be larger than 4GiB (it is stored in 4 bytes)
                // Use the size from the partition table is it is larger (and available)
                return {
                    size: Math.max(sizeFromFooter, sizeFromPartitionTable || 0),
                    isEstimated: true,
                };
            }
        }
        else if (sizeFromPartitionTable !== undefined) {
            return { size: sizeFromPartitionTable, isEstimated: true };
        }
    }
}
exports.GZipSource = GZipSource;
GZipSource.mimetype = 'application/gzip';
source_destination_1.SourceDestination.register(GZipSource);
//# sourceMappingURL=gzip.js.map