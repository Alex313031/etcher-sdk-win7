"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsbBBbootDrive = void 0;
const source_destination_1 = require("./source-destination");
class UsbBBbootDrive extends source_destination_1.SourceDestination {
    constructor(usbDevice) {
        super();
        this.usbDevice = usbDevice;
        this.raw = null;
        this.displayName = 'Initializing device';
        this.device = null;
        this.devicePath = null;
        this.icon = 'loading';
        this.isSystem = false;
        this.description = 'BeagleBone';
        this.mountpoints = [];
        this.isReadOnly = false;
        this.disabled = true;
        this.size = null;
        this.emitsProgress = true;
        this.progress = 0;
        usbDevice.on('progress', (value) => {
            this.progress = value;
            this.emit('progress', value);
        });
    }
}
exports.UsbBBbootDrive = UsbBBbootDrive;
//# sourceMappingURL=usb-bb-boot.js.map