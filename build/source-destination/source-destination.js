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
exports.SourceDestination = exports.SparseStreamVerifier = exports.StreamVerifier = exports.Verifier = exports.SourceDestinationFs = exports.createHasher = exports.ProgressHashStream = exports.CountingHashStream = void 0;
const stream_1 = require("stream");
const events_1 = require("events");
const fileType = require("file-type");
const partitioninfo_1 = require("partitioninfo");
const path_1 = require("path");
const xxhash_addon_1 = require("xxhash-addon");
const aligned_lockable_buffer_1 = require("../aligned-lockable-buffer");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const sparse_filter_stream_1 = require("../sparse-stream/sparse-filter-stream");
const sparse_read_stream_1 = require("../sparse-stream/sparse-read-stream");
const utils_1 = require("../utils");
const progress_1 = require("./progress");
class HashStream extends stream_1.Transform {
    constructor(seed, outEnc) {
        super();
        if (outEnc && typeof outEnc !== 'string' && !Buffer.isBuffer(outEnc)) {
            outEnc = 'buffer';
        }
        this._outEnc = outEnc;
        this._hash = new xxhash_addon_1.XXHash3(seed);
    }
    _transform(chunk, _encoding, callback) {
        this._hash.update(chunk);
        callback();
    }
    _flush(callback) {
        this.push(this._hash.digest(this._outEnc));
        callback();
    }
}
class CountingHashStream extends HashStream {
    constructor() {
        super(...arguments);
        this.bytesWritten = 0;
    }
    async __transform(chunk, encoding) {
        const unlock = (0, aligned_lockable_buffer_1.isAlignedLockableBuffer)(chunk)
            ? await chunk.rlock()
            : undefined;
        try {
            await (0, utils_1.fromCallback)((callback) => {
                super._transform(chunk, encoding, callback);
            });
        }
        finally {
            unlock === null || unlock === void 0 ? void 0 : unlock();
        }
        this.bytesWritten += chunk.length;
    }
    _transform(chunk, encoding, callback) {
        (0, utils_1.asCallback)(this.__transform(chunk, encoding), callback);
    }
}
exports.CountingHashStream = CountingHashStream;
exports.ProgressHashStream = (0, progress_1.makeClassEmitProgressEvents)(CountingHashStream, 'bytesWritten', 'bytesWritten');
function createHasher() {
    const hasher = new exports.ProgressHashStream(constants_1.XXHASH_SEED, 'buffer');
    hasher.on('finish', async () => {
        const checksum = (await (0, utils_1.streamToBuffer)(hasher)).toString('hex');
        hasher.emit('checksum', checksum);
    });
    return hasher;
}
exports.createHasher = createHasher;
class SourceDestinationFs {
    // Adapts a SourceDestination to an fs like interface (so it can be used in udif for example)
    constructor(source) {
        this.source = source;
    }
    open(_path, _options, callback) {
        callback(null, 1);
    }
    close(_fd, callback) {
        callback(null);
    }
    fstat(_fd, callback) {
        this.source
            .getMetadata()
            .then((metadata) => {
            if (metadata.size === undefined) {
                callback(new Error('No size'));
                return;
            }
            callback(null, { size: metadata.size });
        })
            .catch(callback);
    }
    read(_fd, buffer, bufferOffset, length, sourceOffset, callback) {
        this.source
            .read(buffer, bufferOffset, length, sourceOffset)
            .then((res) => {
            callback(null, res.bytesRead, res.buffer);
        })
            .catch(callback);
    }
}
exports.SourceDestinationFs = SourceDestinationFs;
class Verifier extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.progress = {
            bytes: 0,
            position: 0,
            speed: 0,
            averageSpeed: 0,
        };
    }
    handleEventsAndPipe(stream, meter) {
        meter.on('progress', (progress) => {
            this.progress = progress;
            this.emit('progress', progress);
        });
        stream.on('end', this.emit.bind(this, 'end'));
        meter.on('finish', this.emit.bind(this, 'finish'));
        stream.once('error', () => {
            stream.unpipe(meter);
            meter.end();
        });
        stream.pipe(meter);
    }
}
exports.Verifier = Verifier;
class StreamVerifier extends Verifier {
    constructor(source, checksum, size) {
        super();
        this.source = source;
        this.checksum = checksum;
        this.size = size;
    }
    async run() {
        const stream = await this.source.createReadStream({
            end: this.size - 1,
            alignment: this.source.getAlignment(),
        });
        stream.on('error', this.emit.bind(this, 'error'));
        const hasher = createHasher();
        hasher.on('error', this.emit.bind(this, 'error'));
        hasher.on('checksum', (streamChecksum) => {
            if (streamChecksum !== this.checksum) {
                this.emit('error', new errors_1.ChecksumVerificationError(`Source and destination checksums do not match: ${this.checksum} !== ${streamChecksum}`, streamChecksum, this.checksum));
            }
        });
        this.handleEventsAndPipe(stream, hasher);
    }
}
exports.StreamVerifier = StreamVerifier;
class SparseStreamVerifier extends Verifier {
    constructor(source, blocks) {
        super();
        this.source = source;
        this.blocks = blocks;
    }
    async run() {
        const alignment = this.source.getAlignment();
        let stream;
        if (await this.source.canRead()) {
            stream = new sparse_read_stream_1.SparseReadStream({
                source: this.source,
                blocks: this.blocks,
                chunkSize: constants_1.CHUNK_SIZE,
                verify: true,
                generateChecksums: false,
                alignment,
                numBuffers: 2,
            });
            stream.on('error', this.emit.bind(this, 'error'));
        }
        else if (await this.source.canCreateReadStream()) {
            const originalStream = await this.source.createReadStream();
            originalStream.once('error', (error) => {
                originalStream.unpipe(transform);
                this.emit('error', error);
            });
            const transform = new sparse_filter_stream_1.SparseFilterStream({
                blocks: this.blocks,
                verify: true,
                generateChecksums: false,
            });
            transform.once('error', (error) => {
                originalStream.unpipe(transform);
                // @ts-ignore
                if (typeof originalStream.destroy === 'function') {
                    // @ts-ignore
                    originalStream.destroy();
                }
                this.emit('error', error);
            });
            originalStream.pipe(transform);
            stream = transform;
        }
        else {
            throw new errors_1.NotCapable();
        }
        const meter = new progress_1.ProgressWritable({ objectMode: true });
        this.handleEventsAndPipe(stream, meter);
    }
}
exports.SparseStreamVerifier = SparseStreamVerifier;
class SourceDestination extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.isOpen = false;
    }
    static register(Cls) {
        if (Cls.mimetype !== undefined) {
            SourceDestination.mimetypes.set(Cls.mimetype, Cls);
        }
    }
    getAlignment() {
        return undefined;
    }
    async canRead() {
        return false;
    }
    async canWrite() {
        return false;
    }
    async canCreateReadStream() {
        return false;
    }
    async canCreateSparseReadStream() {
        return false;
    }
    async canCreateWriteStream() {
        return false;
    }
    async canCreateSparseWriteStream() {
        return false;
    }
    async getMetadata() {
        if (this.metadata === undefined) {
            this.metadata = await this._getMetadata();
        }
        return this.metadata;
    }
    async _getMetadata() {
        return {};
    }
    async read(_buffer, _bufferOffset, _length, _sourceOffset) {
        throw new errors_1.NotCapable();
    }
    async write(_buffer, _bufferOffset, _length, _fileOffset) {
        throw new errors_1.NotCapable();
    }
    async createReadStream(_options = {}) {
        throw new errors_1.NotCapable();
    }
    async createSparseReadStream(_options = {}) {
        throw new errors_1.NotCapable();
    }
    async getBlocks() {
        throw new errors_1.NotCapable();
    }
    async createWriteStream(_options = {}) {
        throw new errors_1.NotCapable();
    }
    async createSparseWriteStream(_options = {}) {
        throw new errors_1.NotCapable();
    }
    async open() {
        if (!this.isOpen) {
            await this._open();
            this.isOpen = true;
        }
    }
    async close() {
        if (this.isOpen) {
            await this._close();
            this.isOpen = false;
        }
    }
    async _open() {
        // noop
    }
    async _close() {
        // noop
    }
    createVerifier(checksumOrBlocks, size) {
        if (Array.isArray(checksumOrBlocks)) {
            for (const block of checksumOrBlocks) {
                if (block.checksumType === undefined || block.checksum === undefined) {
                    throw new Error('Block is missing checksum or checksumType attributes, can not create verifier');
                }
            }
            return new SparseStreamVerifier(this, checksumOrBlocks);
        }
        else {
            if (size === undefined) {
                throw new Error('A size argument is required for creating a stream checksum verifier');
            }
            return new StreamVerifier(this, checksumOrBlocks, size);
        }
    }
    async getMimeTypeFromName() {
        const metadata = await this.getMetadata();
        if (metadata.name === undefined) {
            return;
        }
        const extension = (0, path_1.extname)(metadata.name).toLowerCase();
        if (extension === '.dmg') {
            return 'application/x-apple-diskimage';
        }
    }
    async getMimeTypeFromContent() {
        let stream;
        try {
            stream = await this.createReadStream({
                end: 263,
                alignment: this.getAlignment(),
            });
        }
        catch (error) {
            if (error instanceof errors_1.NotCapable) {
                return;
            }
            throw error;
        }
        const ft = fileType(await (0, utils_1.streamToBuffer)(stream));
        if (ft !== undefined && ft !== null) {
            return ft.mime;
        }
    }
    async getInnerSourceHelper(mimetype) {
        if (mimetype === undefined) {
            return this;
        }
        const Cls = SourceDestination.mimetypes.get(mimetype);
        if (Cls === undefined) {
            return this;
        }
        if (Cls.requiresRandomReadableSource && !(await this.canRead())) {
            throw new errors_1.NotCapable(`Can not read a ${Cls.name} from a ${this.constructor.name}.`);
        }
        const innerSource = new Cls(this);
        return innerSource.getInnerSource();
    }
    async getInnerSource() {
        await this.open();
        const metadata = await this.getMetadata();
        if (metadata.isEtch === true) {
            return this;
        }
        let mimetype = await this.getMimeTypeFromName();
        if (mimetype !== undefined) {
            try {
                return await this.getInnerSourceHelper(mimetype);
            }
            catch (error) {
                if (error instanceof errors_1.NotCapable) {
                    throw error;
                }
                // File extension may be wrong, try content.
            }
        }
        mimetype = await this.getMimeTypeFromContent();
        return this.getInnerSourceHelper(mimetype);
    }
    async getPartitionTable() {
        const stream = await this.createReadStream({
            end: 34 * 512,
            alignment: this.getAlignment(),
        });
        const buffer = await (0, utils_1.streamToBuffer)(stream);
        try {
            return await (0, partitioninfo_1.getPartitions)(buffer, { getLogical: false });
        }
        catch (_a) {
            // no partitions
        }
    }
}
exports.SourceDestination = SourceDestination;
SourceDestination.imageExtensions = [
    'img',
    'iso',
    'bin',
    'dsk',
    'hddimg',
    'raw',
    'dmg',
    'sdcard',
    'rpi-sdimg',
    'wic',
];
SourceDestination.mimetypes = new Map();
//# sourceMappingURL=source-destination.js.map