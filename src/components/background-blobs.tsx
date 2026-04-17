export function BackgroundBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] bg-pink opacity-25 blur-3xl animate-blob" />
      <div
        className="absolute top-1/4 -right-32 h-[32rem] w-[32rem] bg-blue opacity-25 blur-3xl animate-blob"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] bg-violet opacity-20 blur-3xl animate-blob"
        style={{ animationDelay: "-8s" }}
      />
    </div>
  );
}
