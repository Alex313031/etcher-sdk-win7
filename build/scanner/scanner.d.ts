/// <reference types="node" />
import { EventEmitter } from 'events';
import { Adapter, AdapterSourceDestination } from './adapters/adapter';
export declare class Scanner extends EventEmitter {
    private adapters;
    drives: Set<AdapterSourceDestination>;
    constructor(adapters: Adapter[]);
    private onAttach;
    private onDetach;
    getBy(field: 'raw' | 'device' | 'devicePath', value: string): AdapterSourceDestination | undefined;
    start(): Promise<void>;
    stop(): void;
}
