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
exports.MultiDestination = exports.MultiDestinationVerifier = exports.MultiDestinationError = void 0;
const events_1 = require("events");
const stream_1 = require("stream");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
const block_device_1 = require("./block-device");
const source_destination_1 = require("./source-destination");
function isntNull(x) {
    return x !== null;
}
class MultiDestinationError extends Error {
    constructor(error, destination) {
        super();
        this.error = error;
        this.destination = destination;
    }
}
exports.MultiDestinationError = MultiDestinationError;
class MultiDestinationVerifier extends source_destination_1.Verifier {
    constructor(source, checksumOrBlocks, size) {
        super();
        this.verifiers = new Set();
        for (const dest of source.activeDestinations) {
            const verifier = dest.createVerifier(checksumOrBlocks, size);
            verifier.on('error', (error) => {
                this.oneVerifierFinished(verifier);
                source.destinationError(dest, error, this);
            });
            verifier.on('finish', () => {
                this.oneVerifierFinished(verifier);
            });
            this.verifiers.add(verifier);
        }
    }
    oneVerifierFinished(verifier) {
        if (!this.verifiers.has(verifier)) {
            return;
        }
        if (this.verifiers.size === 1) {
            clearInterval(this.timer);
            this.emitProgress();
            this.emit('finish');
        }
        this.verifiers.delete(verifier);
    }
    emitProgress() {
        const verifier = (0, utils_1.minBy)(this.verifiers, (v) => {
            return v.progress.bytes;
        });
        if (verifier !== undefined) {
            this.emit('progress', verifier.progress);
        }
    }
    async run() {
        if (this.verifiers.size === 0) {
            this.emit('finish');
            return;
        }
        this.timer = setInterval(this.emitProgress.bind(this), constants_1.PROGRESS_EMISSION_INTERVAL);
        for (const verifier of this.verifiers) {
            verifier.run();
        }
    }
}
exports.MultiDestinationVerifier = MultiDestinationVerifier;
class MultiDestination extends source_destination_1.SourceDestination {
    constructor(destinations) {
        super();
        // MultiDestination does not emit 'error' events, only 'fail' events wrapping the original error in a MultiDestinationError
        this.destinations = new Set();
        this.erroredDestinations = new Set();
        if (destinations.length === 0) {
            throw new Error('At least one destination is required');
        }
        for (const destination of destinations) {
            this.destinations.add(destination);
        }
    }
    getAlignment() {
        let max;
        for (const destination of this.destinations.values()) {
            if (destination instanceof block_device_1.BlockDevice &&
                (max === undefined || destination.alignment > max)) {
                max = destination.alignment;
            }
        }
        return max;
    }
    destinationError(destination, error, stream) {
        // If a stream is provided, emit the 'fail' event on it, instead of this instance.
        if (!(error instanceof errors_1.VerificationError)) {
            // Verification errors aren't fatal
            this.erroredDestinations.add(destination);
        }
        error = new MultiDestinationError(error, destination);
        // Don't emit 'error' events as it would unpipe the source from the stream
        if (stream !== undefined) {
            stream.emit('fail', error);
        }
        else {
            this.emit('fail', error);
        }
    }
    get activeDestinations() {
        return (0, utils_1.difference)(this.destinations, this.erroredDestinations);
    }
    async can(methodName) {
        return (0, utils_1.every)(await Promise.all(Array.from(this.activeDestinations).map((destination) => destination[methodName]())));
    }
    canRead() {
        return this.can('canRead');
    }
    canWrite() {
        return this.can('canWrite');
    }
    canCreateReadStream() {
        return this.can('canCreateReadStream');
    }
    canCreateSparseReadStream() {
        return this.can('canCreateSparseReadStream');
    }
    canCreateWriteStream() {
        return this.can('canCreateWriteStream');
    }
    canCreateSparseWriteStream() {
        return this.can('canCreateSparseWriteStream');
    }
    read(buffer, bufferOffset, length, sourceOffset) {
        // Reads from the first destination (supposing all destinations contain the same data)
        return Array.from(this.activeDestinations)[0].read(buffer, bufferOffset, length, sourceOffset);
    }
    async write(buffer, bufferOffset, length, fileOffset) {
        const results = await Promise.all(Array.from(this.activeDestinations).map((destination) => destination.write(buffer, bufferOffset, length, fileOffset)));
        // Returns the first WriteResult (they should be all the same)
        return results[0];
        // TODO: handle errors so one destination can fail
    }
    createReadStream(options) {
        // TODO: raise an error or a warning here
        return Array.from(this.activeDestinations)[0].createReadStream(options);
    }
    createSparseReadStream(options) {
        // TODO: raise an error or a warning here
        return Array.from(this.activeDestinations)[0].createSparseReadStream(options);
    }
    async createStream(methodName, ...args) {
        const passthrough = new stream_1.PassThrough({
            objectMode: methodName === 'createSparseWriteStream',
        });
        // all streams listen to end events, +1 because we'll listen too
        const listeners = this.activeDestinations.size + 1;
        if (listeners > events_1.EventEmitter.defaultMaxListeners) {
            passthrough.setMaxListeners(listeners);
        }
        const progresses = new Map();
        let interval;
        function oneStreamFinished(stream) {
            if (!progresses.has(stream)) {
                return;
            }
            if (progresses.size === 1) {
                clearInterval(interval);
                emitProgress(); // Just to be sure we emitted the last state
                passthrough.emit('done');
            }
            progresses.delete(stream);
        }
        function emitProgress() {
            // TODO: avoid Array.from
            const leastAdvancedProgress = (0, utils_1.minBy)(Array.from(progresses.values()).filter(isntNull), (p) => p.position);
            if (leastAdvancedProgress !== undefined) {
                passthrough.emit('progress', leastAdvancedProgress);
            }
        }
        await Promise.all(Array.from(this.activeDestinations).map(async (destination) => {
            const stream = await destination[methodName](...args);
            progresses.set(stream, null);
            stream.on('progress', (progressEvent) => {
                progresses.set(stream, progressEvent);
                if (interval === undefined) {
                    interval = setInterval(emitProgress, constants_1.PROGRESS_EMISSION_INTERVAL);
                }
            });
            stream.on('error', (error) => {
                this.destinationError(destination, error, passthrough);
                oneStreamFinished(stream);
            });
            stream.on('finish', oneStreamFinished.bind(null, stream));
            passthrough.pipe(stream);
        }));
        passthrough.on('pipe', () => {
            // Handle the special case where we have zero destination streams
            if (this.activeDestinations.size === 0) {
                passthrough.emit('done');
            }
        });
        return passthrough;
    }
    createWriteStream(...args) {
        return this.createStream('createWriteStream', ...args);
    }
    createSparseWriteStream(...args) {
        return this.createStream('createSparseWriteStream', ...args);
    }
    createVerifier(checksumOrBlocks, size) {
        return new MultiDestinationVerifier(this, checksumOrBlocks, size);
    }
    async _open() {
        await Promise.all(Array.from(this.destinations).map(async (destination) => {
            try {
                await destination.open();
            }
            catch (error) {
                this.destinationError(destination, error);
            }
        }));
    }
    async _close() {
        await Promise.all(Array.from(this.destinations).map(async (destination) => {
            try {
                await destination.close();
            }
            catch (error) {
                this.destinationError(destination, error);
            }
        }));
    }
}
exports.MultiDestination = MultiDestination;
//# sourceMappingURL=multi-destination.js.map