import { Router, RequestHandler } from "express";
import { registerUser, loginUser } from "./user.controller";

const router = Router();

router.post("/register", registerUser as RequestHandler);
router.post("/login", loginUser as RequestHandler);

export default router;
