/**
 * @summary Clean a device's partition tables
 * @param {String} device - device path
 * @example
 * diskpart.clean('\\\\.\\PhysicalDrive2')
 *   .then(...)
 *   .catch(...)
 */
export declare const clean: (device: string) => Promise<void>;
