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
exports.retryOnTransientError = exports.BlocksVerificationError = exports.ChecksumVerificationError = exports.VerificationError = exports.NotCapable = void 0;
const process_1 = require("process");
const utils_1 = require("./utils");
class NotCapable extends Error {
}
exports.NotCapable = NotCapable;
class VerificationError extends Error {
    constructor() {
        super(...arguments);
        this.code = 'EVALIDATION';
    }
}
exports.VerificationError = VerificationError;
class ChecksumVerificationError extends VerificationError {
    constructor(message, checksum, expectedChecksum) {
        super(message);
        this.checksum = checksum;
        this.expectedChecksum = expectedChecksum;
    }
}
exports.ChecksumVerificationError = ChecksumVerificationError;
function blocksVerificationErrorMessage(blocksWithChecksum, checksum) {
    const start = blocksWithChecksum.blocks[0].offset;
    const lastBlock = blocksWithChecksum.blocks[blocksWithChecksum.blocks.length - 1];
    const end = lastBlock.offset + lastBlock.length - 1;
    return `Checksum does not match for range [${start}, ${end}]: "${blocksWithChecksum.checksum}" != "${checksum}"`;
}
class BlocksVerificationError extends VerificationError {
    constructor(blocks, checksum) {
        super(blocksVerificationErrorMessage(blocks, checksum));
        this.blocks = blocks;
        this.checksum = checksum;
    }
}
exports.BlocksVerificationError = BlocksVerificationError;
/**
 * @summary Determine whether an error is considered a
 * transient occurrence, and the operation should be retried
 * Errors considered potentially temporary are:
 *   - Mac OS: ENXIO, EBUSY
 *   - Windows: ENOENT, UNKNOWN
 *   - Linux: EIO, EBUSY
 */
function isTransientError(error) {
    if (process_1.platform === 'darwin') {
        return error.code === 'ENXIO' || error.code === 'EBUSY';
    }
    else if (process_1.platform === 'linux') {
        return error.code === 'EIO' || error.code === 'EBUSY';
    }
    else if (process_1.platform === 'win32') {
        return error.code === 'ENOENT' || error.code === 'UNKNOWN';
    }
    return false;
}
async function retryOnTransientError(fn, maxRetries, baseDelay) {
    let retries = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (error) {
            if (isTransientError(error)) {
                if (retries < maxRetries) {
                    retries += 1;
                    await (0, utils_1.delay)(baseDelay * retries);
                    continue;
                }
                error.code = 'EUNPLUGGED';
            }
            throw error;
        }
    }
}
exports.retryOnTransientError = retryOnTransientError;
//# sourceMappingURL=errors.js.map