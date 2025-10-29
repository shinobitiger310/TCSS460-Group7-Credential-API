import { Request, Response, NextFunction } from 'express';
import {
    validateLogin,
    validateRegister,
    validatePasswordResetRequest,
    validatePasswordReset,
    validatePasswordChange,
    validatePhoneSend,
    validatePhoneVerify,
    validateEmailToken,
    validateUserIdParam,
    passwordStrength,
    validatePagination,
    handleValidationErrors
} from '../core/middleware/validation';

describe('Validation Middleware', () => {
    
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: any;
    
    beforeEach(() => {
        mockRequest = {
            body: {},
            params: {},
            query: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    // #1: validateLogin
    describe('validateLogin (#1)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validateLogin)).toBe(true);
            expect(validateLogin.length).toBeGreaterThan(0);
        });

        it('should include handleValidationErrors', () => {
            expect(validateLogin[validateLogin.length - 1]).toBe(handleValidationErrors);
        });
    });

    // #2: validateRegister
    describe('validateRegister (#2)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validateRegister)).toBe(true);
            expect(validateRegister.length).toBeGreaterThan(0);
        });

        it('should include all required fields', () => {
            expect(validateRegister.length).toBeGreaterThanOrEqual(6);
        });
    });

    // #3: validatePasswordResetRequest
    describe('validatePasswordResetRequest (#3)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validatePasswordResetRequest)).toBe(true);
        });

        it('should include handleValidationErrors', () => {
            expect(validatePasswordResetRequest[validatePasswordResetRequest.length - 1]).toBe(handleValidationErrors);
        });
    });

    // #4: validatePasswordReset
    describe('validatePasswordReset (#4)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validatePasswordReset)).toBe(true);
            expect(validatePasswordReset.length).toBeGreaterThanOrEqual(2);
        });
    });

    // #5: validatePasswordChange
    describe('validatePasswordChange (#5)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validatePasswordChange)).toBe(true);
            expect(validatePasswordChange.length).toBeGreaterThanOrEqual(2);
        });
    });

    // #6: validatePhoneSend
    describe('validatePhoneSend (#6)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validatePhoneSend)).toBe(true);
        });
    });

    // #7: validatePhoneVerify
    describe('validatePhoneVerify (#7)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validatePhoneVerify)).toBe(true);
        });
    });

    // #8: validateEmailToken
    describe('validateEmailToken (#8)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validateEmailToken)).toBe(true);
        });
    });

    // #9: validateUserIdParam
    describe('validateUserIdParam (#9)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validateUserIdParam)).toBe(true);
        });
    });

    // #10: passwordStrength
    describe('passwordStrength (#10 - OPTIONAL)', () => {
        it('should be defined', () => {
            expect(passwordStrength).toBeDefined();
        });
    });

    // #11: validatePagination
    describe('validatePagination (#11)', () => {
        it('should be an array with validators', () => {
            expect(Array.isArray(validatePagination)).toBe(true);
            expect(validatePagination.length).toBeGreaterThanOrEqual(2);
        });
    });

    // Integration Tests
    describe('Integration Tests', () => {
        it('should have all 11 validators exported', () => {
            expect(validateLogin).toBeDefined();
            expect(validateRegister).toBeDefined();
            expect(validatePasswordResetRequest).toBeDefined();
            expect(validatePasswordReset).toBeDefined();
            expect(validatePasswordChange).toBeDefined();
            expect(validatePhoneSend).toBeDefined();
            expect(validatePhoneVerify).toBeDefined();
            expect(validateEmailToken).toBeDefined();
            expect(validateUserIdParam).toBeDefined();
            expect(passwordStrength).toBeDefined();
            expect(validatePagination).toBeDefined();
        });

        it('should have consistent structure - all validators end with error handler', () => {
            const validators = [
                validateLogin,
                validateRegister,
                validatePasswordResetRequest,
                validatePasswordReset,
                validatePasswordChange,
                validatePhoneSend,
                validatePhoneVerify,
                validateEmailToken,
                validateUserIdParam,
                validatePagination
            ];

            validators.forEach(validator => {
                expect(Array.isArray(validator)).toBe(true);
                expect(validator[validator.length - 1]).toBe(handleValidationErrors);
            });
        });
    });
});