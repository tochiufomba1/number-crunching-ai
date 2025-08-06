// app/api/data/route.js
import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/../auth'

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').slice(3); 
  const endpointIdentifier = slug.join('/');

  // Retrieve bearer token
  const session = await auth();
  const externalAPIToken = session?.user.token

  if (!externalAPIToken) {
    // Unauthorized: if no token is found, respond with a 401.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Use the endpointIdentifier to determine which external API to call.
  // For example, map it to an external URL:
  //let externalURL = '';
  // switch (endpointIdentifier) {
  //   case 'twitter':
  //     externalURL = 'https://api.twitter.com/2/tweets';
  //     break;
  //   case 'github':
  //     externalURL = 'https://api.github.com/user';
  //     break;
  //   // Add more cases as needed.
  //   default:
  //     return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  // }


  try {
    const incomingCookie = request.headers.get('cookie') || ''
    // TODO: Consider file download case (may need to use a switch statement or check the endpointIdentifier)
    // Use the token to call the external API.
    // console.log(`${process.env.EXTERNAL_API_BASE_URL}/api/${endpointIdentifier}`)
    const externalRes = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/${endpointIdentifier}`, {
      headers: {
        'Authorization': `Bearer ${externalAPIToken}`,
        Cookie: incomingCookie,
      },
    });

    if (!externalRes.ok) {
      throw new Error('External API error');
    }

    const externalResCT = externalRes.headers.get('content-type') || '';

    const setCookie = externalRes.headers.get('set-cookie')

    if (externalResCT.includes('text/csv')) {
      // you can tweak filename, attachment vs inline, etc.
      const headers = {
        'Content-Type': externalResCT,
        'Content-Disposition': 'attachment; filename="export.csv"',
      };
      return new NextResponse(externalRes.body, {
        status: externalRes.status,
        headers,
      });
    }

    const data = await externalRes.json();
    const response = NextResponse.json(data, { status: externalRes.status })
    if (setCookie) {
      // preserve path/domain/samesite attributes if you need to tweak them
      response.headers.set('set-cookie', setCookie)
    }
    return response;

  } catch (error: unknown) {
    // If the external API call fails, return an error response.
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').slice(3); 
  const endpointIdentifier = slug.join('/');

  // Retrieve bearer token
  const session = await auth();
  const externalAPIToken = session?.user.token

  if (!externalAPIToken) {
    // Unauthorized: if no token is found, respond with a 403.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const incomingCookie = request.headers.get('cookie') || ''
  
    const jsonData = await request.json();
    const body = JSON.stringify(jsonData);

    const externalRes = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/${endpointIdentifier}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${externalAPIToken}`,
        'Content-Type': "application/json",
        Cookie: incomingCookie,
      },
      body,
    });

    if (!externalRes.ok) {
      throw new Error('External API error');
    }

    const externalResCT = externalRes.headers.get('content-type') || '';

    const setCookie = externalRes.headers.get('set-cookie')

    if (externalResCT.includes('text/csv')) {
      const headers = {
        'Content-Type': externalResCT,
        'Content-Disposition': 'attachment; filename="export.csv"',
      };
      return new NextResponse(externalRes.body, {
        status: externalRes.status,
        headers,
      });
    }

    const data = await externalRes.json();
    const response = NextResponse.json(data, { status: externalRes.status })
    if (setCookie) {
      response.headers.set('set-cookie', setCookie)
    }
    return response;

  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').slice(3); 
  const endpointIdentifier = slug.join('/');
  
  // Retrieve bearer token
  const session = await auth();
  const externalAPIToken = session?.user.token

  if (!externalAPIToken) {
    // Unauthorized: if no token is found, respond with a 401.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${externalAPIToken}`,
      'Accept': 'application/json'
    };

    let body: BodyInit;
    const incomingContentType = request.headers.get("content-type") || "";

    if (incomingContentType.includes("application/json")) {
      // For JSON requests, parse and re-stringify the JSON body
      const jsonData = await request.json();
      body = JSON.stringify(jsonData);
      headers["Content-Type"] = "application/json";
    } else {
      // For FormData requests, get the form data object directly
      const formData = await request.formData();
      body = formData;
    }

    // Use the token to call the external API.
    const externalRes = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/${endpointIdentifier}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body,
    });

    if (!externalRes.ok) {
      throw new Error('External API error');
    }

    const setCookieHeader = externalRes.headers.get('set-cookie');

    const data = await externalRes.json();

    // Return the data as JSON to the client.
    const res = NextResponse.json(data);
    if (setCookieHeader) {
      // You can set it directly or process it if needed to adjust domain/path.
      res.headers.set('set-cookie', setCookieHeader);
    }

    return res;

  } catch (error: unknown) {
    // If the external API call fails, return an error response.
    console.log(error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').slice(3); 
  const endpointIdentifier = slug.join('/');

  // Retrieve bearer token
  const session = await auth();
  const externalAPIToken = session?.user.token

  if (!externalAPIToken) {
    // Unauthorized: if no token is found, respond with a 403.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const incomingCookie = request.headers.get('cookie') || ''

    const externalRes = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/${endpointIdentifier}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${externalAPIToken}`,
        'Content-Type': "application/json",
        Cookie: incomingCookie,
      },
    });

    if (!externalRes.ok) {
      throw new Error('External API error');
    }

    const setCookie = externalRes.headers.get('set-cookie')

    const response = NextResponse.json({}, { status: externalRes.status })
    if (setCookie) {
      response.headers.set('set-cookie', setCookie)
    }
    return response;

  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}