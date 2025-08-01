import express from 'express';
import OpenAI from 'openai';
import pool from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Load AI prompts configuration
function loadAIPrompts() {
  try {
    const configPath = path.join(__dirname, '../config/ai-prompts.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading AI prompts config:', error);
    return null;
  }
}

// Generate multiple themes for event
router.post('/generate-themes', async (req, res) => {
  try {
    const { date_time, venue_id, manual_override, feedback } = req.body;

    if (!date_time) {
      return res.status(400).json({ error: 'date_time is required' });
    }

    if (manual_override) {
      return res.json({ 
        themes: [{
          name: manual_override,
          description: `Join us for ${manual_override} - a themed Kinky Coffee event!`
        }],
        source: 'manual'
      });
    }

    const prompts = loadAIPrompts();
    if (!prompts) {
      throw new Error('Failed to load AI prompts configuration');
    }

    // Get venue information for location context
    let location = 'the local area';
    if (venue_id) {
      try {
        const venueQuery = 'SELECT city, state FROM venues WHERE id = $1';
        const venueResult = await pool.query(venueQuery, [venue_id]);
        if (venueResult.rows.length > 0) {
          const venue = venueResult.rows[0];
          location = `${venue.city}, ${venue.state}`;
        }
      } catch (venueError) {
        console.error('Error fetching venue for AI prompt:', venueError);
      }
    }

    const eventDate = new Date(date_time);
    
    // Choose prompt template based on whether this is a regeneration
    const promptTemplate = feedback ? 
      prompts.themeGeneration.regeneratePromptTemplate : 
      prompts.themeGeneration.userPromptTemplate;
    
    let userPrompt = promptTemplate
      .replace('{date}', eventDate.toDateString())
      .replace('{location}', location);
    
    if (feedback) {
      userPrompt = userPrompt.replace('{feedback}', feedback);
    }

    const completion = await openai.chat.completions.create({
      model: prompts.themeGeneration.model || "gpt-4o",
      messages: [
        { role: "system", content: prompts.themeGeneration.systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.8
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      throw new Error('No themes generated');
    }

    // Parse JSON response, handling markdown code blocks
    let themes;
    try {
      // Remove markdown code block formatting if present
      let cleanJson = responseText;
      if (responseText.startsWith('```json') && responseText.endsWith('```')) {
        cleanJson = responseText.slice(7, -3).trim();
      } else if (responseText.startsWith('```') && responseText.endsWith('```')) {
        cleanJson = responseText.slice(3, -3).trim();
      }
      
      themes = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse themes JSON:', responseText);
      throw new Error('Failed to parse generated themes');
    }

    if (!Array.isArray(themes) || themes.length === 0) {
      throw new Error('Invalid themes format received');
    }

    res.json({
      themes,
      source: 'ai'
    });

  } catch (error) {
    console.error('Error generating themes:', error);
    res.status(500).json({ error: 'Failed to generate themes' });
  }
});

// Generate banner image
router.post('/generate-image', async (req, res) => {
  try {
    const { theme, description, date_time } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'theme is required' });
    }

    const prompts = loadAIPrompts();
    if (!prompts) {
      throw new Error('Failed to load AI prompts configuration');
    }

    // Use configurable prompt template
    let prompt = prompts.imageGeneration.promptTemplate
      .replace('{theme}', theme)
      .replace('{description}', description || 'A themed community coffee meetup');

    const response = await openai.images.generate({
      model: prompts.imageGeneration.model || "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard"
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    res.json({
      image_url: imageUrl,
      prompt_used: prompt
    });

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Chat with AI for theme refinement
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const prompts = loadAIPrompts();
    if (!prompts) {
      throw new Error('Failed to load AI prompts configuration');
    }

    const contextInfo = context ? `\n\nCurrent context: ${JSON.stringify(context)}` : '';
    const systemPrompt = prompts.chatSystem.systemPrompt + contextInfo;

    const completion = await openai.chat.completions.create({
      model: prompts.chatSystem.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content;

    res.json({
      response,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

module.exports = router;