import { useMemo } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createPendingCheckoutSession } from "@/lib/pending-plans.functions";

interface Props {
  token: string;
  returnUrl: string;
}

export function PendingCheckout({ token, returnUrl }: Props) {
  const options = useMemo(
    () => ({
      fetchClientSecret: async (): Promise<string> => {
        const result = await createPendingCheckoutSession({
          data: { token, returnUrl, environment: getStripeEnvironment() },
        });
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret)
          throw new Error("Stripe did not return a client secret");
        return result.clientSecret;
      },
    }),
    [token, returnUrl],
  );

  return (
    <div id="checkout" className="min-h-[560px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
