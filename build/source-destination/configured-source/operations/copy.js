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
exports.copy = void 0;
const balena_image_fs_1 = require("balena-image-fs");
async function copyFile(sourceFs, sourcePath, destinationFs, destinationPath) {
    const readStream = sourceFs.createReadStream(`/${sourcePath}`);
    const writeStream = destinationFs.createWriteStream(`/${destinationPath}`);
    await new Promise((resolve, reject) => {
        readStream
            .on('error', reject)
            .pipe(writeStream)
            .on('error', reject)
            .on('close', resolve);
    });
}
async function copy(diskFrom, partitionFrom, pathFrom, diskTo, partitionTo, pathTo) {
    await (0, balena_image_fs_1.interact)(diskFrom, partitionFrom, async (fsFrom) => {
        if (diskFrom === diskTo && partitionFrom === partitionTo) {
            await copyFile(fsFrom, pathFrom, fsFrom, pathTo);
        }
        else {
            await (0, balena_image_fs_1.interact)(diskTo, partitionTo, async (fsTo) => {
                await copyFile(fsFrom, pathFrom, fsTo, pathTo);
            });
        }
    });
}
exports.copy = copy;
//# sourceMappingURL=copy.js.map