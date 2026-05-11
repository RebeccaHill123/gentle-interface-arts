export function BackgroundBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-[26rem] w-[26rem] bg-pink opacity-[0.12] blur-3xl animate-blob" />
      <div
        className="absolute top-1/4 -right-32 h-[30rem] w-[30rem] bg-blue opacity-[0.10] blur-3xl animate-blob"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] bg-violet opacity-[0.08] blur-3xl animate-blob"
        style={{ animationDelay: "-8s" }}
      />
    </div>
  );
}
