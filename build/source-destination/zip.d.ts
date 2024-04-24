/// <reference types="node" />
import { Metadata } from './metadata';
import { CreateReadStreamOptions, CreateSparseReadStreamOptions, SourceDestination } from './source-destination';
import { SourceSource } from './source-source';
import { SparseReadable } from '../sparse-stream/shared';
import { SparseFilterStream } from '../sparse-stream/sparse-filter-stream';
export declare function matchSupportedExtensions(filename: string): boolean;
export declare class StreamZipSource extends SourceSource {
    private match;
    private entry?;
    constructor(source: SourceDestination, match?: (filename: string) => boolean);
    canCreateReadStream(): Promise<boolean>;
    private getEntry;
    createReadStream({ start, end, }?: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    protected _getMetadata(): Promise<Metadata>;
}
export declare class RandomAccessZipSource extends SourceSource {
    private match;
    private static manifestFields;
    private zip;
    private ready;
    private entries;
    constructor(source: SourceDestination, match?: (filename: string) => boolean);
    private init;
    canCreateReadStream(): Promise<boolean>;
    canCreateSparseReadStream(): Promise<boolean>;
    private getEntries;
    private getImageEntry;
    protected _open(): Promise<void>;
    private getEntryByName;
    private getStream;
    private getString;
    private getJson;
    createReadStream({ start, end, alignment, numBuffers, }: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    createSparseReadStream({ generateChecksums, alignment, numBuffers, }?: CreateSparseReadStreamOptions): Promise<SparseFilterStream>;
    _getMetadata(): Promise<Metadata>;
}
export declare class ZipSource extends SourceSource {
    private preferStreamSource;
    private match;
    static readonly mimetype = "application/zip";
    private ready;
    private implementation;
    constructor(source: SourceDestination, preferStreamSource?: boolean, match?: (filename: string) => boolean);
    private prepare;
    canCreateReadStream(): Promise<boolean>;
    open(): Promise<void>;
    canCreateSparseReadStream(): Promise<boolean>;
    createReadStream({ emitProgress, start, end, alignment, numBuffers, }?: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    createSparseReadStream({ generateChecksums, alignment, numBuffers, }?: CreateSparseReadStreamOptions): Promise<SparseReadable>;
    protected _getMetadata(): Promise<Metadata>;
}
