/**
 * /api/admin — dashboard, users, seller approve/reject, audit & security events (Admin only).
 * Rate limits (after auth, keyed by user id):
 * - reads: adminReadLimiter
 * - writes: adminWriteLimiter
 * - sensitive: adminSensitiveLimiter
 * @see controllers/admin.controller.js · OpenAPI: docs/openapi/admin.paths.js
 */
import { Router } from "express";
import auth from "../middleware/auth.js";
import { admin } from "../middleware/roles.js";
import {
    adminReadLimiter,
    adminWriteLimiter,
    adminSensitiveLimiter,
} from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import { adminUserStatusBodySchema } from "../validation/schemas.js";
import {
    approveSellerController,
    getDashboardStatsController,
    listUsersController,
    rejectSellerController,
    setUserRoleController,
    getAuditLogsController,
    getSecurityEventsController,
    listFeedbackController,
    setUserStatusController,
} from "../controllers/admin.controller.js";
import {
    listAdminNotificationsController,
    markNotificationReadController,
    markAllNotificationsReadController,
    adminSearchController,
    salesSeriesController,
} from "../controllers/adminExtras.controller.js";

const adminRouter = Router();

// Auth first so rate limiters can key by req.userId (not shared NAT IPs).
adminRouter.use(auth, admin);

// ── Reads (dashboard / lists / analytics) ───────────────────────────
adminRouter.get("/stats", adminReadLimiter, getDashboardStatsController);
adminRouter.get("/sales-series", adminReadLimiter, salesSeriesController);
adminRouter.get("/search", adminReadLimiter, adminSearchController);
adminRouter.get("/notifications", adminReadLimiter, listAdminNotificationsController);
adminRouter.get("/users", adminReadLimiter, listUsersController);
adminRouter.get("/seller-requests", adminReadLimiter, (req, res, next) => {
    req.query.sellerRequest = "true";
    return listUsersController(req, res, next);
});
adminRouter.get("/feedback", adminReadLimiter, listFeedbackController);
adminRouter.get("/audit-logs", adminReadLimiter, getAuditLogsController);
adminRouter.get("/security-events", adminReadLimiter, getSecurityEventsController);

// ── Writes (non-destructive) ────────────────────────────────────────
adminRouter.post("/notifications/mark-read", adminWriteLimiter, markNotificationReadController);
adminRouter.post("/notifications/mark-all-read", adminWriteLimiter, markAllNotificationsReadController);

// ── Sensitive (role / status / seller approve-reject) ───────────────
adminRouter.put("/users/:id/role", adminSensitiveLimiter, setUserRoleController);
adminRouter.put(
    "/users/:id/status",
    adminSensitiveLimiter,
    validateBody(adminUserStatusBodySchema),
    setUserStatusController,
);
adminRouter.post("/users/:id/approve-seller", adminSensitiveLimiter, approveSellerController);
adminRouter.post("/users/:id/reject-seller", adminSensitiveLimiter, rejectSellerController);

export default adminRouter;

