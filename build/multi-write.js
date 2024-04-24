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
exports.pipeSourceToDestinations = exports.decompressThenFlash = exports.DECOMPRESSED_IMAGE_PREFIX = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const block_read_stream_1 = require("./block-read-stream");
const block_transform_stream_1 = require("./block-transform-stream");
const constants_1 = require("./constants");
const compressed_source_1 = require("./source-destination/compressed-source");
const configured_source_1 = require("./source-destination/configured-source/configured-source");
const file_1 = require("./source-destination/file");
const multi_destination_1 = require("./source-destination/multi-destination");
const source_destination_1 = require("./source-destination/source-destination");
const tmp_1 = require("./tmp");
exports.DECOMPRESSED_IMAGE_PREFIX = 'decompressed-image-';
function getEta(current, total, speed) {
    return speed === 0 ? undefined : (total - current) / speed;
}
function isWorthDecompressing(filename = '') {
    return [
        '.img',
        '.bin',
        '.hddimg',
        '.raw',
        '.sdcard',
        '.rpi-sdimg',
        '.wic',
    ].includes((0, path_1.extname)(filename));
}
function defaultEnoughSpaceForDecompression(free, imageSize) {
    return imageSize === undefined
        ? false
        : imageSize < Math.min(free / 2, 5 * 1024 ** 3);
}
async function decompressThenFlash({ source, destinations, onFail, onProgress, verify = false, numBuffers = 16, decompressFirst = false, trim = false, configure, enoughSpaceForDecompression = defaultEnoughSpaceForDecompression, asItIs = false, }) {
    await source.open();
    if (!asItIs) {
        source = await source.getInnerSource();
    }
    const sourceMetadata = await source.getMetadata();
    const enoughDiskSpaceAvailable = enoughSpaceForDecompression(await (0, tmp_1.freeSpace)(), sourceMetadata.size);
    let decompressedFilePath;
    try {
        if (decompressFirst &&
            sourceMetadata.isCompressed &&
            isWorthDecompressing(sourceMetadata.name) &&
            enoughDiskSpaceAvailable) {
            ({ path: decompressedFilePath } = await (0, tmp_1.tmpFile)({
                keepOpen: false,
                prefix: exports.DECOMPRESSED_IMAGE_PREFIX,
            }));
            const decompressedSource = new file_1.File({
                path: decompressedFilePath,
                write: true,
            });
            await decompressedSource.open();
            const inputStream = await source.createReadStream();
            const outputStream = await decompressedSource.createWriteStream();
            await new Promise((resolve, reject) => {
                outputStream.on('done', resolve);
                outputStream.on('error', reject);
                inputStream.on('error', reject);
                const state = {
                    active: 0,
                    failed: 0,
                    type: 'decompressing',
                };
                const [$onProgress, onRootStreamProgress] = createCompleteOnProgress(onProgress, sourceMetadata, state, false);
                (0, compressed_source_1.getRootStream)(inputStream).on('progress', onRootStreamProgress);
                outputStream.on('progress', $onProgress);
                inputStream.pipe(outputStream);
            });
            source = decompressedSource;
        }
        if ((trim || configure !== undefined) &&
            !(source instanceof configured_source_1.ConfiguredSource)) {
            if (!(await source.canRead())) {
                console.warn("Can't configure or trim a source that is not randomly readable, skipping");
            }
            else {
                source = new configured_source_1.ConfiguredSource({
                    source,
                    shouldTrimPartitions: trim,
                    createStreamFromDisk: decompressFirst || !sourceMetadata.isCompressed,
                    configure,
                });
                await source.open();
            }
        }
        return await pipeSourceToDestinations({
            source,
            destinations,
            onFail,
            onProgress,
            verify,
            numBuffers,
        });
    }
    finally {
        if (decompressedFilePath) {
            await fs_1.promises.unlink(decompressedFilePath);
        }
    }
}
exports.decompressThenFlash = decompressThenFlash;
function createCompleteOnProgress(onProgress, sourceMetadata, state, sparse) {
    function $onProgress(progress) {
        // sourceMetadata will be updated by pipeRegularSourceToDestination
        if (sourceMetadata.size !== undefined && state.size === undefined) {
            state.size = sourceMetadata.size;
        }
        let size;
        let percentage;
        let eta;
        if (sparse) {
            size = state.blockmappedSize;
            state.bytesWritten = progress.bytes;
        }
        else {
            size = state.size;
            state.bytesWritten = progress.position;
        }
        if (size !== undefined &&
            state.bytesWritten !== undefined &&
            state.bytesWritten <= size) {
            percentage = (state.bytesWritten / size) * 100;
            eta = getEta(state.bytesWritten, size, progress.speed);
        }
        else if (state.rootStreamSpeed !== undefined &&
            state.rootStreamPosition !== undefined &&
            state.compressedSize !== undefined) {
            percentage = (state.rootStreamPosition / state.compressedSize) * 100;
            eta = getEta(state.rootStreamPosition, state.compressedSize, state.rootStreamSpeed);
        }
        const result = {
            ...progress,
            ...state,
            percentage,
            eta,
        };
        onProgress(result);
    }
    function onRootStreamProgress(progress) {
        state.rootStreamPosition = progress.position;
        state.rootStreamSpeed = progress.speed;
        state.rootStreamAverageSpeed = progress.averageSpeed;
    }
    return [$onProgress, onRootStreamProgress];
}
// This function is the most common use case of the SDK.
// Added it here to avoid duplicating it in other projects.
async function pipeSourceToDestinations({ source, destinations, onFail, onProgress, verify = false, numBuffers = 16, }) {
    if (numBuffers < 2) {
        numBuffers = 2;
    }
    const destination = new multi_destination_1.MultiDestination(destinations);
    const failures = new Map();
    const state = {
        active: destination.destinations.size,
        failed: 0,
        type: 'flashing',
    };
    destination.on('fail', _onFail);
    await Promise.all([source.open(), destination.open()]);
    const [sourceMetadata, sparseSource, sparseDestination] = await Promise.all([
        source.getMetadata(),
        source.canCreateSparseReadStream(),
        destination.canCreateSparseWriteStream(),
    ]);
    const sparse = sparseSource && sparseDestination;
    state.sparse = sparse;
    state.size = sourceMetadata.size;
    state.compressedSize = sourceMetadata.compressedSize;
    state.blockmappedSize = sourceMetadata.blockmappedSize;
    function updateState(step) {
        if (step !== undefined) {
            state.type = step;
        }
        state.failed = failures.size;
        state.active = destination.destinations.size - state.failed;
    }
    function _onFail(error) {
        failures.set(error.destination, error.error);
        updateState();
        onFail(error.destination, error.error);
    }
    const [$onProgress, onRootStreamProgress] = createCompleteOnProgress(onProgress, sourceMetadata, state, sparse);
    if (sparse) {
        await pipeSparseSourceToDestination(source, destination, verify, numBuffers, updateState, _onFail, $onProgress, onRootStreamProgress);
    }
    else {
        await pipeRegularSourceToDestination(source, sourceMetadata, destination, verify, numBuffers, updateState, _onFail, $onProgress, onRootStreamProgress);
    }
    updateState('finished');
    await Promise.all([source.close(), destination.close()]);
    return { sourceMetadata, failures, bytesWritten: state.bytesWritten || 0 };
}
exports.pipeSourceToDestinations = pipeSourceToDestinations;
function notUndefined(x) {
    return x !== undefined;
}
function getAlignment(...devices) {
    const alignments = devices.map((d) => d.getAlignment()).filter(notUndefined);
    if (alignments.length) {
        return Math.max(...alignments);
    }
}
async function pipeRegularSourceToDestination(source, sourceMetadata, destination, verify, numBuffers, updateState, onFail, onProgress, onRootStreamProgress) {
    let lastPosition = 0;
    const emitSourceProgress = sourceMetadata.size === undefined || sourceMetadata.isSizeEstimated;
    const alignment = getAlignment(source, destination);
    const highWaterMark = alignment === undefined ? undefined : numBuffers - 1;
    const [sourceStream, destinationStream] = await Promise.all([
        source.createReadStream({
            emitProgress: emitSourceProgress,
            alignment,
            numBuffers,
        }),
        destination.createWriteStream({ highWaterMark }),
    ]);
    (0, compressed_source_1.getRootStream)(sourceStream).on('progress', (progress) => {
        onRootStreamProgress(progress);
    });
    const checksum = await new Promise((resolve, reject) => {
        let result;
        let done = false;
        let hasher;
        function maybeDone(maybeChecksum) {
            if (maybeChecksum !== undefined) {
                result = maybeChecksum;
            }
            else {
                done = true;
            }
            if (done &&
                (!verify ||
                    destination.activeDestinations.size === 0 ||
                    result !== undefined)) {
                if (hasher !== undefined) {
                    sourceStream.unpipe(hasher);
                    hasher.end();
                }
                resolve(result);
            }
        }
        sourceStream.once('error', reject);
        destinationStream.on('fail', onFail); // This is emitted by MultiDestination when one of its destinations fails
        destinationStream.once('error', reject);
        if (verify) {
            hasher = (0, source_destination_1.createHasher)();
            hasher.once('checksum', maybeDone);
            sourceStream.pipe(hasher);
        }
        destinationStream.once('done', maybeDone);
        destinationStream.on('progress', (progress) => {
            lastPosition = progress.position;
            onProgress(progress);
        });
        if (alignment !== undefined &&
            !(sourceStream instanceof block_read_stream_1.BlockReadStream ||
                sourceStream instanceof block_transform_stream_1.BlockTransformStream)) {
            // The destination needs data to be aligned and it isn't.
            // Pass it through a BlockTransformStream to align it.
            sourceStream
                .pipe(new block_transform_stream_1.BlockTransformStream({
                chunkSize: constants_1.CHUNK_SIZE,
                alignment,
                numBuffers,
            }))
                .pipe(destinationStream);
        }
        else {
            sourceStream.pipe(destinationStream);
        }
    });
    if (sourceMetadata.size === undefined ||
        sourceMetadata.isSizeEstimated === true) {
        sourceMetadata.size = lastPosition;
        sourceMetadata.isSizeEstimated = false;
    }
    if (verify && checksum) {
        updateState('verifying');
        const verifier = destination.createVerifier(checksum, lastPosition);
        await runVerifier(verifier, onFail, onProgress);
    }
}
async function pipeSparseSourceToDestination(source, destination, verify, numBuffers, updateState, onFail, onProgress, onRootStreamProgress) {
    const alignment = getAlignment(source, destination);
    const highWaterMark = alignment === undefined ? undefined : numBuffers - 1;
    const [sourceStream, destinationStream] = await Promise.all([
        source.createSparseReadStream({
            generateChecksums: verify,
            alignment,
            numBuffers,
        }),
        destination.createSparseWriteStream({ highWaterMark }),
    ]);
    (0, compressed_source_1.getRootStream)(sourceStream).on('progress', (progress) => {
        onRootStreamProgress(progress);
    });
    await new Promise((resolve, reject) => {
        sourceStream.once('error', reject);
        destinationStream.once('error', reject);
        destinationStream.once('done', resolve);
        destinationStream.on('fail', onFail); // This is emitted by MultiDestination when one of its destinations fails
        destinationStream.on('progress', onProgress);
        sourceStream.pipe(destinationStream);
    });
    if (verify) {
        updateState('verifying');
        const verifier = destination.createVerifier(sourceStream.blocks);
        await runVerifier(verifier, onFail, onProgress);
    }
}
async function runVerifier(verifier, onFail, onProgress) {
    await new Promise((resolve, reject) => {
        verifier.once('error', reject);
        verifier.once('finish', resolve);
        verifier.on('fail', onFail);
        verifier.on('progress', onProgress);
        verifier.run();
    });
}
//# sourceMappingURL=multi-write.js.map