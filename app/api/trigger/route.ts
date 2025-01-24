// /api/trigger/route.ts
import { NextResponse } from "next/server";
import { VercelAIToolSet } from 'composio-core';

export async function POST(req: Request) {
  try {
    const { listenMode, connectedAccountId } = await req.json();
    
    if (!listenMode) {
      return NextResponse.json({ status: 'listening_disabled' });
    }

    if (!connectedAccountId) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Connected account ID is required' 
      }, { status: 400 });
    }

    const toolset = new VercelAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
    console.log(connectedAccountId)
    // Setup the trigger
    try {
      await toolset.triggers.setup({
          connectedAccountId: connectedAccountId,
          triggerName: "GMAIL_NEW_GMAIL_MESSAGE",
          config: {"userId":"me","interval":1,"labelIds":"INBOX"}
      });
    } catch (setupError) {
      console.error('Error setting up trigger:', setupError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to setup trigger',
        details: setupError instanceof Error ? setupError.message : 'Unknown setup error'
      }, { status: 500 });
    }


    return new Promise((resolve, reject) => {
      // Add a timeout of 30 seconds
      const timeoutId = setTimeout(() => {
        resolve(NextResponse.json({
          status: 'timeout',
          message: 'No trigger received within timeout period'
        }));
      }, 30000); // 30 seconds timeout

      try {
        // Store the subscription to be able to unsubscribe later
        const subscription = toolset.triggers.subscribe(
          (data) => {
            clearTimeout(timeoutId);
            console.log('Trigger received:', data);
            
            
            resolve(NextResponse.json({
              status: 'trigger_received',
              subject: data.payload.subject,
              sender: data.payload.sender,
              messageText: data.payload.messageText,
              triggerData: data.payload
            }));
          },
          {
            onError: (error) => {
              clearTimeout(timeoutId);
              console.error('Subscription error:', error);
              
              
              resolve(NextResponse.json({
                status: 'error',
                message: 'Subscription error occurred',
                details: error instanceof Error ? error.message : 'Unknown subscription error'
              }, { status: 500 }));
            }
          }
        );
      } catch (subscribeError) {
        clearTimeout(timeoutId);
        console.error('Error in subscribe:', subscribeError);
        resolve(NextResponse.json({
          status: 'error',
          message: 'Failed to setup subscription',
          details: subscribeError instanceof Error ? subscribeError.message : 'Unknown subscription error'
        }, { status: 500 }));
      }
    });

  } catch (error) {
    console.error('Error in trigger endpoint:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}