/**
 * Comprehensive API Testing Suite - WordPress Import Endpoints
 * Tests import functionality, error handling, and data sanitization
 */

import request from 'supertest';
import { Express } from 'express';
import pool from '../../config/database';
import nock from 'nock';

let app: Express;
const MOCK_WP_URL = 'https://test-wordpress.com';

beforeAll(async () => {
  // Setup mock WordPress environment
  process.env.WORDPRESS_SITE_URL = MOCK_WP_URL;
  process.env.WORDPRESS_USERNAME = 'testuser';
  process.env.WORDPRESS_PASSWORD = 'testpass';
});

beforeEach(async () => {
  // Clean up test data before each test
  await pool.query('DELETE FROM wordpress_venues');
  await pool.query('DELETE FROM organizers WHERE name LIKE $1', ['%Test%']);
  await pool.query('DELETE FROM venues WHERE name LIKE $1', ['%Test%']);
});

afterAll(async () => {
  nock.cleanAll();
  await pool.end();
});

describe('POST /api/import/wordpress/venues', () => {
  describe('Successful Import Cases', () => {
    test('should import venues successfully', async () => {
      // Mock WordPress API response
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, {
          venues: [
            {
              id: 1,
              venue: 'Test Venue One',
              address: '123 Main St',
              city: 'Test City',
              state: 'TC',
              zip: '12345'
            },
            {
              id: 2,
              venue: 'Test Venue &#038; Bar', // HTML entity
              address: '456 Oak Ave',
              city: 'Another City',
              state: 'AC',
              zip: '67890'
            }
          ]
        });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        result: {
          imported: 2,
          matched: 0,
          errors: []
        }
      });

      // Verify venues were created with proper sanitization
      const venues = await pool.query('SELECT * FROM venues ORDER BY id');
      expect(venues.rows).toHaveLength(2);
      expect(venues.rows[1].name).toBe('Test Venue & Bar'); // HTML entity decoded
    });

    test('should handle empty venue response', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, { venues: [] });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(200);

      expect(response.body.result).toMatchObject({
        imported: 0,
        matched: 0,
        errors: []
      });
    });

    test('should match existing venues instead of creating duplicates', async () => {
      // Create existing venue
      await pool.query(`
        INSERT INTO venues (name, street_address, city, state, zip_code, created_at, updated_at)
        VALUES ('Existing Venue', '123 Main St', 'Test City', 'TC', '12345', NOW(), NOW())
      `);

      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, {
          venues: [
            {
              id: 1,
              venue: 'Existing Venue',
              address: '123 Main St',
              city: 'Test City',
              state: 'TC',
              zip: '12345'
            }
          ]
        });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(200);

      expect(response.body.result).toMatchObject({
        imported: 0,
        matched: 1,
        errors: []
      });

      // Verify no duplicate was created
      const venues = await pool.query('SELECT COUNT(*) as count FROM venues WHERE name = $1', ['Existing Venue']);
      expect(parseInt(venues.rows[0].count)).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle WordPress API authentication failure', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(401, { message: 'Unauthorized' });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(500);

      expect(response.body.error).toContain('WordPress API error: 401');
    });

    test('should handle WordPress API not found', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(404, { message: 'Not Found' });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(500);

      expect(response.body.error).toContain('WordPress API error: 404');
    });

    test('should handle network timeout', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .replyWithError({ code: 'ECONNABORTED', message: 'timeout' });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(500);

      expect(response.body.error).toContain('timeout');
    });

    test('should handle malformed WordPress response', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, 'invalid json');

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    test('should collect individual venue import errors', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, {
          venues: [
            {
              id: 1,
              venue: '', // Invalid empty name
              address: '123 Main St',
              city: 'Test City'
            },
            {
              id: 2,
              venue: 'Valid Venue',
              address: '456 Oak Ave',
              city: 'Another City'
            }
          ]
        });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(200);

      expect(response.body.result).toMatchObject({
        imported: 1, // Only the valid venue
        matched: 0,
        errors: expect.arrayContaining([
          expect.objectContaining({
            venueId: 1,
            error: expect.any(String)
          })
        ])
      });
    });
  });

  describe('Data Sanitization', () => {
    test('should decode HTML entities in venue names', async () => {
      const testCases = [
        { input: 'Venue &#8211; Test', expected: 'Venue – Test' },
        { input: 'Bar &#038; Grill', expected: 'Bar & Grill' },
        { input: 'Caf&#233; Central', expected: 'Café Central' },
        { input: 'Multiple &#8211; &#038; &#8217; Entities', expected: 'Multiple – & \' Entities' }
      ];

      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, {
          venues: testCases.map((tc, index) => ({
            id: index + 1,
            venue: tc.input,
            address: '123 Test St',
            city: 'Test City'
          }))
        });

      await request(app)
        .post('/api/import/wordpress/venues')
        .expect(200);

      // Verify all HTML entities were decoded
      const venues = await pool.query('SELECT name FROM venues ORDER BY id');
      testCases.forEach((tc, index) => {
        expect(venues.rows[index].name).toBe(tc.expected);
      });
    });

    test('should sanitize address fields', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, {
          venues: [{
            id: 1,
            venue: 'Test Venue',
            address: '123 Main &#038; Oak St',
            city: 'Test &#8211; City',
            state: 'TC &#038; State',
            zip: '12345'
          }]
        });

      await request(app)
        .post('/api/import/wordpress/venues')
        .expect(200);

      const venue = await pool.query('SELECT * FROM venues WHERE name = $1', ['Test Venue']);
      expect(venue.rows[0]).toMatchObject({
        street_address: '123 Main & Oak St',
        city: 'Test – City',
        state: 'TC & State'
      });
    });
  });

  describe('Pagination Handling', () => {
    test('should handle multiple pages of venues', async () => {
      // Mock first page
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 1, per_page: 50 })
        .reply(200, {
          venues: Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            venue: `Venue ${i + 1}`,
            address: '123 Test St'
          }))
        });

      // Mock second page with fewer venues
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 2, per_page: 50 })
        .reply(200, {
          venues: Array.from({ length: 25 }, (_, i) => ({
            id: i + 51,
            venue: `Venue ${i + 51}`,
            address: '123 Test St'
          }))
        });

      // Mock third page (empty)
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/venues')
        .query({ page: 3, per_page: 50 })
        .reply(200, { venues: [] });

      const response = await request(app)
        .post('/api/import/wordpress/venues')
        .expect(200);

      expect(response.body.result.imported).toBe(75);
      
      const venueCount = await pool.query('SELECT COUNT(*) as count FROM venues');
      expect(parseInt(venueCount.rows[0].count)).toBe(75);
    });
  });
});

describe('POST /api/import/wordpress/organizer', () => {
  describe('Successful Organizer Import', () => {
    test('should create default organizer when none exists in WordPress', async () => {
      // Mock WordPress API - no events found
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/events')
        .query(true)
        .reply(200, { events: [] });

      const response = await request(app)
        .post('/api/import/wordpress/organizer')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        result: {
          action: 'created',
          organizer: expect.objectContaining({
            name: 'Event Organizer',
            email: expect.stringContaining('@'),
            is_default: true
          }),
          message: expect.stringContaining('Default organizer created')
        }
      });

      // Verify organizer was created as default
      const organizer = await pool.query('SELECT * FROM organizers WHERE is_default = true');
      expect(organizer.rows).toHaveLength(1);
      expect(organizer.rows[0].name).toBe('Event Organizer');
    });

    test('should import organizer from WordPress events', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/events')
        .query(true)
        .reply(200, {
          events: [{
            id: 1,
            organizer: {
              id: 1,
              organizer: 'WordPress Event Organizer',
              email: 'wp@example.com'
            }
          }]
        });

      const response = await request(app)
        .post('/api/import/wordpress/organizer')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        result: {
          action: 'imported',
          organizer: expect.objectContaining({
            name: 'WordPress Event Organizer',
            email: 'wp@example.com',
            is_default: true
          })
        }
      });
    });

    test('should return existing default organizer if present', async () => {
      // Create existing default organizer
      await pool.query(`
        INSERT INTO organizers (name, email, is_default, created_at, updated_at)
        VALUES ('Existing Organizer', 'existing@example.com', true, NOW(), NOW())
      `);

      const response = await request(app)
        .post('/api/import/wordpress/organizer')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        result: {
          action: 'existing',
          organizer: expect.objectContaining({
            name: 'Existing Organizer',
            email: 'existing@example.com',
            is_default: true
          })
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WordPress API failure gracefully', async () => {
      nock(MOCK_WP_URL)
        .get('/wp-json/tribe/events/v1/events')
        .query(true)
        .replyWithError('Network error');

      const response = await request(app)
        .post('/api/import/wordpress/organizer')
        .expect(200); // Should still succeed by creating default

      expect(response.body.result.action).toBe('created');
      expect(response.body.result.message).toContain('Default organizer created');
    });
  });
});

describe('GET /api/import/organizers/default', () => {
  test('should return default organizer if exists', async () => {
    await pool.query(`
      INSERT INTO organizers (name, email, is_default, created_at, updated_at)
      VALUES ('Default Organizer', 'default@example.com', true, NOW(), NOW())
    `);

    const response = await request(app)
      .get('/api/import/organizers/default')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      organizer: expect.objectContaining({
        name: 'Default Organizer',
        email: 'default@example.com',
        is_default: true
      }),
      hasDefault: true
    });
  });

  test('should indicate no default organizer exists', async () => {
    const response = await request(app)
      .get('/api/import/organizers/default')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      organizer: null,
      hasDefault: false
    });
  });
});

describe('Import Integration Tests', () => {
  test('should handle full import workflow', async () => {
    // Mock venue import
    nock(MOCK_WP_URL)
      .get('/wp-json/tribe/events/v1/venues')
      .query({ page: 1, per_page: 50 })
      .reply(200, {
        venues: [{
          id: 1,
          venue: 'Integration Test Venue',
          address: '123 Integration St'
        }]
      });

    // Mock organizer import  
    nock(MOCK_WP_URL)
      .get('/wp-json/tribe/events/v1/events')
      .query(true)
      .reply(200, { events: [] });

    // Import venues first
    const venueResponse = await request(app)
      .post('/api/import/wordpress/venues')
      .expect(200);

    expect(venueResponse.body.result.imported).toBe(1);

    // Import organizer
    const organizerResponse = await request(app)
      .post('/api/import/wordpress/organizer')
      .expect(200);

    expect(organizerResponse.body.result.action).toBe('created');

    // Verify both exist and can be used together
    const venues = await pool.query('SELECT COUNT(*) as count FROM venues');
    const organizers = await pool.query('SELECT COUNT(*) as count FROM organizers WHERE is_default = true');
    
    expect(parseInt(venues.rows[0].count)).toBeGreaterThan(0);
    expect(parseInt(organizers.rows[0].count)).toBe(1);
  });
});