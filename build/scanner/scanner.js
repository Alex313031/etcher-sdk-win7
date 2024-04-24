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
exports.Scanner = void 0;
const debug_ = require("debug");
const events_1 = require("events");
const debug = debug_('etcher-sdk:scanner');
class Scanner extends events_1.EventEmitter {
    constructor(adapters) {
        super();
        this.adapters = adapters;
        this.drives = new Set();
        this.adapters.forEach((adapter) => {
            adapter.on('attach', this.onAttach.bind(this));
            adapter.on('detach', this.onDetach.bind(this));
            adapter.on('error', this.emit.bind(this, 'error'));
        });
    }
    onAttach(drive) {
        this.drives.add(drive);
        this.emit('attach', drive);
    }
    onDetach(drive) {
        this.drives.delete(drive);
        this.emit('detach', drive);
    }
    getBy(field, value) {
        for (const drive of this.drives) {
            if (drive[field] === value) {
                return drive;
            }
        }
    }
    start() {
        debug('start');
        let notReady = this.adapters.length;
        return new Promise((resolve) => {
            this.adapters.forEach((adapter) => {
                adapter.on('ready', () => {
                    notReady -= 1;
                    if (notReady === 0) {
                        this.emit('ready');
                        resolve();
                    }
                });
                adapter.start();
            });
        });
    }
    stop() {
        debug('stop');
        this.drives.clear();
        this.adapters.forEach((adapter) => {
            adapter.stop();
        });
    }
}
exports.Scanner = Scanner;
//# sourceMappingURL=scanner.js.map