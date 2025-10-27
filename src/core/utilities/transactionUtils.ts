import { Response } from 'express';
import { PoolClient } from 'pg';
import { getPool } from './database';
import { sendError, sendSuccess } from './responseUtils';

export interface TransactionResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}

/**
 * Execute operations within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 */
export const withTransaction = async <T>(
    operation: (client: PoolClient) => Promise<T>
): Promise<TransactionResult<T>> => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');

        return {
            success: true,
            data: result
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }

        return {
            success: false,
            error: error as Error
        };
    } finally {
        client.release();
    }
};

/**
 * Execute transaction with automatic HTTP response handling
 * Sends success/error responses automatically
 */
export const executeTransactionWithResponse = async <T>(
    operation: (client: PoolClient) => Promise<T>,
    response: Response,
    successMessage?: string,
    errorMessage: string = 'Transaction failed'
): Promise<void> => {
    const result = await withTransaction(operation);

    if (result.success) {
        sendSuccess(response, result.data, successMessage);
    } else {
        console.error('Transaction error:', result.error);
        sendError(response, 500, errorMessage);
    }
};