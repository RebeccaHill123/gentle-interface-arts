import { useMemo } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import {
  createSubscriptionCheckoutSession,
  type SubscriptionPlanId,
} from "@/lib/pro.functions";

interface Props {
  priceId: SubscriptionPlanId;
  returnUrl: string;
}

export function StripeEmbeddedCheckout({ priceId, returnUrl }: Props) {
  const options = useMemo(
    () => ({
      fetchClientSecret: async (): Promise<string> => {
        const result = await createSubscriptionCheckoutSession({
          data: {
            priceId,
            returnUrl,
            environment: getStripeEnvironment(),
          },
        });
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret)
          throw new Error("Stripe did not return a client secret");
        return result.clientSecret;
      },
    }),
    [priceId, returnUrl],
  );

  return (
    <div id="checkout" className="min-h-[520px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
