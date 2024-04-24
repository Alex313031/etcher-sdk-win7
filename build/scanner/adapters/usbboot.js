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
exports.UsbbootDeviceAdapter = void 0;
const lazy_1 = require("../../lazy");
const usbboot_1 = require("../../source-destination/usbboot");
const adapter_1 = require("./adapter");
class UsbbootDeviceAdapter extends adapter_1.Adapter {
    constructor() {
        super();
        this.drives = new Map();
        const rpiUsbboot = (0, lazy_1.getRaspberrypiUsbboot)();
        if (rpiUsbboot !== undefined) {
            this.scanner = new rpiUsbboot.UsbbootScanner();
            this.scanner.on('attach', this.onAttach.bind(this));
            this.scanner.on('detach', this.onDetach.bind(this));
            this.scanner.on('ready', this.emit.bind(this, 'ready'));
            this.scanner.on('error', this.emit.bind(this, 'error'));
        }
        else {
            console.warn('node-raspberrypi-usbboot not available');
            setImmediate(this.emit.bind(this, 'ready'));
        }
    }
    start() {
        var _a, _b;
        (_b = (_a = this.scanner) === null || _a === void 0 ? void 0 : _a.start) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    stop() {
        var _a, _b;
        (_b = (_a = this.scanner) === null || _a === void 0 ? void 0 : _a.stop) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    onAttach(device) {
        let drive = this.drives.get(device);
        if (drive === undefined) {
            drive = new usbboot_1.UsbbootDrive(device);
            this.drives.set(device, drive);
        }
        this.emit('attach', drive);
    }
    onDetach(device) {
        const drive = this.drives.get(device);
        this.drives.delete(device);
        this.emit('detach', drive);
    }
}
exports.UsbbootDeviceAdapter = UsbbootDeviceAdapter;
//# sourceMappingURL=usbboot.js.map