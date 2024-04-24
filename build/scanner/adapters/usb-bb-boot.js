"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsbBBbootDeviceAdapter = void 0;
const node_beaglebone_usbboot_1 = require("@balena/node-beaglebone-usbboot");
const usb_bb_boot_1 = require("../../source-destination/usb-bb-boot");
const adapter_1 = require("./adapter");
class UsbBBbootDeviceAdapter extends adapter_1.Adapter {
    constructor() {
        super();
        this.drives = new Map();
        this.scanner = new node_beaglebone_usbboot_1.UsbBBbootScanner();
        this.scanner.on('attach', this.onAttach.bind(this));
        this.scanner.on('detach', this.onDetach.bind(this));
        this.scanner.on('ready', this.emit.bind(this, 'ready'));
        this.scanner.on('error', this.emit.bind(this, 'error'));
    }
    start() {
        this.scanner.start();
    }
    stop() {
        this.scanner.stop();
    }
    onAttach(device) {
        let drive = this.drives.get(device);
        if (drive === undefined) {
            drive = new usb_bb_boot_1.UsbBBbootDrive(device);
            this.drives.set(device, drive);
        }
        this.emit('attach', drive);
    }
    onDetach(device) {
        const drive = this.drives.get(device);
        this.drives.delete(device);
        this.emit('detach', drive);
    }
}
exports.UsbBBbootDeviceAdapter = UsbBBbootDeviceAdapter;
//# sourceMappingURL=usb-bb-boot.js.map