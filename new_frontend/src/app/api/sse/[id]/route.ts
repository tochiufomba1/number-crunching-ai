import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions";
import { createClient } from 'redis'

//Source: https://github.com/felixiho/next-js-streaming/blob/main/src/app/api/sse/route.ts
export async function GET(request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const [dynamicSegment, user] = await Promise.all([
            params,
            getCurrentUser()
        ]);

        if (!user || user.id != dynamicSegment["id"])
            throw new Error("Not allowed to access resource")

        const subscriber = createClient();
        subscriber.on('error', err => console.log('Redis Client Error', err));
        await subscriber.connect()

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                console.log("initi")
                try {
                    await subscriber.subscribe(`user:${dynamicSegment.id}`, (message) =>{
                        console.log("got message")
                        console.log(JSON.stringify(message))
                        const sseMessage = `data: ${message}\n\n`;
                        controller.enqueue(encoder.encode(sseMessage))
                    })
                } catch (error) {
                    console.error("Stream error:", error);
                    // controller.enqueue(encoder.encode(JSON.stringify({error: "Error occured..."})));
                    controller.close();
                }
            },
            async cancel(){
                await subscriber.quit()
            }
        });

        return new NextResponse(stream, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
            },
        })
    } catch (error) {
        console.error("Server error:", error);
        return new NextResponse(
            JSON.stringify({ error: "Internal Server Error" }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
}