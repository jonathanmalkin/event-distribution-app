const axios = require('axios');
require('dotenv').config();

const baseURL = process.env.WORDPRESS_SITE_URL;
const username = process.env.WORDPRESS_USERNAME;
const password = process.env.WORDPRESS_PASSWORD;

if (!baseURL || !username || !password) {
  console.error('WordPress credentials not configured');
  process.exit(1);
}

const credentials = Buffer.from(`${username}:${password}`).toString('base64');

async function debugWordPressAPI() {
  try {
    console.log('Testing WordPress API at:', baseURL);
    
    const response = await axios.get(`${baseURL}/wp-json/tribe/events/v1/events`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 1,
        status: 'publish,draft'
      },
      timeout: 30000
    });

    console.log('\n=== FIRST EVENT STRUCTURE ===');
    console.log(JSON.stringify(response.data.events[0], null, 2));

    // Also try regular WordPress posts endpoint
    try {
      const postsResponse = await axios.get(`${baseURL}/wp-json/wp/v2/tribe_events`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        params: {
          per_page: 1,
        },
        timeout: 30000
      });

      console.log('\n=== REGULAR WP POST STRUCTURE ===');
      console.log(JSON.stringify(postsResponse.data[0], null, 2));
    } catch (postError) {
      console.log('\nRegular WP posts endpoint failed:', postError.message);
    }

  } catch (error) {
    console.error('Error fetching WordPress events:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

debugWordPressAPI();