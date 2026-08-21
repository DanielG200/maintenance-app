const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Image upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
});

const supabase = require('./supabase');

app.get('/api/db-test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: 'Supabase connection works',
      data,
    });
  } catch (error) {
    console.error('Database test error:', error);

    res.status(500).json({
      success: false,
      error: 'Database connection failed',
    });
  }
});

// ============================================
// ITEMS API
// ============================================

app.get('/api/items', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error('Get items error:', error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      items: data,
    });
  } catch (error) {
    console.error('Items API error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to load items',
    });
  }
});

// Create a new item
app.post('/api/items', async (req, res) => {
  try {
    const {
      user_id,
      name,
      category,
      brand,
      model,
      year,
      image_url,
      last_maintenance,
    } = req.body;

    if (!user_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'user_id and name are required',
      });
    }

    const { data, error } = await supabase
      .from('items')
      .insert([
        {
          user_id,
          name,
          category: category || null,
          brand: brand || null,
          model: model || null,
          year: year || null,
          image_url: image_url || null,
          last_maintenance:
            last_maintenance || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Create item error:', error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.status(201).json({
      success: true,
      item: data,
    });
  } catch (error) {
    console.error('Items POST error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to create item',
    });
  }
});

// ============================================
// ITEM IMAGE UPLOAD
// ============================================

app.post('/api/items/upload-image', async (req, res) => {
  try {
    const { base64, mimeType, fileName } = req.body;

    if (!base64) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
      });
    }

    const buffer = Buffer.from(base64, 'base64');

    const extension =
      fileName?.split('.').pop() || 'jpg';

    const storagePath =
      `items/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from('item-images')
        .upload(
          storagePath,
          buffer,
          {
            contentType: mimeType || 'image/jpeg',
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        'Supabase image upload error:',
        uploadError
      );

      return res.status(500).json({
        success: false,
        error: uploadError.message,
      });
    }

    const { data } =
      supabase.storage
        .from('item-images')
        .getPublicUrl(storagePath);

    console.log(
      'Image uploaded:',
      data.publicUrl
    );

    res.json({
      success: true,
      imageUrl: data.publicUrl,
    });

  } catch (error) {
    console.error(
      'Image upload error:',
      error
    );

    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
});

// OpenAI configuration
// KEPT FOR LATER — NOT CURRENTLY BEING USED
/*
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
*/

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'Maintenance App API is running',
  });
});

// Backend connection test
app.get('/api/test', (req, res) => {
  console.log('TEST REQUEST RECEIVED');

  res.json({
    success: true,
    message: 'Backend connection works',
  });
});

// AI item identification
app.post(
  '/api/identify-item',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image provided',
        });
      }

      console.log(
        'Received image:',
        req.file.originalname
      );

      console.log(
        'Image size:',
        req.file.size
      );

      console.log(
        'Image type:',
        req.file.mimetype
      );

      // =====================================================
      // OPENAI CODE — DISABLED FOR NOW
      // =====================================================

      /*
      const base64Image =
        req.file.buffer.toString('base64');

      const mimeType =
        req.file.mimetype || 'image/jpeg';

      const response = await openai.responses.create({
        model: 'gpt-5-mini',

        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `
Identify the main physical item in this image.

Return ONLY valid JSON in this exact format:

{
  "name": "item name",
  "category": "item category",
  "maintenance": [
    {
      "name": "maintenance task",
      "interval": 6,
      "unit": "months",
      "estimatedCost": "$50-$100"
    }
  ]
}

Rules:

- Identify the item as accurately as possible.
- Do not invent a specific brand or model unless the image provides enough evidence.
- Include 3-5 useful maintenance tasks.
- Use units of "days", "weeks", "months", or "years".
- Estimated costs should be reasonable ranges.
- Return JSON only.
                `,
              },
              {
                type: 'input_image',
                image_url:
                  `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
      });

      const text = response.output_text;

      console.log('AI response:', text);

      const result = JSON.parse(text);

      return res.json({
        success: true,
        item: {
          name: result.name,
          category: result.category,
        },
        maintenance: result.maintenance,
      });
      */

      // =====================================================
      // MOCK AI RESPONSE — CURRENTLY ACTIVE
      // =====================================================

      console.log(
        'Using mock AI identification'
      );

      const result = {
        name: 'Toyota Corolla',
        category: 'Vehicle',

        maintenance: [
          {
            name: 'Oil Change',
            interval: 6,
            unit: 'months',
            estimatedCost: '$50-$100',
          },
          {
            name: 'Tire Rotation',
            interval: 6,
            unit: 'months',
            estimatedCost: '$20-$40',
          },
          {
            name: 'Brake Inspection',
            interval: 12,
            unit: 'months',
            estimatedCost: '$50-$100',
          },
          {
            name: 'Air Filter Replacement',
            interval: 12,
            unit: 'months',
            estimatedCost: '$20-$40',
          },
        ],
      };

      console.log(
        'Mock identification:',
        result.name
      );

      res.json({
        success: true,

        item: {
          name: result.name,
          category: result.category,
        },

        maintenance: result.maintenance,
      });
    } catch (error) {
      console.error(
        'Identify item error:',
        error
      );

      res.status(500).json({
        success: false,
        error: 'Failed to identify item',
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(
    `Maintenance API running on http://localhost:${PORT}`
  );
});