import { Router, RequestHandler } from "express";
import deviceController from "./device.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.post("/", authMiddleware as RequestHandler, deviceController.createDevice as RequestHandler);

router.post("/data", authMiddleware as RequestHandler, deviceController.postDeviceData  as RequestHandler);

router.post("/rmq" ,authMiddleware as RequestHandler, deviceController.postDeviceDataRMQ  as RequestHandler);

router.get("/analytics", authMiddleware as RequestHandler, deviceController.getAnalytics  as RequestHandler);

router.get("/uptime", authMiddleware as RequestHandler, deviceController.getUptimeData  as RequestHandler);

router.get("/analytics/hourly", authMiddleware as RequestHandler, deviceController.getHourlyAnalytics as RequestHandler);

router.get("/uptime/state-changes", authMiddleware as RequestHandler, deviceController.getStateChanges  as RequestHandler);

router.get("/report", authMiddleware as RequestHandler, deviceController.getDeviceReport  as RequestHandler);

export default router;
