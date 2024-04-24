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
exports.DriverlessDevice = void 0;
const source_destination_1 = require("./source-destination");
class DriverlessDevice extends source_destination_1.SourceDestination {
    constructor(driverlessDevice) {
        super();
        this.accessible = false;
        this.raw = null;
        this.device = null;
        this.devicePath = null;
        this.isSystem = false;
        this.mountpoints = [];
        this.size = null;
        this.emitsProgress = false;
        this.description = '';
        this.deviceDescriptor = {
            idVendor: driverlessDevice.vid,
            idProduct: driverlessDevice.pid,
        };
    }
}
exports.DriverlessDevice = DriverlessDevice;
//# sourceMappingURL=driverless.js.map