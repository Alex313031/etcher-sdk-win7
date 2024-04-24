"use strict";
/*
 * Copyright 2018 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configure = void 0;
const balena_image_fs_1 = require("balena-image-fs");
const outdent_1 = require("outdent");
const util_1 = require("util");
function nmWifiConfig(index, options) {
    let config = (0, outdent_1.outdent) `
		[connection]
		id=balena-wifi-${pad(index)}
		type=wifi

		[wifi]
		hidden=true
		mode=infrastructure
		ssid=${options.wifiSsid}

		[ipv4]
	`;
    if (options.routeMetric) {
        config += (0, outdent_1.outdent) `

			route-metric=${options.routeMetric}
		`;
    }
    if (options.ip && options.netmask && options.gateway) {
        config += (0, outdent_1.outdent) `

			method=manual
			address1=${options.ip}/${options.netmask},${options.gateway}
		`;
    }
    else {
        config += (0, outdent_1.outdent) `

			method=auto
		`;
    }
    config += (0, outdent_1.outdent) `


		[ipv6]
		addr-gen-mode=stable-privacy
		method=auto
	`;
    if (options.wifiKey) {
        config += (0, outdent_1.outdent) `


			[wifi-security]
			auth-alg=open
			key-mgmt=wpa-psk
			psk=${options.wifiKey}
		`;
    }
    return config;
}
function createNetworkConfigFiles(networks) {
    return {
        ethernet: networks.map((n) => n.configuration).filter((n) => !!n),
        wifi: networks
            .filter((n) => !!n.wifiSsid)
            .map((network, index) => nmWifiConfig(index + 1, network)),
    };
}
function pad(num) {
    return `${num}`.padStart(2, '0');
}
async function configure(disk, partition, config) {
    const { wifiSsid, wifiKey, ip, netmask, gateway, routeMetric, network, ...configJSON } = config;
    // FIXME: init with an empty list once the api no longer uses ('wifiSsid', 'wifiKey', 'ip', 'netmask', 'gateway')
    const networks = [
        { wifiSsid, wifiKey, ip, netmask, gateway, routeMetric },
        ...(network !== null && network !== void 0 ? network : []),
    ];
    const networkConfigFiles = createNetworkConfigFiles(networks);
    await (0, balena_image_fs_1.interact)(disk, partition, async (fs) => {
        const writeFileAsync = (0, util_1.promisify)(fs.writeFile);
        const mkdirAsync = (0, util_1.promisify)(fs.mkdir);
        await writeFileAsync('/config.json', JSON.stringify(configJSON));
        try {
            await mkdirAsync('/system-connections');
        }
        catch (_a) {
            // Directory already exists
        }
        for (const [index, configuration,] of networkConfigFiles.ethernet.entries()) {
            await writeFileAsync(`/system-connections/connection-${pad(index + 1)}`, configuration);
        }
        for (const [index, configuration] of networkConfigFiles.wifi.entries()) {
            await writeFileAsync(`/system-connections/balena-wifi-${pad(index + 1)}`, configuration);
        }
    });
}
exports.configure = configure;
//# sourceMappingURL=configure.js.map