import express from 'express';
import pool from '../config/database';

const router = express.Router();

// Submit RSVP
router.post('/', async (req, res) => {
  try {
    const { event_id, email, name, phone, newsletter_signup } = req.body;

    if (!event_id || !email || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: event_id, email, name' 
      });
    }

    // Check if event exists
    const eventQuery = 'SELECT * FROM events WHERE id = $1';
    const eventResult = await pool.query(eventQuery, [event_id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Insert RSVP (will fail if duplicate email for same event due to unique constraint)
    const insertQuery = `
      INSERT INTO event_rsvps (event_id, email, name, phone, newsletter_signup, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const rsvpResult = await pool.query(insertQuery, [
      event_id, 
      email.toLowerCase(), 
      name, 
      phone || null, 
      newsletter_signup || false
    ]);

    const rsvp = rsvpResult.rows[0];

    // TODO: Send location reveal email
    await sendLocationRevealEmail(rsvp, event);

    // TODO: Add to newsletter if requested
    if (newsletter_signup) {
      await addToNewsletter(email, name, event);
    }

    res.status(201).json({
      message: 'RSVP confirmed! Location details have been sent to your email.',
      rsvp_id: rsvp.id
    });

  } catch (error) {
    console.error('Error processing RSVP:', error);
    
    // Handle duplicate RSVP
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        error: 'You have already RSVP\'d for this event' 
      });
    }
    
    res.status(500).json({ error: 'Failed to process RSVP' });
  }
});

// Get RSVPs for an event (admin only - would need auth)
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const query = `
      SELECT id, email, name, phone, newsletter_signup, location_revealed, created_at
      FROM event_rsvps
      WHERE event_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [eventId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

// Simulate sending location reveal email
async function sendLocationRevealEmail(rsvp: any, event: any): Promise<void> {
  console.log(`Sending location reveal email to ${rsvp.email} for event: ${event.theme}`);
  console.log(`Location: ${event.specific_location}`);
  
  // TODO: Implement actual email sending
  // This would integrate with an email service like SendGrid, Mailgun, etc.
  
  // Mark location as revealed
  const updateQuery = `
    UPDATE event_rsvps 
    SET location_revealed = true 
    WHERE id = $1
  `;
  
  await pool.query(updateQuery, [rsvp.id]);
}

// Simulate newsletter signup
async function addToNewsletter(email: string, name: string, event: any): Promise<void> {
  console.log(`Adding ${email} (${name}) to newsletter for event: ${event.theme}`);
  
  // TODO: Integrate with Mailchimp or other newsletter service
  // This would add the subscriber to your mailing list
}

module.exports = router;