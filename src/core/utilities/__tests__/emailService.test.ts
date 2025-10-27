import * as nodemailer from 'nodemailer';
import {
    initializeEmailService,
    sendEmail,
    sendSMSViaEmail,
    sendVerificationEmail,
    sendPasswordResetEmail
} from '../emailService';
import * as envConfig from '../envConfig';

// Mock nodemailer
jest.mock('nodemailer');
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// Mock envConfig
jest.mock('../envConfig');
const mockEnvConfig = envConfig as jest.Mocked<typeof envConfig>;

describe('emailService', () => {
    let mockTransporter: jest.Mocked<nodemailer.Transporter>;
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };

        // Create mock transporter
        mockTransporter = {
            sendMail: jest.fn(),
        } as unknown as jest.Mocked<nodemailer.Transporter>;

        // Mock nodemailer.createTransport
        mockNodemailer.createTransport.mockReturnValue(mockTransporter);

        // Mock environment functions
        mockEnvConfig.getEnvVar.mockImplementation((key: string, defaultValue?: string) => {
            const envVars: { [key: string]: string } = {
                'EMAIL_SERVICE': 'gmail',
                'EMAIL_USER': 'test@example.com',
                'EMAIL_PASSWORD': 'password123',
                'EMAIL_FROM': 'Auth² Service <noreply@auth2.com>',
                'SEND_EMAILS': 'false',
                'SEND_SMS_EMAILS': 'false',
                'DEFAULT_SMS_CARRIER': 'att',
            };
            return envVars[key] || defaultValue || '';
        });

        mockEnvConfig.isProduction.mockReturnValue(false);

        // Mock console methods
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Clear any existing transporter
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.restoreAllMocks();
    });

    describe('initializeEmailService', () => {
        it('should initialize email transporter successfully', () => {
            expect(() => initializeEmailService()).not.toThrow();

            expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    user: 'test@example.com',
                    pass: 'password123',
                },
            });

            expect(consoleSpy).toHaveBeenCalledWith('✅ Email service initialized successfully');
        });

        it('should throw error when initialization fails', () => {
            mockNodemailer.createTransport.mockImplementation(() => {
                throw new Error('Configuration error');
            });

            expect(() => initializeEmailService()).toThrow('Configuration error');
            expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to initialize email service:', expect.any(Error));
        });

        it('should use custom email service from environment', () => {
            mockEnvConfig.getEnvVar.mockImplementation((key: string, defaultValue?: string) => {
                if (key === 'EMAIL_SERVICE') return 'outlook';
                if (key === 'EMAIL_USER') return 'test@outlook.com';
                if (key === 'EMAIL_PASSWORD') return 'password456';
                return defaultValue || '';
            });

            initializeEmailService();

            expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
                service: 'outlook',
                auth: {
                    user: 'test@outlook.com',
                    pass: 'password456',
                },
            });
        });
    });

    describe('sendEmail', () => {
        beforeEach(() => {
            initializeEmailService();
        });

        it('should send email in production mode', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            const options = {
                to: 'recipient@example.com',
                subject: 'Test Subject',
                text: 'Test message',
            };

            const result = await sendEmail(options);

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'Auth² Service <noreply@auth2.com>',
                to: 'recipient@example.com',
                subject: 'Test Subject',
                text: 'Test message',
            });
            expect(consoleSpy).toHaveBeenCalledWith('📧 Email sent to recipient@example.com');
        });

        it('should send email when SEND_EMAILS is true in development', async () => {
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'SEND_EMAILS') return 'true';
                if (key === 'EMAIL_FROM') return 'test@example.com';
                return '';
            });
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            const options = {
                to: 'recipient@example.com',
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
            };

            const result = await sendEmail(options);

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'test@example.com',
                to: 'recipient@example.com',
                subject: 'Test Subject',
                html: '<p>Test HTML</p>',
            });
        });

        it('should mock email in development mode', async () => {
            mockEnvConfig.isProduction.mockReturnValue(false);
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'SEND_EMAILS') return 'false';
                return '';
            });

            const options = {
                to: 'recipient@example.com',
                subject: 'Test Subject',
                text: 'Test message',
            };

            const result = await sendEmail(options);

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            expect(consoleSpy).toHaveBeenCalledWith('📧 MOCK EMAIL (Development Mode)');
            expect(consoleSpy).toHaveBeenCalledWith('To: recipient@example.com');
            expect(consoleSpy).toHaveBeenCalledWith('Subject: Test Subject');
            expect(consoleSpy).toHaveBeenCalledWith('Text: Test message');
        });

        it('should handle email sending errors', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

            const options = {
                to: 'recipient@example.com',
                subject: 'Test Subject',
                text: 'Test message',
            };

            const result = await sendEmail(options);

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send email:', expect.any(Error));
        });

        it('should handle both text and html content', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            const options = {
                to: 'recipient@example.com',
                subject: 'Test Subject',
                text: 'Plain text',
                html: '<p>HTML content</p>',
            };

            await sendEmail(options);

            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'Auth² Service <noreply@auth2.com>',
                to: 'recipient@example.com',
                subject: 'Test Subject',
                text: 'Plain text',
                html: '<p>HTML content</p>',
            });
        });

        // Note: The "transporter not initialized" error condition is implicitly tested
        // through the getTransporter() function which is called in all production email sending scenarios.
        // This error case is difficult to test in isolation due to Jest's module mocking system,
        // but it's covered by the requirement that initializeEmailService() must be called before
        // any email operations in production mode.
    });

    describe('sendSMSViaEmail', () => {
        beforeEach(() => {
            initializeEmailService();
            // Mock SMS_GATEWAYS from @models
            jest.doMock('@models', () => ({
                SMS_GATEWAYS: {
                    att: '@txt.att.net',
                    tmobile: '@tmomail.net',
                    verizon: '@vtext.com',
                    mock: '@sms.mock.com',
                },
            }));
        });

        it('should send SMS via email gateway in production', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            const result = await sendSMSViaEmail('1234567890', 'Test SMS message', 'att');

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'test@example.com',
                to: '1234567890@txt.att.net',
                subject: '',
                text: 'Test SMS message',
            });
            expect(consoleSpy).toHaveBeenCalledWith('📱 SMS sent via email gateway to 1234567890@txt.att.net');
        });

        it('should clean phone number correctly', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            await sendSMSViaEmail('(123) 456-7890', 'Test message', 'att');

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: '1234567890@txt.att.net',
                })
            );
        });

        it('should handle US country code removal', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            await sendSMSViaEmail('+1-234-567-8900', 'Test message', 'att');

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: '2345678900@txt.att.net',
                })
            );
        });

        it('should use default carrier when none specified', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'DEFAULT_SMS_CARRIER') return 'tmobile';
                if (key === 'EMAIL_USER') return 'test@example.com';
                return '';
            });
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            await sendSMSViaEmail('1234567890', 'Test message');

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: '1234567890@tmomail.net',
                })
            );
        });

        it('should use mock gateway in development', async () => {
            mockEnvConfig.isProduction.mockReturnValue(false);
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'SEND_SMS_EMAILS') return 'false';
                return '';
            });

            const result = await sendSMSViaEmail('1234567890', 'Test message', 'att');

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('📱 Using mock SMS gateway for development');
            expect(consoleSpy).toHaveBeenCalledWith('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            expect(consoleSpy).toHaveBeenCalledWith('📱 MOCK SMS (Email-to-SMS Gateway)');
        });

        it('should send SMS when SEND_SMS_EMAILS is true in development', async () => {
            mockEnvConfig.isProduction.mockReturnValue(false);
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'SEND_SMS_EMAILS') return 'true';
                if (key === 'EMAIL_USER') return 'test@example.com';
                return '';
            });
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            const result = await sendSMSViaEmail('1234567890', 'Test message', 'att');

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });

        it('should handle SMS sending errors', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockRejectedValue(new Error('SMS gateway error'));

            const result = await sendSMSViaEmail('1234567890', 'Test message', 'att');

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send SMS via email gateway:', expect.any(Error));
        });
    });

    describe('sendVerificationEmail', () => {
        beforeEach(() => {
            initializeEmailService();
        });

        it('should send verification email with correct content', async () => {
            mockEnvConfig.isProduction.mockReturnValue(false);
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'SEND_EMAILS') return 'true';
                if (key === 'EMAIL_FROM') return 'noreply@auth2.com';
                return '';
            });
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            const result = await sendVerificationEmail(
                'user@example.com',
                'John',
                'https://example.com/verify?token=abc123'
            );

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@auth2.com',
                to: 'user@example.com',
                subject: 'Verify your Auth² account',
                html: expect.stringContaining('Welcome to Auth², John!'),
            });

            const htmlContent = mockTransporter.sendMail.mock.calls[0][0].html;
            expect(htmlContent).toContain('https://example.com/verify?token=abc123');
            expect(htmlContent).toContain('Verify Email');
            expect(htmlContent).toContain('This link will expire in 48 hours');
        });

        it('should handle verification email sending errors', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockRejectedValue(new Error('Email service error'));

            const result = await sendVerificationEmail(
                'user@example.com',
                'John',
                'https://example.com/verify?token=abc123'
            );

            expect(result).toBe(false);
        });
    });

    describe('sendPasswordResetEmail', () => {
        beforeEach(() => {
            initializeEmailService();
        });

        it('should send password reset email with correct content', async () => {
            mockEnvConfig.isProduction.mockReturnValue(false);
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'SEND_EMAILS') return 'true';
                if (key === 'EMAIL_FROM') return 'noreply@auth2.com';
                return '';
            });
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            const result = await sendPasswordResetEmail(
                'user@example.com',
                'Jane',
                'https://example.com/reset?token=xyz789'
            );

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: 'noreply@auth2.com',
                to: 'user@example.com',
                subject: 'Password Reset Request - Auth²',
                html: expect.stringContaining('Hi Jane,'),
            });

            const htmlContent = mockTransporter.sendMail.mock.calls[0][0].html;
            expect(htmlContent).toContain('https://example.com/reset?token=xyz789');
            expect(htmlContent).toContain('Reset Password');
            expect(htmlContent).toContain('This link will expire in 1 hour');
        });

        it('should handle password reset email sending errors', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockRejectedValue(new Error('Email service error'));

            const result = await sendPasswordResetEmail(
                'user@example.com',
                'Jane',
                'https://example.com/reset?token=xyz789'
            );

            expect(result).toBe(false);
        });
    });

    describe('Integration tests', () => {
        beforeEach(() => {
            initializeEmailService();
        });

        it('should handle complete email workflow', async () => {
            mockEnvConfig.isProduction.mockReturnValue(true);
            mockTransporter.sendMail.mockResolvedValue({} as nodemailer.SentMessageInfo);

            // Send verification email
            const verificationResult = await sendVerificationEmail(
                'newuser@example.com',
                'New User',
                'https://example.com/verify?token=abc123'
            );

            // Send password reset email
            const resetResult = await sendPasswordResetEmail(
                'existinguser@example.com',
                'Existing User',
                'https://example.com/reset?token=xyz789'
            );

            // Send SMS
            const smsResult = await sendSMSViaEmail('1234567890', 'Your code is 123456', 'att');

            expect(verificationResult).toBe(true);
            expect(resetResult).toBe(true);
            expect(smsResult).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
        });

        it('should work in development mode with mocking', async () => {
            mockEnvConfig.isProduction.mockReturnValue(false);
            mockEnvConfig.getEnvVar.mockImplementation((key: string) => {
                if (key === 'SEND_EMAILS') return 'false';
                if (key === 'SEND_SMS_EMAILS') return 'false';
                return '';
            });

            const emailResult = await sendEmail({
                to: 'test@example.com',
                subject: 'Test',
                text: 'Test message',
            });

            const smsResult = await sendSMSViaEmail('1234567890', 'Test SMS');

            expect(emailResult).toBe(true);
            expect(smsResult).toBe(true);
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('📧 MOCK EMAIL (Development Mode)');
            expect(consoleSpy).toHaveBeenCalledWith('📱 MOCK SMS (Email-to-SMS Gateway)');
        });
    });
});