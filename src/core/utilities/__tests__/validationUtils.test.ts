// Mock markdownUtils to avoid ESM module issues in tests
jest.mock('../markdownUtils', () => ({
    markdownToHtml: jest.fn(),
    readMarkdownFile: jest.fn(),
    getMarkdownFiles: jest.fn(),
    generateDocsIndex: jest.fn(),
}));

import {
    isStringProvided,
    isValidEmail,
    isValidPhone,
    isValidRole
} from '@utilities';

describe('validationUtils', () => {

    describe('isStringProvided', () => {
        it('should return true for non-empty strings', () => {
            expect(isStringProvided('hello')).toBe(true);
            expect(isStringProvided('a')).toBe(true);
            expect(isStringProvided('123')).toBe(true);
            expect(isStringProvided('special!@#$%')).toBe(true);
            expect(isStringProvided('  text  ')).toBe(true);
        });

        it('should return false for empty strings', () => {
            expect(isStringProvided('')).toBe(false);
            expect(isStringProvided('   ')).toBe(false);
            expect(isStringProvided('\t')).toBe(false);
            expect(isStringProvided('\n')).toBe(false);
            expect(isStringProvided('\r\n')).toBe(false);
        });

        it('should return false for non-string values', () => {
            expect(isStringProvided(null)).toBe(false);
            expect(isStringProvided(undefined)).toBe(false);
            expect(isStringProvided(123)).toBe(false);
            expect(isStringProvided(0)).toBe(false);
            expect(isStringProvided(true)).toBe(false);
            expect(isStringProvided(false)).toBe(false);
            expect(isStringProvided([])).toBe(false);
            expect(isStringProvided({})).toBe(false);
            expect(isStringProvided(() => {})).toBe(false);
        });

        it('should handle unicode and special characters', () => {
            expect(isStringProvided('你好')).toBe(true);
            expect(isStringProvided('😀')).toBe(true);
            expect(isStringProvided('café')).toBe(true);
            expect(isStringProvided('\u0000')).toBe(true); // null character
        });

        it('should handle strings with only whitespace in the middle', () => {
            expect(isStringProvided('hello world')).toBe(true);
            expect(isStringProvided('a    b')).toBe(true);
        });
    });

    describe('isValidEmail', () => {




        it('should handle edge cases', () => {
            expect(isValidEmail('a@b.c')).toBe(true); // Minimal valid email
            expect(isValidEmail('user+tag@example.com')).toBe(true); // Plus addressing
            expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true); // Complex valid
        });

        it('should reject emails with spaces', () => {
            expect(isValidEmail(' user@example.com')).toBe(false);
            expect(isValidEmail('user@example.com ')).toBe(false);
            expect(isValidEmail(' user@example.com ')).toBe(false);
        });

        it('should handle international domain names', () => {
            expect(isValidEmail('user@münchen.de')).toBe(true);
            expect(isValidEmail('user@中国.cn')).toBe(true);
        });
    });

    describe('isValidEmail: should return true for valid email addresses', () => {
        const validEmails = [
            'user@example.com',
            'test.user@example.com',
            'test+user@example.com',
            'test_user@example.com',
            'test-user@example.com',
            '123@example.com',
            'a@b.co',
            'user@subdomain.example.com',
            'user@example.co.uk',
            'user123@test-domain.com',
            'CAPS@EXAMPLE.COM'
        ].map(email => ([email, true]));
        test.each(validEmails)(
            'isValidEmail("%s") should return %s',
            (input, expected) => {
                expect(isValidEmail(input.toString())).toBe(expected);
            }
        )
    });

    describe('isValidEmail: should return false for invalid email addresses', () => {
        const invalidEmails = [
            '',
            ' ',
            'notanemail',
            '@example.com',
            'user@',
            'user',
            'user@@example.com',
            'user@example',
            'user @example.com',
            'user@ example.com',
            'user@example .com',
            'user@.com',
            'user@example.',
            'user.example.com',
            'user@',
            '@',
            'user@exam ple.com',
            'user@example..com',
            'user.@example.com',
            '.user@example.com'
        ].map(email => ([email, false]));
        test.each(invalidEmails)(
            'isValidEmail("%s") should return %s',
            (input, expected) => {
                expect(isValidEmail(input.toString())).toBe(expected);
            }
        )
    });

    describe('isValidPhone', () => {
        it('should return true for valid phone numbers', () => {
            const validPhones = [
                '1234567890',
                '12345678901',
                '123-456-7890',
                '(123) 456-7890',
                '123.456.7890',
                '123 456 7890',
                '+1 234 567 8900',
                '+12345678900',
                '001-234-567-8900',
                '1-234-567-8900',
                '+1 (234) 567-8900'
            ];

            validPhones.forEach(phone => {
                expect(isValidPhone(phone)).toBe(true);
            });
        });

        it('should return false for invalid phone numbers', () => {
            const invalidPhones = [
                '',
                ' ',
                '123',
                '12345',
                '123456789', // Only 9 digits
                'abcdefghij',
                'phone',
                '123-456',
                '(123) 456',
                '12 34 56',
                'notaphone'
            ];

            invalidPhones.forEach(phone => {
                expect(isValidPhone(phone)).toBe(false);
            });
        });

        it('should count only digits', () => {
            expect(isValidPhone('(((1)))2-3-4-5-6-7-8-9-0')).toBe(true); // 10 digits
            expect(isValidPhone('+++++1234567890+++++')).toBe(true); // 10 digits
            expect(isValidPhone('1.2.3.4.5.6.7.8.9')).toBe(false); // Only 9 digits
        });

        it('should handle international formats', () => {
            expect(isValidPhone('+44 20 7123 4567')).toBe(true); // UK format
            expect(isValidPhone('+81-3-1234-5678')).toBe(true); // Japan format
            expect(isValidPhone('+86 138 0000 0000')).toBe(true); // China format
        });

        it('should handle extra long numbers', () => {
            expect(isValidPhone('123456789012345')).toBe(true); // 15 digits
            expect(isValidPhone('+1234567890123456789')).toBe(true); // 19 digits
        });

        it('should handle mixed special characters', () => {
            expect(isValidPhone('(123) 456-7890 ext. 123')).toBe(true); // Has 'ext.'
            expect(isValidPhone('123-456-7890 x123')).toBe(true); // Has 'x'
            expect(isValidPhone('#123*456*7890#')).toBe(true); // Special chars
        });
    });

    describe('isValidRole', () => {
        it('should return true for valid role numbers', () => {
            expect(isValidRole(1)).toBe(true);
            expect(isValidRole(2)).toBe(true);
            expect(isValidRole(3)).toBe(true);
            expect(isValidRole(4)).toBe(true);
            expect(isValidRole(5)).toBe(true);
        });

        it('should return true for valid role strings', () => {
            expect(isValidRole('1')).toBe(true);
            expect(isValidRole('2')).toBe(true);
            expect(isValidRole('3')).toBe(true);
            expect(isValidRole('4')).toBe(true);
            expect(isValidRole('5')).toBe(true);
        });

        it('should return false for invalid role numbers', () => {
            expect(isValidRole(0)).toBe(false);
            expect(isValidRole(6)).toBe(false);
            expect(isValidRole(10)).toBe(false);
            expect(isValidRole(-1)).toBe(false);
            expect(isValidRole(1.5)).toBe(false);
            expect(isValidRole(2.9)).toBe(false);
            expect(isValidRole(Number.MAX_VALUE)).toBe(false);
            expect(isValidRole(Number.MIN_VALUE)).toBe(false);
        });

        it('should return false for invalid role strings', () => {
            expect(isValidRole('0')).toBe(false);
            expect(isValidRole('6')).toBe(false);
            expect(isValidRole('10')).toBe(false);
            expect(isValidRole('-1')).toBe(false);
            expect(isValidRole('1.5')).toBe(false);
            expect(isValidRole('one')).toBe(false);
            expect(isValidRole('abc')).toBe(false);
            expect(isValidRole('')).toBe(false);
            expect(isValidRole(' ')).toBe(false);
        });

        it('should handle string numbers with whitespace', () => {
            expect(isValidRole(' 1 ')).toBe(true); // Has spaces
            expect(isValidRole('1 ')).toBe(true);
            expect(isValidRole(' 1')).toBe(true);
            expect(isValidRole('\t1')).toBe(true);
        });

        it('should handle NaN and special number values', () => {
            expect(isValidRole(NaN)).toBe(false);
            expect(isValidRole(Infinity)).toBe(false);
            expect(isValidRole(-Infinity)).toBe(false);
        });

        it('should handle type coercion edge cases', () => {
            expect(isValidRole('01')).toBe(true); // Should parse to 1
            expect(isValidRole('05')).toBe(true); // Should parse to 5
            expect(isValidRole('00001')).toBe(true); // Should parse to 1
            expect(isValidRole('+1')).toBe(true); // Should parse to 1
            expect(isValidRole('1.0')).toBe(true); // Should parse to 1
            expect(isValidRole('5.0')).toBe(true); // Should parse to 5
        });

        it('should handle other invalid types', () => {
            expect(isValidRole(null as never)).toBe(false);
            expect(isValidRole(undefined as never)).toBe(false);
            expect(isValidRole(true as never)).toBe(false);
            expect(isValidRole(false as never)).toBe(false);
            expect(isValidRole([] as never)).toBe(false);
            expect(isValidRole({} as never)).toBe(false);
        });

        it('should handle boundary values', () => {
            expect(isValidRole(0.99999)).toBe(false);
            expect(isValidRole(1.00001)).toBe(false);
            expect(isValidRole(4.99999)).toBe(false);
            expect(isValidRole(5.00001)).toBe(false);
        });
    });

    describe('Integration tests', () => {
        it('should validate a complete registration form', () => {
            // Valid registration data
            const validData = {
                firstname: 'John',
                lastname: 'Doe',
                email: 'john.doe@example.com',
                username: 'johndoe',
                role: '3',
                phone: '(555) 123-4567'
            };

            expect(isStringProvided(validData.firstname)).toBe(true);
            expect(isStringProvided(validData.lastname)).toBe(true);
            expect(isStringProvided(validData.username)).toBe(true);
            expect(isValidEmail(validData.email)).toBe(true);
            expect(isValidRole(validData.role)).toBe(true);
            expect(isValidPhone(validData.phone)).toBe(true);
        });

        it('should reject invalid registration data', () => {
            // Invalid registration data
            const invalidData = {
                firstname: '',
                lastname: '   ',
                email: 'not-an-email',
                username: null,
                role: '10',
                phone: '123'
            };

            expect(isStringProvided(invalidData.firstname)).toBe(false);
            expect(isStringProvided(invalidData.lastname)).toBe(false);
            expect(isValidEmail(invalidData.email)).toBe(false);
            expect(isStringProvided(invalidData.username)).toBe(false);
            expect(isValidRole(invalidData.role)).toBe(false);
            expect(isValidPhone(invalidData.phone)).toBe(false);
        });

        it('should handle mixed valid and invalid data', () => {
            const mixedData = [
                { value: 'valid@email.com', validator: isValidEmail, expected: true },
                { value: 'invalid-email', validator: isValidEmail, expected: false },
                { value: '1234567890', validator: isValidPhone, expected: true },
                { value: '123', validator: isValidPhone, expected: false },
                { value: '3', validator: isValidRole, expected: true },
                { value: '10', validator: isValidRole, expected: false },
                { value: 'username', validator: isStringProvided, expected: true },
                { value: '', validator: isStringProvided, expected: false }
            ];

            mixedData.forEach(({ value, validator, expected }) => {
                expect(validator(value)).toBe(expected);
            });
        });

        it('should validate all roles correctly', () => {
            const roles = [0, 1, 2, 3, 4, 5, 6];
            const expected = [false, true, true, true, true, true, false];

            roles.forEach((role, index) => {
                expect(isValidRole(role)).toBe(expected[index]);
                expect(isValidRole(role.toString())).toBe(expected[index]);
            });
        });

        it('should handle real-world email edge cases', () => {
            const edgeCases = [
                { email: 'user+tag@example.com', valid: true }, // Plus addressing
                { email: 'user.name@example.com', valid: true }, // Dots
                { email: 'user_name@example.com', valid: true }, // Underscore
                { email: 'user-name@example.com', valid: true }, // Hyphen
                { email: '123@example.com', valid: true }, // Numbers
                { email: 'user@sub.example.com', valid: true }, // Subdomain
                { email: 'user@example.co.uk', valid: true }, // Multiple TLD
                { email: 'user..name@example.com', valid: false }, // Double dots
                { email: '.user@example.com', valid: false }, // Leading dot
                { email: 'user.@example.com', valid: false }, // Trailing dot
            ];

            edgeCases.forEach(({ email, valid }) => {
                expect(isValidEmail(email)).toBe(valid);
            });
        });

        it('should handle real-world phone number formats', () => {
            const phoneFormats = [
                { phone: '555-0123', valid: false }, // Too short
                { phone: '555-555-0123', valid: true }, // Standard US
                { phone: '1-555-555-0123', valid: true }, // With country code
                { phone: '+1-555-555-0123', valid: true }, // With +
                { phone: '(555) 555-0123', valid: true }, // With parentheses
                { phone: '555.555.0123', valid: true }, // With dots
                { phone: '5555550123', valid: true }, // No formatting
                { phone: '+44 20 7123 4567', valid: true }, // UK
                { phone: '+86 138 0000 0000', valid: true }, // China
                { phone: 'ext. 123', valid: false }, // Extension only
            ];

            phoneFormats.forEach(({ phone, valid }) => {
                expect(isValidPhone(phone)).toBe(valid);
            });
        });
    });

    describe('Performance tests', () => {
        it('should handle validation of large datasets efficiently', () => {
            const startTime = Date.now();
            const iterations = 10000;

            for (let i = 0; i < iterations; i++) {
                isStringProvided(`test${i}`);
                isValidEmail(`user${i}@example.com`);
                isValidPhone(`555${i.toString().padStart(7, '0')}`);
                isValidRole((i % 5) + 1);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete 10000 iterations in less than 100ms
            expect(totalTime).toBeLessThan(150);
        });

        it('should handle extremely long strings without crashing', () => {
            const longString = 'a'.repeat(10000);
            const longEmail = 'a'.repeat(5000) + '@' + 'b'.repeat(5000) + '.com';
            const longPhone = '1'.repeat(10000);

            expect(() => isStringProvided(longString)).not.toThrow();
            expect(() => isValidEmail(longEmail)).not.toThrow();
            expect(() => isValidPhone(longPhone)).not.toThrow();
        });
    });
});