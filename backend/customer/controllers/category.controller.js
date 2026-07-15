/**
 * Category HTTP handlers for `/api/category`.
 */
import {
    createCategory,
    findCategories,
    updateCategory,
    deleteCategory,
    countCategoryUsage,
} from '../../shared/models/category.model.js';
import { pickId } from '../../shared/utils/sql.js';

export const AddCategoryController = async (request, response) => {
    try {
        const { name, image } = request.body;
        if (!name || !image) {
            return response.status(400).json({ message: 'Enter required fields', error: true, success: false });
        }
        const saveCategory = await createCategory({ name, image });
        return response.json({ message: 'Add Category', data: saveCategory, success: true, error: false });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getCategoryController = async (request, response) => {
    try {
        const data = await findCategories();
        return response.json({ data, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const updateCategoryController = async (request, response) => {
    try {
        const { _id, name, image } = request.body;
        await updateCategory(pickId(_id), { name, image });
        return response.json({ message: 'Updated Category', success: true, error: false });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const deleteCategoryController = async (request, response) => {
    try {
        const id = pickId(request.body._id);
        if ((await countCategoryUsage(id)) > 0) {
            return response.status(400).json({
                message: "Category is already use can't delete",
                error: true,
                success: false,
            });
        }
        await deleteCategory(id);
        return response.json({ message: 'Delete category successfully', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, success: false, error: true });
    }
};
