// src/core/utilities/responseUtils.ts
import { Response } from 'express';

/**
 * Standard success response
 * @param response - Express response object
 * @param data - Data to send in response
 * @param message - Optional success message
 * @param status - HTTP status code (default 200)
 */
export const sendSuccess = (
    response: Response,
    data: any,
    message?: string,
    status: number = 200
) => {
    response.status(status).json({
        success: true,
        message,
        data,
    });
};

/**
 * Standard error response
 * @param response - Express response object
 * @param status - HTTP status code
 * @param message - Error message
 * @param errorCode - Optional error code for debugging
 */
export const sendError = (
    response: Response,
    status: number,
    message: string,
    errorCode?: string
) => {
    response.status(status).json({
        success: false,
        message,
        ...(errorCode && { errorCode }),
    });
};

/**
 * Standard validation error response
 * @param response - Express response object
 * @param errors - Array of validation errors
 */
export const sendValidationError = (
    response: Response,
    errors: Array<{ field?: string; message: string }>
) => {
    response.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
    });
};