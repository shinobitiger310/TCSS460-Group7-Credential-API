/**
 * Documentation Routes
 *
 * Serves markdown documentation files from docs-2.0/ as HTML with syntax highlighting
 * and provides both rendered and raw file access.
 *
 * Educational demonstrations:
 * - Static file serving with dynamic processing
 * - Content type handling (text/html vs text/plain)
 * - Path parameter validation and sanitization
 * - File system security (path traversal prevention)
 */

import { Router, Request, Response } from 'express';
import { param } from 'express-validator';
import path from 'path';
import fs from 'fs';

import { handleValidationErrors } from '@middleware';
import { readMarkdownFile, generateDocsIndex } from '@utilities';

const router = Router();

/**
 * Documentation index page
 *
 * Displays an index of all available documentation files with links
 * to both rendered HTML and raw markdown versions.
 *
 * Educational Focus:
 * - Dynamic content generation from file system
 * - HTML response with navigation
 * - Integration with existing API documentation
 *
 * @param request - Express request object
 * @param response - Express response object
 */
router.get('/', (request: Request, response: Response) => {
    try {
        const docsPath = path.join(__dirname, '../../../docs-2.0');
        const indexHtml = generateDocsIndex(docsPath);

        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.send(indexHtml);
    } catch (error) {
        console.error('Error generating docs index:', error);
        response.status(500).json({
            success: false,
            message: 'Failed to generate documentation index',
            errorCode: 'DOCS_INDEX_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Serve raw markdown files
 *
 * Returns the raw markdown content of documentation files.
 * Useful for downloading or viewing source markdown.
 *
 * Educational Focus:
 * - Content-Type header for plain text
 * - File serving with proper MIME types
 * - Path parameter validation for security
 *
 * @param request - Express request object with filename parameter
 * @param response - Express response object
 */
router.get(
    '/raw/:filename',
    [
        param('filename')
            .matches(/^[a-zA-Z0-9_-]+\.md$/)
            .withMessage(
                'Filename must be a valid markdown file (alphanumeric, underscores, hyphens only)'
            )
    ],
    handleValidationErrors,
    (request: Request, response: Response): void => {
        try {
            const filename = request.params.filename;
            if (!filename) {
                response.status(400).json({
                    success: false,
                    message: 'Filename parameter is required',
                    errorCode: 'MISSING_FILENAME',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const docsPath = path.join(__dirname, '../../../docs-2.0');
            const filePath = path.join(docsPath, filename);

            // Security check: ensure the resolved path is within docs directory
            const resolvedPath = path.resolve(filePath);
            const resolvedDocsPath = path.resolve(docsPath);

            if (!resolvedPath.startsWith(resolvedDocsPath)) {
                response.status(400).json({
                    success: false,
                    message: 'Invalid file path',
                    errorCode: 'INVALID_PATH',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            if (!fs.existsSync(filePath)) {
                response.status(404).json({
                    success: false,
                    message: `Documentation file '${filename}' not found`,
                    errorCode: 'DOCS_FILE_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const markdownContent = fs.readFileSync(filePath, 'utf8');

            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
            response.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            response.send(markdownContent);
        } catch (error) {
            console.error('Error serving raw markdown file:', error);
            response.status(500).json({
                success: false,
                message: 'Failed to serve documentation file',
                errorCode: 'DOCS_SERVE_ERROR',
                timestamp: new Date().toISOString()
            });
        }
    }
);

/**
 * Serve rendered markdown files as HTML
 *
 * Converts markdown documentation to HTML with syntax highlighting
 * and styled presentation. Provides a user-friendly reading experience.
 *
 * Educational Focus:
 * - Markdown to HTML conversion
 * - Syntax highlighting for code blocks
 * - CSS styling for documentation
 * - Content transformation pipelines
 *
 * @param request - Express request object with filename parameter
 * @param response - Express response object
 */
router.get(
    '/:filename',
    [
        param('filename')
            .matches(/^[a-zA-Z0-9_-]+\.md$/)
            .withMessage(
                'Filename must be a valid markdown file (alphanumeric, underscores, hyphens only)'
            )
    ],
    handleValidationErrors,
    (request: Request, response: Response): void => {
        try {
            const filename = request.params.filename;
            if (!filename) {
                response.status(400).json({
                    success: false,
                    message: 'Filename parameter is required',
                    errorCode: 'MISSING_FILENAME',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const docsPath = path.join(__dirname, '../../../docs-2.0');
            const filePath = path.join(docsPath, filename);

            // Security check: ensure the resolved path is within docs directory
            const resolvedPath = path.resolve(filePath);
            const resolvedDocsPath = path.resolve(docsPath);

            if (!resolvedPath.startsWith(resolvedDocsPath)) {
                response.status(400).json({
                    success: false,
                    message: 'Invalid file path',
                    errorCode: 'INVALID_PATH',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const htmlContent = readMarkdownFile(filePath);

            if (!htmlContent) {
                response.status(404).json({
                    success: false,
                    message: `Documentation file '${filename}' not found`,
                    errorCode: 'DOCS_FILE_NOT_FOUND',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.send(htmlContent);
        } catch (error) {
            console.error('Error serving rendered markdown file:', error);
            response.status(500).json({
                success: false,
                message: 'Failed to render documentation file',
                errorCode: 'DOCS_RENDER_ERROR',
                timestamp: new Date().toISOString()
            });
        }
    }
);

export const docsRoutes = router;
