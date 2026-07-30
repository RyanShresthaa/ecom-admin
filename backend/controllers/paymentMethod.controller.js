/**
 * Saved payment methods — verify card/bank details, store metadata only.
 */
import {
    createPaymentMethod,
    findPaymentMethodsByUser,
    deletePaymentMethod,
    setDefaultPaymentMethod,
} from '../models/paymentMethod.model.js';
import {
    validatePaymentMethodDetails,
    firstPaymentError,
} from '../utils/paymentMethodValidation.js';
import { pickId } from '../utils/sql.js';

/** POST /api/payment/methods/verify — check card or bank details without saving. */
export const verifyPaymentMethodController = async (req, res) => {
    try {
        const result = validatePaymentMethodDetails(req.body || {});
        if (!result.ok) {
            return res.status(400).json({
                message: firstPaymentError(result),
                errors: result.errors,
                error: true,
                success: false,
            });
        }
        return res.json({
            message: 'Payment details look valid',
            data: result.value,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

/** POST /api/payment/methods — verify then save last4 / metadata only. */
export const addPaymentMethodController = async (req, res) => {
    try {
        const body = req.body || {};
        const created = await createPaymentMethod({
            userId: req.userId,
            type: body.type,
            brand: body.brand,
            last4: body.last4,
            exp_month: body.exp_month,
            exp_year: body.exp_year,
            bank_name: body.bank_name,
            account_type: body.account_type,
            billing_name: body.billing_name,
            billing_zip: body.billing_zip,
            routing_last4: body.routing_last4,
            is_default: body.is_default,
        });
        return res.status(201).json({
            message: 'Payment method saved',
            data: created,
            error: false,
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const listPaymentMethodsController = async (req, res) => {
    try {
        const data = await findPaymentMethodsByUser(req.userId);
        return res.json({ data, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const deletePaymentMethodController = async (req, res) => {
    try {
        const id = pickId(req.body?._id ?? req.params?.id);
        if (!id) {
            return res.status(400).json({ message: 'Payment method id required', error: true, success: false });
        }
        const ok = await deletePaymentMethod(id, req.userId);
        if (!ok) {
            return res.status(404).json({ message: 'Payment method not found', error: true, success: false });
        }
        return res.json({ message: 'Payment method removed', error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const setDefaultPaymentMethodController = async (req, res) => {
    try {
        const id = pickId(req.body?._id ?? req.params?.id);
        if (!id) {
            return res.status(400).json({ message: 'Payment method id required', error: true, success: false });
        }
        const updated = await setDefaultPaymentMethod(id, req.userId);
        if (!updated) {
            return res.status(404).json({ message: 'Payment method not found', error: true, success: false });
        }
        return res.json({ message: 'Default payment method updated', data: updated, error: false, success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};
