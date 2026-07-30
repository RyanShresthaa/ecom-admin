/**
 * Address CRUD for `/api/address` — all rows scoped by `req.userId` in models.
 * Bodies are normalized via `addressBodySchema` (+ ZIP/state consistency checks).
 */
import {
    createAddress,
    findAddressesByUser,
    updateAddress,
    deleteAddress,
} from '../models/address.model.js';
import { pickId } from '../utils/sql.js';
import { validateShippingAddress, firstAddressError } from '../utils/addressValidation.js';
import { getCachedRegionMode } from '../utils/regionModeCache.js';

export const addAddressController = async (req, res) => {
    try {
        const body = req.body || {};
        const created = await createAddress({
            userId: req.userId,
            address_line: body.address_line,
            city: body.city,
            state: body.state,
            pincode: body.pincode,
            country: body.country,
            mobile: body.mobile,
        });
        return res.json({ message: 'Address added', data: created, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getAddressController = async (req, res) => {
    try {
        const data = await findAddressesByUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const updateAddressController = async (req, res) => {
    try {
        const { _id, ...rest } = req.body || {};
        const updated = await updateAddress(pickId(_id), req.userId, rest);
        if (!updated) {
            return res.status(404).json({ message: 'Address not found', error: true, success: false });
        }
        return res.json({ message: 'Address updated', data: updated, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const deleteAddressController = async (req, res) => {
    try {
        await deleteAddress(pickId(req.body._id), req.userId);
        return res.json({ message: 'Address deleted', error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** POST /api/address/verify — check location/shipping fields without saving. */
export const verifyAddressController = async (req, res) => {
    try {
        const body = req.body || {};
        const result = validateShippingAddress(
            {
                address_line: body.address_line ?? body.addressLine,
                city: body.city,
                state: body.state,
                pincode: body.pincode ?? body.zip ?? body.postal_code,
                country: body.country,
                mobile: body.mobile ?? body.phone,
            },
            getCachedRegionMode(),
        );
        if (!result.ok) {
            return res.status(400).json({
                message: firstAddressError(result),
                errors: result.errors,
                error: true,
                success: false,
            });
        }
        return res.json({
            message: 'Address looks valid',
            data: result.value,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
