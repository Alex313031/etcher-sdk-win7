/// <reference types="node" />
import { Transform } from 'stream';
import { CompressedSource } from './compressed-source';
export declare class BZip2Source extends CompressedSource {
    static readonly mimetype = "application/x-bzip2";
    protected createTransform(): Transform;
    protected getSize(): Promise<{
        size: number;
        isEstimated: true;
    } | undefined>;
}
