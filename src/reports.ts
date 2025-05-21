import { openai } from '@ai-sdk/openai';
import { zValidator } from '@hono/zod-validator';
import { CoreMessage, generateObject } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

const app = new Hono()

//From ReportSummaryDataBusinessLogic.GetColumnMap
const campaignFields = ["Account", "Status", "Type", "TypeCombineAPI", "Created", "Segment", "From", "Title", "Subject", "Active", "Active%", "Attempted", "Attempted%", "Remaining", "Remaining%", "Completed", "CompletedRecips", "Completed%", "Total", "Received", "Success", "Success%", "Paused", "Opens (Unique)", "Opens (Total)", "Open%", "Click-To-Open Rate (CTOR)%", "Opens, Mobile (Unique)", "Opens, Mobile (Total)", "Opens, Mobile %", "Opens, Desktop (Unique)", "Opens, Desktop (Total)", "Opens, Desktop %", "Opens, Web (Unique)", "Opens, Web (Total)", "Opens, Web %", "Opens, Unknown (Unique)", "Opens, Unknown (Total)", "Opens, Unknown %", "Clicks (Unique)", "Clicks (Total)", "Click%", "ClickStreams (Unique)", "ClickStreams (Total)", "ClickStream%", "Complaints", "Complaint%", "Unsubscribes", "Unsubscribe%", "Soft Bounce", "Hard Bounce", "Bounce%", "Engagement", "Forwards", "Impressions", "Purchases (Clickstream)", "Revenue (Clickstream)", "Purchases (Commerce)", "Revenue (Commerce)", "Sessions (Commerce)", "Conversion Rate% (Commerce)", "Shares"];

const messagesSchema  = z.array(
    z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
    })
);

const chatRequestSchema = z.object({
    messages: messagesSchema,
});

const contactChatRequestSchema = z.object({
    contactFields: z.array(z.string()),
    messages: messagesSchema
})

const aiDescribeSchema = z.object({
    chatResponse: z.string().describe("The conversational response to the user's message."),
    reportType: z.enum(['campaigns', 'contacts']),
    displayType: z.enum(['graph', 'grid'])
});

const filterConditionSchema = z.record(
    z.union([
        z.literal("$gt"),
        z.literal("$gte"),
        z.literal("$lt"),
        z.literal("$lte"),
        z.literal("$eq")
    ]),
    z.union([z.string(), z.number()])
);

const filterSchema = z.array(
    z.record(z.string(), filterConditionSchema)
);

const aiCampaignResponseSchema = z.object({
    chatResponse: z.string().describe("The conversational response to the user's message."),
    xAxis: z.string().describe("string (Either 'over time' or a field from the list of available fields, to use as the x axis of the report)"),
    yAxis: z.string().describe("string (The field from the list of available fields to use as the y axis of the report)"),
    startDate: z.string().optional().describe("string, optional (The start date of the requested time period in ISO 8601 format)"),
    endDate: z.string().optional().describe("string, optional (The date of the requested time period in ISO 8601 format)"),
    filter: filterSchema.optional()
});

const aiCampaignGridResponseSchema = z.object({
    chatResponse: z.string().describe("The conversational response to the user's message."),
    fields: z.array(z.string()).describe("An array of fields from the list of available fields that will be helpful for the user to visualize their results.  You should also include fields that seem related to the user's request"),
    startDate: z.string().optional().describe("string, optional (The start date of the requested time period in ISO 8601 format)"),
    endDate: z.string().optional().describe("string, optional (The date of the requested time period in ISO 8601 format)"),
    filter: filterSchema.optional()
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
  "reportType": "string (Either 'campaigns' if the request appears to be related to campaigns or 'contacts' if the request appears to be related to contacts)",
  "displayType": "string (Either 'graph' or 'grid' depending on which would be a more appropriate way to display the results)"
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

        return c.json(result.object);
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
Analyze the user's request based on this context. Today is ${new Date().toISOString()}.
Respond with a JSON object matching the following schema:
{
  "chatResponse": "string (Your conversational response to the user)",
  "xAxis": "string (Either 'over time' or a field from the list of available fields, to use as the x axis of the report)",
  "yAxis": "string (The field from the list of available fields to use as the y axis of the report)",
  "startDate": "string, optional (The start date of the requested time period in ISO 8601 format)",
  "endDate": "string, optional (The date of the requested time period in ISO 8601 format)",
  "filter": An array of filter objects to apply to the output, following the schema {"field": { "operator": "value" }} where "field" is an available field, and operator is one of ("$eq", "$gt", "$gte", "$lt", "$lte"). As an example, to filter only campaigns with more than 10% open rate use: [{
    { "Open%": { "$gt": 10 } }
  }]"
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

        return c.json(result.object);
    } catch (error) {
        console.error("Error calling AI:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: 'Failed to get response from AI' }, 500);
    }
});

app.post('/campaignsgrid', zValidator('json', chatRequestSchema), async (c) => {
    const { messages } = c.req.valid('json');

    const systemPrompt: CoreMessage = {
        role: 'system',
        content: `You are an expert AI assistant specialized in helping users generate reports related to their email sending
Here are the available fields in JSON format:
\`\`\`fields
${JSON.stringify(campaignFields)}
\`\`\`
Analyze the user's request based on this context. Today is ${new Date().toISOString()}.
Respond with a JSON object matching the following schema:
{
  "chatResponse": "string (Your conversational response to the user)",
  "fields": An array of fields from the list of available fields that will be helpful for the user to visualize their results.  You should also include fields that seem related to the user's request,
  "startDate": "string, optional (The start date of the requested time period in ISO 8601 format)",
  "endDate": "string, optional (The date of the requested time period in ISO 8601 format)",
  "filter": An array of filter objects to apply to the output, following the schema {"field": { "operator": "value" }} where "field" is an available field, and operator is one of ("$gt", "$gte", "$lt", "$lte"). As an example, to filter only campaigns with more than 10% open rate use: [{
    { "Open%": { "$gt": 10 } }
  }]"
}`
    };

    const allMessages: CoreMessage[] = [systemPrompt, ...messages];

    try {
        const result = await generateObject({
            model: openai('gpt-4o-mini'),
            messages: allMessages,
            schema: aiCampaignGridResponseSchema,
            temperature: 0.7,
        });

        return c.json(result.object);
    } catch (error) {
        console.error("Error calling AI:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: 'Failed to get response from AI' }, 500);
    }
});

app.post('/contacts', zValidator('json', contactChatRequestSchema), async (c) => {
    const { contactFields, messages } = c.req.valid('json');

    const systemPrompt: CoreMessage = {
        role: 'system',
        content: `You are an expert AI assistant specialized in helping users generate reports related to their email contacts
Here are the available fields in JSON format:
\`\`\`fields
${JSON.stringify(contactFields)}
\`\`\`
Analyze the user's request based on this context. Today is ${new Date().toISOString()}.
Respond with a JSON object matching the following schema:
{
  "chatResponse": "string (Your conversational response to the user)",
  "xAxis": "string (The field from the list of available fields, to use as the x axis of the report)",
  "yAxis": "string (The field from the list of available fields, to use as the y axis of the report)",
  "filter": An array of filter objects to apply to the output, following the schema {"field": { "operator": "value" }} where "field" is an available field, and operator is one of ("$eq", "$gt", "$gte", "$lt", "$lte"). As an example, to filter only contacts at gmail.com: [{
    { "Domain": { "$eq": "gmail.com" } }
  }]"
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

        return c.json(result.object);
    } catch (error) {
        console.error("Error calling AI:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: 'Failed to get response from AI' }, 500);
    }
});

app.post('/contactsgrid', zValidator('json', contactChatRequestSchema), async (c) => {
    const { contactFields, messages } = c.req.valid('json');

    const systemPrompt: CoreMessage = {
        role: 'system',
        content: `You are an expert AI assistant specialized in helping users generate reports related to their email contacts
Here are the available fields in JSON format:
\`\`\`fields
${JSON.stringify(contactFields)}
\`\`\`
Analyze the user's request based on this context. Today is ${new Date().toISOString()}.
Respond with a JSON object matching the following schema:
{
  "chatResponse": "string (Your conversational response to the user)",
  "fields": An array of fields from the list of available fields that will be helpful for the user to visualize their results.  You should also include fields that seem related to the user's request,
  "filter": An array of filter objects to apply to the output, following the schema {"field": { "operator": "value" }} where "field" is an available field, and operator is one of ("$eq", "$gt", "$gte", "$lt", "$lte"). As an example, to filter only contacts at gmail.com: [{
    { "Domain": { "$eq": "gmail.com" } }
  }]"
}`
    };

    const allMessages: CoreMessage[] = [systemPrompt, ...messages];

    try {
        const result = await generateObject({
            model: openai('gpt-4o-mini'),
            messages: allMessages,
            schema: aiCampaignGridResponseSchema,
            temperature: 0.7,
        });

        return c.json(result.object);
    } catch (error) {
        console.error("Error calling AI:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: 'Failed to get response from AI' }, 500);
    }
});

export default app;