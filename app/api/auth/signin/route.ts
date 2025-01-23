import { OpenAIToolSet } from "composio-core";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { entityId } = await request.json();
    
    if (!entityId) {
      return NextResponse.json(
        { 
          status: "error", 
          message: "Entity ID is required" 
        }, 
        { status: 400 }
      );
    }

    const toolset = new OpenAIToolSet();

    try {
      // Check if connection already exists for this entity
      const entity = await toolset.client.getEntity(entityId);
      const connectionDetails = await entity.getConnection({ appName: "GMAIL" });

      if (connectionDetails) {
        return NextResponse.json({ 
          status: "connected",
          message: "Already connected to Gmail",
          url: null,
          connectedAccountId: connectionDetails.id
        });
      }
    } catch (connectionError) {
      // If connection not found, proceed with initiating a new one
      if (connectionError.errCode === 'SDK::NO_CONNECTED_ACCOUNT_FOUND') {
        // Continue to connection initiation
      } else {
        throw connectionError; // Re-throw if it's a different error
      }
    }
    const redirect = 'http://localhost:3000/'
    // Initiate new connection
    const connectionRequest = await toolset.connectedAccounts.initiate({
      appName: "GMAIL",
      entityId: entityId,
      authMode: "OAUTH2",
      redirectUri: redirect
    });

    return NextResponse.json({ 
      status: "initiated",
      message: "Connection initiated",
      connectionId: connectionRequest.connectedAccountId,
      url: connectionRequest.redirectUrl // Make sure we're using the correct URL property
    });

  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        message: error.message || "Failed to authenticate" 
      }, 
      { status: 500 }
    );
  }
}
