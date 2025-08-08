# Error Prevention & Best Practices Guide

## Overview
This guide documents common error patterns encountered during development and provides systematic prevention strategies to ensure robust, maintainable code.

## 🚨 Common Error Patterns & Solutions

### 1. Database Constraint Errors

**Pattern**: Foreign key violations during cleanup operations
**Root Cause**: Attempting to delete parent records while child records still reference them
**Impact**: Development workflow interruptions, manual cleanup required

**Prevention Strategies**:
- ✅ Use safe cleanup procedures from `src/database/safe-cleanup.sql`
- ✅ Always check dependencies with `check_dependencies()` function
- ✅ Follow proper deletion order: children → parents
- ✅ Use transaction rollback for safety

**Example Usage**:
```sql
-- Check what depends on what before deletion
SELECT check_dependencies();

-- Safe cleanup of venues and organizers
SELECT safe_cleanup_venues_organizers();

-- Complete data cleanup with rollback safety
SELECT safe_cleanup_all_data();
```

### 2. Data Quality Issues

**Pattern**: HTML entities in imported WordPress data (&#8211;, &#038;)
**Root Cause**: WordPress stores encoded HTML entities that need decoding
**Impact**: Incorrect display in UI, poor user experience

**Prevention Strategies**:
- ✅ Use sanitization utilities from `src/utils/sanitization.ts`
- ✅ Apply sanitization during import process
- ✅ Test with actual WordPress data containing entities

**Example Usage**:
```typescript
import { sanitizeVenueName, sanitizeWordPressContent } from '../utils/sanitization';

// Always sanitize WordPress imports
const venue = {
  name: sanitizeVenueName(wpVenue.venue), // Converts &#8211; to –
  address: sanitizeWordPressContent(wpVenue.address)
};
```

### 3. API Field Inconsistencies

**Pattern**: Field name mismatches between API expectations and client requests
**Root Cause**: No request validation, inconsistent documentation
**Impact**: 400 errors, debugging time, user frustration

**Prevention Strategies**:
- ✅ Use validation middleware from `src/middleware/validation.ts`
- ✅ Apply validation to all API routes
- ✅ Provide clear error messages with expected field names
- ✅ Test API endpoints with various input combinations

**Example Usage**:
```typescript
import { validateEventCreation } from '../middleware/validation';

// Apply validation middleware to routes
router.post('/events', validateEventCreation, async (req, res) => {
  // Field validation is guaranteed here
});
```

### 4. Schema-Code Synchronization Issues

**Pattern**: TypeScript interfaces out of sync with database schema
**Root Cause**: Manual synchronization process between database and code
**Impact**: Compilation failures, server startup issues

**Prevention Strategies**:
- ✅ Update TypeScript interfaces when modifying database schema
- ✅ Use consistent naming between database columns and interface properties
- ✅ Include interface updates in migration checklists
- ✅ Consider automated interface generation tools

**Checklist for Schema Changes**:
1. Update database migration files
2. Update TypeScript interfaces in `src/models/`
3. Update API validation rules
4. Test compilation and runtime behavior
5. Update API documentation

### 5. Environment Configuration Issues

**Pattern**: Database connection failures, missing environment variables
**Root Cause**: Inconsistent development environment setup
**Impact**: Server startup failures, connection errors

**Prevention Strategies**:
- ✅ Validate environment on startup using `validateEnvironment()`
- ✅ Provide clear error messages for missing configuration
- ✅ Document all required environment variables
- ✅ Use fallback strategies where appropriate

**Example Usage**:
```typescript
import { validateEnvironment } from '../middleware/validation';

// Validate environment on server startup
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
  console.error('Environment validation failed:', envValidation.errors);
  process.exit(1);
}
```

## 📋 Development Workflow Checklist

### Before Making Database Changes:
- [ ] Backup current database state
- [ ] Check foreign key dependencies
- [ ] Plan deletion/update order
- [ ] Test with safe cleanup procedures
- [ ] Update corresponding TypeScript interfaces

### Before Adding New API Endpoints:
- [ ] Define validation schema
- [ ] Apply validation middleware
- [ ] Test with various input combinations
- [ ] Document field names and types
- [ ] Include error handling with clear messages

### Before Importing WordPress Data:
- [ ] Test sanitization functions with sample data
- [ ] Verify HTML entity handling
- [ ] Check for data completeness
- [ ] Validate fallback strategies
- [ ] Monitor for import errors

### Before Server Deployment:
- [ ] Validate all environment variables
- [ ] Test database connectivity
- [ ] Verify external API credentials
- [ ] Run comprehensive test suite
- [ ] Check server startup process

## 🛠️ Quick Reference Commands

### Database Operations
```bash
# Connect to database
psql -d event_distribution

# Run safe cleanup
psql -d event_distribution -c "SELECT safe_cleanup_venues_organizers();"

# Check dependencies
psql -d event_distribution -c "SELECT check_dependencies();"
```

### API Testing
```bash
# Test event creation with correct fields
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"date_time": "2025-08-15T19:00:00.000Z", "venue_id": 1}'

# Test with validation errors
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{"event_date": "2025-08-15T19:00:00.000Z"}' # Wrong field name
```

### WordPress Import Testing
```bash
# Import venues with sanitization
curl -X POST http://localhost:3001/api/import/wordpress/venues

# Import organizer with fallback handling
curl -X POST http://localhost:3001/api/import/wordpress/organizer

# Check sanitization results
curl http://localhost:3001/api/venues | jq '.[] | {id, name}'
```

## 📊 Success Metrics

Track these metrics to measure error prevention effectiveness:

1. **Database Operations**: Zero foreign key constraint errors
2. **API Validation**: <1% 400 errors due to field mismatches  
3. **Data Quality**: 100% HTML entities properly decoded
4. **Environment Setup**: One-command startup for new developers
5. **Import Reliability**: >95% success rate for WordPress imports

## 🚀 Future Improvements

**Phase 2 Enhancements** (Next Sprint):
- Automated TypeScript interface generation from database schema
- Comprehensive API testing suite with edge cases
- Real-time error monitoring and alerting
- Database migration management system

**Phase 3 Enhancements** (1 Month):
- Docker containerization for consistent environments
- Automated data validation pipelines
- Performance monitoring and optimization
- Advanced logging and debugging tools

## 📚 Additional Resources

- **Safe Cleanup Procedures**: `src/database/safe-cleanup.sql`
- **Data Sanitization**: `src/utils/sanitization.ts`
- **API Validation**: `src/middleware/validation.ts`
- **Environment Setup**: `backend/README.md`
- **Database Schema**: `backend/src/database/schema.sql`

---

*Last Updated: August 2025*  
*Keep this guide current by updating it whenever new error patterns are identified or prevention strategies are implemented.*