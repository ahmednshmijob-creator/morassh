import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import paymentRouter from "./payment";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiRouter);
router.use("/payment", paymentRouter);

export default router;
