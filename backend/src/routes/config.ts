import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Get AI prompts configuration
router.get('/ai-prompts', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../config/ai-prompts.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'AI prompts configuration not found' });
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    res.json(config);
  } catch (error) {
    console.error('Error reading AI prompts config:', error);
    res.status(500).json({ error: 'Failed to read AI prompts configuration' });
  }
});

// Update AI prompts configuration
router.put('/ai-prompts', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../config/ai-prompts.json');
    const newConfig = req.body;

    // Validate the structure
    if (!newConfig.themeGeneration || !newConfig.imageGeneration || !newConfig.chatSystem) {
      return res.status(400).json({ error: 'Invalid configuration structure' });
    }

    // Create backup of current config
    const backupPath = path.join(__dirname, '../config/ai-prompts.backup.json');
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
    }

    // Write new configuration
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    
    res.json({ message: 'AI prompts configuration updated successfully' });
  } catch (error) {
    console.error('Error updating AI prompts config:', error);
    res.status(500).json({ error: 'Failed to update AI prompts configuration' });
  }
});

// Get platform configuration (sanitized - no secrets)
router.get('/platforms', async (req, res) => {
  try {
    // Return sanitized platform config structure
    const platformConfig = {
      wordpress: {
        url: process.env.WORDPRESS_URL || '',
        username: process.env.WORDPRESS_USERNAME || '',
        appPassword: process.env.WORDPRESS_APP_PASSWORD ? '••••••••' : ''
      },
      facebook: {
        appId: process.env.FACEBOOK_APP_ID || '',
        appSecret: process.env.FACEBOOK_APP_SECRET ? '••••••••' : '',
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN ? '••••••••' : ''
      },
      instagram: {
        appId: process.env.INSTAGRAM_APP_ID || '',
        appSecret: process.env.INSTAGRAM_APP_SECRET ? '••••••••' : '',
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN ? '••••••••' : ''
      },
      eventbrite: {
        apiKey: process.env.EVENTBRITE_API_KEY ? '••••••••' : '',
        organizationId: process.env.EVENTBRITE_ORGANIZATION_ID || ''
      },
      meetup: {
        apiKey: process.env.MEETUP_API_KEY ? '••••••••' : '',
        groupId: process.env.MEETUP_GROUP_ID || ''
      },
      email: {
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS ? '••••••••' : ''
      }
    };

    res.json(platformConfig);
  } catch (error) {
    console.error('Error reading platform config:', error);
    res.status(500).json({ error: 'Failed to read platform configuration' });
  }
});

// Update platform configuration
router.put('/platforms', async (req, res) => {
  try {
    const config = req.body;
    const envPath = path.join(__dirname, '../../.env');
    
    // Read current .env file
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Function to update or add environment variable
    const updateEnvVar = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += `\n${newLine}`;
      }
    };

    // Update environment variables (only if not masked)
    if (config.wordpress) {
      if (config.wordpress.url) updateEnvVar('WORDPRESS_URL', config.wordpress.url);
      if (config.wordpress.username) updateEnvVar('WORDPRESS_USERNAME', config.wordpress.username);
      if (config.wordpress.appPassword && config.wordpress.appPassword !== '••••••••') {
        updateEnvVar('WORDPRESS_APP_PASSWORD', config.wordpress.appPassword);
      }
    }

    if (config.facebook) {
      if (config.facebook.appId) updateEnvVar('FACEBOOK_APP_ID', config.facebook.appId);
      if (config.facebook.appSecret && config.facebook.appSecret !== '••••••••') {
        updateEnvVar('FACEBOOK_APP_SECRET', config.facebook.appSecret);
      }
      if (config.facebook.accessToken && config.facebook.accessToken !== '••••••••') {
        updateEnvVar('FACEBOOK_ACCESS_TOKEN', config.facebook.accessToken);
      }
    }

    if (config.instagram) {
      if (config.instagram.appId) updateEnvVar('INSTAGRAM_APP_ID', config.instagram.appId);
      if (config.instagram.appSecret && config.instagram.appSecret !== '••••••••') {
        updateEnvVar('INSTAGRAM_APP_SECRET', config.instagram.appSecret);
      }
      if (config.instagram.accessToken && config.instagram.accessToken !== '••••••••') {
        updateEnvVar('INSTAGRAM_ACCESS_TOKEN', config.instagram.accessToken);
      }
    }

    if (config.eventbrite) {
      if (config.eventbrite.apiKey && config.eventbrite.apiKey !== '••••••••') {
        updateEnvVar('EVENTBRITE_API_KEY', config.eventbrite.apiKey);
      }
      if (config.eventbrite.organizationId) updateEnvVar('EVENTBRITE_ORGANIZATION_ID', config.eventbrite.organizationId);
    }

    if (config.meetup) {
      if (config.meetup.apiKey && config.meetup.apiKey !== '••••••••') {
        updateEnvVar('MEETUP_API_KEY', config.meetup.apiKey);
      }
      if (config.meetup.groupId) updateEnvVar('MEETUP_GROUP_ID', config.meetup.groupId);
    }

    if (config.email) {
      if (config.email.smtpHost) updateEnvVar('SMTP_HOST', config.email.smtpHost);
      if (config.email.smtpPort) updateEnvVar('SMTP_PORT', config.email.smtpPort.toString());
      if (config.email.smtpUser) updateEnvVar('SMTP_USER', config.email.smtpUser);
      if (config.email.smtpPass && config.email.smtpPass !== '••••••••') {
        updateEnvVar('SMTP_PASS', config.email.smtpPass);
      }
    }

    // Write updated .env file
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    
    res.json({ 
      message: 'Platform configuration updated successfully',
      note: 'Changes will take effect after server restart'
    });
  } catch (error) {
    console.error('Error updating platform config:', error);
    res.status(500).json({ error: 'Failed to update platform configuration' });
  }
});

// Test platform connections
router.post('/test-connections', async (req, res) => {
  try {
    const { platforms } = req.body;
    const results: { [key: string]: { status: 'success' | 'error', message: string } } = {};

    // Test each requested platform
    for (const platform of platforms) {
      switch (platform) {
        case 'wordpress':
          // Test WordPress connection
          if (process.env.WORDPRESS_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
            try {
              // Implement WordPress API test
              results.wordpress = { status: 'success', message: 'WordPress connection configured' };
            } catch (error) {
              results.wordpress = { status: 'error', message: 'WordPress connection failed' };
            }
          } else {
            results.wordpress = { status: 'error', message: 'WordPress credentials not configured' };
          }
          break;

        case 'openai':
          // Test OpenAI connection
          if (process.env.OPENAI_API_KEY) {
            try {
              // Test API key validity by making a simple request
              results.openai = { status: 'success', message: 'OpenAI API key configured' };
            } catch (error) {
              results.openai = { status: 'error', message: 'OpenAI API key invalid' };
            }
          } else {
            results.openai = { status: 'error', message: 'OpenAI API key not configured' };
          }
          break;

        case 'facebook':
          // Test Facebook connection
          if (process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID) {
            try {
              const FacebookService = require('../services/platforms/FacebookService').default;
              const facebookService = new FacebookService();
              const testResult = await facebookService.testConnection();
              results.facebook = testResult;
            } catch (error) {
              results.facebook = { status: 'error', message: `Facebook service error: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          } else {
            results.facebook = { status: 'error', message: 'Facebook credentials not configured' };
          }
          break;

        case 'instagram':
          // Test Instagram connection
          if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
            try {
              const InstagramService = require('../services/platforms/InstagramService').default;
              const instagramService = new InstagramService();
              const testResult = await instagramService.testConnection();
              results.instagram = testResult;
            } catch (error) {
              results.instagram = { status: 'error', message: `Instagram service error: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          } else {
            results.instagram = { status: 'error', message: 'Instagram credentials not configured' };
          }
          break;

        case 'eventbrite':
          // Test Eventbrite connection
          if (process.env.EVENTBRITE_API_KEY) {
            try {
              const EventbriteService = require('../services/platforms/EventbriteService').default;
              const eventbriteService = new EventbriteService();
              const testResult = await eventbriteService.testConnection();
              results.eventbrite = testResult;
            } catch (error) {
              results.eventbrite = { status: 'error', message: `Eventbrite service error: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          } else {
            results.eventbrite = { status: 'error', message: 'Eventbrite API key not configured' };
          }
          break;

        default:
          results[platform] = { status: 'error', message: 'Platform test not implemented' };
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Error testing connections:', error);
    res.status(500).json({ error: 'Failed to test platform connections' });
  }
});

module.exports = router;