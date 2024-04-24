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
exports.DriverlessDeviceAdapter = void 0;
const process_1 = require("process");
const lazy_1 = require("../../lazy");
const driverless_1 = require("../../source-destination/driverless");
const utils_1 = require("../../utils");
const adapter_1 = require("./adapter");
const SCAN_INTERVAL = 1000;
class DriverlessDeviceAdapter$ extends adapter_1.Adapter {
    constructor() {
        super(...arguments);
        // Emits 'attach', 'detach' and 'ready'
        this.drives = new Map();
        this.running = false;
        this.ready = false;
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
        if (this.listDriverlessDevices === undefined) {
            // This import fails on anything else than win32 and this class will only be exported on win32
            this.listDriverlessDevices = (await Promise.resolve().then(() => require('winusb-driver-generator'))).listDriverlessDevices;
        }
        while (this.running) {
            this.scan();
            if (!this.ready) {
                this.ready = true;
                this.emit('ready');
            }
            await (0, utils_1.delay)(SCAN_INTERVAL);
        }
    }
    scan() {
        let drives;
        try {
            // winusb-driver-generator may fail with "Requested resource busy or similar call already in progress"
            drives = this.listDrives();
        }
        catch (error) {
            return;
        }
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
                const driverlessDevice = new driverless_1.DriverlessDevice(drive);
                this.emit('attach', driverlessDevice);
                this.drives.set(added, driverlessDevice);
            }
        }
    }
    listDrives() {
        var _a;
        const isUsbBootCapableUSBDevice = (_a = (0, lazy_1.getRaspberrypiUsbboot)()) === null || _a === void 0 ? void 0 : _a.isUsbBootCapableUSBDevice;
        const result = new Map();
        if (isUsbBootCapableUSBDevice == null) {
            return result;
        }
        const devices = this.listDriverlessDevices();
        for (const device of devices) {
            if (isUsbBootCapableUSBDevice(device.vid, device.pid)) {
                result.set(device.did, device);
            }
        }
        return result;
    }
}
exports.DriverlessDeviceAdapter = process_1.platform === 'win32' ? DriverlessDeviceAdapter$ : undefined;
//# sourceMappingURL=driverless.js.map