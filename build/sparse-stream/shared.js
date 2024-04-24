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
exports.blocksLength = exports.createSparseReaderStateIterator = void 0;
const crypto_1 = require("crypto");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const lazy_1 = require("../lazy");
function createHasher(checksumType) {
    if (checksumType === 'crc32') {
        return (0, lazy_1.getCrc)().createHash();
    }
    else if (checksumType === 'sha1' || checksumType === 'sha256') {
        return (0, crypto_1.createHash)(checksumType);
    }
    else if (checksumType === 'xxhash3') {
        const { XXHash3 } = (0, lazy_1.getXXHash)();
        return new XXHash3(constants_1.XXHASH_SEED);
    }
}
function* createSparseReaderStateIterator(blocks, verify, generateChecksums) {
    if (verify && generateChecksums) {
        throw new Error('verify and generateChecksums are mutually exclusive');
    }
    if (generateChecksums) {
        for (const block of blocks) {
            if (block.checksumType === undefined) {
                throw new Error('All blocks must have a checksumType if generateChecksums is true');
            }
        }
    }
    for (const block of blocks) {
        const hasher = createHasher(block.checksumType);
        for (const subBlock of block.blocks) {
            yield { block, subBlock, hasher };
        }
        verifyOrGenerateChecksum(hasher, block, verify, generateChecksums);
    }
}
exports.createSparseReaderStateIterator = createSparseReaderStateIterator;
function verifyOrGenerateChecksum(hasher, blocks, verify, generateChecksums) {
    var _a;
    if (hasher !== undefined) {
        const checksum = hasher.digest('hex');
        if (generateChecksums) {
            blocks.checksum = checksum;
        }
        else if (verify && ((_a = blocks.checksum) === null || _a === void 0 ? void 0 : _a.toString()) !== checksum.toString()) {
            throw new errors_1.BlocksVerificationError(blocks, checksum);
        }
    }
}
function blocksLength(blocks) {
    let sum = 0;
    for (const block of blocks) {
        for (const blk of block.blocks) {
            sum += blk.length;
        }
    }
    return sum;
}
exports.blocksLength = blocksLength;
//# sourceMappingURL=shared.js.map