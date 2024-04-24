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
exports.ProgressWritable = exports.CountingWritable = exports.makeClassEmitProgressEvents = void 0;
const stream_1 = require("stream");
const constants_1 = require("../constants");
const speedometer_1 = require("../speedometer");
function makeClassEmitProgressEvents(Cls, attribute, positionAttribute, interval = constants_1.PROGRESS_EMISSION_INTERVAL) {
    // This returns a class that extends Cls, tracks for `attribute` updates and emits `progress` events every `interval` based on it.
    //  * the type of `attribute` must be a number;
    //  * the position attribute of emitted events will be copied from the `positionAttribute` of the instances.
    return class extends Cls {
        constructor(...args) {
            super(...args);
            const startTime = Date.now();
            const meter = new speedometer_1.Speedometer(constants_1.SPEED_WINDOW);
            const state = {
                position: 0,
                bytes: 0,
                speed: 0,
                averageSpeed: 0,
            };
            // @ts-ignore
            let attributeValue = this[attribute];
            const update = () => {
                // @ts-ignore
                const newValue = this[attribute];
                const attributeDelta = newValue - attributeValue;
                if (attributeDelta === 0) {
                    return;
                }
                attributeValue = newValue;
                state.bytes += attributeDelta;
                // Ignore because I don't know how to express that positionAttribute is a key of T instances
                // @ts-ignore
                const position = this[positionAttribute];
                if (position !== undefined) {
                    state.position = position;
                }
                state.speed = meter.speed(attributeDelta);
                state.averageSpeed = (state.bytes / (Date.now() - startTime)) * 1000;
                this.emit('progress', state);
            };
            // TODO: setInterval only when attribute is set
            const timer = setInterval(update, interval);
            const clear = () => {
                clearInterval(timer);
            };
            this.once('error', clear);
            // Writable streams
            this.once('finish', clear);
            this.once('finish', update);
            // Readable streams
            this.once('end', clear);
            this.once('end', update);
        }
    };
}
exports.makeClassEmitProgressEvents = makeClassEmitProgressEvents;
class CountingWritable extends stream_1.Writable {
    constructor() {
        super(...arguments);
        this.bytesWritten = 0;
    }
    _write(chunk, _enc, callback) {
        if (Buffer.isBuffer(chunk)) {
            this.bytesWritten = this.position = this.bytesWritten + chunk.length;
        }
        else {
            this.bytesWritten += chunk.buffer.length;
            this.position = chunk.position + chunk.buffer.length;
        }
        callback();
    }
}
exports.CountingWritable = CountingWritable;
exports.ProgressWritable = makeClassEmitProgressEvents(CountingWritable, 'bytesWritten', 'position');
//# sourceMappingURL=progress.js.map