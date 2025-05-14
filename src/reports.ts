import { Hono } from 'hono'
import { CoreMessage, generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono()

//From ReportSummaryDataBusinessLogic.GetColumnMap
const campaignFields = ["Account","Status","Type","TypeCombineAPI","Created","Segment","From","Title","Subject","Active","Active%","Attempted","Attempted%","Remaining","Remaining%","Completed","CompletedRecips","Completed%","Total","Received","Success","Success%","Paused","Opens (Unique)","Opens (Total)","Open%","Click-To-Open Rate (CTOR)%","Opens, Mobile (Unique)","Opens, Mobile (Total)","Opens, Mobile %","Opens, Desktop (Unique)","Opens, Desktop (Total)","Opens, Desktop %","Opens, Web (Unique)","Opens, Web (Total)","Opens, Web %","Opens, Unknown (Unique)","Opens, Unknown (Total)","Opens, Unknown %","Clicks (Unique)","Clicks (Total)","Click%","ClickStreams (Unique)","ClickStreams (Total)","ClickStream%","Complaints","Complaint%","Unsubscribes","Unsubscribe%","Soft Bounce","Hard Bounce","Bounce%","Engagement","Forwards","Impressions","Purchases (Clickstream)","Revenue (Clickstream)","Purchases (Commerce)","Revenue (Commerce)","Sessions (Commerce)","Conversion Rate% (Commerce)","Shares"];

const chatRequestSchema = z.object({
    messages: z.array(
        z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
        })
    ),
});

const aiDescribeSchema = z.object({
    chatResponse: z.string().describe("The conversational response to the user's message."),
    reportType: z.enum(['campaigns', 'contacts'])
});

const aiCampaignResponseSchema = z.object({
    chatResponse: z.string().describe("The conversational response to the user's message."),
    xAxis: z.string().describe("string (Either 'over time' or a field from the list of available fields, to use as the x axis of the report)"),
    yAxis: z.string().describe("string (The field from the list of available fields to use as the y axis of the report)"),
    timeframe: z.string().describe("string (The length of time to run the report.  90 days should be the default if the user hasn't specified)")
});

app.post('/describe', zValidator('json', chatRequestSchema), async (c) => {
    const { messages } = c.req.valid('json');

    const systemPrompt: CoreMessage = {
        role: 'system',
        content: `You are an expert AI assistant specialized in helping users generate reports related to their email sending
Analyze the user's request and determine what type of report they're trying to generate
Respond with a JSON object matching the following schema:
{
  "chatResponse": "string (Your conversational response to the user.  Be as brief as possible.)",
  "reportType": "string (Either 'campaigns' if the request appears to be related to campaigns or 'contacts' if the request appears to be related to contacts)"
}`
    };

    const allMessages: CoreMessage[] = [systemPrompt, ...messages];

    try {
        const result = await generateObject({
            model: openai('gpt-4o-mini'),
            messages: allMessages,
            schema: aiDescribeSchema,
            temperature: 0.7,
        });

        return c.json(result);
    } catch (error) {
        console.error("Error calling AI:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: 'Failed to get response from AI' }, 500);
    }
});

app.post('/campaigns', zValidator('json', chatRequestSchema), async (c) => {
    const { messages } = c.req.valid('json');

    const systemPrompt: CoreMessage = {
        role: 'system',
        content: `You are an expert AI assistant specialized in helping users generate reports related to their email sending
Here are the available fields in JSON format:
\`\`\`fields
${JSON.stringify(campaignFields)}
\`\`\`
Analyze the user's request based on this HTML context.
Respond with a JSON object matching the following schema:
{
  "chatResponse": "string (Your conversational response to the user)",
  "xAxis": "string (Either 'over time' or a field from the list of available fields, to use as the x axis of the report)",
  "yAxis": "string (The field from the list of available fields to use as the y axis of the report)",
  "timeframe": "string (The length of time to run the report.  90 days should be the default if the user hasn't specified)"
}`
    };

    const allMessages: CoreMessage[] = [systemPrompt, ...messages];

    try {
        const result = await generateObject({
            model: openai('gpt-4o-mini'),
            messages: allMessages,
            schema: aiCampaignResponseSchema,
            temperature: 0.7,
        });

        return c.json(result);
    } catch (error) {
        console.error("Error calling AI:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: 'Failed to get response from AI' }, 500);
    }
});

export default app;