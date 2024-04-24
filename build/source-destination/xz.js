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
exports.XzSource = void 0;
const lzma_native_1 = require("lzma-native");
const os_1 = require("os");
const util_1 = require("util");
const compressed_source_1 = require("./compressed-source");
const source_destination_1 = require("./source-destination");
const parseFileIndexAsync = (0, util_1.promisify)(lzma_native_1.parseFileIndex);
class XzSource extends compressed_source_1.CompressedSource {
    createTransform() {
        return (0, lzma_native_1.createDecompressor)({ memlimit: Math.floor((0, os_1.totalmem)() * 0.2) });
    }
    async getSize() {
        if (!(await this.source.canRead())) {
            const sizeFromPartitionTable = await this.getSizeFromPartitionTable();
            if (sizeFromPartitionTable !== undefined) {
                return { size: sizeFromPartitionTable, isEstimated: true };
            }
            return;
        }
        const { size } = await this.source.getMetadata();
        if (size === undefined) {
            return;
        }
        const { uncompressedSize } = await parseFileIndexAsync({
            fileSize: size,
            read: async (count, offset, callback) => {
                try {
                    const readResult = await this.source.read(Buffer.allocUnsafe(count), 0, count, offset);
                    callback(null, readResult.buffer);
                }
                catch (error) {
                    callback(error);
                }
            },
        });
        return { size: uncompressedSize, isEstimated: false };
    }
}
exports.XzSource = XzSource;
XzSource.mimetype = 'application/x-xz';
source_destination_1.SourceDestination.register(XzSource);
//# sourceMappingURL=xz.js.map