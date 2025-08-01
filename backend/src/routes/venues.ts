import express from 'express';
import pool from '../config/database';
import { Venue } from '../models/Event';

const router = express.Router();

// Get all active venues
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT * FROM venues 
      WHERE is_active = true 
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// Get single venue
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM venues WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

// Create new venue
router.post('/', async (req, res) => {
  try {
    const {
      name,
      street_address,
      city,
      state,
      zip_code
    }: Venue = req.body;

    if (!name || !street_address || !city || !state || !zip_code) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, street_address, city, state, zip_code' 
      });
    }

    const query = `
      INSERT INTO venues (name, street_address, city, state, zip_code, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const values = [name, street_address, city, state, zip_code];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating venue:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        error: 'A venue with this name and address already exists' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create venue' });
  }
});

// Update venue
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const query = `
      UPDATE venues 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, ...Object.values(updates)];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating venue:', error);
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

// Soft delete venue (set is_active to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE venues 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json({ message: 'Venue deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating venue:', error);
    res.status(500).json({ error: 'Failed to deactivate venue' });
  }
});

module.exports = router;