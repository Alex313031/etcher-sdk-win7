"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalenaS3CompressedSource = void 0;
const CombinedStream = require("combined-stream");
const file_disk_1 = require("file-disk");
const gzip_stream_1 = require("gzip-stream");
const stream_1 = require("stream");
const ZipPartStream = require("zip-part-stream");
const zlib_1 = require("zlib");
const balena_s3_source_1 = require("./balena-s3-source");
const configure_1 = require("./configured-source/configure");
const configure_2 = require("./configured-source/operations/configure");
const copy_1 = require("./configured-source/operations/copy");
const errors_1 = require("../errors");
const stream_limiter_1 = require("../stream-limiter");
const utils_1 = require("../utils");
class BalenaS3CompressedSource extends balena_s3_source_1.BalenaS3SourceBase {
    constructor({ format, filenamePrefix, configuration, ...options }) {
        super(options);
        this.configuredParts = new Map();
        this.format = format;
        this.filenamePrefix = filenamePrefix;
        this.configuration = configuration;
    }
    async getSize() {
        return (await this.createStream(true)).zLen;
    }
    getFilename() {
        return [
            this.filenamePrefix,
            this.deviceType,
            this.osVersion,
            this.buildId.endsWith('.dev') ? 'dev' : undefined,
            this.supervisorVersion,
            this.release,
        ]
            .filter((p) => p !== undefined)
            .join('-');
    }
    async _getMetadata() {
        return {
            supervisorVersion: this.supervisorVersion,
            osVersion: this.osVersion,
            lastModified: this.lastModified,
            size: this.size,
            version: this.buildId,
            name: this.filename,
            format: this.format,
        };
    }
    async getSupervisorVersion() {
        const response = await this.download('VERSION');
        const lastModified = new Date(response.headers['last-modified']);
        const supervisorVersion = response.data.trim();
        return { supervisorVersion, lastModified };
    }
    async getOsVersion() {
        const response = await this.download('VERSION_HOSTOS');
        return response.data.trim();
    }
    async getImageJSON() {
        const imageJSON = (await this.download('image.json')).data;
        return imageJSON;
    }
    async getDeviceTypeJSON() {
        return (await this.download('device-type.json')).data;
    }
    async getPartStream(filename) {
        const response = await this.download(`compressed/${filename}`, 'stream');
        return response.data;
    }
    findPartitionPart(imageJSON, partition) {
        for (const { parts } of Object.values(imageJSON)) {
            for (const part of parts) {
                if (part.partitionIndex === `(${partition})`) {
                    return part;
                }
            }
        }
        throw new Error(`Couldn't find compressed image part for partition ${partition}`);
    }
    findImagePart(imageJSON, image) {
        var _a, _b;
        const [part] = (_b = (_a = imageJSON[image]) === null || _a === void 0 ? void 0 : _a.parts) !== null && _b !== void 0 ? _b : [];
        if (part === undefined) {
            throw new Error(`Couldn't find compressed part for image ${image}`);
        }
        return part;
    }
    findPart(definition) {
        if (definition.partition !== undefined) {
            const partition = (0, configure_1.normalizePartition)(definition.partition);
            return this.findPartitionPart(this.imageJSON, partition);
        }
        else if (definition.image !== undefined) {
            return this.findImagePart(this.imageJSON, definition.image);
        }
        else {
            throw new Error('No partition or image to configure found');
        }
    }
    async extractDeflateToDisk(filename) {
        const stream = await this.getPartStream(filename);
        const combined = CombinedStream.create();
        combined.append(stream);
        combined.append(gzip_stream_1.DEFLATE_END);
        const inflate = (0, zlib_1.createInflateRaw)();
        combined.pipe(inflate);
        return new file_disk_1.BufferDisk(await (0, utils_1.streamToBuffer)(inflate));
    }
    async configure() {
        var _a, _b;
        if (this.configuration === undefined) {
            return;
        }
        const disks = new Map();
        const self = this;
        async function getDisk(definition) {
            const filename = self.findPart(definition).filename;
            const d = disks.get(filename);
            if (d !== undefined) {
                return d;
            }
            const d2 = await self.extractDeflateToDisk(filename);
            disks.set(filename, d2);
            return d2;
        }
        // configure
        await (0, configure_2.configure)(await getDisk(this.deviceTypeJSON.configuration.config), undefined, this.configuration);
        // copy operations
        for (const cpy of (_a = this.deviceTypeJSON.configuration.operations) !== null && _a !== void 0 ? _a : []) {
            if ((0, configure_1.shouldRunOperation)((_b = this.configuration) !== null && _b !== void 0 ? _b : {}, cpy)) {
                await (0, copy_1.copy)(await getDisk(cpy.from), undefined, cpy.from.path, await getDisk(cpy.to), undefined, cpy.to.path);
            }
        }
        // compress
        await Promise.all(Array.from(disks.entries()).map(async ([filename, disk]) => {
            const stream = (await disk.getStream()).pipe((0, gzip_stream_1.createDeflatePart)());
            const buffer = await (0, utils_1.streamToBuffer)(stream);
            const { crc, zLen } = stream.metadata();
            this.configuredParts.set(filename, { crc, zLen, buffer });
        }));
    }
    async _open() {
        const [{ supervisorVersion, lastModified }, osVersion, imageJSON, deviceTypeJSON,] = await Promise.all([
            this.getSupervisorVersion(),
            this.getOsVersion(),
            this.getImageJSON(),
            this.getDeviceTypeJSON(),
        ]);
        if (deviceTypeJSON.yocto.archive) {
            // Only zip works for yocto archives (intel-edison)
            this.format = 'zip';
        }
        this.supervisorVersion = supervisorVersion;
        this.lastModified = lastModified;
        this.osVersion = osVersion;
        this.deviceTypeJSON = deviceTypeJSON;
        // The order is important, getFilename() expects osVersion and supervisorVersion to be set
        this.filename = this.getFilename();
        // replace resin.img with the requested filename if needed
        const keys = Object.keys(imageJSON);
        if (keys.length === 1 && keys[0] === 'resin.img') {
            this.filename += '.img';
            this.imageJSON = {
                [this.filename]: imageJSON['resin.img'],
            };
        }
        else {
            this.imageJSON = imageJSON;
        }
        await this.configure();
        // The order is important, getSize() expects imageJSON and filename to be set and the image to be configured
        this.size = await this.getSize();
    }
    async getParts(fake) {
        return Promise.all(Object.entries(this.imageJSON).map(async ([filename, { parts }]) => ({
            filename,
            parts: await Promise.all(parts.map(async (p) => {
                let stream;
                let { crc, zLen } = p;
                const configuredPart = this.configuredParts.get(p.filename);
                if (configuredPart !== undefined) {
                    ({ buffer: stream, crc, zLen } = configuredPart);
                }
                else if (fake) {
                    stream = new stream_1.Readable();
                }
                else {
                    stream = await this.getPartStream(p.filename);
                }
                return { ...p, crc, zLen, stream };
            })),
        })));
    }
    async createZipStream(fake) {
        const entries = (await this.getParts(fake)).map(({ filename, parts }) => ZipPartStream.createEntry(filename, parts));
        return ZipPartStream.create(entries);
    }
    async createGzipStream(fake) {
        const [{ parts }] = await this.getParts(fake);
        return (0, gzip_stream_1.createGzipFromParts)(parts);
    }
    async createStream(fake = false) {
        return await (this.format === 'zip'
            ? this.createZipStream(fake)
            : this.createGzipStream(fake));
    }
    async createReadStream(options = {}) {
        if (options.start !== undefined) {
            throw new errors_1.NotCapable();
        }
        const stream = await this.createStream();
        if (options.end !== undefined) {
            return new stream_limiter_1.StreamLimiter(stream, options.end + 1);
        }
        return stream;
    }
}
exports.BalenaS3CompressedSource = BalenaS3CompressedSource;
//# sourceMappingURL=balena-s3-compressed-source.js.map