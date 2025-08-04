-- Fix database constraint to allow 'published' status
ALTER TABLE event_distributions 
DROP CONSTRAINT IF EXISTS event_distributions_status_check;

ALTER TABLE event_distributions 
ADD CONSTRAINT event_distributions_status_check 
CHECK (status IN ('pending', 'published', 'success', 'failed', 'cancelled'));