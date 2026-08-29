import { Router } from "express";
import { listResourcesHandler, updateStatusHandler } from "../controllers/resourceController";
import { requireAuthority } from "../middlewares/auth";

const router = Router();

router.get("/", listResourcesHandler);
router.put("/:id/status", requireAuthority, updateStatusHandler);


export default router;
