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
} from '../../shared/models/product.model.js';
import { pickId } from '../../shared/utils/sql.js';
import { withCache, bustCache } from '../../shared/utils/responseCache.js';

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
        const cacheKey = `products:${page}:${limit}:${search}:${published}:${sellerId}:${src.categoryId}:${src.sort}:${Boolean(request.userId)}`;
        const { data, totalCount } = await withCache(cacheKey, 2500, () =>
            findProducts({
                search,
                published,
                skip,
                limit,
                minPrice: src.minPrice,
                maxPrice: src.maxPrice,
                sellerId,
                categoryId: src.categoryId,
                sort: src.sort,
            }),
        );
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

export const getProductByIdController = async (request, response) => {
    try {
        const product = await findProductById(request.params.id);
        if (!product) {
            return response.status(404).json({ message: 'Product not found', error: true, success: false });
        }
        return response.json({ message: 'product details', data: product, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

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

export const getProductDetails = async (request, response) => {
    try {
        const product = await findProductById(pickId(request.body.productId));
        return response.json({ message: 'product details', data: product, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

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
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const searchProduct = getProductController;
