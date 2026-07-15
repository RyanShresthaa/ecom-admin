/**
 * Subcategory CRUD under categories for `/api/subcategory`.
 */
import {
    createSubCategory,
    findSubCategories,
    findSubCategoryById,
    updateSubCategory,
    deleteSubCategory,
} from '../../shared/models/subCategory.model.js';
import { pickId } from '../../shared/utils/sql.js';

export const AddSubCategoryController = async (request, response) => {
    try {
        const { name, image, category } = request.body;
        if (!name || !image || !category?.[0]) {
            return response.status(400).json({ message: 'Provide name, image, category', error: true, success: false });
        }
        const save = await createSubCategory({ name, image, category });
        return response.json({ message: 'Sub Category Created', data: save, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getSubCategoryController = async (request, response) => {
    try {
        const data = await findSubCategories();
        return response.json({ message: 'Sub Category data', data, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const updateSubCategoryController = async (request, response) => {
    try {
        const { _id, name, image, category } = request.body;
        const checkSub = await findSubCategoryById(pickId(_id));
        if (!checkSub) {
            return response.status(400).json({ message: 'Check your _id', error: true, success: false });
        }
        const updated = await updateSubCategory(pickId(_id), { name, image, category });
        return response.json({ message: 'Updated Successfully', data: updated, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const deleteSubCategoryController = async (request, response) => {
    try {
        const deleted = await deleteSubCategory(pickId(request.body._id));
        return response.json({ message: 'Delete successfully', data: deleted, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
