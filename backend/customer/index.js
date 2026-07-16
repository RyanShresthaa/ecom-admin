/**
 * Customer-facing HTTP surface (storefront + shared auth/catalog writes gated by role).
 */
import { Router } from 'express'
import userRouter from './routes/user.route.js'
import productRouter from './routes/product.route.js'
import categoryRouter from './routes/category.route.js'
import subCategoryRouter from './routes/subcategory.route.js'
import cartRouter from './routes/cart.route.js'
import orderRouter from './routes/order.route.js'
import addressRouter from './routes/address.route.js'
import paymentRouter from './routes/payment.route.js'
import uploadRouter from './routes/upload.route.js'
import couponRouter from './routes/coupon.route.js'
import reviewRouter from './routes/review.route.js'
import wishlistRouter from './routes/wishlist.route.js'
import returnRouter from './routes/return.route.js'
import shopRouter from './routes/shop.route.js'
import feedbackRouter from './routes/feedback.route.js'
import {
  flagsRouter,
  mfaRouter,
  fxRouter,
  loyaltyRouter,
  recommendationsRouter,
  reservationsRouter,
  sellerRouter,
  pushRouter,
} from './routes/scale.route.js'

const customerRouter = Router()

// Mount customer auth/profile endpoints.
customerRouter.use('/user', userRouter)
// Mount storefront product catalog endpoints.
customerRouter.use('/product', productRouter)
// Mount category listing and management endpoints.
customerRouter.use('/category', categoryRouter)
// Mount subcategory endpoints for catalog drill-down.
customerRouter.use('/subcategory', subCategoryRouter)
// Mount cart operations for customer checkout flow.
customerRouter.use('/cart', cartRouter)
// Mount customer order placement and history endpoints.
customerRouter.use('/order', orderRouter)
// Mount customer address book endpoints.
customerRouter.use('/address', addressRouter)
// Mount payment initiation and callback endpoints.
customerRouter.use('/payment', paymentRouter)
// Mount customer-side upload endpoints.
customerRouter.use('/upload', uploadRouter)
// Mount coupon validation and apply endpoints.
customerRouter.use('/coupon', couponRouter)
// Mount product review endpoints.
customerRouter.use('/review', reviewRouter)
// Mount wishlist add/remove/list endpoints.
customerRouter.use('/wishlist', wishlistRouter)
// Mount return and refund request endpoints.
customerRouter.use('/return', returnRouter)
// Mount shop info and storefront settings endpoints.
customerRouter.use('/shop', shopRouter)
// Mount customer feedback submission endpoints.
customerRouter.use('/feedback', feedbackRouter)

// Scale / marketplace foundations (feature-flag gated)
// Mount feature flag and runtime toggle endpoints.
customerRouter.use('/flags', flagsRouter)
// Mount MFA enrollment and verification endpoints.
customerRouter.use('/mfa', mfaRouter)
// Mount currency conversion and FX endpoints.
customerRouter.use('/fx', fxRouter)
// Mount loyalty points and rewards endpoints.
customerRouter.use('/loyalty', loyaltyRouter)
// Mount recommendation feed endpoints.
customerRouter.use('/recommendations', recommendationsRouter)
// Mount reservation and inventory hold endpoints.
customerRouter.use('/reservations', reservationsRouter)
// Mount seller/marketplace operations endpoints.
customerRouter.use('/seller', sellerRouter)
// Mount push notification registration/send endpoints.
customerRouter.use('/push', pushRouter)

export default customerRouter
