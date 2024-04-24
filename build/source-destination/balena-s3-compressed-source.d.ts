/// <reference types="node" />
import { Readable } from 'stream';
import { BalenaS3SourceBase, BalenaS3SourceOptions } from './balena-s3-source';
import { Metadata } from './metadata';
import { CreateReadStreamOptions } from './source-destination';
import { Dictionary } from '../utils';
interface ImageJSONPart {
    filename: string;
    crc: number;
    len: number;
    zLen: number;
    partitionIndex?: string;
}
export declare type ImageJSON = Dictionary<{
    parts: ImageJSONPart[];
}>;
export interface BalenaS3CompressedSourceOptions extends BalenaS3SourceOptions {
    format: 'zip' | 'gzip';
    filenamePrefix?: string;
    configuration?: Dictionary<any>;
}
export declare class BalenaS3CompressedSource extends BalenaS3SourceBase {
    private imageJSON;
    private deviceTypeJSON;
    private format;
    private filenamePrefix?;
    private configuration?;
    private configuredParts;
    private supervisorVersion;
    private lastModified;
    private osVersion;
    private size;
    private filename;
    constructor({ format, filenamePrefix, configuration, ...options }: BalenaS3CompressedSourceOptions);
    private getSize;
    private getFilename;
    protected _getMetadata(): Promise<Metadata>;
    private getSupervisorVersion;
    private getOsVersion;
    private getImageJSON;
    private getDeviceTypeJSON;
    private getPartStream;
    private findPartitionPart;
    private findImagePart;
    private findPart;
    private extractDeflateToDisk;
    private configure;
    protected _open(): Promise<void>;
    private getParts;
    private createZipStream;
    private createGzipStream;
    private createStream;
    createReadStream(options?: CreateReadStreamOptions): Promise<Readable>;
}
export {};
