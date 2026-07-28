/**
 * Bcrypt cost + rehash unit tests. Run: node --test scripts/bcrypt-cost.test.mjs
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import {
    getBcryptCost,
    validateBcryptCostEnv,
    parseBcryptCostFromHash,
    needsRehash,
    hashPassword,
    comparePassword,
    rehashPasswordIfNeeded,
    BCRYPT_COST_DEFAULT,
} from '../utils/passwordHash.js';

function snap(keys) {
    const o = {};
    for (const k of keys) o[k] = process.env[k];
    return o;
}
function restore(o) {
    for (const [k, v] of Object.entries(o)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
}

describe('BCRYPT_COST validation', () => {
    let env;
    beforeEach(() => {
        env = snap(['BCRYPT_COST']);
    });
    afterEach(() => restore(env));

    it('defaults to 10 when unset', () => {
        delete process.env.BCRYPT_COST;
        assert.equal(getBcryptCost(), BCRYPT_COST_DEFAULT);
        assert.equal(validateBcryptCostEnv(), null);
    });

    it('accepts 10–15', () => {
        for (const c of [10, 11, 12, 15]) {
            process.env.BCRYPT_COST = String(c);
            assert.equal(getBcryptCost(), c);
        }
    });

    it('rejects out of range', () => {
        process.env.BCRYPT_COST = '9';
        assert.match(validateBcryptCostEnv(), /BCRYPT_COST/);
        process.env.BCRYPT_COST = '16';
        assert.match(validateBcryptCostEnv(), /BCRYPT_COST/);
        process.env.BCRYPT_COST = 'abc';
        assert.match(validateBcryptCostEnv(), /BCRYPT_COST/);
    });
});

describe('parse / needsRehash / upgrade', () => {
    let env;
    beforeEach(() => {
        env = snap(['BCRYPT_COST']);
        process.env.BCRYPT_COST = '12';
    });
    afterEach(() => restore(env));

    it('parses cost from hash', async () => {
        const hash = await bcrypt.hash('SecurePass1', 10);
        assert.equal(parseBcryptCostFromHash(hash), 10);
    });

    it('needsRehash when stored cost is lower', async () => {
        const hash = await bcrypt.hash('SecurePass1', 10);
        assert.equal(needsRehash(hash, 12), true);
        assert.equal(needsRehash(hash, 10), false);
    });

    it('hashPassword uses configured cost', async () => {
        process.env.BCRYPT_COST = '10';
        const hash = await hashPassword('SecurePass1');
        assert.equal(parseBcryptCostFromHash(hash), 10);
        assert.equal(await comparePassword('SecurePass1', hash), true);
        assert.equal(await comparePassword('wrong', hash), false);
    });

    it('rehashPasswordIfNeeded upgrades low-cost hashes', async () => {
        process.env.BCRYPT_COST = '11';
        const oldHash = await bcrypt.hash('SecurePass1', 10);
        let saved = null;
        const updated = await rehashPasswordIfNeeded(
            42,
            'SecurePass1',
            oldHash,
            async (_id, fields) => {
                saved = fields.password;
            },
        );
        assert.equal(updated, true);
        assert.equal(parseBcryptCostFromHash(saved), 11);
        assert.equal(await comparePassword('SecurePass1', saved), true);
    });

    it('rehashPasswordIfNeeded is no-op when cost already matches', async () => {
        process.env.BCRYPT_COST = '10';
        const hash = await hashPassword('SecurePass1');
        let called = false;
        const updated = await rehashPasswordIfNeeded(1, 'SecurePass1', hash, async () => {
            called = true;
        });
        assert.equal(updated, false);
        assert.equal(called, false);
    });
});
