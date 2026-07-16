/**
 * Product list/search/detail and staff CRUD; uses `product.model.js` and `requireProductOwner` on writes.
 */
import {
    createProduct,
    findProducts,
    findProductById,
    findProductsByCategory,
    findProductsByCategoryAndSub,
    updateProduct,
    deleteProduct,
    restoreProduct,
} from '../../shared/models/product.model.js';
import { pickId } from '../../shared/utils/sql.js';
import { withCache, bustCache } from '../../shared/utils/responseCache.js';
import { findProductSalesMetricsByIds } from '../../shared/models/order.model.js';
import { countFeedbackByProductIds } from '../../shared/models/feedback.model.js';

// Attach sold / refunded / complaint stats for staff product list & detail.
async function attachProductMetrics(products) {
    const list = Array.isArray(products) ? products : products ? [products] : [];
    if (!list.length) return products;

    const ids = list.map((p) => pickId(p.id ?? p._id)).filter(Boolean);
    const [salesMap, complaintMap] = await Promise.all([
        findProductSalesMetricsByIds(ids),
        countFeedbackByProductIds(ids),
    ]);

    const enrich = (p) => {
        const id = String(pickId(p.id ?? p._id) || '');
        const sales = salesMap.get(id) || { soldQty: 0, refundedQty: 0 };
        return {
            ...p,
            soldQty: sales.soldQty,
            sold_qty: sales.soldQty,
            refundedQty: sales.refundedQty,
            refunded_qty: sales.refundedQty,
            complaintCount: complaintMap.get(id) || 0,
            complaint_count: complaintMap.get(id) || 0,
        };
    };

    return Array.isArray(products) ? list.map(enrich) : enrich(products);
}

function isStaff(user) {
    return user?.role === 'Admin' || user?.role === 'Seller';
}
// POST /api/product/create — creates a new product listing.
export const createProductController = async (request, response) => {
    try {
        const body = request.body;
        const subCat = body.subcategory || body.subCategory;
        if (!body.name || !body.image?.[0] || !body.category?.[0] || !subCat?.[0] || !body.unit || !body.price || !body.description) {
            return response.status(400).json({ message: 'Enter required fields', error: true, success: false });
        }
        const sellerId = request.user?.role === 'Seller' ? request.userId : body.seller_id || null;
        const saveProduct = await createProduct({ ...body, subcategory: subCat }, sellerId);
        bustCache('products:')
        return response.json({ message: 'Product Created Successfully', data: saveProduct, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// GET /api/product/get-product — lists/searches product catalog entries.
export const getProductController = async (request, response) => {
    try {
        const src = { ...request.query, ...request.body };
        const page = Number(src.page) || 1;
        const limit = Number(src.limit) || 10;
        const search = src.search || '';
        let published;
        if (src.published !== undefined && src.published !== '') {
            published = src.published === 'true' || src.published === true;
        } else if (!request.userId) {
            published = true;
        }
        const skip = (page - 1) * limit;
        let sellerId = src.sellerId || src.seller_id;
        if (request.user?.role === 'Seller' && src.mine === 'true') {
            sellerId = request.userId;
        }
        const cacheKey = `products:${page}:${limit}:${search}:${published}:${sellerId}:${src.categoryId}:${src.sort}:${Boolean(request.userId)}:${isStaff(request.user)}`;
        const { data, totalCount } = await withCache(cacheKey, 2500, async () => {
            const result = await findProducts({
                search,
                published,
                skip,
                limit,
                minPrice: src.minPrice,
                maxPrice: src.maxPrice,
                sellerId,
                categoryId: src.categoryId,
                sort: src.sort,
            });
            if (isStaff(request.user)) {
                result.data = await attachProductMetrics(result.data);
            }
            return result;
        });
        return response.json({
            message: 'Product data',
            error: false,
            success: true,
            totalCount,
            totalNoPage: Math.ceil(totalCount / limit),
            data,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// GET /api/product/get-product/:id — fetches single product by id.
export const getProductByIdController = async (request, response) => {
    try {
        let product = await findProductById(request.params.id);
        if (!product) {
            return response.status(404).json({ message: 'Product not found', error: true, success: false });
        }
        if (isStaff(request.user)) {
            product = await attachProductMetrics(product);
        }
        return response.json({ message: 'product details', data: product, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// POST /api/product/get-product-by-category — lists products by category.
export const getProductByCategory = async (request, response) => {
    try {
        const { id } = request.body;
        if (!id) {
            return response.status(400).json({ message: 'provide category id', error: true, success: false });
        }
        const product = await findProductsByCategory(id);
        return response.json({ message: 'category product list', data: product, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// POST /api/product/get-pruduct-by-category-and-subcategory — lists products by category and subcategory.
export const getProductByCategoryAndSubCategory = async (request, response) => {
    try {
        const { categoryId, subCategoryId, page = 1, limit = 10 } = request.body;
        if (!categoryId || !subCategoryId) {
            return response.status(400).json({ message: 'Provide categoryId and subCategoryId', error: true, success: false });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const { data, totalCount } = await findProductsByCategoryAndSub(categoryId, subCategoryId, skip, Number(limit));
        return response.json({
            message: 'Product list',
            data,
            totalCount,
            page: Number(page),
            limit: Number(limit),
            success: true,
            error: false,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// POST /api/product/get-product-details — fetches detailed product payload.
export const getProductDetails = async (request, response) => {
    try {
        const product = await findProductById(pickId(request.body.productId));
        return response.json({ message: 'product details', data: product, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// PUT /api/product/update-product — updates existing product details.
export const updateProductDetails = async (request, response) => {
    try {
        const id = pickId(request.body._id);
        if (!id) {
            return response.status(400).json({ message: 'provide product _id', error: true, success: false });
        }
        await updateProduct(id, request.body);
        bustCache('products:')
        return response.json({ message: 'updated successfully', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// DELETE /api/product/delete-product — soft-deletes a product listing.
export const deleteProductDetails = async (request, response) => {
    try {
        const id = pickId(request.body._id);
        if (!id) {
            return response.status(400).json({ message: 'provide _id ', error: true, success: false });
        }
        await deleteProduct(id);
        bustCache('products:')
        return response.json({ message: 'Delete successfully', error: false, success: true });
    } catch (error) {
        // Postgres FK violation when record is referenced elsewhere.
        // Even though product deletion is soft-delete, some DB configs/triggers may still throw FK errors.
        const code = error?.code;
        if (code === '23503' || String(error?.message || '').toLowerCase().includes('foreign key')) {
            return response.status(400).json({
                message: 'Cannot delete product because it is referenced by other records (e.g. orders). Please remove related items first.',
                error: true,
                success: false,
            });
        }

        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** Soft-restore a previously deleted product */
// POST /api/product/restore-product — restores a previously deleted product.
export const restoreProductController = async (request, response) => {
    try {
        const id = pickId(request.body._id || request.params.id);
        if (!id) {
            return response.status(400).json({ message: 'provide _id', error: true, success: false });
        }
        const data = await restoreProduct(id);
        if (!data) {
            return response.status(404).json({ message: 'Product not found or not deleted', error: true, success: false });
        }
        bustCache('products:');
        return response.json({ message: 'Product restored', data, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const searchProduct = getProductController;

