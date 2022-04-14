/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const phoneSpecsSchema = new schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Phone"
    },
    price: {
        type: Number
    },
    releaseDate: {
        type: String
    },
    dimensions: {
        type: String
    },
    newtork: {
        type: String
    },
    weight: {
        type: String
    },
    sim: {
        type: String
    },
    screenType: {
        type: String
    },
    screenSize: {
        type: String
    },
    screenResolution: {
        type: String
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
    exMem: {
        type: String
    },
    intMem: {
        type: String
    },
    mainCam: {
        type: String
    },
    selfieCam: {
        type: String
    },
    loudspeaker: {
        type: String
    },
    slot3p5mm: {
        type: String
    },
    wlan: {
        type: String
    },
    bluetooth: {
        type: String
    },
    gps: {
        type: String
    },
    nfc: {
        type: String
    },
    radio: {
        type: String
    },
    usb: {
        type: String
    },
    sensors: {
        type: String
    },
    battery: {
        type: String
    },
    charging: {
        type: String
    }
});

module.exports = mongoose.model("Pspec", phoneSpecsSchema);