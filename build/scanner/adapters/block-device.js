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
exports.BlockDeviceAdapter = void 0;
const _debug = require("debug");
const drivelist_1 = require("drivelist");
const block_device_1 = require("../../source-destination/block-device");
const utils_1 = require("../../utils");
const adapter_1 = require("./adapter");
const debug = _debug('etcher-sdk:block-device-adapter');
const SCAN_INTERVAL = 1000;
const USBBOOT_RPI_COMPUTE_MODULE_NAMES = [
    '0001',
    'RPi-MSD- 0001',
    'File-Stor Gadget',
    'Linux File-Stor_Gadget',
    'Linux File-Stor Gadget',
    'Linux File-Stor Gadget USB Device',
    'Linux File-Stor Gadget Media',
];
function looksLikeComputeModule(description) {
    for (const name of USBBOOT_RPI_COMPUTE_MODULE_NAMES) {
        if (description.startsWith(name)) {
            return true;
        }
    }
    return false;
}
function driveKey(drive) {
    return [
        drive.device,
        drive.size,
        drive.description,
        drive.mountpoints
            .map((m) => m.path)
            .sort()
            .join(','),
    ].join('|');
}
class BlockDeviceAdapter extends adapter_1.Adapter {
    constructor({ includeSystemDrives = () => false, unmountOnSuccess = false, write = false, direct = true, }) {
        super();
        this.drives = new Map();
        this.running = false;
        this.ready = false;
        this.includeSystemDrives = includeSystemDrives;
        this.unmountOnSuccess = unmountOnSuccess;
        this.oWrite = write;
        this.oDirect = direct;
    }
    start() {
        this.running = true;
        this.scanLoop();
    }
    stop() {
        this.running = false;
        this.ready = false;
        this.drives.clear();
    }
    async scanLoop() {
        while (this.running) {
            await this.scan();
            if (!this.ready) {
                this.ready = true;
                this.emit('ready');
            }
            await (0, utils_1.delay)(SCAN_INTERVAL);
        }
    }
    async scan() {
        const drives = await this.listDrives();
        if (this.running) {
            // we may have been stopped while listing the drives.
            const oldDevices = new Set(this.drives.keys());
            const newDevices = new Set(drives.keys());
            for (const removed of (0, utils_1.difference)(oldDevices, newDevices)) {
                this.emit('detach', this.drives.get(removed));
                this.drives.delete(removed);
            }
            for (const added of (0, utils_1.difference)(newDevices, oldDevices)) {
                const drive = drives.get(added);
                const blockDevice = new block_device_1.BlockDevice({
                    drive: drive,
                    unmountOnSuccess: this.unmountOnSuccess,
                    write: this.oWrite,
                    direct: this.oDirect,
                });
                this.emit('attach', blockDevice);
                this.drives.set(added, blockDevice);
            }
        }
    }
    async listDrives() {
        let drives;
        const result = new Map();
        try {
            drives = await (0, drivelist_1.list)();
        }
        catch (error) {
            debug(error);
            this.emit('error', error);
            return result;
        }
        for (const drive of drives) {
            if (!(
            // Always ignore RAID attached devices, as they are in danger-country;
            // Even flashing RAIDs intentionally can have unintended effects
            (drive.busType !== 'RAID' &&
                // Exclude errored drives
                !drive.error &&
                // Exclude system drives if needed
                (this.includeSystemDrives() || !drive.isSystem) &&
                // Exclude drives with no size
                typeof drive.size === 'number' &&
                // Exclude virtual drives (DMG, TimeMachine, ... on macOS)
                !drive.isVirtual))) {
                continue;
            }
            const displayName = /PhysicalDrive/i.test(drive.device) && drive.mountpoints.length
                ? drive.mountpoints.map((m) => m.path).join(', ') // Windows
                : drive.device;
            const resultDrive = { ...drive, displayName };
            if (looksLikeComputeModule(resultDrive.description)) {
                resultDrive.description = 'Compute Module';
                // TODO: Should this be in the sdk?
                resultDrive.icon = 'raspberrypi';
                resultDrive.isSystem = false;
            }
            result.set(driveKey(drive), resultDrive);
        }
        return result;
    }
}
exports.BlockDeviceAdapter = BlockDeviceAdapter;
//# sourceMappingURL=block-device.js.map