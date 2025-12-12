import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const APP_PIN = process.env.APP_PIN || '123456';
const AUTH_COOKIE_NAME = 'shop_auth';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function POST(request) {
  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'PIN is required' },
        { status: 400 }
      );
    }

    if (pin === APP_PIN) {
      // Set auth cookie (not httpOnly so client JS can read it for auth checks)
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, 'authenticated', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_SECONDS,
        path: '/'
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid PIN' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

    return NextResponse.json({
      authenticated: authCookie?.value === 'authenticated'
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}

