/// <reference types="node" />
import { AxiosInstance } from 'axios';
import { ReadResult } from 'file-disk';
import { Metadata } from './metadata';
import { CreateReadStreamOptions, SourceDestination } from './source-destination';
declare type Name = 'balena' | 'resin';
export interface AwsCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
}
export interface BalenaS3SourceOptions {
    host: string;
    bucket: string;
    prefix?: string;
    deviceType: string;
    buildId: string;
    release?: string;
    awsCredentials?: AwsCredentials;
}
export declare abstract class BalenaS3SourceBase extends SourceDestination {
    readonly host: string;
    readonly bucket: string;
    readonly prefix: string;
    readonly deviceType: string;
    readonly buildId: string;
    readonly release?: string;
    protected axiosInstance: AxiosInstance;
    private static filesMissingFromPreloadedImages;
    constructor({ host, bucket, prefix, deviceType, buildId, release, awsCredentials, }: BalenaS3SourceOptions);
    canCreateReadStream(): Promise<boolean>;
    static isESRVersion(buildId: string): boolean;
    private isESR;
    protected download(path: string, responseType?: 'stream'): Promise<import("axios").AxiosResponse<any>>;
    protected getUrl(path: string): string;
}
export declare class BalenaS3Source extends BalenaS3SourceBase {
    private rawSource;
    private zipSource;
    private names;
    name: Name;
    private getName;
    canRead(): Promise<boolean>;
    read(buffer: Buffer, bufferOffset: number, length: number, sourceOffset: number): Promise<ReadResult>;
    createReadStream(options?: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
    protected _getMetadata(): Promise<Metadata>;
    protected _open(): Promise<void>;
    protected _close(): Promise<void>;
}
export {};
