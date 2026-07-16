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
// Dashboard and notification routes for admin/staff control center.
adminRouter.get("/stats", auth, staff, getDashboardStatsController);
adminRouter.get("/notifications", auth, staff, listNotificationsController);
adminRouter.patch("/notifications/:id/read", auth, staff, markNotificationReadController);
adminRouter.post("/notifications/read-all", auth, staff, markAllNotificationsReadController);
// User management routes for listing, creation, and profile lookup.
adminRouter.get("/users", auth, staff, listUsersController);
adminRouter.post("/users", auth, staff, validateBody(adminCreateCustomerBodySchema), createCustomerController);
adminRouter.get("/users/:id", auth, staff, getUserDetailController);
// Seller-request convenience route that reuses users listing with forced sellerRequest filter.
adminRouter.get("/seller-requests", auth, admin, (req, res, next) => {
    req.query.sellerRequest = "true";
    return listUsersController(req, res, next);
});
// Privileged admin-only moderation, audit, and security visibility routes.
adminRouter.put("/users/:id/role", auth, admin, setUserRoleController);
adminRouter.put("/users/:id/status", auth, admin, validateBody(adminUserStatusBodySchema), setUserStatusController);
adminRouter.post("/users/:id/approve-seller", auth, admin, approveSellerController);
adminRouter.get("/feedback", auth, admin, listFeedbackController);
adminRouter.post("/users/:id/reject-seller", auth, admin, rejectSellerController);
adminRouter.get("/audit-logs", auth, admin, getAuditLogsController);
adminRouter.get("/security-events", auth, admin, getSecurityEventsController);

export default adminRouter;
