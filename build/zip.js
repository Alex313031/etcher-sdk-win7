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
exports.getFileStreamFromZipStream = void 0;
const unzip = require("unzip-stream");
const constants_1 = require("./constants");
const getFileStreamFromZipStream = async (zipStream, match) => {
    return await new Promise((resolve, reject) => {
        let found = false;
        zipStream.on('error', reject);
        const unzipper = unzip.Parse();
        unzipper.on('error', reject);
        zipStream.pipe(unzipper);
        unzipper.on('entry', (entry) => {
            if (!found && entry.type === 'File' && match(entry.path)) {
                found = true;
                // The compressed size is only known if the size is known
                if (entry.size !== undefined) {
                    entry.compressedSize = unzipper.unzipStream.parsedEntity.compressedSize;
                }
                entry.on('end', () => {
                    var _a, _b;
                    // Stop reading the zip archive once the file we want has been extracted.
                    (_a = zipStream.unpipe) === null || _a === void 0 ? void 0 : _a.call(zipStream, unzipper);
                    // @ts-ignore
                    (_b = zipStream.destroy) === null || _b === void 0 ? void 0 : _b.call(zipStream);
                });
                resolve(entry);
            }
            else {
                entry.autodrain();
            }
        });
        zipStream.on('end', () => {
            if (!found) {
                reject(new Error(constants_1.NO_MATCHING_FILE_MSG));
            }
        });
    });
};
exports.getFileStreamFromZipStream = getFileStreamFromZipStream;
//# sourceMappingURL=zip.js.map