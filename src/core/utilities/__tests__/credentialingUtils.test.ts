import {
    generateSalt,
    generateHash,
    generateSaltedHash,
    verifyPassword,
    generateVerificationCode,
    generateSecureToken
} from '../credentialingUtils';

describe('credentialingUtils', () => {

    describe('generateSalt', () => {
        it('should generate a 64-character hex string', () => {
            const salt = generateSalt();
            expect(salt).toHaveLength(64);
            expect(salt).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should generate unique salts', () => {
            const salt1 = generateSalt();
            const salt2 = generateSalt();
            const salt3 = generateSalt();

            expect(salt1).not.toBe(salt2);
            expect(salt2).not.toBe(salt3);
            expect(salt1).not.toBe(salt3);
        });

        it('should consistently return hex characters only', () => {
            for (let i = 0; i < 10; i++) {
                const salt = generateSalt();
                expect(salt).toMatch(/^[a-f0-9]+$/);
            }
        });
    });

    describe('generateHash', () => {
        it('should generate a 64-character SHA256 hash', () => {
            const hash = generateHash('password', 'salt');
            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should generate consistent hash for same inputs', () => {
            const password = 'testPassword123';
            const salt = 'testSalt';

            const hash1 = generateHash(password, salt);
            const hash2 = generateHash(password, salt);

            expect(hash1).toBe(hash2);
        });

        it('should generate different hashes for different passwords', () => {
            const salt = 'sameSalt';
            const hash1 = generateHash('password1', salt);
            const hash2 = generateHash('password2', salt);

            expect(hash1).not.toBe(hash2);
        });

        it('should generate different hashes for different salts', () => {
            const password = 'samePassword';
            const hash1 = generateHash(password, 'salt1');
            const hash2 = generateHash(password, 'salt2');

            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty strings', () => {
            const hash1 = generateHash('', '');
            const hash2 = generateHash('password', '');
            const hash3 = generateHash('', 'salt');

            expect(hash1).toHaveLength(64);
            expect(hash2).toHaveLength(64);
            expect(hash3).toHaveLength(64);
            expect(hash1).not.toBe(hash2);
            expect(hash1).not.toBe(hash3);
        });

        it('should handle special characters in password', () => {
            const password = '!@#$%^&*()_+-=[]{}|;\':",./<>?';
            const salt = 'testSalt';

            const hash = generateHash(password, salt);
            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should handle unicode characters', () => {
            const password = '密码🔒パスワード';
            const salt = 'testSalt';

            const hash = generateHash(password, salt);
            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('generateSaltedHash', () => {
        it('should return both salt and hash', async () => {
            const result = await generateSaltedHash('password');

            expect(result).toHaveProperty('salt');
            expect(result).toHaveProperty('hash');
            expect(result.salt).toHaveLength(64);
            expect(result.hash).toHaveLength(64);
        });

        it('should generate unique salts for same password', async () => {
            const password = 'samePassword';
            const result1 = await generateSaltedHash(password);
            const result2 = await generateSaltedHash(password);

            expect(result1.salt).not.toBe(result2.salt);
            expect(result1.hash).not.toBe(result2.hash);
        });

        it('should generate verifiable hash', async () => {
            const password = 'testPassword';
            const { salt, hash } = await generateSaltedHash(password);

            // Manually verify the hash
            const verificationHash = generateHash(password, salt);
            expect(hash).toBe(verificationHash);
        });

        it('should handle long passwords', async () => {
            const longPassword = 'a'.repeat(1000);
            const result = await generateSaltedHash(longPassword);

            expect(result.salt).toHaveLength(64);
            expect(result.hash).toHaveLength(64);
        });
    });

    describe('verifyPassword', () => {
        it('should return true for correct password', () => {
            const password = 'correctPassword';
            const salt = generateSalt();
            const hash = generateHash(password, salt);

            const result = verifyPassword(password, salt, hash);
            expect(result).toBe(true);
        });

        it('should return false for incorrect password', () => {
            const correctPassword = 'correctPassword';
            const wrongPassword = 'wrongPassword';
            const salt = generateSalt();
            const hash = generateHash(correctPassword, salt);

            const result = verifyPassword(wrongPassword, salt, hash);
            expect(result).toBe(false);
        });

        it('should return false for wrong salt', () => {
            const password = 'testPassword';
            const correctSalt = generateSalt();
            const wrongSalt = generateSalt();
            const hash = generateHash(password, correctSalt);

            const result = verifyPassword(password, wrongSalt, hash);
            expect(result).toBe(false);
        });

        it('should return false for tampered hash', () => {
            const password = 'testPassword';
            const salt = generateSalt();
            const hash = generateHash(password, salt);
            const tamperedHash = hash.substring(0, 63) + (hash[63] === 'a' ? 'b' : 'a');

            const result = verifyPassword(password, salt, tamperedHash);
            expect(result).toBe(false);
        });

        it('should handle empty strings', () => {
            const result1 = verifyPassword('', '', generateHash('', ''));
            expect(result1).toBe(true);

            const result2 = verifyPassword('password', '', generateHash('password', ''));
            expect(result2).toBe(true);
        });

        it('should be case sensitive', () => {
            const salt = generateSalt();
            const hash = generateHash('Password', salt);

            expect(verifyPassword('Password', salt, hash)).toBe(true);
            expect(verifyPassword('password', salt, hash)).toBe(false);
            expect(verifyPassword('PASSWORD', salt, hash)).toBe(false);
        });

        it('should work with generateSaltedHash', async () => {
            const password = 'integrationTest';
            const { salt, hash } = await generateSaltedHash(password);

            expect(verifyPassword(password, salt, hash)).toBe(true);
            expect(verifyPassword('wrongPassword', salt, hash)).toBe(false);
        });
    });

    describe('generateVerificationCode', () => {
        it('should generate a 6-digit string', () => {
            const code = generateVerificationCode();
            expect(code).toHaveLength(6);
            expect(code).toMatch(/^\d{6}$/);
        });

        it('should generate codes between 100000 and 999999', () => {
            for (let i = 0; i < 100; i++) {
                const code = generateVerificationCode();
                const codeNum = parseInt(code);

                expect(codeNum).toBeGreaterThanOrEqual(100000);
                expect(codeNum).toBeLessThanOrEqual(999999);
            }
        });

        it('should generate different codes (statistical test)', () => {
            const codes = new Set();
            const iterations = 100;

            for (let i = 0; i < iterations; i++) {
                codes.add(generateVerificationCode());
            }

            // Should generate at least 90% unique codes in 100 iterations
            expect(codes.size).toBeGreaterThan(90);
        });

        it('should always return string type', () => {
            for (let i = 0; i < 10; i++) {
                const code = generateVerificationCode();
                expect(typeof code).toBe('string');
            }
        });

        it('should not have leading zeros stripped', () => {
            // This test might occasionally fail due to randomness
            // Run multiple times to increase chance of getting a code starting with 1
            let foundCodeStartingWith1 = false;

            for (let i = 0; i < 1000 && !foundCodeStartingWith1; i++) {
                const code = generateVerificationCode();
                if (code.startsWith('1')) {
                    foundCodeStartingWith1 = true;
                    expect(code).toHaveLength(6);
                }
            }

            // Statistically, we should find at least one code starting with 1
            expect(foundCodeStartingWith1).toBe(true);
        });
    });

    describe('generateSecureToken', () => {
        it('should generate a 64-character hex string by default', () => {
            const token = generateSecureToken();
            expect(token).toHaveLength(64);
            expect(token).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should generate tokens of specified byte length', () => {
            const token16 = generateSecureToken(16);
            const token32 = generateSecureToken(32);
            const token64 = generateSecureToken(64);

            expect(token16).toHaveLength(32);  // 16 bytes = 32 hex chars
            expect(token32).toHaveLength(64);  // 32 bytes = 64 hex chars
            expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
        });

        it('should generate unique tokens', () => {
            const tokens = new Set();
            const iterations = 100;

            for (let i = 0; i < iterations; i++) {
                tokens.add(generateSecureToken());
            }

            expect(tokens.size).toBe(iterations);
        });

        it('should only contain valid hex characters', () => {
            for (let i = 0; i < 10; i++) {
                const token = generateSecureToken(Math.floor(Math.random() * 64) + 1);
                expect(token).toMatch(/^[a-f0-9]+$/);
            }
        });

        it('should handle edge cases', () => {
            const token1 = generateSecureToken(1);
            const token256 = generateSecureToken(256);

            expect(token1).toHaveLength(2);
            expect(token256).toHaveLength(512);
            expect(token1).toMatch(/^[a-f0-9]{2}$/);
            expect(token256).toMatch(/^[a-f0-9]{512}$/);
        });

        it('should maintain cryptographic randomness', () => {
            // Test that tokens have good distribution of characters
            const token = generateSecureToken(1000); // Large token
            const charCounts: { [key: string]: number } = {};

            for (const char of token) {
                charCounts[char] = (charCounts[char] || 0) + 1;
            }

            // All hex characters should appear in a large random sample
            const hexChars = '0123456789abcdef'.split('');
            for (const hexChar of hexChars) {
                expect(charCounts[hexChar]).toBeGreaterThan(0);
            }

            // No character should dominate (basic randomness check)
            const counts = Object.values(charCounts);
            const maxCount = Math.max(...counts);
            const minCount = Math.min(...counts);
            const ratio = maxCount / minCount;

            // Ratio should be reasonable (not perfect due to randomness)
            expect(ratio).toBeLessThan(3);
        });
    });

    describe('Integration tests', () => {
        it('should work end-to-end for password creation and verification', async () => {
            const passwords = [
                'simplePassword',
                'C0mpl3x!P@ssw0rd',
                '🔐 Unicode Password 密码',
                '',
                ' ',
                'a'.repeat(500)
            ];

            for (const password of passwords) {
                const { salt, hash } = await generateSaltedHash(password);

                // Should verify correctly
                expect(verifyPassword(password, salt, hash)).toBe(true);

                // Should fail with wrong password
                expect(verifyPassword(password + 'x', salt, hash)).toBe(false);

                // Should fail with wrong salt
                expect(verifyPassword(password, generateSalt(), hash)).toBe(false);
            }
        });

        it('should generate different hashes for same password with different salts', async () => {
            const password = 'testPassword';
            const results = await Promise.all([
                generateSaltedHash(password),
                generateSaltedHash(password),
                generateSaltedHash(password)
            ]);

            // All salts should be different
            expect(results[0].salt).not.toBe(results[1].salt);
            expect(results[1].salt).not.toBe(results[2].salt);
            expect(results[0].salt).not.toBe(results[2].salt);

            // All hashes should be different
            expect(results[0].hash).not.toBe(results[1].hash);
            expect(results[1].hash).not.toBe(results[2].hash);
            expect(results[0].hash).not.toBe(results[2].hash);

            // But all should verify correctly
            for (const { salt, hash } of results) {
                expect(verifyPassword(password, salt, hash)).toBe(true);
            }
        });
    });
});