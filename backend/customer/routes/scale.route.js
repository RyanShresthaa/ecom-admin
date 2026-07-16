/**
 * Scale / marketplace feature routes.
 * Prefixed under /api via customer index mounts.
 */
import { Router } from 'express';
import auth from '../../shared/middleware/auth.js';
import { admin, staff } from '../../shared/middleware/roles.js';
import {
    listFlagsController,
    setFlagController,
    mfaStatusController,
    mfaBeginController,
    mfaConfirmController,
    mfaDisableController,
    listFxController,
    upsertFxController,
    convertFxController,
    loyaltyMeController,
    loyaltyLedgerController,
    loyaltyRedeemController,
    loyaltyAdjustController,
    relatedProductsController,
    setRelatedController,
    removeRelatedController,
    reserveStockController,
    releaseReservationController,
    myReservationsController,
    expireReservationsController,
    sellerBalanceController,
    sellerEarningsController,
    sellerPayoutsListController,
    sellerPayoutCreateController,
    registerDeviceController,
    unregisterDeviceController,
    listDevicesController,
    sendPushController,
} from '../controllers/scale.controller.js';

const flagsRouter = Router();
// Feature-flag endpoints: list (auth + staff) and update (auth + admin).
flagsRouter.get('/', auth, staff, listFlagsController);
flagsRouter.put('/', auth, admin, setFlagController);

const mfaRouter = Router();
// MFA endpoints: status/setup/confirm/disable for authenticated users.
mfaRouter.get('/status', auth, mfaStatusController);
mfaRouter.post('/begin', auth, mfaBeginController);
mfaRouter.post('/confirm', auth, mfaConfirmController);
mfaRouter.post('/disable', auth, mfaDisableController);

const fxRouter = Router();
// FX endpoints: public rates/convert and staff rate upsert.
fxRouter.get('/rates', listFxController);
fxRouter.put('/rates', auth, staff, upsertFxController);
fxRouter.post('/convert', convertFxController);

const loyaltyRouter = Router();
// Loyalty endpoints: user wallet/ledger/redeem and admin adjustment.
loyaltyRouter.get('/me', auth, loyaltyMeController);
loyaltyRouter.get('/ledger', auth, loyaltyLedgerController);
loyaltyRouter.post('/redeem', auth, loyaltyRedeemController);
loyaltyRouter.post('/adjust', auth, admin, loyaltyAdjustController);

const recommendationsRouter = Router();
// Product recommendation endpoints: public read + staff manage relations.
recommendationsRouter.get('/product/:productId', relatedProductsController);
recommendationsRouter.post('/related', auth, staff, setRelatedController);
recommendationsRouter.delete('/related', auth, staff, removeRelatedController);

const reservationsRouter = Router();
// Reservation endpoints: user reserve/release/mine and staff expiration job.
reservationsRouter.post('/reserve', auth, reserveStockController);
reservationsRouter.post('/release', auth, releaseReservationController);
reservationsRouter.get('/mine', auth, myReservationsController);
reservationsRouter.post('/expire', auth, staff, expireReservationsController);

const sellerRouter = Router();
// Seller finance endpoints: balance, earnings, and payout operations (auth + staff).
sellerRouter.get('/balance', auth, staff, sellerBalanceController);
sellerRouter.get('/earnings', auth, staff, sellerEarningsController);
sellerRouter.get('/payouts', auth, staff, sellerPayoutsListController);
sellerRouter.post('/payouts', auth, staff, sellerPayoutCreateController);

const pushRouter = Router();
// Push notification endpoints: device registration and staff-triggered sends.
pushRouter.post('/devices', auth, registerDeviceController);
pushRouter.delete('/devices', auth, unregisterDeviceController);
pushRouter.get('/devices', auth, listDevicesController);
pushRouter.post('/send', auth, staff, sendPushController);

export {
    flagsRouter,
    mfaRouter,
    fxRouter,
    loyaltyRouter,
    recommendationsRouter,
    reservationsRouter,
    sellerRouter,
    pushRouter,
};
