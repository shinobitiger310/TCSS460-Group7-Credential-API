import { Response } from 'express';
import { sendSuccess, sendError, sendValidationError } from '../responseUtils';

describe('responseUtils', () => {
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendSuccess', () => {
        it('should send success response with default status 200', () => {
            const testData = { id: 1, name: 'test' };
            const testMessage = 'Operation successful';

            sendSuccess(mockResponse as Response, testData, testMessage);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: testMessage,
                data: testData,
            });
        });

        it('should send success response with custom status', () => {
            const testData = { created: true };
            const testMessage = 'Resource created';
            const customStatus = 201;

            sendSuccess(mockResponse as Response, testData, testMessage, customStatus);

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: testMessage,
                data: testData,
            });
        });

        it('should send success response without message', () => {
            const testData = { users: [] };

            sendSuccess(mockResponse as Response, testData);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: undefined,
                data: testData,
            });
        });

        it('should handle null data', () => {
            sendSuccess(mockResponse as Response, null, 'Success with null data');

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Success with null data',
                data: null,
            });
        });

        it('should handle empty object data', () => {
            sendSuccess(mockResponse as Response, {}, 'Success with empty object');

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Success with empty object',
                data: {},
            });
        });

        it('should handle array data', () => {
            const arrayData = [1, 2, 3];
            sendSuccess(mockResponse as Response, arrayData, 'Array data');

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Array data',
                data: arrayData,
            });
        });
    });

    describe('sendError', () => {
        it('should send error response with required parameters', () => {
            const status = 400;
            const message = 'Bad request';

            sendError(mockResponse as Response, status, message);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: message,
            });
        });

        it('should send error response with error code', () => {
            const status = 404;
            const message = 'Resource not found';
            const errorCode = 'USER001';

            sendError(mockResponse as Response, status, message, errorCode);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: message,
                errorCode: errorCode,
            });
        });

        it('should handle server error status codes', () => {
            const status = 500;
            const message = 'Internal server error';
            const errorCode = 'SRVR001';

            sendError(mockResponse as Response, status, message, errorCode);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: message,
                errorCode: errorCode,
            });
        });

        it('should handle authentication error status codes', () => {
            const status = 401;
            const message = 'Unauthorized';
            const errorCode = 'AUTH009';

            sendError(mockResponse as Response, status, message, errorCode);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: message,
                errorCode: errorCode,
            });
        });

        it('should not include errorCode when not provided', () => {
            const status = 403;
            const message = 'Forbidden';

            sendError(mockResponse as Response, status, message);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: message,
            });
        });

        it('should handle empty error code', () => {
            const status = 400;
            const message = 'Bad request';
            const errorCode = '';

            sendError(mockResponse as Response, status, message, errorCode);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: message,
            });
        });
    });

    describe('sendValidationError', () => {
        it('should send validation error with single error', () => {
            const errors = [{ field: 'email', message: 'Invalid email format' }];

            sendValidationError(mockResponse as Response, errors);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: errors,
            });
        });

        it('should send validation error with multiple errors', () => {
            const errors = [
                { field: 'email', message: 'Invalid email format' },
                { field: 'password', message: 'Password too short' },
                { field: 'phone', message: 'Invalid phone number' },
            ];

            sendValidationError(mockResponse as Response, errors);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: errors,
            });
        });

        it('should handle errors without field names', () => {
            const errors = [
                { message: 'General validation error' },
                { message: 'Another validation issue' },
            ];

            sendValidationError(mockResponse as Response, errors);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: errors,
            });
        });

        it('should handle empty errors array', () => {
            const errors: Array<{ field?: string; message: string }> = [];

            sendValidationError(mockResponse as Response, errors);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: [],
            });
        });

        it('should handle mixed errors with and without field names', () => {
            const errors = [
                { field: 'username', message: 'Username already exists' },
                { message: 'Request contains invalid data' },
                { field: 'role', message: 'Invalid role value' },
            ];

            sendValidationError(mockResponse as Response, errors);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: errors,
            });
        });
    });

    describe('Integration tests', () => {
        it('should correctly handle chained method calls', () => {
            const testData = { token: 'abc123' };
            sendSuccess(mockResponse as Response, testData, 'Login successful', 200);

            expect(statusMock).toHaveBeenCalledTimes(1);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Login successful',
                data: testData,
            });
        });

        it('should handle response object properly for errors', () => {
            sendError(mockResponse as Response, 401, 'Invalid token', 'AUTH007');

            expect(statusMock).toHaveBeenCalledTimes(1);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledTimes(1);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid token',
                errorCode: 'AUTH007',
            });
        });

        it('should work with complex nested data structures', () => {
            const complexData = {
                user: {
                    id: 1,
                    profile: {
                        name: 'John Doe',
                        preferences: ['email', 'sms'],
                    },
                },
                metadata: {
                    lastLogin: '2023-01-01',
                    loginCount: 42,
                },
            };

            sendSuccess(mockResponse as Response, complexData, 'Profile retrieved');

            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                message: 'Profile retrieved',
                data: complexData,
            });
        });
    });

    describe('Type safety tests', () => {
        it('should accept any data type for success responses', () => {
            const stringData = 'simple string';
            const numberData = 42;
            const booleanData = true;

            sendSuccess(mockResponse as Response, stringData);
            sendSuccess(mockResponse as Response, numberData);
            sendSuccess(mockResponse as Response, booleanData);

            expect(jsonMock).toHaveBeenCalledTimes(3);
        });

        it('should require proper error structure for validation errors', () => {
            const validErrors = [
                { field: 'email', message: 'Required' },
                { message: 'General error' },
            ];

            sendValidationError(mockResponse as Response, validErrors);

            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: validErrors,
            });
        });
    });
});