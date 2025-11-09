"use client";

import { signIn } from "../../../auth";
import { DEFAULT_LOGIN_REDIRECT } from "../../../routes";
import { Button } from "../ui/button";

export default function Social() {
    const onClick = async (provider: "google" | "github") => {
        signIn(provider, {
            callbackUrl: DEFAULT_LOGIN_REDIRECT
        })
    }

    return (
        <div className="flex items-center w-full gap-x-2">
            <Button
                size="lg"
                className="w-full"
                variant="outline"
                onClick={() => {}}
            >
                Google
            </Button>
        </div>
    );
}