
import { Request, Response } from "express";
import asyncHandler from 'express-async-handler';
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { StoreSettingsModel } from "../../models/schema/admin/storeSettings";
import { saveBase64Image } from "../../utils/handleImages";


// Get store settings
export const getStoreSettings = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {

        let settings = await StoreSettingsModel.findOne();

        // Create default settings if no settings exist
        if (!settings) {
            settings = await StoreSettingsModel.create({
                title: "Store.",
                logo: null,
            });
        }

        SuccessResponse(
            res,
            {
                message: "Store settings fetched successfully",
                settings,
            },
            200
        );
    }
);


// Update store settings
export const updateStoreSettings = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {

        const { title, logo } = req.body;

        // Validation
        if (!title || typeof title !== "string" || !title.trim()) {
            throw new BadRequest("title is required.");
        }

        let settings = await StoreSettingsModel.findOne();

        // If settings don't exist, create them
        if (!settings) {

            let logoUrl: string | null = null;

            if (logo) {
                logoUrl = await saveBase64Image(
                    logo,
                    `${Date.now()}_store_logo`,
                    req,
                    "store"
                );
            }

            settings = await StoreSettingsModel.create({
                title: title.trim(),
                logo: logoUrl,
            });

        } else {

            // Update title
            settings.title = title.trim();

            // Update logo only if a new logo was provided
            if (logo) {
                const logoUrl = await saveBase64Image(
                    logo,
                    `${Date.now()}_store_logo`,
                    req,
                    "store"
                );

                settings.logo = logoUrl;
            }

            await settings.save();
        }

        SuccessResponse(
            res,
            {
                message: "Store settings updated successfully",
                settings,
            },
            200
        );
    }
);