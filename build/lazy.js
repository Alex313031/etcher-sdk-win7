"use strict";
/*
Copyright 2020 balena.io

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCrc = exports.getUnmountDisk = exports.getXXHash = exports.getRaspberrypiUsbboot = void 0;
const util_1 = require("util");
const utils_1 = require("./utils");
exports.getRaspberrypiUsbboot = (0, utils_1.once)(() => {
    try {
        return require('node-raspberrypi-usbboot');
    }
    catch (e) {
        console.warn('Failed to import node-raspberrypi-usbboot:', e);
    }
});
exports.getXXHash = (0, utils_1.once)(() => require('xxhash-addon'));
exports.getUnmountDisk = (0, utils_1.once)(() => (0, util_1.promisify)(require('mountutils').unmountDisk));
exports.getCrc = (0, utils_1.once)(() => require('cyclic-32'));
//# sourceMappingURL=lazy.js.map