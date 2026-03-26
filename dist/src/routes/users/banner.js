"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const banner_1 = require("../../controller/users/banner");
const bannerRouter = (0, express_1.Router)();
bannerRouter.get("/", banner_1.getBanners);
exports.default = bannerRouter;
