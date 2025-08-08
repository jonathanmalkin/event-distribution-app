/**
 * Comprehensive API Testing Suite - Events Endpoints
 * Tests validation, error handling, and edge cases
 */

import request from 'supertest';
import { Express } from 'express';
import pool from '../../config/database';
import { Events, Venues, Organizers } from '../../generated/database-types';

// Mock app setup - would normally import actual app
let app: Express;
let testVenueId: number;
let testOrganizerId: number;
let testEventId: number;

beforeAll(async () => {
  // Setup test database and app
  // Create test venue and organizer for testing
  const venueResult = await pool.query(`
    INSERT INTO venues (name, street_address, city, state, zip_code, created_at, updated_at)
    VALUES ('Test Venue', '123 Test St', 'Test City', 'TS', '12345', NOW(), NOW())
    RETURNING id
  `);
  testVenueId = venueResult.rows[0].id;

  const organizerResult = await pool.query(`
    INSERT INTO organizers (name, email, is_default, created_at, updated_at)
    VALUES ('Test Organizer', 'test@example.com', false, NOW(), NOW())
    RETURNING id
  `);
  testOrganizerId = organizerResult.rows[0].id;
});

afterAll(async () => {
  // Cleanup test data
  await pool.query('DELETE FROM events WHERE venue_id = $1', [testVenueId]);
  await pool.query('DELETE FROM venues WHERE id = $1', [testVenueId]);
  await pool.query('DELETE FROM organizers WHERE id = $1', [testOrganizerId]);
  await pool.end();
});

afterEach(async () => {
  // Cleanup events after each test
  if (testEventId) {
    await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
    testEventId = 0;
  }
});

describe('POST /api/events', () => {
  describe('Successful Event Creation', () => {
    test('should create event with all required fields', async () => {
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: testVenueId,
        theme: 'Test Event Theme',
        description: 'Test event description',
        organizer_id: testOrganizerId
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        dateTime: expect.any(String),
        venueId: testVenueId,
        theme: 'Test Event Theme',
        organizerId: testOrganizerId
      });

      testEventId = response.body.id;
    });

    test('should create event with minimal required fields', async () => {
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: testVenueId
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        dateTime: expect.any(String),
        venueId: testVenueId,
        organizerId: expect.any(Number), // Should assign default organizer
        status: 'draft'
      });

      testEventId = response.body.id;
    });
  });

  describe('Validation Error Cases', () => {
    test('should reject request without date_time', async () => {
      const eventData = {
        venue_id: testVenueId,
        theme: 'Test Theme'
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'date_time',
            message: expect.stringContaining('required')
          })
        ])
      });
    });

    test('should reject request without venue_id', async () => {
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        theme: 'Test Theme'
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'venue_id',
            message: expect.stringContaining('required')
          })
        ])
      });
    });

    test('should reject invalid date_time format', async () => {
      const eventData = {
        date_time: 'invalid-date',
        venue_id: testVenueId
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'date_time',
          message: expect.stringContaining('valid ISO 8601'),
          received: 'invalid-date'
        })
      );
    });

    test('should reject non-integer venue_id', async () => {
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: 'invalid'
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'venue_id',
          message: expect.stringContaining('positive integer')
        })
      );
    });

    test('should reject negative venue_id', async () => {
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: -1
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'venue_id',
          message: expect.stringContaining('positive integer')
        })
      );
    });

    test('should reject invalid status value', async () => {
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: testVenueId,
        status: 'invalid-status'
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'status',
          message: expect.stringContaining('draft" or "published')
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long theme', async () => {
      const longTheme = 'A'.repeat(1000);
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: testVenueId,
        theme: longTheme
      };

      // Should either accept or reject gracefully
      const response = await request(app)
        .post('/api/events')
        .send(eventData);

      expect([201, 400]).toContain(response.status);
      
      if (response.status === 201) {
        testEventId = response.body.id;
        expect(response.body.theme).toBeDefined();
      }
    });

    test('should handle past date', async () => {
      const eventData = {
        date_time: '2020-01-01T19:00:00.000Z', // Past date
        venue_id: testVenueId
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(201);

      testEventId = response.body.id;
      expect(response.body.dateTime).toBe('2020-01-01T19:00:00.000Z');
    });

    test('should handle far future date', async () => {
      const eventData = {
        date_time: '2099-12-31T23:59:59.999Z',
        venue_id: testVenueId
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(201);

      testEventId = response.body.id;
      expect(response.body.dateTime).toBe('2099-12-31T23:59:59.999Z');
    });

    test('should handle non-existent venue_id', async () => {
      const nonExistentVenueId = 99999;
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: nonExistentVenueId
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body.error).toContain('venue');
    });

    test('should handle non-existent organizer_id', async () => {
      const nonExistentOrganizerId = 99999;
      const eventData = {
        date_time: '2025-08-15T19:00:00.000Z',
        venue_id: testVenueId,
        organizer_id: nonExistentOrganizerId
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventData)
        .expect(400);

      expect(response.body.error).toContain('organizer');
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.length).toBeGreaterThanOrEqual(2); // Missing date_time and venue_id
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toContain('JSON');
    });
  });
});

describe('GET /api/events', () => {
  beforeEach(async () => {
    // Create test event
    const result = await pool.query(`
      INSERT INTO events (date_time, venue_id, organizer_id, theme, status, created_at, updated_at)
      VALUES ('2025-08-15T19:00:00.000Z', $1, $2, 'Test Event', 'published', NOW(), NOW())
      RETURNING id
    `, [testVenueId, testOrganizerId]);
    testEventId = result.rows[0].id;
  });

  test('should return list of events', async () => {
    const response = await request(app)
      .get('/api/events')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    const event = response.body.find((e: any) => e.id === testEventId);
    expect(event).toBeDefined();
    expect(event).toMatchObject({
      id: testEventId,
      theme: 'Test Event',
      status: 'published'
    });
  });

  test('should support pagination', async () => {
    const response = await request(app)
      .get('/api/events?page=1&limit=5')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(5);
  });

  test('should support filtering by status', async () => {
    const response = await request(app)
      .get('/api/events?status=published')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    response.body.forEach((event: any) => {
      expect(event.status).toBe('published');
    });
  });

  test('should handle invalid query parameters gracefully', async () => {
    const response = await request(app)
      .get('/api/events?limit=invalid')
      .expect(200); // Should default to sensible values

    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('GET /api/events/:id', () => {
  beforeEach(async () => {
    const result = await pool.query(`
      INSERT INTO events (date_time, venue_id, organizer_id, theme, status, created_at, updated_at)
      VALUES ('2025-08-15T19:00:00.000Z', $1, $2, 'Single Event Test', 'draft', NOW(), NOW())
      RETURNING id
    `, [testVenueId, testOrganizerId]);
    testEventId = result.rows[0].id;
  });

  test('should return single event by id', async () => {
    const response = await request(app)
      .get(`/api/events/${testEventId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: testEventId,
      theme: 'Single Event Test',
      status: 'draft'
    });
  });

  test('should return 404 for non-existent event', async () => {
    const response = await request(app)
      .get('/api/events/99999')
      .expect(404);

    expect(response.body.error).toContain('not found');
  });

  test('should return 400 for invalid id format', async () => {
    const response = await request(app)
      .get('/api/events/invalid-id')
      .expect(400);

    expect(response.body.error).toContain('valid');
  });
});

describe('Error Response Format', () => {
  test('validation errors should have consistent format', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      error: expect.any(String),
      details: expect.arrayContaining([
        expect.objectContaining({
          field: expect.any(String),
          message: expect.any(String),
          expected: expect.any(String)
        })
      ]),
      hint: expect.any(String)
    });
  });

  test('should include helpful hints for common mistakes', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({
        event_date: '2025-08-15T19:00:00.000Z', // Wrong field name
        venue_id: testVenueId
      })
      .expect(400);

    expect(response.body.hint).toContain('field names');
    expect(response.body.details).toContainEqual(
      expect.objectContaining({
        field: 'date_time',
        message: expect.stringContaining('required')
      })
    );
  });
});