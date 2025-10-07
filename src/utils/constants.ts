// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  SUPERADMIN: 'superadmin',
} as const;
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// User status
export const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// Shift status
export const SHIFT_STATUS = {
  OPEN: 'open',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
} as const;
export type ShiftStatus = typeof SHIFT_STATUS[keyof typeof SHIFT_STATUS];

// Application status
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

// Common shift roles
export const SHIFT_ROLES = {
  CARE_WORKER: 'care_worker',
  NURSE: 'nurse',
  SENIOR_CARE_WORKER: 'senior_care_worker',
  TEAM_LEADER: 'team_leader',
  SUPPORT_WORKER: 'support_worker',
  KITCHEN_STAFF: 'kitchen_staff',
  MAINTENANCE: 'maintenance',
  DRIVER: 'driver',
} as const;
export type ShiftRole = typeof SHIFT_ROLES[keyof typeof SHIFT_ROLES];

// Rating values
export const RATING_VALUES = {
  MIN: 1,
  MAX: 5,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;


// API response messages
export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login successful',
    LOGOUT: 'Logout successful',
    REGISTER: 'Registration successful',
    UPDATE: 'Update successful',
    DELETE: 'Delete successful',
    CREATE: 'Created successfully',
    APPROVED: 'Approved successfully',
    REJECTED: 'Rejected successfully',
  },
  ERROR: {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION: 'Validation error',
    INTERNAL_SERVER: 'Internal server error',
    BAD_REQUEST: 'Bad request',
    CONFLICT: 'Resource already exists',
    EXPIRED: 'Resource has expired',
    INVALID_CREDENTIALS: 'Invalid credentials',
    ACCOUNT_PENDING: 'Account pending approval',
    ACCOUNT_INACTIVE: 'Account is inactive',
  },
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const

// Token expiration times (in milliseconds)
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 1000 * 60 * 60 , // 1 hour
  REFRESH_TOKEN: 1000 * 60 * 60 * 24 * 7, // 7 days
  RESET_TOKEN: 1000 * 60 * 15, // 15 minutes
  VERIFICATION_TOKEN: 1000 * 60 * 60 * 24, // 24 hours
} as const;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false,
} as const;

// Rate limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5, // per 15 minutes
  RESET_PASSWORD: 3, // per hour
  RESEND_VERIFICATION: 3, // per hour
  SIGNUP_ATTEMPTS: 10, // per hour
} as const;

// Account verification status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  EXPIRED: 'expired',
} as const;
export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

// Session management
export const SESSION = {
  COOKIE_NAME_ACCESS: 'accessToken',
  COOKIE_NAME_REFRESH: 'refreshToken',
  COOKIE_PATH: '/',
  SAME_SITE: 'lax',
} as const;

// Updated AUTH-specific messages (to be more specific than generic ones)
export const AUTH_MESSAGES = {
  SUCCESS: {
    SIGNUP: 'Registration successful. Please check your email for verification.',
    EMAIL_VERIFIED: 'Email verified successfully',
    PASSWORD_RESET_SENT: 'Password reset instructions sent to your email',
    PASSWORD_RESET_SUCCESS: 'Password updated successfully',
    PROFILE_COMPLETED: 'Profile completed successfully',
    TOKEN_REFRESHED: 'Authentication refreshed successfully',
  },
  ERROR: {
    EMAIL_EXISTS: 'An account with this email already exists',
    EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
    INVALID_EMAIL_FORMAT: 'Please provide a valid email address',
    WEAK_PASSWORD: 'Password must be at least 8 characters long',
    TOKEN_EXPIRED: 'Session expired. Please login again',
    TOKEN_INVALID: 'Invalid or malformed token',
    REFRESH_TOKEN_INVALID: 'Invalid refresh token. Please login again',
    USER_METADATA_INCOMPLETE: 'User profile information is incomplete',
    ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts',
    PASSWORD_RESET_EXPIRED: 'Password reset link has expired',
    VERIFICATION_EXPIRED: 'Email verification link has expired',
    TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
  },
} as const;

// Email templates/types
export const EMAIL_TYPES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_LOCKED: 'account_locked',
  LOGIN_NOTIFICATION: 'login_notification',
} as const;
export type EmailType = typeof EMAIL_TYPES[keyof typeof EMAIL_TYPES];

// Security events for logging
export const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_VERIFIED: 'email_verified',
  ACCOUNT_LOCKED: 'account_locked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  TOKEN_REFRESHED: 'token_refreshed',
} as const;
export type SecurityEvent = typeof SECURITY_EVENTS[keyof typeof SECURITY_EVENTS];

// Environment-specific configurations
export const AUTH_CONFIG = {
  ENVIRONMENTS: {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
  },
  REDIRECT_URLS: {
    DEVELOPMENT: 'http://127.0.0.1:5500/auth/callback',
    STAGING: 'https://staging.yourdomain.com/auth/callback',
    PRODUCTION: 'https://yourdomain.com/auth/callback',
  },
} as const;