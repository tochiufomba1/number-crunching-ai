'use client'

import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import Button from '../components/button/button';
import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );



  return (
    <form action={formAction} style={{ marginTop: "0.75rem" }}>
      <div style={{ "paddingLeft": "1.5rem", "paddingRight": "1.5rem", "paddingBottom": "1rem", "paddingTop": "2rem", "flex": "1 1 0%", "borderRadius": "0.5rem", "backgroundColor": "#F9FAFB" }}>
        <h1 style={{ "marginBottom": "0.75rem", "fontSize": "1.5rem", "lineHeight": "2rem", "color": "#111827" }}>
          Please log in to continue.
        </h1>
        <div style={{ "width": "100%" }}>
          <div>
            <label
              style={{ "display": "block", "marginBottom": "0.75rem", "marginTop": "1.25rem", "fontSize": "0.75rem", "lineHeight": "1rem", "fontWeight": 500, "color": "#111827" }}
              htmlFor="email"
            >
              Email
            </label>
            <div style={{ "position": "relative" }}>
              <input
                style={{ "display": "block", "paddingLeft": "2.5rem", "borderRadius": "0.375rem", "borderWidth": "1px", "borderColor": "#E5E7EB", "outlineWidth": "2px", "width": "100%", "fontSize": "0.875rem", "lineHeight": "1.25rem" }}
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
              />
              <AtSymbolIcon style={{ "position": "absolute", "left": "0.75rem", "top": "50%", "color": "#6B7280", "pointerEvents": "none", "height": "18px", "width": "18px" }} />
            </div>
          </div>
          <div style={{ "marginTop": "1rem" }}>
            <label
              style={{ "display": "block", "marginBottom": "0.75rem", "marginTop": "1.25rem", "fontSize": "0.75rem", "lineHeight": "1rem", "fontWeight": 500, "color": "#111827" }}
              htmlFor="password"
            >
              Password
            </label>
            <div style={{ "position": "relative" }}>
              <input
                style={{ "display": "block", "paddingLeft": "2.5rem", "borderRadius": "0.375rem", "borderWidth": "1px", "borderColor": "#E5E7EB", "outlineWidth": "2px", "width": "100%", "fontSize": "0.875rem", "lineHeight": "1.25rem" }}
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
                minLength={6}
              />
              <KeyIcon style={{ "position": "absolute", "left": "0.75rem", "top": "50%", "color": "#6B7280", "pointerEvents": "none", "height": "18px", "width": "18px" }} />
            </div>
          </div>
        </div>
        <input type="hidden" name="redirectTo" value={callbackUrl} />
        <Button style={{ "marginTop": "1rem", "width": "100%" }} aria-disabled={isPending}>
          Log in <ArrowRightIcon style={{ "width": "1.25rem", "height": "1.25rem", "color": "#F9FAFB" }} />
        </Button>

        <div
          style={{ "display": "flex", "marginLeft": "0.25rem", "alignItems": "flex-end", "height": "2rem" }}
          aria-live="polite"
          aria-atomic="true"
        >
          {errorMessage && (
            <>
              <ExclamationCircleIcon style={{ "width": "1.25rem", "height": "1.25rem", "color": "#EF4444" }} />
              <p style={{ "fontSize": "0.875rem", "lineHeight": "1.25rem", "color": "#EF4444" }}>{errorMessage}</p>
            </>
          )}
        </div>

        <div>
          <p style={{ "marginBottom": "0.75rem", "fontSize": "1.5rem", "lineHeight": "2rem", "color": "#111827" }}>
            Don&apos;t have an account? <Link style={{ color: '#3b82f6', textDecoration: 'underline' }} href={"/register"}>Register here</Link>
          </p>
        </div>
      </div>
    </form>
  );
}
