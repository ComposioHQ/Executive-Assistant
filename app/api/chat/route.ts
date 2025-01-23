import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { ActionExecutionResDto, TPostProcessor, VercelAIToolSet } from 'composio-core';
import { NextResponse } from "next/server";

// Define interface for the request body
interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  trigger?: string; // Optional trigger event identifier
  chatHistory?: Array<{ role: string; content: string }>; // Added chatHistory to interface
}

export async function POST(req: Request) {
  try {
    const { messages, trigger, chatHistory = [] }: ChatRequest = await req.json();
    const postProcessor: TPostProcessor = ({ actionName, appName, toolResponse }: {
      actionName: string;
      appName: string;
      toolResponse: ActionExecutionResDto;
    }) => {
      console.log("toolResponse", toolResponse);
      // Only process if it's GMAIL_FETCH_EMAILS action
      if (actionName !== "GMAIL_FETCH_EMAILS") {
        return toolResponse; // Return original response for other actions
      }
      const messages = toolResponse.data.response_data.messages;
      const processedMessages = messages.reduce((acc: any[], message: any) => {
        if (message.sender && message.subject && message.messageText && message.threadId) {
          acc.push({
            sender: message.sender,
            subject: message.subject,
            content: message.messageText,
            threadId: message.threadId
          });
        }
        return acc;
      }, []);
      return processedMessages; // Add this return statement
    }
    // Setup toolset
    const toolset = new VercelAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });

    toolset.addPostProcessor(postProcessor);

    async function setupUserConnectionIfNotExists(entityId: string | undefined) {
      const entity = await toolset.client.getEntity(entityId);
      const connection = await entity.getConnection({ app: "gmail" });

      if (!connection) {
        const connection = await entity.initiateConnection({ appName: "gmail" });
        console.log("Log in via: ", connection.redirectUrl);
        return connection.waitUntilActive(60);
      }

      return connection;
    }

    async function executeAgent(entityName: string | undefined, inputMessages: any[], triggerEvent?: string) {
      // setup entity
      const entity = await toolset.client.getEntity(entityName);
      await setupUserConnectionIfNotExists(entity.id);


      // Modify system prompt based on whether it's a trigger or user input
      const systemPrompt = triggerEvent
        ? `You are a Gmail Customer Support assistant handling a trigger event: ${triggerEvent}. You have access to the user's Gmail and can perform actions using the available tools. Process this trigger event appropriately. You are agentic and can suggest actions to the user. Feel free to suggest actions to the user.`
        : `You are a Gmail Customer Support assistant. You have access to the user's Gmail and you can perform actions on it using the tools you have. Introduce yourself as a Gmail agent. Probe the user asking for different questions to ensure you pass the correct parameters to execute the actions. You are agentic and can suggest actions to the user. Feel free to suggest actions to the user.`;

      // get tools based on actions
      const tools = await toolset.getTools({
        actions: [
            "GMAIL_SEND_EMAIL",
            "GMAIL_CREATE_EMAIL_DRAFT",
            "GMAIL_REPLY_TO_THREAD",
            "GMAIL_ADD_LABEL_TO_EMAIL",
            "GMAIL_FETCH_EMAILS",
            "GOOGLECALENDAR_CREATE_EVENT",
            "GOOGLECALENDAR_GET_CURRENT_DATE_TIME",
            "GOOGLECALENDAR_FIND_EVENT",
            "GOOGLECALENDAR_UPDATE_EVENT",
            "GOOGLECALENDAR_DELETE_EVENT"
        ],
      });

      // Combine chat history with current messages for context
      const fullMessageContext = [...chatHistory, ...inputMessages];

      // Generate AI response with full context
      const aiResponse = await generateText({
        model: openai("gpt-4o"),
        tools,
        toolChoice: "auto",
        system: systemPrompt,
        messages: fullMessageContext, // Use combined messages instead of just inputMessages
      });

      let finalResult = null;
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        finalResult = await toolset.executeToolCall(
          {
            name: aiResponse.toolCalls[0].toolName,
            arguments: aiResponse.toolCalls[0].args
          },
          entity.id
        );
        console.log("Tool execution result:", finalResult);
      }
      console.log("AI Response:", aiResponse);

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt: finalResult
          ? `
          Given the context of the user's request "${inputMessages[inputMessages.length - 1].content}", analyze the AI's response: "${aiResponse.text} and tool result: ${finalResult}". 

          Objectives:
          - Directly address the user's intent
          - Clearly explain the tool's execution result
          - If there was no tool execution, just respond conversationally. Do not let the user know that you are an extra layer that is acting between the tool executor and the user. 
          - Provide actionable insights or next steps
          - Maintain a professional and helpful tone
          - Do not mention whether a tool was executed or not.
          - If a tool was executed, explain the outcome. If no tool was used, respond conversationally. Always be proactive in suggesting potential follow-up actions.
          
          `
          : `
          Context: ${triggerEvent ? 'Trigger Event' : 'User Request'}: "${inputMessages[inputMessages.length - 1].content}"

          Task: Craft a response that:
          - Synthesizes the AI's analysis (${aiResponse.text})
          - Incorporates the tool execution result (${finalResult}) If there was no tool execution, just respond conversationally. Do not let the user know that you are an extra layer that is acting between the tool executor and the user. Do not mention whether a tool was executed or not.
          - Provides clear, actionable information
          - Suggests potential next steps or additional actions

          Response Guidelines:
          - Be direct and informative
          - Highlight key outcomes
          - Offer proactive suggestions
          - Maintain a user-centric approach
          `,
      });

      return {
        aitext: text,
        aiResponse: aiResponse.text,
        toolResult: finalResult
      };
    }

    // Execute agent with the trigger event if present
    const result = await executeAgent("default", messages, trigger);

    // Return structured response
    return NextResponse.json({
      role: 'assistant',
      content: `${result.aitext}`
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      role: 'assistant',
      content: 'Sorry, there was an error processing your request.'
    }, { status: 500 });
  }
}