import { BlockMap } from 'blockmap';
import { BlocksWithChecksum } from '../sparse-stream/shared';
export interface Metadata {
    size?: number;
    isSizeEstimated?: boolean;
    isCompressed?: boolean;
    compressedSize?: number;
    blockmappedSize?: number;
    name?: string;
    blockMap?: BlockMap;
    blocks?: BlocksWithChecksum[];
    instructions?: string;
    logo?: string;
    bytesToZeroOutFromTheBeginning?: number;
    checksum?: string;
    checksumType?: string;
    recommendedDriveSize?: number;
    releaseNotesUrl?: string;
    supportUrl?: string;
    url?: string;
    version?: string;
    isEtch?: boolean;
    supervisorVersion?: string;
    osVersion?: string;
    lastModified?: Date;
    format?: 'zip' | 'gzip';
}
