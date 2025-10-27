/**
 * Markdown processing utilities
 *
 * Utilities for converting markdown files to HTML with syntax highlighting
 * and consistent styling for documentation hosting.
 */

import { marked } from 'marked';
import hljs from 'highlight.js';
import fs from 'fs';
import path from 'path';

/**
 * Configure marked with syntax highlighting using the modern renderer API
 */
marked.use({
    breaks: true,
    gfm: true,
    renderer: {
        /**
         * Custom code block renderer with syntax highlighting
         *
         * @param token - Token object containing code block information
         * @param token.text - The code text to be highlighted
         * @param token.lang - Optional language identifier for syntax highlighting
         * @returns HTML string with highlighted code
         */
        code(token: { text: string; lang?: string }): string {
            const code = token.text;
            const language = token.lang;

            if (language && hljs.getLanguage(language)) {
                try {
                    return `<pre><code class="hljs language-${language}">${hljs.highlight(code, { language }).value}</code></pre>`;
                } catch {
                    // Fall back to auto-detection
                }
            }
            return `<pre><code class="hljs">${hljs.highlightAuto(code).value}</code></pre>`;
        }
    }
});

/**
 * Convert markdown content to HTML with styling
 *
 * @param markdownContent Raw markdown content
 * @param title Optional title for the HTML page
 * @returns Complete HTML page with CSS styling
 */
export const markdownToHtml = (markdownContent: string, title: string = 'Documentation'): string => {
    const htmlContent = marked(markdownContent);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            color: #24292f;
        }

        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }

        h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }

        p { margin-bottom: 16px; }

        code {
            background-color: rgba(175, 184, 193, 0.2);
            padding: 0.2em 0.4em;
            border-radius: 6px;
            font-size: 85%;
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
        }

        pre {
            background-color: #f6f8fa;
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            margin-bottom: 16px;
        }

        pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            font-size: 100%;
        }

        blockquote {
            padding: 0 1em;
            color: #656d76;
            border-left: 0.25em solid #d0d7de;
            margin: 0 0 16px 0;
        }

        ul, ol { padding-left: 2em; margin-bottom: 16px; }
        li { margin-bottom: 0.25em; }

        table {
            border-spacing: 0;
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
        }

        th, td {
            padding: 6px 13px;
            border: 1px solid #d0d7de;
        }

        th {
            background-color: #f6f8fa;
            font-weight: 600;
        }

        a {
            color: #0969da;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .nav-header {
            background-color: #f6f8fa;
            border-bottom: 1px solid #d0d7de;
            padding: 16px 0;
            margin: -20px -20px 20px -20px;
            padding-left: 20px;
            padding-right: 20px;
        }

        .nav-links a {
            margin-right: 16px;
            font-weight: 500;
        }

        /* Syntax highlighting styles */
        .hljs {
            background: #f6f8fa;
            color: #24292f;
        }

        .hljs-comment,
        .hljs-quote {
            color: #6a737d;
            font-style: italic;
        }

        .hljs-keyword,
        .hljs-selector-tag,
        .hljs-subst {
            color: #d73a49;
        }

        .hljs-number,
        .hljs-literal,
        .hljs-variable,
        .hljs-template-variable,
        .hljs-tag .hljs-attr {
            color: #005cc5;
        }

        .hljs-string,
        .hljs-doctag {
            color: #032f62;
        }

        .hljs-title,
        .hljs-section,
        .hljs-selector-id {
            color: #6f42c1;
        }

        .hljs-type,
        .hljs-class .hljs-title {
            color: #6f42c1;
        }

        .hljs-tag,
        .hljs-name,
        .hljs-attribute {
            color: #22863a;
        }

        .hljs-regexp,
        .hljs-link {
            color: #e36209;
        }

        .hljs-symbol,
        .hljs-bullet {
            color: #e36209;
        }

        .hljs-built_in,
        .hljs-builtin-name {
            color: #005cc5;
        }

        .hljs-meta {
            color: #6a737d;
        }

        .hljs-deletion {
            background: #ffeef0;
        }

        .hljs-addition {
            background: #f0fff4;
        }

        .hljs-emphasis {
            font-style: italic;
        }

        .hljs-strong {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="nav-header">
        <div class="nav-links">
            <a href="/doc">📚 Documentation Index</a>
            <a href="/api-docs">🔧 API Documentation</a>
            <a href="/jwt_test">❤️ Health Check</a>
        </div>
    </div>

    <main>
        ${htmlContent}
    </main>
</body>
</html>`;
};

/**
 * Read and convert markdown file to HTML
 *
 * @param filePath Path to markdown file
 * @returns HTML content or null if file not found
 */
export const readMarkdownFile = (filePath: string): string | null => {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        const markdownContent = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath, '.md');
        const title = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        return markdownToHtml(markdownContent, title);
    } catch (error) {
        console.error('Error reading markdown file:', error);
        return null;
    }
};

/**
 * Get list of markdown files in a directory
 *
 * @param dirPath Directory path to scan
 * @returns Array of markdown file information
 */
export const getMarkdownFiles = (
    dirPath: string
): Array<{ name: string; path: string; title: string }> => {
    try {
        if (!fs.existsSync(dirPath)) {
            return [];
        }

        const files = fs.readdirSync(dirPath);
        return files
            .filter((file) => file.endsWith('.md'))
            .map((file) => {
                const name = file;
                const filePath = path.join(dirPath, file);
                const title = path
                    .basename(file, '.md')
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase());

                return { name, path: filePath, title };
            });
    } catch (error) {
        console.error('Error scanning directory for markdown files:', error);
        return [];
    }
};

/**
 * Generate documentation index HTML
 *
 * @param docsPath Path to docs directory
 * @returns HTML index page
 */
export const generateDocsIndex = (docsPath: string): string => {
    // Check if README.md exists and use it as the main content
    const readmePath = path.join(docsPath, 'README.md');

    if (fs.existsSync(readmePath)) {
        // Use README.md as the main landing page content
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        return markdownToHtml(readmeContent, 'TCSS-460-auth-squared Documentation');
    }

    // Fallback to generated index if README.md doesn't exist
    const markdownFiles = getMarkdownFiles(docsPath);

    const filesList =
        markdownFiles.length > 0
            ? markdownFiles
                  .map(
                      (file) =>
                          `<li><a href="/doc/${file.name}">${file.title}</a> - <a href="/doc/raw/${file.name}">Raw</a></li>`
                  )
                  .join('\n        ')
            : '<li>No documentation files found</li>';

    const indexContent = `
# TCSS-460-auth-squared Documentation

Welcome to the documentation portal for the TCSS-460-auth-squared project.

## Available Documentation

<ul>
        ${filesList}
</ul>

## Quick Links

- [Interactive API Documentation (Swagger UI)](/api-docs) - Test endpoints interactively
- [Health Check](/jwt_test) - Verify API status

## Educational Resources

This API demonstrates:
- RESTful API design principles
- Authentication with JWT tokens
- Authorization with role-based access control (RBAC)
- Password security (hashing, salting, timing-safe comparison)
- Email and SMS verification workflows
- Transaction management for data consistency
- HTTP method semantics (GET, POST, PUT, DELETE)
- Request parameter types (query, path, body, headers)
- Input validation and sanitization
- Standardized response formats
- Error handling patterns
- API documentation with OpenAPI/Swagger

## Development Commands

\`\`\`bash
# Start development server
npm run local

# Start with database
npm run start:full

# Build project
npm run build

# Run tests
npm test

# Docker commands
npm run docker:up
npm run docker:down
\`\`\`

## Contact

For questions about this educational API, please contact the TCSS-460 course staff.
`;

    return markdownToHtml(indexContent, 'TCSS-460-auth-squared Documentation');
};
