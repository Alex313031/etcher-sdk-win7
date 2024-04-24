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
exports.BZip2Source = void 0;
const unbzip2Stream = require("unbzip2-stream");
const compressed_source_1 = require("./compressed-source");
const source_destination_1 = require("./source-destination");
class BZip2Source extends compressed_source_1.CompressedSource {
    createTransform() {
        return unbzip2Stream();
    }
    async getSize() {
        const size = await this.getSizeFromPartitionTable();
        if (size !== undefined) {
            return { size, isEstimated: true };
        }
    }
}
exports.BZip2Source = BZip2Source;
BZip2Source.mimetype = 'application/x-bzip2';
source_destination_1.SourceDestination.register(BZip2Source);
//# sourceMappingURL=bzip2.js.map