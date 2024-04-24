/// <reference types="node" />
import { Transform } from 'stream';
import { CompressedSource } from './compressed-source';
export declare class GZipSource extends CompressedSource {
    static readonly mimetype = "application/gzip";
    protected createTransform(): Transform;
    protected getSize(): Promise<{
        size: number;
        isEstimated: true;
    } | undefined>;
}
