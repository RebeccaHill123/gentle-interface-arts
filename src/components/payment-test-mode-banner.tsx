const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as
  | string
  | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-[12px] text-destructive">
        Production checkout is not configured. Complete Stripe go-live to
        accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-amber-400/40 bg-amber-400/10 px-4 py-2 text-center text-[12px] text-amber-500 dark:text-amber-300">
        Test mode — use card 4242 4242 4242 4242 to try checkout.
      </div>
    );
  }
  return null;
}
