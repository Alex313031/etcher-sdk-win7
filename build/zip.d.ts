/// <reference types="node" />
/// <reference types="mocha" />
import * as unzip from 'unzip-stream';
export declare const getFileStreamFromZipStream: (zipStream: NodeJS.ReadableStream, match: (filename: string) => boolean) => Promise<unzip.ZipStreamEntry>;
