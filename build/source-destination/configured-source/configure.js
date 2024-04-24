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
exports.configure = exports.normalizePartition = exports.shouldRunOperation = void 0;
const balena_image_fs_1 = require("balena-image-fs");
const partitioninfo_1 = require("partitioninfo");
const util_1 = require("util");
const configure_1 = require("./operations/configure");
const copy_1 = require("./operations/copy");
const MBR_LAST_PRIMARY_PARTITION = 4;
function shouldRunOperation(options, operation) {
    var _a;
    const when = (_a = operation.when) !== null && _a !== void 0 ? _a : {};
    for (const [key, value] of Object.entries(when)) {
        if (options[key] !== value) {
            return false;
        }
    }
    return true;
}
exports.shouldRunOperation = shouldRunOperation;
function normalizePartition(partition) {
    // New device-type.json partition format: partition index
    if (typeof partition === 'number') {
        return partition;
    }
    // Old device-type.json partition format: { primary: 4, logical: 1 }
    if (typeof partition.logical === 'number') {
        return partition.logical + MBR_LAST_PRIMARY_PARTITION;
    }
    // Old device-type.json partition format: { primary: 4 }
    if (typeof partition.primary === 'number') {
        return partition.primary;
    }
    throw new Error(`Invalid partition: ${partition}`);
}
exports.normalizePartition = normalizePartition;
async function getDiskDeviceType(disk) {
    const partitions = await (0, partitioninfo_1.getPartitions)(disk);
    for (const partition of partitions.partitions) {
        if (partition.type === 14) {
            const deviceType = await (0, balena_image_fs_1.interact)(disk, partition.index, async (fs) => {
                try {
                    return await (0, util_1.promisify)(fs.readFile)('/device-type.json');
                }
                catch (error) {
                    return undefined;
                }
            });
            if (deviceType) {
                return JSON.parse(deviceType.toString());
            }
        }
    }
}
async function configure(disk, config) {
    var _a, _b, _c;
    const deviceType = await getDiskDeviceType(disk);
    const operations = (_b = (_a = deviceType === null || deviceType === void 0 ? void 0 : deviceType.configuration) === null || _a === void 0 ? void 0 : _a.operations) !== null && _b !== void 0 ? _b : [];
    const configPartition = (_c = deviceType === null || deviceType === void 0 ? void 0 : deviceType.configuration) === null || _c === void 0 ? void 0 : _c.config.partition;
    if (config !== undefined && configPartition !== undefined) {
        await (0, configure_1.configure)(disk, normalizePartition(configPartition), config);
    }
    for (const cpy of operations) {
        if (cpy.from.partition !== undefined &&
            cpy.to.partition !== undefined &&
            shouldRunOperation(config !== null && config !== void 0 ? config : {}, cpy)) {
            await (0, copy_1.copy)(disk, normalizePartition(cpy.from.partition), cpy.from.path, disk, normalizePartition(cpy.to.partition), cpy.to.path);
        }
    }
}
exports.configure = configure;
//# sourceMappingURL=configure.js.map