import { Hono } from 'hono'
import { streamText as honoStream, stream } from 'hono/streaming';
import { handle } from 'hono/vercel';
import { CoreMessage, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import template from './template';

const app = new Hono<{ Bindings: { SERVER_API_KEY: string } }>();

app.get('/', (c) => c.text('AI Service Running!'));

// Middleware for API key authentication
app.use('/api/*', async (c, next) => {
    const apiKey = c.req.header('X-API-KEY');
    // Make sure to set SERVER_API_KEY in your Vercel environment variables
    const expectedApiKey = c.env.SERVER_API_KEY;

    if (!expectedApiKey) {
        console.error('SERVER_API_KEY is not set in the environment.');
        return c.json({ error: 'API configuration error' }, 500);
    }

    if (apiKey && apiKey === expectedApiKey) {
        await next();
    } else {
        return c.json({ error: 'Unauthorized: Invalid or missing API key' }, 401);
    }
});

app.use('/api/*', cors({
    origin: '*', // You might want to restrict this in production
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'], // Added X-API-KEY
}));

app.route('/api/template', template);

export default {
  port: 1807,
  fetch: app.fetch,
}
