/// <reference types="node" />
import { Hash } from 'crypto';
import * as XXHash from 'xxhash-addon';
import { AlignedLockableBuffer } from '../aligned-lockable-buffer';
export declare type ChecksumType = 'crc32' | 'sha1' | 'sha256' | 'xxhash3';
export interface Block {
    offset: number;
    length: number;
}
export interface BlocksWithChecksum {
    checksumType?: ChecksumType;
    checksum?: string;
    blocks: Block[];
}
export interface SparseStreamChunk {
    buffer: Buffer | AlignedLockableBuffer;
    position: number;
}
export interface SparseReadable extends NodeJS.ReadableStream {
    blocks: BlocksWithChecksum[];
    push(chunk: SparseStreamChunk): boolean;
}
export interface SparseWritable extends NodeJS.WritableStream {
    _write(chunk: SparseStreamChunk, encoding: string, callback: (err?: Error | null) => void): void;
}
declare type AnyHasher = Hash | XXHash | XXHash.XXHash64 | XXHash.XXHash3;
export interface SparseReaderState {
    block: BlocksWithChecksum;
    subBlock: Block;
    hasher?: AnyHasher;
}
export declare function createSparseReaderStateIterator(blocks: BlocksWithChecksum[], verify: boolean, generateChecksums: boolean): Iterator<SparseReaderState>;
export declare function blocksLength(blocks: BlocksWithChecksum[]): number;
export {};
