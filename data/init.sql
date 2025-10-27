-- Auth² Service Database Schema
-- Complete initial setup for authentication and authorization
-- Includes both email and phone verification

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS Email_Verification CASCADE;
DROP TABLE IF EXISTS Phone_Verification CASCADE;
DROP TABLE IF EXISTS Account_Credential CASCADE;
DROP TABLE IF EXISTS Account CASCADE;

-- Account table with verification status for both email and phone
CREATE TABLE Account (
    Account_ID SERIAL PRIMARY KEY,
    FirstName VARCHAR(255) NOT NULL,
    LastName VARCHAR(255) NOT NULL,
    Username VARCHAR(255) NOT NULL UNIQUE,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Email_Verified BOOLEAN DEFAULT FALSE,
    Phone VARCHAR(15) NOT NULL UNIQUE,
    Phone_Verified BOOLEAN DEFAULT FALSE,
    Account_Role INT NOT NULL,
    Account_Status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'locked'
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account credentials table
CREATE TABLE Account_Credential (
    Credential_ID SERIAL PRIMARY KEY,
    Account_ID INT NOT NULL,
    Salted_Hash VARCHAR(255) NOT NULL,
    Salt VARCHAR(255),
    FOREIGN KEY(Account_ID) REFERENCES Account(Account_ID) ON DELETE CASCADE
);

-- Phone verification codes table (SMS)
CREATE TABLE Phone_Verification (
    Verification_ID SERIAL PRIMARY KEY,
    Account_ID INT NOT NULL,
    Phone VARCHAR(15) NOT NULL,
    Verification_Code VARCHAR(6) NOT NULL,
    Code_Expires TIMESTAMPTZ NOT NULL,
    Attempts INT DEFAULT 0,
    Verified BOOLEAN DEFAULT FALSE,
    Created_At TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(Account_ID) REFERENCES Account(Account_ID) ON DELETE CASCADE
);

-- Email verification tokens table
CREATE TABLE Email_Verification (
    Verification_ID SERIAL PRIMARY KEY,
    Account_ID INT NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Verification_Token VARCHAR(64) NOT NULL UNIQUE, -- Longer token for email links
    Token_Expires TIMESTAMPTZ NOT NULL,
    Verified BOOLEAN DEFAULT FALSE,
    Created_At TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(Account_ID) REFERENCES Account(Account_ID) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_account_email ON Account(Email);
CREATE INDEX idx_account_phone ON Account(Phone);
CREATE INDEX idx_account_username ON Account(Username);
CREATE INDEX idx_account_status ON Account(Account_Status);

CREATE INDEX idx_phone_verification_account ON Phone_Verification(Account_ID);
CREATE INDEX idx_phone_verification_code ON Phone_Verification(Verification_Code);
CREATE INDEX idx_phone_verification_expires ON Phone_Verification(Code_Expires);

CREATE INDEX idx_email_verification_account ON Email_Verification(Account_ID);
CREATE INDEX idx_email_verification_token ON Email_Verification(Verification_Token);
CREATE INDEX idx_email_verification_expires ON Email_Verification(Token_Expires);

-- Comments for documentation
COMMENT ON TABLE Account IS 'Main user account table for Auth² Service';
COMMENT ON COLUMN Account.Email_Verified IS 'Whether the email address has been verified via email link';
COMMENT ON COLUMN Account.Phone_Verified IS 'Whether the phone number has been verified via SMS';
COMMENT ON COLUMN Account.Account_Status IS 'Account status: pending (awaiting verification), active, suspended, or locked';

COMMENT ON TABLE Email_Verification IS 'Stores email verification tokens for account activation';
COMMENT ON COLUMN Email_Verification.Verification_Token IS 'Unique token sent in email verification link';
COMMENT ON COLUMN Email_Verification.Token_Expires IS 'Expiration time for email token (typically 24-48 hours)';

COMMENT ON TABLE Phone_Verification IS 'Stores SMS verification codes and attempts';
COMMENT ON COLUMN Phone_Verification.Verification_Code IS '6-digit code sent via SMS';
COMMENT ON COLUMN Phone_Verification.Code_Expires IS 'Expiration time for SMS code (typically 10-15 minutes)';
COMMENT ON COLUMN Phone_Verification.Attempts IS 'Number of failed verification attempts for security';