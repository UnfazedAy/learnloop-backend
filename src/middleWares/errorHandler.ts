import { Request, Response, NextFunction, RequestHandler } from "express";
import { HTTP_STATUS, MESSAGES } from "../utils/constants";
import { AUTH_MESSAGES } from "../utils/constants"; // Import the new auth-specific messages
import ErrorResponse from "../utils/errorResponse";

// Use the literal types from constants
type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// Extend Error with custom fields
interface CustomError extends Partial<Error> {
  statusCode?: HttpStatusCode;
  code?: number | string;
  details?: {
    path?: (string | number)[];
    message: string;
  }[];
}

// Supabase-specific error mappings
const mapSupabaseError = (error: CustomError): { statusCode: HttpStatusCode; message: string } => {
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Email already exists
  if (errorMessage.includes('already registered') || errorMessage.includes('email already exists')) {
    return { statusCode: HTTP_STATUS.CONFLICT, message: AUTH_MESSAGES.ERROR.EMAIL_EXISTS };
  }
  
  // Invalid credentials
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid email or password')) {
    return { statusCode: HTTP_STATUS.UNAUTHORIZED, message: MESSAGES.ERROR.INVALID_CREDENTIALS };
  }
  
  // Email not confirmed
  if (errorMessage.includes('email not confirmed') || errorMessage.includes('email not verified')) {
    return { statusCode: HTTP_STATUS.UNAUTHORIZED, message: AUTH_MESSAGES.ERROR.EMAIL_NOT_VERIFIED };
  }
  
  // Rate limiting
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
    return { statusCode: HTTP_STATUS.UNAUTHORIZED, message: AUTH_MESSAGES.ERROR.TOO_MANY_REQUESTS };
  }
  
  // Token expired
  if (errorMessage.includes('jwt expired') || errorMessage.includes('token expired')) {
    return { statusCode: HTTP_STATUS.UNAUTHORIZED, message: AUTH_MESSAGES.ERROR.TOKEN_EXPIRED };
  }
  
  // Invalid token
  if (errorMessage.includes('invalid token') || errorMessage.includes('malformed token')) {
    return { statusCode: HTTP_STATUS.UNAUTHORIZED, message: AUTH_MESSAGES.ERROR.TOKEN_INVALID };
  }
  
  // Default to bad request for other Supabase errors
  return { statusCode: HTTP_STATUS.BAD_REQUEST, message: error.message || MESSAGES.ERROR.BAD_REQUEST };
};

// Error handling middleware
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error("Error Details:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  });

  // Initialize fallback values with correct types
  let statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message: string = MESSAGES.ERROR.INTERNAL_SERVER;
  let errors: { field: string; message: string }[] | null = null;

  // Custom API error (highest priority)
  if (err instanceof ErrorResponse) {
    statusCode = err.statusCode || HTTP_STATUS.BAD_REQUEST;
    message = err.message;
  }
  // Supabase auth errors
  else if (err.message && (
    err.message.includes('auth') || 
    err.message.includes('user') || 
    err.message.includes('email') ||
    err.message.includes('password') ||
    err.message.includes('token') ||
    err.message.includes('jwt')
  )) {
    const mapped = mapSupabaseError(err);
    statusCode = mapped.statusCode;
    message = mapped.message;
  }
  // Validation error (e.g. from Zod, Joi, etc.)
  else if (err.name === "ValidationError" && err.details) {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    message = MESSAGES.ERROR.VALIDATION;
    errors = err.details.map((detail) => ({
      field: detail.path?.join(".") || "unknown",
      message: detail.message,
    }));
  }
  // JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = AUTH_MESSAGES.ERROR.TOKEN_INVALID;
  }
  else if (err.name === "TokenExpiredError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = AUTH_MESSAGES.ERROR.TOKEN_EXPIRED;
  }
  // Database constraint errors
  else if (err.code === "23505") { // Postgres unique constraint
    statusCode = HTTP_STATUS.CONFLICT;
    message = MESSAGES.ERROR.CONFLICT;
  }
  else if (err.code === "23503") { // Postgres foreign key constraint
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Invalid reference data";
  }
  else if (err.code === 11000) { // MongoDB Duplicate key error
    statusCode = HTTP_STATUS.CONFLICT;
    message = MESSAGES.ERROR.CONFLICT;
  }
  // Mongoose/MongoDB errors
  else if (err.name === "CastError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Invalid ID format";
  }

  // Response structure
  const errorResponse = {
    status: "error",
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      originalError: err.message 
    }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper for controllers
// export const asyncHandler = (fn: RequestHandler): RequestHandler => {
//   return (req, res, next) => {
//     Promise.resolve(fn(req, res, next)).catch(next);
//   };
// };

export const asyncHandler = <P, ResBody, ReqBody>(
  fn: (req: Request<P, ResBody, ReqBody>, res: Response, next: NextFunction) => Promise<ResBody | void>
): RequestHandler<P, ResBody, ReqBody> => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;