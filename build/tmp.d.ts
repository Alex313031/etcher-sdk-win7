/// <reference types="node" />
import { promises as fs } from 'fs';
export interface TmpFileResult {
    path: string;
    fileHandle?: fs.FileHandle;
}
export declare function cleanupTmpFiles(olderThan?: number, prefix?: string): Promise<void>;
export interface TmpFileOptions {
    keepOpen?: boolean;
    prefix?: string;
    postfix?: string;
}
export declare function tmpFile({ keepOpen, prefix, postfix, }: TmpFileOptions): Promise<TmpFileResult>;
export declare function withTmpFile<T>(options: TmpFileOptions, fn: (result: TmpFileResult) => Promise<T>): Promise<T>;
export declare function freeSpace(): Promise<number>;
