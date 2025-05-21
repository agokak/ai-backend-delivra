import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import template from './template';
import reports from './reports';
import { serve } from '@hono/node-server';
import 'dotenv/config';

const app = new Hono()

app.get('/', (c) => c.text('AI Service Running!'));

app.use('/api/*', cors({
    origin: '*',
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Expected-Listname'],
}));

app.route('/api/template', template);
app.route('/api/reports', reports);

serve({
  fetch: app.fetch,
  port: 1807
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})