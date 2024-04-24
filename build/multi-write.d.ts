import { ConfigureFunction } from './source-destination/configured-source/configured-source';
import { Metadata } from './source-destination/metadata';
import { SourceDestination } from './source-destination/source-destination';
export declare type WriteStep = 'decompressing' | 'flashing' | 'verifying' | 'finished';
export declare const DECOMPRESSED_IMAGE_PREFIX = "decompressed-image-";
interface MultiDestinationState {
    active: number;
    failed: number;
    type: WriteStep;
    size?: number;
    compressedSize?: number;
    blockmappedSize?: number;
    sparse?: boolean;
    rootStreamPosition?: number;
    rootStreamSpeed?: number;
    rootStreamAverageSpeed?: number;
    bytesWritten?: number;
}
export interface MultiDestinationProgress extends MultiDestinationState {
    bytes: number;
    position: number;
    speed: number;
    averageSpeed: number;
    percentage?: number;
    eta?: number;
}
export declare type OnFailFunction = (destination: SourceDestination, error: Error) => void;
export declare type OnProgressFunction = (progress: MultiDestinationProgress) => void;
export interface PipeSourceToDestinationsResult {
    failures: Map<SourceDestination, Error>;
    bytesWritten: number;
    sourceMetadata: Metadata;
}
export declare function decompressThenFlash({ source, destinations, onFail, onProgress, verify, numBuffers, decompressFirst, trim, configure, enoughSpaceForDecompression, asItIs, }: {
    source: SourceDestination;
    destinations: SourceDestination[];
    onFail: OnFailFunction;
    onProgress: OnProgressFunction;
    verify?: boolean;
    numBuffers?: number;
    decompressFirst?: boolean;
    trim?: boolean;
    configure?: ConfigureFunction;
    enoughSpaceForDecompression?: (free: number, imageSize?: number) => boolean;
    asItIs?: boolean;
}): Promise<PipeSourceToDestinationsResult>;
export declare function pipeSourceToDestinations({ source, destinations, onFail, onProgress, verify, numBuffers, }: {
    source: SourceDestination;
    destinations: SourceDestination[];
    onFail: OnFailFunction;
    onProgress: OnProgressFunction;
    verify?: boolean;
    numBuffers?: number;
}): Promise<PipeSourceToDestinationsResult>;
export {};
