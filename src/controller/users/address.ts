import { AddressModel } from "../../models/schema/users/Address";
import { ZoneModel } from "../../models/schema/admin/Zone";
import { CityModels } from "../../models/schema/admin/City";
import { CountryModel } from "../../models/schema/admin/Country";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";

export const addAddress = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { country, city, zone } = req.body;

    const countryExists = await CountryModel.exists({ _id: country });
    if (!countryExists) throw new NotFound("The selected country is invalid");

    const cityExists = await CityModels.exists({ _id: city });
    if (!cityExists) throw new NotFound("The selected city is invalid");

    const zoneExists = await ZoneModel.exists({ _id: zone });
    if (!zoneExists) throw new NotFound("The selected zone is invalid");

    const address = await AddressModel.create({
        ...req.body,
        user: userId
    });

    SuccessResponse(res, { message: "Address added successfully", address }, 201);
};

export const getMyAddresses = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const addresses = await AddressModel.find({ user: userId })
        .populate('country', 'name')
        .populate('city', 'name')
        .populate('zone', 'name shippingCost');

    SuccessResponse(res, { message: "Addresses fetched successfully", addresses });
};

export const deleteAddress = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const address = await AddressModel.findOneAndDelete({ _id: id, user: userId });

    if (!address) throw new NotFound("Address not found or unauthorized");

    SuccessResponse(res, { message: "Address deleted successfully" });
};

export const updateAddress = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { country, city, zone } = req.body;

    if (zone) {
        const zoneExists = await ZoneModel.exists({ _id: zone });
        if (!zoneExists) throw new NotFound("The selected zone is invalid");
    }
    if (city) {
        const cityExists = await CityModels.exists({ _id: city });
        if (!cityExists) throw new NotFound("The selected city is invalid");
    }
    if (country) {
        const countryExists = await CountryModel.exists({ _id: country });
        if (!countryExists) throw new NotFound("The selected country is invalid");
    }
    const address = await AddressModel.findOneAndUpdate(
        { _id: id, user: userId },
        { $set: req.body },
        { new: true, runValidators: true }
    );

    if (!address) throw new NotFound("Address not found or unauthorized");

    SuccessResponse(res, { message: "Address updated successfully", address });
};

export const getAllLists = async (req: Request, res: Response) => {
    const countries = await CountryModel.find();
    const cities = await CityModels.find();
    const zones = await ZoneModel.find();

    SuccessResponse(res, { message: "Lists fetched successfully", countries, cities, zones });
};