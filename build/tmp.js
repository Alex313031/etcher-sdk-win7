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
exports.freeSpace = exports.withTmpFile = exports.tmpFile = exports.cleanupTmpFiles = void 0;
const checkDiskSpace = require("check-disk-space");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const TMP_RANDOM_BYTES = 6;
const TMP_DIR = (0, path_1.join)((0, os_1.tmpdir)(), 'etcher');
const TRIES = 5;
function randomFilePath(prefix, postfix) {
    return (0, path_1.join)(TMP_DIR, `${prefix}${(0, crypto_1.randomBytes)(TMP_RANDOM_BYTES).toString('hex')}${postfix}`);
}
async function cleanupTmpFiles(olderThan = Date.now(), prefix = '') {
    let dirents = [];
    try {
        dirents = await fs_1.promises.readdir(TMP_DIR, { withFileTypes: true });
    }
    catch (_a) {
        return;
    }
    for (const dirent of dirents) {
        if (dirent.isFile()) {
            if (dirent.name.startsWith(prefix)) {
                const filename = (0, path_1.join)(TMP_DIR, dirent.name);
                try {
                    const stats = await fs_1.promises.stat(filename);
                    if (stats.ctime.getTime() <= olderThan) {
                        await fs_1.promises.unlink(filename);
                    }
                }
                catch (_b) {
                    // noop
                }
            }
        }
    }
}
exports.cleanupTmpFiles = cleanupTmpFiles;
async function createTmpRoot() {
    try {
        await fs_1.promises.mkdir(TMP_DIR, { recursive: true });
    }
    catch (error) {
        // the 'recursive' option is only supported on node >= 10.12.0
        if (error.code === 'EEXIST' && !(await fs_1.promises.stat(TMP_DIR)).isDirectory()) {
            await fs_1.promises.unlink(TMP_DIR);
            await fs_1.promises.mkdir(TMP_DIR, { recursive: true });
        }
    }
}
async function tmpFile({ keepOpen = true, prefix = 'tmp-', postfix = '.tmp', }) {
    await createTmpRoot();
    let fileHandle;
    let path;
    let ok = false;
    for (let i = 0; i < TRIES; i++) {
        path = randomFilePath(prefix, postfix);
        try {
            fileHandle = await fs_1.promises.open(path, 'wx+');
            ok = true;
            break;
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    if (!ok) {
        throw new Error(`Could not generate a temporary filename in ${TRIES} tries`);
    }
    if (!keepOpen && fileHandle !== undefined) {
        await fileHandle.close();
        fileHandle = undefined;
    }
    return { fileHandle, path: path };
}
exports.tmpFile = tmpFile;
async function withTmpFile(options, fn) {
    const result = await tmpFile(options);
    try {
        return await fn(result);
    }
    finally {
        if (options.keepOpen && result.fileHandle !== undefined) {
            await result.fileHandle.close();
        }
        try {
            await fs_1.promises.unlink(result.path);
        }
        catch (error) {
            // The file might already have been deleted by cleanupTmpFiles
            if (error.code !== 'ENOENT') {
                // tslint:disable-next-line:no-unsafe-finally
                throw error;
            }
        }
    }
}
exports.withTmpFile = withTmpFile;
async function freeSpace() {
    try {
        return (await checkDiskSpace(TMP_DIR)).free;
    }
    catch (error) {
        console.warn(`Could not check free disk space in "${TMP_DIR}": ${error}`);
        return 0;
    }
}
exports.freeSpace = freeSpace;
//# sourceMappingURL=tmp.js.map