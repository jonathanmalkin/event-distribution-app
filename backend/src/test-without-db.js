// Test script that doesn't require database
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testWithoutDatabase() {
  console.log('🧪 Testing API without database...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    
    // Test 2: Check if server responds to venues endpoint (even if DB fails)
    console.log('\n2. Testing venues endpoint response...');
    const venuesResponse = await fetch(`${BASE_URL}/api/venues`);
    console.log(`   Status: ${venuesResponse.status}`);
    
    if (venuesResponse.status === 500) {
      const errorData = await venuesResponse.json();
      console.log('⚠️  Expected database error:', errorData.error);
    } else if (venuesResponse.ok) {
      const venues = await venuesResponse.json();
      console.log(`✅ Venues endpoint working, found ${venues.length} venues`);
    }

    // Test 3: Test AI endpoints configuration
    console.log('\n3. Testing AI prompts configuration...');
    const fs = require('fs');
    const path = require('path');
    
    const configPath = path.join(__dirname, 'config', 'ai-prompts.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ AI prompts config loaded');
      console.log(`   Theme generation prompt: ${config.themeGeneration ? 'Found' : 'Missing'}`);
      console.log(`   Image generation prompt: ${config.imageGeneration ? 'Found' : 'Missing'}`);
    } else {
      console.log('❌ AI prompts config not found');
    }

    console.log('\n4. Testing server structure...');
    
    // Check if OpenAI key is configured (don't log the actual key)
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log(`   OpenAI API Key: ${openaiKey && openaiKey !== 'your_openai_api_key_here' ? 'Configured' : 'Not configured'}`);
    
    // Check if all route files exist
    const routeFiles = ['events.ts', 'venues.ts', 'ai.ts', 'distribution.ts', 'rsvp.ts'];
    const routesPath = path.join(__dirname, 'routes');
    
    for (const file of routeFiles) {
      const filePath = path.join(routesPath, file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file} route file exists`);
      } else {
        console.log(`   ❌ ${file} route file missing`);
      }
    }

    console.log('\n🎉 Server structure test completed!');
    console.log('\n💡 To test full functionality:');
    console.log('   1. Set up PostgreSQL database');
    console.log('   2. Run the database initialization script');
    console.log('   3. Configure OpenAI API key in .env file');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3001');
  }
}

testWithoutDatabase();