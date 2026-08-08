export function UserAvatar({
  name,
  image,
  size = "md",
}: {
  name: string;
  image: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-2xl",
  };
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-white ${sizes[size]}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
