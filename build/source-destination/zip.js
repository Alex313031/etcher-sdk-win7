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
exports.ZipSource = exports.RandomAccessZipSource = exports.StreamZipSource = exports.matchSupportedExtensions = void 0;
const blockmap_1 = require("blockmap");
const path_1 = require("path");
const stream_1 = require("stream");
const yauzl_1 = require("yauzl");
const constants_1 = require("../constants");
const zip_1 = require("../zip");
const source_destination_1 = require("./source-destination");
const source_source_1 = require("./source-source");
const block_transform_stream_1 = require("../block-transform-stream");
const errors_1 = require("../errors");
const shared_1 = require("../sparse-stream/shared");
const sparse_filter_stream_1 = require("../sparse-stream/sparse-filter-stream");
const stream_limiter_1 = require("../stream-limiter");
const utils_1 = require("../utils");
function blockmapToBlocks(blockmap) {
    return blockmap.ranges.map((range) => {
        const offset = range.start * blockmap.blockSize;
        const length = (range.end - range.start + 1) * blockmap.blockSize;
        const checksum = range.checksum;
        const checksumType = blockmap.checksumType === 'sha1' || blockmap.checksumType === 'sha256'
            ? blockmap.checksumType
            : undefined;
        return { checksum, checksumType, blocks: [{ offset, length }] };
    });
}
function matchSupportedExtensions(filename) {
    const extension = path_1.posix.extname(filename);
    return (extension.length > 1 &&
        source_destination_1.SourceDestination.imageExtensions.includes(extension.slice(1)));
}
exports.matchSupportedExtensions = matchSupportedExtensions;
class StreamZipSource extends source_source_1.SourceSource {
    constructor(source, match = matchSupportedExtensions) {
        super(source);
        this.match = match;
    }
    async canCreateReadStream() {
        return true;
    }
    async getEntry() {
        if (this.entry === undefined) {
            const entry = await (0, zip_1.getFileStreamFromZipStream)(await this.source.createReadStream(), this.match);
            this.entry = entry;
            const onData = () => {
                // We need to reset the entry if any read happens on this stream
                entry.removeListener('data', onData);
                this.entry = undefined;
            };
            entry.on('data', onData);
            entry.pause();
        }
        return this.entry;
    }
    async createReadStream({ start = 0, end, } = {}) {
        if (start !== 0) {
            throw new errors_1.NotCapable();
        }
        const stream = await this.getEntry();
        if (end !== undefined) {
            // TODO: handle errors on stream after transform finsh event
            const transform = new stream_limiter_1.StreamLimiter(stream, end + 1);
            return transform;
        }
        return stream;
    }
    async _getMetadata() {
        const entry = await this.getEntry();
        return {
            size: entry.size,
            compressedSize: entry.compressedSize,
            name: path_1.posix.basename(entry.path),
        };
    }
}
exports.StreamZipSource = StreamZipSource;
class SourceRandomAccessReader extends yauzl_1.RandomAccessReader {
    constructor(source) {
        super();
        this.source = source;
    }
    _readStreamForRange(start, end) {
        // _readStreamForRange end is exclusive
        // this.source.createReadStream end is inclusive
        // Workaround this method not being async with a passthrough stream
        const passthrough = new stream_1.PassThrough();
        this.source
            .createReadStream({ start, end: end - 1 })
            .then((stream) => {
            stream.on('error', passthrough.emit.bind(passthrough, 'error'));
            stream.pipe(passthrough);
        })
            .catch(passthrough.emit.bind(passthrough, 'error'));
        return passthrough;
    }
}
class RandomAccessZipSource extends source_source_1.SourceSource {
    constructor(source, match = matchSupportedExtensions) {
        super(source);
        this.match = match;
        this.entries = [];
        this.ready = this.init();
    }
    async init() {
        await this.source.open();
        const sourceMetadata = await this.source.getMetadata();
        const reader = new SourceRandomAccessReader(this.source);
        this.zip = await (0, utils_1.fromCallback)((callback) => {
            if (sourceMetadata.size === undefined) {
                throw new errors_1.NotCapable();
            }
            (0, yauzl_1.fromRandomAccessReader)(reader, sourceMetadata.size, { autoClose: false }, callback);
        });
        this.zip.on('entry', (entry) => {
            this.entries.push(entry);
        });
        await new Promise((resolve, reject) => {
            this.zip.on('end', resolve);
            this.zip.on('error', reject);
        });
    }
    async canCreateReadStream() {
        return true;
    }
    async canCreateSparseReadStream() {
        const metadata = await this.getMetadata();
        return metadata.blockMap !== undefined;
    }
    async getEntries() {
        await this.ready;
        return this.entries;
    }
    async getImageEntry() {
        const entries = (await this.getEntries()).filter((e) => this.match(e.fileName));
        const entry = (0, utils_1.maxBy)(entries, (e) => e.uncompressedSize);
        if (entry === undefined) {
            throw new Error(constants_1.NO_MATCHING_FILE_MSG);
        }
        if (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) {
            throw new Error(`unsupported compression method: ${entry.compressionMethod}`);
        }
        return entry;
    }
    async _open() {
        await this.ready;
        // We only want to run this for the error it may throw if there is no disk image in the zip
        await this.getImageEntry();
    }
    async getEntryByName(name) {
        const entries = await this.getEntries();
        for (const entry of entries) {
            if (entry.fileName === name) {
                return entry;
            }
        }
    }
    async getStream(name) {
        const entry = await this.getEntryByName(name);
        if (entry !== undefined) {
            return await (0, utils_1.fromCallback)((callback) => {
                // yauzl does not support start / end for compressed entries
                this.zip.openReadStream(entry, callback);
            });
        }
    }
    async getString(name) {
        const stream = await this.getStream(name);
        if (stream !== undefined) {
            const buffer = await (0, utils_1.streamToBuffer)(stream);
            return buffer.toString();
        }
    }
    async getJson(name) {
        const data = await this.getString(name);
        if (data !== undefined) {
            return JSON.parse(data);
        }
    }
    async createReadStream({ start = 0, end, alignment, numBuffers, }) {
        if (start !== 0) {
            throw new errors_1.NotCapable();
        }
        const entry = await this.getImageEntry();
        const stream = await this.getStream(entry.fileName);
        if (stream === undefined) {
            throw new errors_1.NotCapable();
        }
        if (end !== undefined) {
            // TODO: handle errors on stream after transform finish event
            const transform = new stream_limiter_1.StreamLimiter(stream, end + 1);
            return block_transform_stream_1.BlockTransformStream.alignIfNeeded(transform, alignment, numBuffers);
        }
        return block_transform_stream_1.BlockTransformStream.alignIfNeeded(stream, alignment, numBuffers);
    }
    async createSparseReadStream({ generateChecksums = false, alignment, numBuffers, } = {}) {
        const metadata = await this.getMetadata();
        if (metadata.blocks === undefined) {
            throw new errors_1.NotCapable();
        }
        // Verifying and generating checksums makes no sense, so we only verify if generateChecksums is false.
        const transform = new sparse_filter_stream_1.SparseFilterStream({
            blocks: metadata.blocks,
            verify: !generateChecksums,
            generateChecksums,
        });
        const stream = await this.createReadStream({
            alignment,
            numBuffers,
        });
        stream.pipe(transform);
        return transform;
    }
    async _getMetadata() {
        const entry = await this.getImageEntry();
        const result = {
            size: entry.uncompressedSize,
            compressedSize: entry.compressedSize,
        };
        const prefix = path_1.posix.join(path_1.posix.dirname(entry.fileName), '.meta');
        result.logo = await this.getString(path_1.posix.join(prefix, 'logo.svg'));
        result.instructions = await this.getString(path_1.posix.join(prefix, 'instructions.markdown'));
        const blockMap = await this.getString(path_1.posix.join(prefix, 'image.bmap'));
        if (blockMap !== undefined) {
            result.blockMap = blockmap_1.BlockMap.parse(blockMap);
            result.blocks = blockmapToBlocks(result.blockMap);
            result.blockmappedSize = (0, shared_1.blocksLength)(result.blocks);
        }
        let manifest;
        try {
            manifest = await this.getJson(path_1.posix.join(prefix, 'manifest.json'));
        }
        catch (error) {
            throw new Error('Invalid archive manifest.json');
        }
        let name;
        if (manifest !== undefined) {
            name = manifest.name;
            for (const key of RandomAccessZipSource.manifestFields) {
                result[key] = manifest[key];
            }
        }
        result.name = name || path_1.posix.basename(entry.fileName);
        if (result.logo || result.instructions || result.blockMap || manifest) {
            result.isEtch = true;
        }
        return result;
    }
}
exports.RandomAccessZipSource = RandomAccessZipSource;
RandomAccessZipSource.manifestFields = [
    'bytesToZeroOutFromTheBeginning',
    'checksum',
    'checksumType',
    'recommendedDriveSize',
    'releaseNotesUrl',
    'supportUrl',
    'url',
    'version',
];
class ZipSource extends source_source_1.SourceSource {
    constructor(source, preferStreamSource = false, match = matchSupportedExtensions) {
        super(source);
        this.preferStreamSource = preferStreamSource;
        this.match = match;
        this.ready = this.prepare();
    }
    async prepare() {
        if (!this.preferStreamSource && (await this.source.canRead())) {
            this.implementation = new RandomAccessZipSource(this.source, this.match);
        }
        else {
            this.implementation = new StreamZipSource(this.source, this.match);
        }
    }
    async canCreateReadStream() {
        await this.ready;
        return await this.implementation.canCreateReadStream();
    }
    async open() {
        await this.ready;
        return await this.implementation.open();
    }
    async canCreateSparseReadStream() {
        await this.ready;
        return await this.implementation.canCreateSparseReadStream();
    }
    async createReadStream({ emitProgress = false, start = 0, end, alignment, numBuffers, } = {}) {
        await this.ready;
        const stream = await this.implementation.createReadStream({
            emitProgress,
            start,
            end,
        });
        return block_transform_stream_1.BlockTransformStream.alignIfNeeded(stream, alignment, numBuffers);
    }
    async createSparseReadStream({ generateChecksums = false, alignment, numBuffers, } = {}) {
        await this.ready;
        return await this.implementation.createSparseReadStream({
            generateChecksums,
            alignment,
            numBuffers,
        });
    }
    async _getMetadata() {
        await this.ready;
        const metadata = await this.implementation.getMetadata();
        return { ...metadata, isCompressed: true };
    }
}
exports.ZipSource = ZipSource;
ZipSource.mimetype = 'application/zip';
source_destination_1.SourceDestination.register(ZipSource);
//# sourceMappingURL=zip.js.map