/// <reference types="node" />
import { Transform } from 'stream';
import { CompressedSource } from './compressed-source';
export declare class XzSource extends CompressedSource {
    static readonly mimetype = "application/x-xz";
    protected createTransform(): Transform;
    protected getSize(): Promise<{
        size: number;
        isEstimated: boolean;
    } | undefined>;
}
