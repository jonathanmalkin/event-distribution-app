import { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
  received?: any;
  expected?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate event creation request
 */
export function validateEventCreation(req: Request, res: Response, next: NextFunction) {
  const errors: ValidationError[] = [];
  const { date_time, venue_id, theme, description, status } = req.body;

  // Required field validation
  if (!date_time) {
    errors.push({
      field: 'date_time',
      message: 'date_time is required',
      expected: 'ISO 8601 datetime string'
    });
  } else if (isNaN(Date.parse(date_time))) {
    errors.push({
      field: 'date_time',
      message: 'date_time must be a valid ISO 8601 datetime',
      received: date_time,
      expected: 'ISO 8601 datetime string (e.g., 2025-08-15T19:00:00.000Z)'
    });
  }

  if (!venue_id) {
    errors.push({
      field: 'venue_id',
      message: 'venue_id is required',
      expected: 'positive integer'
    });
  } else if (!Number.isInteger(Number(venue_id)) || Number(venue_id) <= 0) {
    errors.push({
      field: 'venue_id',
      message: 'venue_id must be a positive integer',
      received: venue_id,
      expected: 'positive integer'
    });
  }

  // Optional field validation
  if (theme && typeof theme !== 'string') {
    errors.push({
      field: 'theme',
      message: 'theme must be a string',
      received: typeof theme,
      expected: 'string'
    });
  }

  if (description && typeof description !== 'string') {
    errors.push({
      field: 'description',
      message: 'description must be a string',
      received: typeof description,
      expected: 'string'
    });
  }

  if (status && !['draft', 'published'].includes(status)) {
    errors.push({
      field: 'status',
      message: 'status must be either "draft" or "published"',
      received: status,
      expected: '"draft" or "published"'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      hint: 'Check the API documentation for correct field names and types'
    });
  }

  next();
}

/**
 * Validate venue creation request
 */
export function validateVenueCreation(req: Request, res: Response, next: NextFunction) {
  const errors: ValidationError[] = [];
  const { name, street_address, city, state, zip_code } = req.body;

  // Required field validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'name is required and must be a non-empty string',
      received: name,
      expected: 'non-empty string'
    });
  }

  // Optional field validation
  if (street_address && typeof street_address !== 'string') {
    errors.push({
      field: 'street_address',
      message: 'street_address must be a string',
      received: typeof street_address,
      expected: 'string'
    });
  }

  if (city && typeof city !== 'string') {
    errors.push({
      field: 'city',
      message: 'city must be a string',
      received: typeof city,
      expected: 'string'
    });
  }

  if (state && typeof state !== 'string') {
    errors.push({
      field: 'state',
      message: 'state must be a string',
      received: typeof state,
      expected: 'string'
    });
  }

  if (zip_code && typeof zip_code !== 'string') {
    errors.push({
      field: 'zip_code',
      message: 'zip_code must be a string',
      received: typeof zip_code,
      expected: 'string'
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      hint: 'Check the API documentation for correct field names and types'
    });
  }

  next();
}

/**
 * Generic validation utility
 */
export function createValidator(schema: {[key: string]: {
  required?: boolean;
  type?: string;
  values?: any[];
  validator?: (value: any) => boolean;
}}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    Object.entries(schema).forEach(([field, rules]) => {
      const value = req.body[field];

      // Required field check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `${field} is required`,
          expected: rules.type || 'any'
        });
        return;
      }

      // Skip validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null)) {
        return;
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push({
          field,
          message: `${field} must be of type ${rules.type}`,
          received: typeof value,
          expected: rules.type
        });
        return;
      }

      // Value validation
      if (rules.values && !rules.values.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rules.values.join(', ')}`,
          received: value,
          expected: rules.values.join(' or ')
        });
        return;
      }

      // Custom validation
      if (rules.validator && !rules.validator(value)) {
        errors.push({
          field,
          message: `${field} failed custom validation`,
          received: value
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Environment validation for startup
 */
export function validateEnvironment(): ValidationResult {
  const errors: ValidationError[] = [];
  const requiredEnvVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'WORDPRESS_SITE_URL',
    'WORDPRESS_USERNAME', 
    'WORDPRESS_PASSWORD'
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push({
        field: envVar,
        message: `Environment variable ${envVar} is required`,
        expected: 'non-empty string'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}