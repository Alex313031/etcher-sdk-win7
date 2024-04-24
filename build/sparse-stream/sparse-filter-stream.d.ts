/// <reference types="node" />
import { Transform } from 'stream';
import { BlocksWithChecksum, SparseReadable } from './shared';
export declare class SparseFilterStream extends Transform implements SparseReadable {
    readonly blocks: BlocksWithChecksum[];
    private stateIterator;
    private state?;
    private position;
    constructor({ blocks, verify, generateChecksums, }: {
        blocks: BlocksWithChecksum[];
        verify: boolean;
        generateChecksums: boolean;
    });
    private nextBlock;
    _transform(chunk: Buffer, _encoding: string, callback: (error?: Error) => void): void;
    private __transform;
}
