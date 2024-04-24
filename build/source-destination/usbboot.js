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
exports.UsbbootDrive = void 0;
const source_destination_1 = require("./source-destination");
class UsbbootDrive extends source_destination_1.SourceDestination {
    constructor(usbDevice) {
        super();
        this.usbDevice = usbDevice;
        this.raw = null;
        this.displayName = 'Initializing device';
        this.device = null;
        this.devicePath = null;
        this.icon = 'loading';
        this.isSystem = false;
        this.description = 'Compute Module';
        this.mountpoints = [];
        this.isReadOnly = false;
        this.disabled = true;
        this.size = null;
        this.emitsProgress = true;
        this.progress = 0;
        usbDevice.on('progress', (value) => {
            this.progress = value;
            this.emit('progress', value);
        });
    }
}
exports.UsbbootDrive = UsbbootDrive;
//# sourceMappingURL=usbboot.js.map