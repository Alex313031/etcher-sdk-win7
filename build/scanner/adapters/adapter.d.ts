/// <reference types="node" />
import { EventEmitter } from 'events';
import { SourceDestination } from '../../source-destination/source-destination';
export interface AdapterSourceDestination extends SourceDestination {
    raw: string | null;
    device: string | null;
    devicePath: string | null;
    isSystem: boolean;
    description: string;
    mountpoints: Array<{
        path: string;
    }>;
    size: number | null;
    emitsProgress: boolean;
}
export declare abstract class Adapter extends EventEmitter {
    abstract start(): void;
    abstract stop(): void;
}
