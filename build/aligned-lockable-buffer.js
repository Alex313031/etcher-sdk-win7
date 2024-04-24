"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlignedReadableState = exports.isAlignedLockableBuffer = exports.createBuffer = void 0;
const direct_io_1 = require("@ronomon/direct-io");
const RWMutex = require("rwmutex");
function alignedLockableBufferSlice(start, end) {
    const slice = Buffer.prototype.slice.call(this, start, end);
    return attachMutex(slice, this.alignment, this.lock, this.rlock);
}
function attachMutex(buf, alignment, lock, rlock) {
    const buffer = buf;
    buffer.alignment = alignment;
    buffer.lock = lock;
    buffer.rlock = rlock;
    buffer.slice = alignedLockableBufferSlice;
    return buffer;
}
function createBuffer(size, alignment) {
    const mutex = new RWMutex();
    return attachMutex((0, direct_io_1.getAlignedBuffer)(size, alignment), alignment, mutex.lock.bind(mutex), mutex.rlock.bind(mutex));
}
exports.createBuffer = createBuffer;
function isAlignedLockableBuffer(buffer) {
    return 'rlock' in buffer;
}
exports.isAlignedLockableBuffer = isAlignedLockableBuffer;
class AlignedReadableState {
    constructor(bufferSize, alignment, numBuffers) {
        this.bufferSize = bufferSize;
        this.alignment = alignment;
        this.numBuffers = numBuffers;
        this.currentBufferIndex = 0;
        this.buffers = new Array(numBuffers);
    }
    getCurrentBuffer() {
        let buffer = this.buffers[this.currentBufferIndex];
        if (buffer === undefined) {
            buffer = createBuffer(this.bufferSize, this.alignment);
            this.buffers[this.currentBufferIndex] = buffer;
        }
        this.currentBufferIndex = (this.currentBufferIndex + 1) % this.numBuffers;
        return buffer;
    }
}
exports.AlignedReadableState = AlignedReadableState;
//# sourceMappingURL=aligned-lockable-buffer.js.map