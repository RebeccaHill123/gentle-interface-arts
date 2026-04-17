export function BackgroundBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-96 w-96 bg-peach opacity-70 blur-3xl animate-blob" />
      <div
        className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] bg-lavender opacity-60 blur-3xl animate-blob"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="absolute -bottom-32 left-1/4 h-96 w-96 bg-mint opacity-60 blur-3xl animate-blob"
        style={{ animationDelay: "-6s" }}
      />
    </div>
  );
}
