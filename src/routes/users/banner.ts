import { Router } from "express";
import { getBanners } from "../../controller/users/banner";

const bannerRouter = Router();

bannerRouter.get("/", getBanners);

export default bannerRouter;