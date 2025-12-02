// src/core/utilities/emailService.ts
import { Resend } from 'resend';
import { getEnvVar, isProduction, isDevelopment } from './envConfig';
import { SMS_GATEWAYS } from '@models';
import * as nodemailer from 'nodemailer';

/**
 * Resend client instance
 */
let resendClient: Resend | null = null;

/**
 * Nodemailer transporter for SMS (fallback)
 */
let emailTransporter: nodemailer.Transporter | null = null;

/**
 * Initialize email service (Resend)
 * Call this once at application startup
 */
export const initializeEmailService = (): void => {
    try {
        const resendApiKey = getEnvVar('RESEND_API_KEY');
        const emailFrom = getEnvVar('EMAIL_FROM', 'onboarding@resend.dev');

        console.log('🔧 Initializing email service (Resend)...');
        console.log(`   API Key: ${resendApiKey ? '***' + resendApiKey.slice(-8) : 'NOT SET'}`);
        console.log(`   From: ${emailFrom}`);

        resendClient = new Resend(resendApiKey);

        // Still initialize nodemailer for SMS gateway (if needed)
        if (getEnvVar('EMAIL_USER') && getEnvVar('EMAIL_PASSWORD')) {
            emailTransporter = nodemailer.createTransport({
                service: getEnvVar('EMAIL_SERVICE', 'gmail'),
                auth: {
                    user: getEnvVar('EMAIL_USER'),
                    pass: getEnvVar('EMAIL_PASSWORD'),
                },
            });
        }

        console.log('✅ Email service initialized successfully (Resend)');
    } catch (error) {
        console.error('❌ Failed to initialize email service:', error);
        throw error;
    }
};

/**
 * Get the Resend client instance
 */
const getResend = (): Resend => {
    if (!resendClient) {
        throw new Error('Email service not initialized. Call initializeEmailService() first.');
    }
    return resendClient;
};

/**
 * Get the email transporter instance (for SMS)
 */
const getTransporter = (): nodemailer.Transporter => {
    if (!emailTransporter) {
        throw new Error('Email transporter not initialized.');
    }
    return emailTransporter;
};

/**
 * Send an email using Resend
 */
export const sendEmail = async (options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
}): Promise<boolean> => {
    try {
        const shouldSend = isProduction() || getEnvVar('SEND_EMAILS') === 'true';

        if (shouldSend) {
            const emailFrom = getEnvVar('EMAIL_FROM', 'onboarding@resend.dev');

            const { data, error } = await getResend().emails.send({
                from: emailFrom,
                to: options.to,
                subject: options.subject,
                html: options.html || options.text || '',
            });

            if (error) {
                console.error('❌ Resend error:', error);
                return false;
            }

            console.log(`📧 Email sent to ${options.to} (ID: ${data?.id})`);
        } else {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 MOCK EMAIL (Development Mode)');
            console.log(`To: ${options.to}`);
            console.log(`Subject: ${options.subject}`);
            if (options.text) console.log(`Text: ${options.text}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        return true;
    } catch (error) {
        console.error('❌ Failed to send email:');
        console.error('Error details:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return false;
    }
};

/**
 * Get carrier gateway for SMS
 */
const getCarrierGateway = (carrier?: string): string => {
    // In development, use mock gateway
    if (!isProduction()) {
        console.log('📱 Using mock SMS gateway for development');
        return SMS_GATEWAYS['mock'];
    }

    // If a carrier is provided, use it
    if (carrier && SMS_GATEWAYS[carrier.toLowerCase()]) {
        return SMS_GATEWAYS[carrier.toLowerCase()];
    }

    // Default to configured carrier or AT&T
    const defaultCarrier = getEnvVar('DEFAULT_SMS_CARRIER', 'att');
    return SMS_GATEWAYS[defaultCarrier];
};

/**
 * Send SMS via Email-to-SMS gateway (still uses nodemailer)
 */
export const sendSMSViaEmail = async (
    phone: string,
    message: string,
    carrier?: string
): Promise<boolean> => {
    try {
        // Clean phone number - remove all non-digits
        const cleanPhone = phone.replace(/\D/g, '');

        // Remove country code if present (for US numbers)
        const phoneDigits = cleanPhone.startsWith('1') && cleanPhone.length === 11
            ? cleanPhone.substring(1)
            : cleanPhone;

        // Get carrier gateway
        const gateway = getCarrierGateway(carrier);
        const smsEmail = `${phoneDigits}${gateway}`;

        const shouldSend = isProduction() || getEnvVar('SEND_SMS_EMAILS') === 'true';

        if (shouldSend) {
            await getTransporter().sendMail({
                from: getEnvVar('EMAIL_USER'),
                to: smsEmail,
                subject: '', // Many gateways ignore subject
                text: message, // Use text only, not HTML
            });
            console.log(`📱 SMS sent via email gateway to ${smsEmail}`);
        } else {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📱 MOCK SMS (Email-to-SMS Gateway)');
            console.log(`📧 Would send to: ${smsEmail}`);
            console.log(`📞 Phone: ${phone}`);
            console.log(`📨 Message: ${message}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        return true;
    } catch (error) {
        console.error('Failed to send SMS via email gateway:', error);
        return false;
    }
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (
    email: string,
    firstname: string,
    verificationUrl: string
): Promise<boolean> => {
    return sendEmail({
        to: email,
        subject: 'Verify your Auth² account',
        html: `
            <h2>Welcome to Auth², ${firstname}!</h2>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 48 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
        `,
    });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
    email: string,
    firstname: string,
    resetUrl: string
): Promise<boolean> => {
    return sendEmail({
        to: email,
        subject: 'Password Reset Request - Auth²',
        html: `
            <h2>Password Reset Request</h2>
            <p>Hi ${firstname},</p>
            <p>You requested to reset your password. Click the link below to proceed:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        `,
    });
};
