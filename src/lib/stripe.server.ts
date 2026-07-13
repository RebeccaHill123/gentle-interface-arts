import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox"
    ? getEnv("STRIPE_SANDBOX_API_KEY")
    : getEnv("STRIPE_LIVE_API_KEY");
}

export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Stripe(connectionApiKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl =
        input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace(
        "https://api.stripe.com",
        GATEWAY_STRIPE_BASE,
      );
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(
              init?.headers ??
                (input instanceof Request ? input.headers : undefined),
            ).entries(),
          ),
          "X-Connection-Api-Key": connectionApiKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as {
      message?: string;
      type?: string;
      code?: string;
      raw?: { message?: string; type?: string; code?: string };
    };
    const message = err.raw?.message ?? err.message;
    if (message) return message;
  }
  return "Stripe request failed";
}

export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ type: string; data: { object: any } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
      : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0)
    throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");
  if (!v1Signatures.includes(expected))
    throw new Error("Invalid webhook signature");

  return JSON.parse(body);
}

/**
 * Ensures the 6-month recurring price exists in whichever Stripe environment
 * we're pointed at. The batch_create_product tool doesn't support
 * interval_count, so we create this price via the API idempotently and key
 * it by `lookup_key: 'pro_six_month'`.
 */
export async function ensureSixMonthPrice(stripe: Stripe): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    lookup_keys: ["pro_six_month"],
    limit: 1,
    active: true,
  });
  if (existing.data.length) return existing.data[0];

  // Find the Tentra product by lookup_key of its monthly price.
  const monthly = await stripe.prices.list({
    lookup_keys: ["pro_monthly"],
    limit: 1,
    expand: ["data.product"],
  });
  const productRef = monthly.data[0]?.product;
  const productId =
    typeof productRef === "string" ? productRef : productRef?.id;
  if (!productId) throw new Error("Tentra product not found");

  const price = await stripe.prices.create({
    product: productId,
    currency: "gbp",
    unit_amount: 7299,
    lookup_key: "pro_six_month",
    nickname: "Tentra — 6 months",
    recurring: { interval: "month", interval_count: 6 },
    metadata: { lovable_external_id: "pro_six_month" },
  });
  return price;
}

/**
 * Look up an existing Stripe Customer by userId metadata (then by email), or
 * create one. Puts userId on the Customer so later reads (portal, dashboards,
 * customers.search) are resolvable without depending on Session metadata.
 */
export async function resolveOrCreateCustomer(
  stripe: Stripe,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({
      email: options.email,
      limit: 1,
    });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}
