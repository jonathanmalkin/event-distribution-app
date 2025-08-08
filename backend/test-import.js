#!/usr/bin/env node

// Test script for WordPress venue and organizer import functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testImportWorkflow() {
  console.log('🚀 Starting WordPress Import Test Workflow\n');
  
  try {
    // Step 1: Test server health
    console.log('1. Testing server connection...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Server is running:', healthResponse.data);
    
    // Step 2: Import WordPress venues
    console.log('\n2. Importing WordPress venues...');
    try {
      const venuesResponse = await axios.post(`${BASE_URL}/import/wordpress/venues`, {
        dryRun: false
      });
      console.log('✅ Venues imported successfully:', venuesResponse.data);
    } catch (error) {
      console.log('⚠️  Venue import result:', error.response?.data || error.message);
    }
    
    // Step 3: Import default organizer
    console.log('\n3. Importing default organizer...');
    try {
      const organizerResponse = await axios.post(`${BASE_URL}/import/wordpress/organizer`);
      console.log('✅ Default organizer imported:', organizerResponse.data);
    } catch (error) {
      console.log('⚠️  Organizer import result:', error.response?.data || error.message);
    }
    
    // Step 4: Check default organizer
    console.log('\n4. Checking default organizer...');
    try {
      const defaultOrganizerResponse = await axios.get(`${BASE_URL}/import/organizers/default`);
      console.log('✅ Default organizer status:', defaultOrganizerResponse.data);
    } catch (error) {
      console.log('❌ Failed to get default organizer:', error.response?.data || error.message);
    }
    
    // Step 5: Apply default organizer to existing events
    console.log('\n5. Applying default organizer to events...');
    try {
      const applyResponse = await axios.post(`${BASE_URL}/import/wordpress/organizer/apply`);
      console.log('✅ Default organizer applied to events:', applyResponse.data);
    } catch (error) {
      console.log('⚠️  Apply organizer result:', error.response?.data || error.message);
    }
    
    // Step 6: List all organizers
    console.log('\n6. Listing all organizers...');
    try {
      const organizersResponse = await axios.get(`${BASE_URL}/import/organizers`);
      console.log('✅ All organizers:', organizersResponse.data);
    } catch (error) {
      console.log('❌ Failed to get organizers:', error.response?.data || error.message);
    }
    
    // Step 7: Test WordPress event import (if available)
    console.log('\n7. Testing WordPress event import...');
    try {
      const eventsImportResponse = await axios.post(`${BASE_URL}/import/wordpress/events`, {
        dryRun: false,
        includeImages: false,
        conflictStrategy: 'wordpress',
        statusFilter: ['publish']
      });
      console.log('✅ Events import completed:', eventsImportResponse.data);
    } catch (error) {
      console.log('⚠️  Events import result:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 WordPress Import Test Workflow Complete!');
    
  } catch (error) {
    console.error('❌ Test workflow failed:', error.message);
    if (error.response?.data) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Run the test
testImportWorkflow().catch(console.error);