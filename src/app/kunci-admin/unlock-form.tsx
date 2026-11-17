"use client";

import { useState, useTransition } from "react";
import { PinPad } from "@/components/pin-pad";
import { unlockAdminAction } from "./actions";

export function UnlockForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <PinPad
      submitLabel="Buka admin"
      pending={pending}
      error={error}
      onType={() => setError(null)}
      onSubmit={(pin) =>
        new Promise((resolve) =>
          startTransition(async () => {
            const res = await unlockAdminAction(pin);
            if (res?.error) setError(res.error);
            resolve(res?.error ? false : true);
          }),
        )
      }
    />
  );
}
