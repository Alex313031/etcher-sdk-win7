import { BlocksWithChecksum } from './sparse-stream/shared';
export declare class NotCapable extends Error {
}
export declare class VerificationError extends Error {
    code: string;
}
export declare class ChecksumVerificationError extends VerificationError {
    checksum: string;
    expectedChecksum: string;
    constructor(message: string, checksum: string, expectedChecksum: string);
}
export declare class BlocksVerificationError extends VerificationError {
    readonly blocks: BlocksWithChecksum;
    readonly checksum: string;
    constructor(blocks: BlocksWithChecksum, checksum: string);
}
export declare function retryOnTransientError<T>(fn: () => Promise<T>, maxRetries: number, baseDelay: number): Promise<T>;
