/// <reference types="node" />
import { Readable } from 'stream';
import { SourceDestination } from '../source-destination/source-destination';
import { BlocksWithChecksum, SparseReadable } from './shared';
export declare class SparseReadStream extends Readable implements SparseReadable {
    private source;
    readonly blocks: BlocksWithChecksum[];
    private chunkSize;
    private stateIterator;
    private state?;
    private positionInBlock;
    private alignedReadableState?;
    constructor({ source, blocks, chunkSize, verify, generateChecksums, alignment, numBuffers, }: {
        source: SourceDestination;
        blocks: BlocksWithChecksum[];
        chunkSize: number;
        verify: boolean;
        generateChecksums: boolean;
        alignment?: number;
        numBuffers?: number;
    });
    _read(): Promise<void>;
    private nextBlock;
    private __read;
}
