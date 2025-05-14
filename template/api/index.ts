import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { CoreMessage, generateObject, streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

export const config = {
  runtime: 'edge'
}

const app = new Hono<{ Bindings: { SERVER_API_KEY: string } }>().basePath('/api')

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

const templateRequestSchema = z.object({
    requestText: z.string().describe("A description of the desired email template."),
    imageDescriptions: z.array(z.string()).optional().describe("Optional descriptions of images to include or inspire the template.")
});

// Updated schema for the AI's response, which will be the generated HTML
const aiGeneratedHtmlSchema = z.object({
    generatedHtml: z.string().describe("The complete HTML for the generated email template."),
});

app.post('/', zValidator('json', templateRequestSchema), async (c) => {
    const { requestText, imageDescriptions } = c.req.valid('json');

    const systemPromptContent = `You are an expert AI assistant specialized in generating HTML email templates.
The user will provide a description of the template they want, and optionally, descriptions of images to include.
Generate a complete HTML email template based on this request.

The HTML structure MUST be as follows, with your generated content placed ONLY inside the <tbody> tag:
\`\`\`html
<html><head></head><body>
  <table class="dragndrop" border="0" cellpadding="0" cellspacing="0" height="100%" width="100%">
    <tbody>
      <!-- AI-GENERATED CONTENT GOES HERE. Example: <tr><td>...</td></tr> -->
    </tbody>
  </table>
</body>
</html>
\`\`\`
Ensure the generated content fits within a valid HTML table structure (e.g., using <tr> and <td> elements).
Here is an example of a past email html, follow the structure of this previous email
\'\'\'html
<html><head></head><body><table class="dragndrop" cellpadding="0" cellspacing="0" border="0" height="100%" width="100%"><tbody><tr><td colspan="6" style="width: 100%" class="td100"><div>Test Text</div>
        </td>
      </tr>
      <tr>
        <td colspan="3" style="width: 50%" class="td100">
          <div>adding text</div>
        </td>
        <td colspan="3" style="width: 50%" class="td100"></td>
      </tr>
      <tr>
        <td colspan="6" style="width: 100%" class="td100">
          <div class="socialShareContainer" style="display: inline-flex; flex-direction: row; align-items: center" data-shareemail="true" data-textposition="Left" data-labelposition="Left" data-orientation="Horizontal" data-socialspacing="0" data-socialorder="sssFacebook,sssTwitter,sssLinkedIn,sssEmail,sssPinterest">
            <span class="shareLabel">Share this email:</span>
            <div class="linkContainer" style="display: flex; align-items: center; flex-direction: row; gap: 10px">
              <a prettyname="Facebook" class="facebookLink" target="_blank" style="color: rgba(0, 0, 0, 1); text-decoration: none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=1&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%">
                <div class="socialButton Icon_Facebook" style="padding: 10px; border-radius: 10px; display: flex; flex-direction: row"><img src="https://editor.ne16.com/share/facebook-solid-circle.png" class="Icon_Facebook" border="0"></div>
              </a><a prettyname="Twitter" class="twitterLink" target="_blank" style="color: rgba(0, 0, 0, 1); text-decoration: none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=2&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%">
                <div class="socialButton Icon_Twitter" style="padding: 10px; border-radius: 10px; display: flex; flex-direction: row"><img src="https://editor.ne16.com/share/twitter-solid-circle.png" class="Icon_Twitter" border="0"></div>
              </a><a prettyname="LinkedIn" class="linkedInLink" target="_blank" style="color: rgba(0, 0, 0, 1); text-decoration: none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=3&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%">
                <div class="socialButton Icon_LinkedIn" style="padding: 10px; border-radius: 10px; display: flex; flex-direction: row"><img src="https://editor.ne16.com/share/linkedin-solid-circle.png" class="Icon_LinkedIn" border="0"></div>
              </a><a prettyname="Forward" class="forwardFriendLink" target="_blank" style="color: rgba(0, 0, 0, 1); text-decoration: none" href="http://editor-dev.delivra.com/vo/Forward.aspx?FileID=[[FileID]]&amp;m=%%MemberIDGuid_%%&amp;messageid=%%outmail.messageid%%&amp;ListID=%%merge lists_.listid_%%">
                <div class="socialButton Icon_Email" style="padding: 10px; border-radius: 10px; display: flex; flex-direction: row"><img src="https://editor.ne16.com/share/forward-solid-circle.png" class="Icon_Forward" border="0"></div>
              </a><a prettyname="Pinterest" class="pinterestLink" target="_blank" style="color: rgba(0, 0, 0, 1); text-decoration: none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=12&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%">
                <div class="socialButton Icon_Pinterest" style="padding: 10px; border-radius: 10px; display: flex; flex-direction: row"><img src="https://editor.ne16.com/share/pinterest-solid-circle.png" class="Icon_Pinterest" border="0"></div>
              </a>
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="background-color: rgba(255, 0, 0, 1); width: 33.3333%; padding: 40px 10px" class="td100"></td>
        <td colspan="2" style="width: 33.3333%" class="td100"></td>
        <td colspan="2" style="background-color: rgba(255, 0, 0, 1); width: 33.3333%" class="td100"></td>
      </tr>
      <tr>
        <td colspan="4" style="background-color: rgba(1, 111, 240, 1); width: 66.6667%; padding: 20px 0" class="td100">
          <div><span style="color: rgba(255, 0, 0, 1)">Test Text</span></div>
        </td>
        <td colspan="2" style="background-repeat: no-repeat; vertical-align: top; text-align: center; width: 33.3333%" class="td100"><img class="img100" src="https://editor.dev.delivra-dev.com/delivra-qa-enterprise/delivra-2025-03-24t155825-2025-03-24t155844.png" width="100" style="width: 100px; max-height: 89px" height="auto"></td>
      </tr>
      <tr>
        <td colspan="6" style="width: 100%" class="td100">
          <div class="editor-email-codeblock" style="margin: 11px; font-size: 14px; display: flex; flex-direction: column; justify-content: center"> <a href="google.com">click? </a></div>
        </td>
      </tr>
      <tr>
        <td colspan="6" style="width: 100%" class="td100">
          <div class="editor-email-video"><a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"><img style="width: 100%" class="editor-default-video-thumbnail videoThumbnail100" src="https://editor.dev.delivra-dev.com/delivra-qa-enterprise/maxresdefault-2025-03-24t160136.jpg-2025-03-24t160146.png.jpg"></a></div>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
\'\'\'
Respond with a JSON object matching the following schema:
{
  "generatedHtml": "string (The complete, generated HTML for the email template.)"
}
Do not include any other conversational text or explanations outside of the generated HTML within the 'generatedHtml' field.
`;

    const userPromptContent = `Request: ${requestText}${imageDescriptions && imageDescriptions.length > 0 ? `\nImage Descriptions: ${imageDescriptions.join(', ')}` : ''}`;

    const messagesForAI: CoreMessage[] = [
        { role: 'system', content: systemPromptContent },
        { role: 'user', content: userPromptContent }
    ];

    try {
        const result = generateObject({
            model: openai('gpt-4o-mini'), // Consider a model suitable for creative generation if needed
            messages: messagesForAI,
            schema: aiGeneratedHtmlSchema,
            temperature: 0.7, // Adjust temperature for creativity vs. determinism
        });

        return c.json(result);
    } catch (error) {
        console.error("Error calling AI for template generation:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: 'Failed to get response from AI' }, 500);
    }
});

export default app;