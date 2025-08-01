// Simple test script to verify API endpoints work
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    
    // Test 2: Get venues
    console.log('\n2. Testing venues endpoint...');
    const venuesResponse = await fetch(`${BASE_URL}/venues`);
    const venues = await venuesResponse.json();
    console.log(`✅ Found ${venues.length} venues`);
    if (venues.length > 0) {
      console.log(`   First venue: ${venues[0].name} in ${venues[0].city}, ${venues[0].state}`);
    }

    // Test 3: Create a test venue
    console.log('\n3. Testing venue creation...');
    const newVenue = {
      name: 'Test Coffee Shop',
      street_address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zip_code: '12345'
    };
    
    const createVenueResponse = await fetch(`${BASE_URL}/venues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVenue)
    });
    
    if (createVenueResponse.ok) {
      const createdVenue = await createVenueResponse.json();
      console.log('✅ Venue created successfully:', createdVenue.name);
      
      // Test 4: Create a test event
      console.log('\n4. Testing event creation...');
      const newEvent = {
        date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        venue_id: createdVenue.id,
        theme: 'Test Theme',
        description: 'Test event description',
        status: 'draft'
      };
      
      const createEventResponse = await fetch(`${BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      
      if (createEventResponse.ok) {
        const createdEvent = await createEventResponse.json();
        console.log('✅ Event created successfully:', createdEvent.theme);
        
        // Test 5: Get all events
        console.log('\n5. Testing events retrieval...');
        const eventsResponse = await fetch(`${BASE_URL}/events`);
        const events = await eventsResponse.json();
        console.log(`✅ Found ${events.length} events`);
        
        // Find our test event
        const testEvent = events.find(e => e.id === createdEvent.id);
        if (testEvent && testEvent.venue) {
          console.log(`   Test event venue: ${testEvent.venue.name} in ${testEvent.venue.city}, ${testEvent.venue.state}`);
        }
      } else {
        const eventError = await createEventResponse.text();
        console.log('❌ Event creation failed:', eventError);
      }
    } else {
      const venueError = await createVenueResponse.text();
      console.log('❌ Venue creation failed:', venueError);
    }

    console.log('\n🎉 API endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3001');
  }
}

testEndpoints();