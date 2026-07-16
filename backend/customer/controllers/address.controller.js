/**
 * Address CRUD for `/api/address` — all rows scoped by `req.userId` in models.
 */
import {
    createAddress,
    findAddressesByUser,
    updateAddress,
    deleteAddress,
} from '../../shared/models/address.model.js';
import { pickId } from '../../shared/utils/sql.js';

// POST /api/address/add — adds a saved address for the authenticated user.
export const addAddressController = async (req, res) => {
    try {
        const created = await createAddress({ ...req.body, userId: req.userId });
        return res.json({ message: 'Address added', data: created, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// GET /api/address/get — returns saved addresses for the authenticated user.
export const getAddressController = async (req, res) => {
    try {
        const data = await findAddressesByUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// PUT /api/address/update — updates one of the user's saved addresses.
export const updateAddressController = async (req, res) => {
    try {
        const { _id, ...rest } = req.body;
        const updated = await updateAddress(pickId(_id), req.userId, rest);
        if (!updated) {
            return res.status(404).json({ message: 'Address not found', error: true, success: false });
        }
        return res.json({ message: 'Address updated', data: updated, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

// DELETE /api/address/delete — removes one of the user's saved addresses.
export const deleteAddressController = async (req, res) => {
    try {
        await deleteAddress(pickId(req.body._id), req.userId);
        return res.json({ message: 'Address deleted', error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

