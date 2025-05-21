import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText } from "ai";
import { CoreMessage, UserContent } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { env } from "hono/adapter";

const app = new Hono();

export const templateRequestSchema = z.object({
    requestText: z
        .string()
        .describe("A description of the desired email template."),
    brandImage: z
        .string()
        .optional()
        .describe("Optional URL of a brand image to inspire the email's theme, vibe, and colors."),
    attachedImages: z
        .array(z.string())
        .optional()
        .describe("Optional array of image URLs to be included in the email template."),
    fontFamily: z
        .string()
        .optional()
        .describe("The selected font family for the email template."),
    enableWebSearch: z
        .boolean()
        .optional()
        .describe("Whether to enable web search to find relevant images or information.")
});

app.post("/", zValidator("json", templateRequestSchema), async (c) => {
    const { requestText, brandImage, attachedImages, fontFamily, enableWebSearch } = c.req.valid("json");

    const openai = createOpenAI({
        apiKey: env(c).OPENAI_API_KEY as string,
    });

    const systemPromptContent = `You are an expert AI assistant specialized in generating HTML email templates.
The user will provide a description of the template they want.
If a 'brandImage' is provided, use it to design the theme and vibe of the email. The colors in this image should be used for the colors in the email.
If 'attachedImages' are provided, include all of those images appropriately in the generated HTML using <img> tags. 
Do not repeat images under any circumstances.
Maintain aspect ratio of the images. Do this by setting max-height of all images to 200px. Do NOT set width to 100% on the images.
If a 'fontFamily' is provided, apply this font family to the main content of the email template.
If web search is enabled, you can search the web for relevant information to enhance the template.
Do NOT include any images other than the ones provided in the 'attachedImages' array.
Include social links, and format the markup to include them using the https://editor.ne16.com domain like the example below.
Generate a complete HTML email template based on this request.
After generating, validate the html to make sure that all links are in anchor tags and open in a new tab, and fix any other issues.

The HTML structure MUST be as follows, with your generated content placed ONLY inside the <tbody> tag:
<html>
  <head></head>
<body>
  <table class="dragndrop" border="0" cellpadding="0" cellspacing="0" height="100%" width="100%">
    <tbody>
      <!-- AI-GENERATED CONTENT GOES HERE. Example: <tr><td>...</td></tr> -->
    </tbody>
  </table>
</body>
</html>
Ensure the generated content fits within a valid HTML table structure (e.g., using <tr> and <td> elements).
Here is an example of a past email html, follow the structure of this previous email
<html><head></head><body><table class="dragndrop" cellpadding="0" cellspacing="0" border="0" height="100%" width="100%"><tbody><tr><td colspan="6" style="width:100%" class="td100"><div>Test Text</div></td></tr><tr><td colspan="3" style="width:50%" class="td100"><div>adding text</div></td><td colspan="3" style="width:50%" class="td100"></td></tr><tr><td colspan="6" style="width:100%" class="td100"><div class="socialShareContainer" style="display:inline-flex;flex-direction:row;align-items:center" data-shareemail="true" data-textposition="Left" data-labelposition="Left" data-orientation="Horizontal" data-socialspacing="0" data-socialorder="sssFacebook,sssTwitter,sssLinkedIn,sssEmail,sssPinterest"><span class="shareLabel">Share this email:</span><div class="linkContainer" style="display:flex;align-items:center;flex-direction:row;gap:10px"><a prettyname="Facebook" class="facebookLink" target="_blank" style="color:rgba(0,0,0,1);text-decoration:none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=1&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%"><div class="socialButton Icon_Facebook" style="padding:10px;border-radius:10px;display:flex;flex-direction:row"><img src="https://editor.ne16.com/share/facebook-solid-circle.png" class="Icon_Facebook" border="0"></div></a><a prettyname="Twitter" class="twitterLink" target="_blank" style="color:rgba(0,0,0,1);text-decoration:none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=2&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%"><div class="socialButton Icon_Twitter" style="padding:10px;border-radius:10px;display:flex;flex-direction:row"><img src="https://editor.ne16.com/share/twitter-solid-circle.png" class="Icon_Twitter" border="0"></div></a><a prettyname="LinkedIn" class="linkedInLink" target="_blank" style="color:rgba(0,0,0,1);text-decoration:none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=3&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%"><div class="socialButton Icon_LinkedIn" style="padding:10px;border-radius:10px;display:flex;flex-direction:row"><img src="https://editor.ne16.com/share/linkedin-solid-circle.png" class="Icon_LinkedIn" border="0"></div></a><a prettyname="Forward" class="forwardFriendLink" target="_blank" style="color:rgba(0,0,0,1);text-decoration:none" href="http://editor-dev.delivra.com/vo/Forward.aspx?FileID=[[FileID]]&amp;m=%%MemberIDGuid_%%&amp;messageid=%%outmail.messageid%%&amp;ListID=%%merge lists_.listid_%%"><div class="socialButton Icon_Email" style="padding:10px;border-radius:10px;display:flex;flex-direction:row"><img src="https://editor.ne16.com/share/forward-solid-circle.png" class="Icon_Forward" border="0"></div></a><a prettyname="Pinterest" class="pinterestLink" target="_blank" style="color:rgba(0,0,0,1);text-decoration:none" href="https://editor.dev.delivra-dev.com/vo/Share.aspx?URL=https%3A%2F%2Feditor.dev.delivra-dev.com%2Fvo%2F%3FFileID%3D%%merge outmail_.fileuid_%%%26ListID%3D%%merge lists_.listid_%%&amp;Network=12&amp;ListID=%%merge lists_.listid_%%&amp;MemberID=%%merge members_.memberidguid_%%&amp;FileID=%%merge outmail_.fileuid_%%&amp;MailID=%%merge outmail_.messageid_%%"><div class="socialButton Icon_Pinterest" style="padding:10px;border-radius:10px;display:flex;flex-direction:row"><img src="https://editor.ne16.com/share/pinterest-solid-circle.png" class="Icon_Pinterest" border="0"></div></a></div></div></td></tr><tr><td colspan="2" style="background-color:rgba(255,0,0,1);width:33.3333%;padding:40px 10px" class="td100"></td><td colspan="2" style="width:33.3333%" class="td100"></td><td colspan="2" style="background-color:rgba(255,0,0,1);width:33.3333%" class="td100"></td></tr><tr><td colspan="4" style="background-color:rgba(1,111,240,1);width:66.6667%;padding:20px 0" class="td100"><div><span style="color:rgba(255,0,0,1)">Test Text</span></div></td><td colspan="2" style="background-repeat:no-repeat;vertical-align:top;text-align:center;width:33.3333%" class="td100"><img class="img100" src="https://editor.dev.delivra-dev.com/delivra-qa-enterprise/delivra-2025-03-24t155825-2025-03-24t155844.png" width="100" style="width:100px;max-height:89px" height="auto"></td></tr><tr><td colspan="6" style="width:100%" class="td100"><div class="editor-email-codeblock" style="margin:11px;font-size:14px;display:flex;flex-direction:column;justify-content:center"><a href="google.com">click?</a></div></td></tr><tr><td colspan="6" style="width:100%" class="td100"><div class="editor-email-video"><a target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"><img style="width:100%" class="editor-default-video-thumbnail videoThumbnail100" src="https://editor.dev.delivra-dev.com/delivra-qa-enterprise/maxresdefault-2025-03-24t160136.jpg-2025-03-24t160146.png.jpg"></a></div></td></tr></tbody></table></body></html>
Here is another html example. You need to follow the structure of the previous and next example.
<html><head></head><body><table class="dragndrop" width="100%" height="100%" cellspacing="0" cellpadding="0" border="0"><tbody><tr><td colspan="6" class="bumper td100" style="text-align:left;vertical-align:top;width:100%;background-color:rgba(198,230,218,1)"><div class="bumperContent" style="height:15px"></div></td></tr><tr><td colspan="2" class="td100" style="width:33.3333%;text-align:left;vertical-align:top;background-color:rgba(198,230,218,1)"></td><td colspan="2" class="td100" style="width:33.3333%;text-align:center;vertical-align:middle;background-color:rgba(198,230,218,1);padding:8px"><img class="img100" src="https://content.delivra.com/sampletemplates/FinServBirthday_dragndrop_files/sapling.png" style="width:184px;max-height:42px" width="184" height="auto"></td><td colspan="2" class="td100" style="width:33.3333%;text-align:left;vertical-align:top;background-color:rgba(198,230,218,1)"></td></tr><tr><td colspan="6" class="td100" style="text-align:left;vertical-align:top;width:100%;background-color:rgba(255,255,255,1)"><img class="img100" src="https://content.delivra.com/sampletemplates/FinServBirthday_dragndrop_files/bday_header2-01.png" style="width:600px;max-height:30px" width="600" height="auto"></td></tr><tr><td colspan="6" class="bumper td100" style="text-align:left;vertical-align:top;width:100%"><div class="bumperContent" style="height:10px"></div></td></tr><tr><td colspan="2" class="td100" style="width:33.3333%"></td><td colspan="2" class="td100" style="text-align:left;vertical-align:top;width:33.3333%"><img class="img100" src="https://content.delivra.com/sampletemplates/FinServBirthdayDragandDropTemplate_files/sapling_bday_plant2-01.png" width="200" height="auto" style="width:200px"></td><td colspan="2" class="td100" style="width:33.3333%;text-align:left;vertical-align:top"></td></tr><tr><td colspan="6" class="bumper td100" style="text-align:left;vertical-align:top;width:100%"><div class="bumperContent" style="height:10px"></div></td></tr><tr><td colspan="6" class="td100" style="text-align:left;vertical-align:top;width:100%;border:0 none rgba(239,242,242,1);background-color:rgba(255,255,255,1)"><img class="img100" src="https://content.delivra.com/sampletemplates/FinServBirthday_dragndrop_files/bday_header1.png" style="width:600px;max-height:30px" width="600" height="auto"></td></tr><tr><td colspan="6" class="td100" style="text-align:center;vertical-align:top;width:100%;padding:10px 35px;background-color:rgba(198,230,218,1);font-family:'Century Gothic',Arial,Helvetica,sans-serif;font-size:45px;color:rgba(0,0,0,1)"><h1><div style="text-align:center"><span style="font-family:'Century Gothic',Arial,Helvetica,sans-serif;font-size:45px;color:rgba(255,255,255,1)"><span style="font-family:'Trebuchet MS',Helvetica,sans-serif;color:rgba(0,0,0,1)">Happy Birthday,</span><span style="font-family:'Trebuchet MS',Helvetica,sans-serif"><br>&nbsp;</span></span><span style="font-size:45px">%%FirstName_%%!</span></div></h1></td></tr><tr><td colspan="6" class="td100" style="text-align:left;vertical-align:middle;width:100%;padding:10px 40px;line-height:1.4;background-color:rgba(198,230,218,1);font-family:Tahoma,Geneva,sans-serif;font-size:16px;color:rgba(0,0,0,1)"><span style="font-size:16px;color:rgba(0,0,0,1);font-family:Tahoma,Geneva,sans-serif">The Sapling Team sends you the warmest wishes on your special day. And remember, if you get any special birthday cash, you can stash that money away in your </span><span style="font-size:16px;color:rgba(0,122,78,1);font-family:Tahoma,Geneva,sans-serif"><strong>Sapling Savings account</strong></span><span style="font-size:16px;color:rgba(0,0,0,1);font-family:Tahoma,Geneva,sans-serif">. Earn 2% cash back when you apply within the next month. Already have an account with us? You can check in and see how it's doing by clicking the button below. Want to start saving with us? Follow the 3 step process listed <span class="k-marker"></span><a href="www.google.com" target="_blank" style="color:rgba(0,122,78,1);text-decoration:underline">here.</a><span class="k-marker"></span></span><br></td></tr><tr><td colspan="6" class="td100" style="text-align:center;vertical-align:middle;color:rgba(255,255,255,1);font-size:16px;padding:20px 20px 30px;width:100%;font-family:Tahoma,Geneva,sans-serif;background-color:rgba(198,230,218,1)"><div class="editor-email-button" style="background-color:rgba(0,122,78,1);color:rgba(255,255,255,1);width:auto;border-radius:20px;height:auto;padding:15px 28px">View my account</div></td></tr><tr><td colspan="6" class="td100" style="text-align:left;vertical-align:top;background-color:rgba(239,242,242,1);padding:30px;font-size:14px;color:rgba(136,136,136,1);width:100%"><div>Want more from Sapling Savings?&nbsp;<br><br>Check us out on Facebook, Twitter, LinkedIn, and Instagram!<br><br>Facebook - Twitter - LinkedIn - Instagram</div></td></tr></tbody></table></body></html>
Make sure that you don't escape any characters in the html. Make sure that you don't use any html entities. Make sure that you don't use any double quotes in the html.
Respond with the generated html text as plain text ONLY. Don't add the markdown tags for the html.
Do not include any other conversational text or explanations outside of the generated HTML. There should be no markdown inside the html.
All of the links should be valid links as anchor tags (for example: <a href="https://www.google.com" target="_blank">Google</a>) that open in a new tab.
`;

    const userPromptParts: UserContent = [
        {
            type: "text",
            text: `Request: ${requestText}${fontFamily ? `\\nFont Family: ${fontFamily}` : ""}${enableWebSearch ? `\\nWeb Search: Enabled` : ""}${attachedImages && attachedImages.length > 0 ? `\\nAttached Images: ${attachedImages.join(", ")}` : ""}`,
        },
    ];

    if (brandImage) {
        userPromptParts.push({ type: "image", image: new URL(brandImage) });
    }

    const messagesForAI: CoreMessage[] = [
        { role: "system", content: systemPromptContent },
        { role: "user", content: userPromptParts },
    ];

    try {
        const result = await generateText({
            model: openai.responses("gpt-4.1"),
            messages: messagesForAI,
            temperature: 0.7,
            ...(enableWebSearch ? {
                tools: {
                    web_search_preview: openai.tools.webSearchPreview({
                        searchContextSize: 'high',
                    }),
                },
                toolChoice: { type: 'tool', toolName: 'web_search_preview' },
            } : {})
        });

        console.log(result.text);

        return c.json({ generatedHtml: result.text });
    } catch (error) {
        console.error("Error calling AI for template generation:", error);
        if (error instanceof Error) {
            return c.json({ error: `AI Error: ${error.message}` }, 500);
        }
        return c.json({ error: "Failed to get response from AI" }, 500);
    }
});

export default app;
