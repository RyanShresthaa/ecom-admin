/**
 * /api/admin — dashboard, users, seller approve/reject, audit & security events (Admin only).
 * @see controllers/admin.controller.js · OpenAPI: docs/openapi/admin.paths.js
 */
import { Router } from "express";
import auth from "../../shared/middleware/auth.js";
import { admin, staff } from "../../shared/middleware/roles.js";
import { adminLimiter } from "../../shared/middleware/rateLimiter.js";
import { validateBody } from "../../shared/middleware/validate.js";
import { adminUserStatusBodySchema, adminCreateCustomerBodySchema } from "../../shared/validation/schemas.js";
import {
    approveSellerController,
    getDashboardStatsController,
    listUsersController,
    getUserDetailController,
    createCustomerController,
    rejectSellerController,
    setUserRoleController,
    getAuditLogsController,
    getSecurityEventsController,
    listFeedbackController,
    setUserStatusController,
    listNotificationsController,
    markNotificationReadController,
    markAllNotificationsReadController,
} from "../controllers/admin.controller.js";

const adminRouter = Router();
adminRouter.use(adminLimiter);
adminRouter.get("/stats", auth, staff, getDashboardStatsController);
adminRouter.get("/notifications", auth, staff, listNotificationsController);
adminRouter.patch("/notifications/:id/read", auth, staff, markNotificationReadController);
adminRouter.post("/notifications/read-all", auth, staff, markAllNotificationsReadController);
adminRouter.get("/users", auth, staff, listUsersController);
adminRouter.post("/users", auth, staff, validateBody(adminCreateCustomerBodySchema), createCustomerController);
adminRouter.get("/users/:id", auth, staff, getUserDetailController);
adminRouter.get("/seller-requests", auth, admin, (req, res, next) => {
    req.query.sellerRequest = "true";
    return listUsersController(req, res, next);
});
adminRouter.put("/users/:id/role", auth, admin, setUserRoleController);
adminRouter.put("/users/:id/status", auth, admin, validateBody(adminUserStatusBodySchema), setUserStatusController);
adminRouter.post("/users/:id/approve-seller", auth, admin, approveSellerController);
adminRouter.get("/feedback", auth, admin, listFeedbackController);
adminRouter.post("/users/:id/reject-seller", auth, admin, rejectSellerController);
adminRouter.get("/audit-logs", auth, admin, getAuditLogsController);
adminRouter.get("/security-events", auth, admin, getSecurityEventsController);

export default adminRouter;
