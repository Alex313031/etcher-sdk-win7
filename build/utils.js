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
exports.once = exports.every = exports.sumBy = exports.maxBy = exports.minBy = exports.delay = exports.fromCallback = exports.asCallback = exports.difference = exports.sparseStreamToBuffer = exports.streamToBuffer = void 0;
const aligned_lockable_buffer_1 = require("./aligned-lockable-buffer");
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('error', reject);
        stream.on('data', async (chunk) => {
            let data;
            if ((0, aligned_lockable_buffer_1.isAlignedLockableBuffer)(chunk)) {
                const unlock = await chunk.rlock();
                try {
                    data = Buffer.allocUnsafe(chunk.length);
                    chunk.copy(data);
                }
                finally {
                    unlock();
                }
            }
            else {
                data = chunk;
            }
            chunks.push(data);
        });
        stream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        // The stream may have been explicitely paused
        stream.resume();
    });
}
exports.streamToBuffer = streamToBuffer;
async function sparseStreamToBuffer(stream) {
    const chunks = [];
    await new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.on('end', resolve);
        stream.on('data', async (chunk) => {
            if ((0, aligned_lockable_buffer_1.isAlignedLockableBuffer)(chunk.buffer)) {
                let unlock;
                try {
                    unlock = await chunk.buffer.rlock();
                }
                catch (error) {
                    reject(error);
                    return;
                }
                let data;
                try {
                    data = Buffer.allocUnsafe(chunk.buffer.length);
                    chunk.buffer.copy(data);
                }
                finally {
                    unlock();
                }
                chunk.buffer = data;
            }
            chunks.push(chunk);
        });
    });
    if (chunks.length === 0) {
        return Buffer.alloc(0);
    }
    const lastChunk = chunks[chunks.length - 1];
    const result = Buffer.alloc(lastChunk.position + lastChunk.buffer.length);
    for (const chunk of chunks) {
        chunk.buffer.copy(result, chunk.position);
    }
    return result;
}
exports.sparseStreamToBuffer = sparseStreamToBuffer;
function difference(setA, setB) {
    const _difference = new Set(setA);
    for (const elem of setB) {
        _difference.delete(elem);
    }
    return _difference;
}
exports.difference = difference;
async function asCallback(promise, callback) {
    try {
        const value = await promise;
        callback(null, value);
    }
    catch (error) {
        callback(error);
    }
}
exports.asCallback = asCallback;
async function fromCallback(fn) {
    return await new Promise((resolve, reject) => {
        fn((error, result) => {
            if (error != null) {
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    });
}
exports.fromCallback = fromCallback;
async function delay(ms) {
    await new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
exports.delay = delay;
function minBy(things, iteratee) {
    let result;
    let minimum;
    for (const t of things) {
        const value = iteratee(t);
        if (minimum === undefined || value < minimum) {
            minimum = value;
            result = t;
        }
    }
    return result;
}
exports.minBy = minBy;
function maxBy(things, iteratee) {
    return minBy(things, (t) => -iteratee(t));
}
exports.maxBy = maxBy;
function sumBy(things, iteratee) {
    let result = 0;
    for (const t of things) {
        result += iteratee(t);
    }
    return result;
}
exports.sumBy = sumBy;
function every(things) {
    for (const t of things) {
        if (!t) {
            return false;
        }
    }
    return true;
}
exports.every = every;
function once(fn) {
    let ran = false;
    let result;
    return () => {
        if (!ran) {
            result = fn();
            ran = true;
        }
        return result;
    };
}
exports.once = once;
//# sourceMappingURL=utils.js.map