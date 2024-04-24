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
exports.DEFAULT_ALIGNMENT = exports.XXHASH_SEED = exports.NO_MATCHING_FILE_MSG = exports.CHUNK_SIZE = exports.RETRY_BASE_TIMEOUT = exports.SPEED_WINDOW = exports.PROGRESS_EMISSION_INTERVAL = void 0;
exports.PROGRESS_EMISSION_INTERVAL = 1000 / 4; // emit progress events 4 times per second
exports.SPEED_WINDOW = 2; // Progress events current speed calculation window
exports.RETRY_BASE_TIMEOUT = 100;
exports.CHUNK_SIZE = 1024 ** 2;
exports.NO_MATCHING_FILE_MSG = "Can't find a matching file in this zip archive";
exports.XXHASH_SEED = 0x45544348; // Seed value 0x45544348 = ASCII "ETCH"
exports.DEFAULT_ALIGNMENT = 512;
//# sourceMappingURL=constants.js.map