/// <reference types="node" />
import { CreateReadStreamOptions, SourceDestination } from './source-destination';
export declare class SingleUseStreamSource extends SourceDestination {
    private stream;
    private used;
    constructor(stream: NodeJS.ReadableStream);
    canCreateReadStream(): Promise<boolean>;
    createReadStream({ start, end, }?: CreateReadStreamOptions): Promise<NodeJS.ReadableStream>;
}
