/// <reference types="node" />
import { AxiosBasicCredentials, AxiosInstance } from 'axios';
import { ReadResult } from 'file-disk';
import { Metadata } from './metadata';
import { CreateReadStreamOptions, SourceDestination } from './source-destination';
export declare class Http extends SourceDestination {
    private fileName;
    private url;
    private redirectUrl;
    private avoidRandomAccess;
    private size;
    private acceptsRange;
    private ready;
    private error;
    private axiosInstance;
    constructor({ url, avoidRandomAccess, axiosInstance, auth, }: {
        url: string;
        avoidRandomAccess?: boolean;
        axiosInstance?: AxiosInstance;
        auth?: AxiosBasicCredentials;
    });
    private getInfo;
    canRead(): Promise<boolean>;
    canCreateReadStream(): Promise<boolean>;
    protected _getMetadata(): Promise<Metadata>;
    private getRange;
    read(buffer: Buffer, bufferOffset: number, length: number, sourceOffset: number): Promise<ReadResult>;
    createReadStream({ emitProgress, start, end, }?: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
}
