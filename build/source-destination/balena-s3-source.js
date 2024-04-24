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
exports.BalenaS3Source = exports.BalenaS3SourceBase = void 0;
const aws4_axios_1 = require("aws4-axios");
const axios_1 = require("axios");
const http_1 = require("./http");
const source_destination_1 = require("./source-destination");
const zip_1 = require("./zip");
const ESR_IMAGES_PREFIX = 'esr-images';
const IMAGES_PREFIX = 'images';
const PRELOADED_IMAGES_PREFIX = 'preloaded-images';
class BalenaS3SourceBase extends source_destination_1.SourceDestination {
    constructor({ host, bucket, prefix, deviceType, buildId, release, awsCredentials, }) {
        super();
        this.host = host;
        this.bucket = bucket;
        if (prefix !== undefined) {
            this.prefix = prefix;
        }
        else if (release !== undefined) {
            this.prefix = PRELOADED_IMAGES_PREFIX;
        }
        else if (BalenaS3SourceBase.isESRVersion(buildId)) {
            this.prefix = ESR_IMAGES_PREFIX;
        }
        else {
            this.prefix = IMAGES_PREFIX;
        }
        this.deviceType = deviceType;
        this.buildId = buildId;
        this.release = release;
        this.axiosInstance = axios_1.default.create();
        if (awsCredentials !== undefined) {
            this.axiosInstance.interceptors.request.use((0, aws4_axios_1.aws4Interceptor)({ service: 's3' }, awsCredentials));
        }
    }
    async canCreateReadStream() {
        return true;
    }
    static isESRVersion(buildId) {
        return /^\d{4}\.\d{2}\.\d+\.(dev|prod)$/.test(buildId);
    }
    isESR() {
        return BalenaS3SourceBase.isESRVersion(this.buildId);
    }
    async download(path, responseType) {
        return await this.axiosInstance.get(this.getUrl(path), { responseType });
    }
    getUrl(path) {
        let prefix = this.prefix;
        let release = this.release;
        // Preloaded images have no VERSION, VERSION_HOSTOS or device-type.json file, we need to get it from the images or esr-images folder
        if (release !== undefined &&
            BalenaS3SourceBase.filesMissingFromPreloadedImages.includes(path)) {
            release = undefined;
            prefix = this.isESR() ? ESR_IMAGES_PREFIX : IMAGES_PREFIX;
        }
        return [
            this.host,
            this.bucket,
            prefix,
            this.deviceType,
            encodeURIComponent(this.buildId),
            release,
            path,
        ]
            .filter((x) => x !== undefined)
            .join('/');
    }
}
exports.BalenaS3SourceBase = BalenaS3SourceBase;
BalenaS3SourceBase.filesMissingFromPreloadedImages = [
    'VERSION',
    'VERSION_HOSTOS',
    'device-type.json',
];
class BalenaS3Source extends BalenaS3SourceBase {
    constructor() {
        super(...arguments);
        this.names = ['balena', 'resin'];
    }
    async getName() {
        for (const name of this.names) {
            try {
                await this.axiosInstance({
                    method: 'head',
                    url: this.getUrl(`image/${name}.img`),
                });
                return name;
            }
            catch (error) {
                if (error.response.status !== 404) {
                    throw error;
                }
            }
        }
        throw new Error('Could not find image');
    }
    async canRead() {
        return true;
    }
    async read(buffer, bufferOffset, length, sourceOffset) {
        return await this.rawSource.read(buffer, bufferOffset, length, sourceOffset);
    }
    async createReadStream(options = {}) {
        return await this.zipSource.createReadStream(options);
    }
    async _getMetadata() {
        return await this.zipSource.getMetadata();
    }
    async _open() {
        this.name = await this.getName();
        this.rawSource = new http_1.Http({
            url: this.getUrl(`image/${this.name}.img`),
            axiosInstance: this.axiosInstance,
        });
        this.zipSource = new zip_1.ZipSource(new http_1.Http({
            url: this.getUrl(`image/${this.name}.img.zip`),
            avoidRandomAccess: true,
            axiosInstance: this.axiosInstance,
        }));
        await Promise.all([this.rawSource.open(), await this.zipSource.open()]);
    }
    async _close() {
        await Promise.all([this.zipSource.close(), await this.rawSource.close()]);
    }
}
exports.BalenaS3Source = BalenaS3Source;
//# sourceMappingURL=balena-s3-source.js.map