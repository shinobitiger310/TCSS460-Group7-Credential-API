/**
 * Check if a value is a non-empty string
 * @param {any} value - The value to check
 * @returns {boolean} Whether the value is a non-empty string
 */
export const isStringProvided = (value: any): boolean => {
    return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Check if a value is a valid email address
 * @param {string} email - The email to validate
 * @returns {boolean} Whether the email is valid
 */
export const isValidEmail = (email: string): boolean => {
    // Split and validate structure
    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const [local, domain] = parts;

    // Validate local part
    if (!local || local.length === 0 || local.length > 64) return false;
    if (local.startsWith('.') || local.endsWith('.')) return false;
    if (local.includes('..')) return false;

    // Validate domain
    if (!domain || domain.length === 0 || domain.length > 253) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    if (domain.includes('..')) return false;
    if (!domain.includes('.')) return false;

    // No spaces allowed
    if (email.includes(' ')) return false;

    // If we got here, it's probably valid enough for practical purposes
    return true;
};
/**
 * Check if a value is a valid phone number (basic check)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
export const isValidPhone = (phone: string): boolean => {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, '');
    // Check if it has at least 10 digits
    return digitsOnly.length >= 10;
};

/**
 * Check if a value is a valid role (1-5)
 * @param {string | number} role - The role to validate
 * @returns {boolean} Whether the role is valid
 */
export const isValidRole = (role: string | number): boolean => {
    const roleNum = typeof role === 'string' ? Number(role) : role;

    // Check if it's a valid number and an integer value (even if written as "1.0")
    return !isNaN(roleNum) &&
        Number.isInteger(roleNum) &&
        roleNum >= 1 &&
        roleNum <= 5;
};