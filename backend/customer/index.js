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

const customerRouter = Router()

customerRouter.use('/user', userRouter)
customerRouter.use('/product', productRouter)
customerRouter.use('/category', categoryRouter)
customerRouter.use('/subcategory', subCategoryRouter)
customerRouter.use('/cart', cartRouter)
customerRouter.use('/order', orderRouter)
customerRouter.use('/address', addressRouter)
customerRouter.use('/payment', paymentRouter)
customerRouter.use('/upload', uploadRouter)
customerRouter.use('/coupon', couponRouter)
customerRouter.use('/review', reviewRouter)
customerRouter.use('/wishlist', wishlistRouter)
customerRouter.use('/return', returnRouter)
customerRouter.use('/shop', shopRouter)
customerRouter.use('/feedback', feedbackRouter)

export default customerRouter
