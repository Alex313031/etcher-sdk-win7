import { SourceDestination } from './source-destination';
export declare class SourceSource extends SourceDestination {
    protected source: SourceDestination;
    static requiresRandomReadableSource: boolean;
    constructor(source: SourceDestination);
    protected _open(): Promise<void>;
    protected _close(): Promise<void>;
}
