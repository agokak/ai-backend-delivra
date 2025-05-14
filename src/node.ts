import { serve } from '@hono/node-server';
import index from './index';
import 'dotenv/config';

serve(index);