"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAddress = exports.deleteAddress = exports.getMyAddresses = exports.addAddress = void 0;
const Address_1 = require("../../models/schema/users/Address");
const Zone_1 = require("../../models/schema/admin/Zone");
const City_1 = require("../../models/schema/admin/City");
const Country_1 = require("../../models/schema/admin/Country");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const addAddress = async (req, res) => {
    const userId = req.user?.id;
    const { country, city, zone } = req.body;
    const countryExists = await Country_1.CountryModel.exists({ _id: country });
    if (!countryExists)
        throw new Errors_1.NotFound("The selected country is invalid");
    const cityExists = await City_1.CityModels.exists({ _id: city });
    if (!cityExists)
        throw new Errors_1.NotFound("The selected city is invalid");
    const zoneExists = await Zone_1.ZoneModel.exists({ _id: zone });
    if (!zoneExists)
        throw new Errors_1.NotFound("The selected zone is invalid");
    const address = await Address_1.AddressModel.create({
        ...req.body,
        user: userId
    });
    (0, response_1.SuccessResponse)(res, { message: "Address added successfully", address }, 201);
};
exports.addAddress = addAddress;
const getMyAddresses = async (req, res) => {
    const userId = req.user?.id;
    const addresses = await Address_1.AddressModel.find({ user: userId })
        .populate('country', 'name')
        .populate('city', 'name')
        .populate('zone', 'name shippingCost');
    (0, response_1.SuccessResponse)(res, { message: "Addresses fetched successfully", addresses });
};
exports.getMyAddresses = getMyAddresses;
const deleteAddress = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const address = await Address_1.AddressModel.findOneAndDelete({ _id: id, user: userId });
    if (!address)
        throw new Errors_1.NotFound("Address not found or unauthorized");
    (0, response_1.SuccessResponse)(res, { message: "Address deleted successfully" });
};
exports.deleteAddress = deleteAddress;
const updateAddress = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { country, city, zone } = req.body;
    if (zone) {
        const zoneExists = await Zone_1.ZoneModel.exists({ _id: zone });
        if (!zoneExists)
            throw new Errors_1.NotFound("The selected zone is invalid");
    }
    if (city) {
        const cityExists = await City_1.CityModels.exists({ _id: city });
        if (!cityExists)
            throw new Errors_1.NotFound("The selected city is invalid");
    }
    if (country) {
        const countryExists = await Country_1.CountryModel.exists({ _id: country });
        if (!countryExists)
            throw new Errors_1.NotFound("The selected country is invalid");
    }
    const address = await Address_1.AddressModel.findOneAndUpdate({ _id: id, user: userId }, { $set: req.body }, { new: true, runValidators: true });
    if (!address)
        throw new Errors_1.NotFound("Address not found or unauthorized");
    (0, response_1.SuccessResponse)(res, { message: "Address updated successfully", address });
};
exports.updateAddress = updateAddress;
