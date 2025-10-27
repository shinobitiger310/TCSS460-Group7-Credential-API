# Environment Configuration

A comprehensive guide to managing application configuration across different environments.

> **💡 Related Code**: See implementations in [`/src/core/utilities/envConfig.ts`](../src/core/utilities/envConfig.ts) and environment files in project root

## Quick Navigation
- ⚙️ **Configuration Utilities**: [`envConfig.ts`](../src/core/utilities/envConfig.ts) - Environment variable management
- 📝 **Environment Files**: [`.env.development`](../.env.development), [`.env.example`](../.env.example) - Configuration examples
- 🚀 **Startup Process**: [`index.ts`](../src/index.ts) - Environment validation and server startup
- 🔧 **Database Config**: [`database.ts`](../src/core/utilities/database.ts) - Environment-based database connection
- 🏗️ **Architecture**: [Node.js Architecture](./node-express-architecture.md#application-lifecycle) - Environment in application lifecycle
- 🔒 **Security**: [Web Security Guide](./web-security-guide.md#environment-security) - Environment security practices
- 🔨 **Development Workflow**: [Development Workflow](./development-workflow.md#development-vs-production-comparison) - Dev vs prod environments

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration Strategies](#configuration-strategies)
- [Security Best Practices](#security-best-practices)
- [Deployment Environments](#deployment-environments)
- [Configuration Management Tools](#configuration-management-tools)

---

## Environment Variables

### What are Environment Variables?

Environment variables are dynamic values that can affect the way running processes behave on a computer. In web development, they allow the same application code to run in different environments with different settings.

### Why Environment Variables Matter

#### ✅ **Benefits:**
- **Security**: Keep secrets out of source code (passwords, API keys)
- **Flexibility**: Same code works in different environments
- **Deployment**: Easy to configure for different servers/platforms
- **Team Collaboration**: Each developer can have their own local settings
- **CI/CD Integration**: Automated deployments can inject appropriate values

#### ❌ **Without Environment Variables:**
- Secrets committed to version control (security risk)
- Hardcoded configuration that can't be changed without code changes
- Difficulty deploying to different environments
- Configuration scattered throughout codebase

### Common Environment Types

#### **Development Environment**
```bash
# .env.development
NODE_ENV=development
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=auth_squared_dev
DEBUG=true
LOG_LEVEL=debug
```

#### **Testing Environment**
```bash
# .env.test
NODE_ENV=test
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=auth_squared_test
DEBUG=false
LOG_LEVEL=error
```

#### **Production Environment**
```bash
# .env.production (or environment variables set by deployment platform)
NODE_ENV=production
PORT=80
DATABASE_URL=postgres://user:pass@prod-db.company.com:5432/auth_squared
DEBUG=false
LOG_LEVEL=warn
REDIS_URL=redis://prod-cache.company.com:6379
API_KEY=prod_api_key_here
```

---

## Configuration Strategies

### The .env File Pattern

#### **Environment-Specific Files**
```
.env                    # Default values and development overrides
.env.development        # Development-specific configuration
.env.test              # Testing environment configuration
.env.production        # Production configuration (usually not in repo)
.env.local             # Local overrides (git-ignored)
```

#### **Loading Priority (highest to lowest)**
1. Environment variables already set in the system
2. `.env.local` (loaded for all environments except test)
3. `.env.{NODE_ENV}.local` (e.g., `.env.development.local`)
4. `.env.{NODE_ENV}` (e.g., `.env.development`)
5. `.env`

### Configuration Access Patterns

#### **Basic Environment Variable Access**
```typescript
// ❌ BAD: Direct access without validation
const dbHost = process.env.DB_HOST; // Could be undefined!
const dbPort = process.env.DB_PORT; // String, not number!
```

#### **Safe Environment Variable Access**
```typescript
// ✅ GOOD: Using our utility functions
import { getEnvVar, isDevelopment, isProduction } from '@utilities/envConfig';

const dbHost = getEnvVar('DB_HOST');                    // Required
const dbPort = parseInt(getEnvVar('DB_PORT', '5432')); // With default
const debugMode = isDevelopment();                     // Environment detection
```

### Configuration Validation

```typescript
// From /src/core/utilities/envConfig.ts
export const validateEnv = (): void => {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];

  const missing = requiredVars.filter(varName => {
    try {
      getEnvVar(varName);
      return false;
    } catch {
      return true;
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

### Environment-Specific Configuration

```typescript
// Database configuration that adapts to environment
const createDatabaseConfig = (): PoolConfig => {
  const nodeEnv = getEnvVar('NODE_ENV', 'development');

  if (nodeEnv === 'production') {
    // Production: Use connection string with SSL
    return {
      connectionString: getEnvVar('DATABASE_URL'),
      ssl: { rejectUnauthorized: false }
    };
  }

  // Development/Test: Use individual parameters
  return {
    host: getEnvVar('DB_HOST', 'localhost'),
    port: parseInt(getEnvVar('DB_PORT', '5432')),
    user: getEnvVar('DB_USER', 'postgres'),
    password: getEnvVar('DB_PASSWORD', 'password'),
    database: getEnvVar('DB_NAME', 'auth_squared'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};
```

**📚 Database Connection Details:** See [Database Fundamentals](/docs/database-fundamentals.md) for connection pooling configuration, transaction management, and performance optimization.

---

## Security Best Practices

### **1. Never Commit Secrets to Version Control**

#### ✅ **Good .gitignore patterns:**
```gitignore
# Environment files with secrets
.env.local
.env.production
.env.*.local

# But allow example files
!.env.example
```

#### **Create .env.example files:**
```bash
# .env.example - Template for required variables
NODE_ENV=development
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=auth_squared
```

### **2. Use Different Secrets for Each Environment**

```bash
# Development
API_KEY=dev_key_12345
JWT_SECRET=dev_secret_not_for_production

# Production
API_KEY=prod_key_67890_completely_different
JWT_SECRET=prod_secret_long_random_string_256_bits
```

### **3. Rotate Secrets Regularly**

```typescript
// Support for multiple API keys during rotation
const apiKeys = [
  getEnvVar('API_KEY_PRIMARY'),   // New key
  getEnvVar('API_KEY_SECONDARY')  // Old key being phased out
];

const isValidApiKey = (providedKey: string): boolean => {
  return apiKeys.includes(providedKey);
};
```

### **4. Use Secure Secret Management in Production**

#### **Cloud Platforms:**
- **AWS**: AWS Secrets Manager, Parameter Store
- **Azure**: Azure Key Vault
- **Google Cloud**: Secret Manager
- **Heroku**: Config Vars
- **Docker**: Docker Secrets

#### **Example with AWS Secrets Manager:**
```typescript
import AWS from 'aws-sdk';

const secretsManager = new AWS.SecretsManager();

const getSecret = async (secretName: string): Promise<string> => {
  const result = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return result.SecretString!;
};

// Use in production
if (isProduction()) {
  const dbPassword = await getSecret('prod/database/password');
} else {
  const dbPassword = getEnvVar('DB_PASSWORD');
}
```

**📚 Comprehensive Security Guide:** See [Web Security Guide](/docs/web-security-guide.md) for detailed security practices including secure cookie configuration, CORS setup, and input validation.

---

## Deployment Environments

### **Development Environment**

#### **Characteristics:**
- Local development machine
- Fast feedback loops
- Debug information enabled
- Relaxed security for convenience
- Local database and services

#### **Configuration:**
```typescript
if (isDevelopment()) {
  // Enable detailed error messages
  app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
  }));

  // Allow all CORS origins
  app.use(cors({ origin: '*' }));

  // Verbose logging
  app.use(morgan('combined'));
}
```

### **Testing Environment**

#### **Characteristics:**
- Automated test execution
- Isolated test database
- Minimal logging to avoid noise
- Fast test execution

#### **Configuration:**
```typescript
if (process.env.NODE_ENV === 'test') {
  // Use in-memory database for faster tests
  const dbConfig = {
    host: 'localhost',
    database: 'auth_squared_test',
    // Reduced connection pool for tests
    max: 5,
    idleTimeoutMillis: 1000
  };

  // Suppress console output during tests
  console.log = jest.fn();
}
```

### **Staging Environment**

#### **Characteristics:**
- Production-like environment for testing
- Real external services (but staging versions)
- Performance testing
- User acceptance testing

#### **Configuration:**
```typescript
if (getEnvVar('NODE_ENV') === 'staging') {
  // Production-like security
  app.use(helmet());

  // But with debug information for testing
  app.use(morgan('combined'));

  // Staging API endpoints
  const apiBaseUrl = getEnvVar('STAGING_API_URL');
}
```

### **Production Environment**

#### **Characteristics:**
- Live user traffic
- Maximum security and performance
- Minimal logging and debug information
- High availability and monitoring

#### **Configuration:**
```typescript
if (isProduction()) {
  // Security headers
  app.use(helmet());

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  }));

  // Minimal logging
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));

  // HTTPS redirect
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## Configuration Management Tools

### **dotenv Library**

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific file
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}`;
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });

// Also load default .env
dotenv.config();
```

### **Configuration Schema Validation**

```typescript
import Joi from 'joi';

const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  PORT: Joi.number().default(4000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  API_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

const { error, value } = configSchema.validate(process.env);
if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

export const config = value;
```

### **Type-Safe Configuration**

```typescript
interface Config {
  nodeEnv: 'development' | 'test' | 'staging' | 'production';
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  apiKey?: string;
}

const createConfig = (): Config => ({
  nodeEnv: getEnvVar('NODE_ENV', 'development') as Config['nodeEnv'],
  port: parseInt(getEnvVar('PORT', '4000')),
  database: {
    host: getEnvVar('DB_HOST'),
    port: parseInt(getEnvVar('DB_PORT', '5432')),
    user: getEnvVar('DB_USER'),
    password: getEnvVar('DB_PASSWORD'),
    name: getEnvVar('DB_NAME')
  },
  apiKey: process.env.API_KEY
});

export const config = createConfig();
```

---

## Container and Cloud Deployment

### **Docker Environment Variables**

#### **Dockerfile:**
```dockerfile
FROM node:16-alpine

# Set default environment
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE $PORT

CMD ["npm", "start"]
```

#### **docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=database
      - DB_USER=postgres
      - DB_PASSWORD=password
      - DB_NAME=auth_squared
    depends_on:
      - database

  database:
    image: postgres:13
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=auth_squared
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### **Kubernetes ConfigMaps and Secrets**

#### **ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "auth_squared"
```

#### **Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DB_PASSWORD: cGFzc3dvcmQ=  # base64 encoded
  API_KEY: YXBpX2tleV9oZXJl      # base64 encoded
```

#### **Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-squared-api
spec:
  template:
    spec:
      containers:
      - name: app
        image: auth-squared-api:latest
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

---

## Development Workflow

### **Setting Up New Environment**

1. **Copy example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in values:**
   ```bash
   # Edit .env.local with your specific values
   DB_PASSWORD=your_local_password
   API_KEY=your_dev_api_key
   ```

3. **Validate configuration:**
   ```bash
   npm run validate-env
   ```

### **Environment Switching**

```bash
# Development
export NODE_ENV=development
npm start

# Testing
export NODE_ENV=test
npm test

# Production simulation
export NODE_ENV=production
npm run start:prod
```

### **Configuration Debugging**

```typescript
// Debug configuration utility
export const debugConfig = (): void => {
  if (isDevelopment()) {
    console.log('=== Configuration Debug ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('API_KEY:', process.env.API_KEY ? '[SET]' : '[NOT SET]');
    console.log('==========================');
  }
};
```

---

## Further Reading

- [The Twelve-Factor App](https://12factor.net/) - Methodology for building SaaS apps
- [dotenv Documentation](https://github.com/motdotla/dotenv) - Environment variable loading
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/) - Security best practices

---

*Proper configuration management is essential for secure, maintainable, and deployable applications. These patterns enable smooth transitions between development, testing, and production environments.*