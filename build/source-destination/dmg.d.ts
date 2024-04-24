/// <reference types="node" />
import { Metadata } from './metadata';
import { CreateReadStreamOptions, CreateSparseReadStreamOptions, SourceDestination } from './source-destination';
import { SourceSource } from './source-source';
import { BlocksWithChecksum, SparseReadable } from '../sparse-stream/shared';
export declare class DmgSource extends SourceSource {
    private static mappedBlockTypes;
    static requiresRandomReadableSource: boolean;
    static readonly mimetype = "application/x-apple-diskimage";
    private image;
    constructor(source: SourceDestination);
    canCreateReadStream(): Promise<boolean>;
    canCreateSparseReadStream(): Promise<boolean>;
    createReadStream({ start, end, alignment, numBuffers, }?: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    createSparseReadStream({ alignment, numBuffers, }?: CreateSparseReadStreamOptions): Promise<SparseReadable>;
    getBlocks(): Promise<BlocksWithChecksum[]>;
    protected _getMetadata(): Promise<Metadata>;
    protected _open(): Promise<void>;
}
