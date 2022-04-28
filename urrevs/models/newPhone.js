/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

var nPhoneSchema = new schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Phone",
        required: true
    },
    company: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: String    // numerical
    },
    releaseDate: {
        type: String
    },
    length: {
        type: String    // numerical
    },
    width: {
        type: String    // numerical
    },
    height: {
        type: String    // numerical
    },
    network: {
        type: String
    },
    weight: {
        type: String    // numerical
    },
    sim: {
        type: String
    },
    screenType: {
        type: String
    },
    screenSize: {
        type: String    // numerical
    },
    screen2bodyRatio: {
        type: String    // numerical
    },
    resolutionLength: {
        type: String    // numerical
    },
    resolutionWidth: {
        type: String    // numerical
    },
    resolutionDensity: {
        type: String    // numerical
    },
    screenProtection: {
        type: String
    },
    os: {
        type: String
    },
    chipset: {
        type: String
    },
    cpu: {
        type: String
    },
    gpu: {
        type: String
    },
    intMem: {
        type: Array     // array of strings
    },
    mainCam: {
        type: String
    },
    selfieCam: {
        type: String
    },
    hasLoudspeaker: {
        type: Boolean
    },
    hasStereo: {
        type: Boolean
    },
    has3p5mm: {
        type: Boolean
    },
    wlan: {
        type: String
    },
    bluetoothVersion: {
        type: String        // numerical
    },
    hasNfc: {
        type: Boolean
    },
    radio: {
        type: String
    },
    usbType: {
        type: String
    },
    usbVersion: {
        type: String
    },
    hasGyro: {
        type: Boolean
    },
    hasProximity: {
        type: Boolean
    },
    fingerprintDetails: {
        type: String
    },
    batteryCapacity: {
        type: String        // numerical
    },
    hasFastCharging: {
        type: Boolean
    },
    chargingPower: {
        type: String        // numerical
    }
}, 
{
    timestamps: true
});

nPhoneSchema.index({createdAt: 1});

module.exports = mongoose.model("Nphone", nPhoneSchema);