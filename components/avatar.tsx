import { initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  image?: string;
  size?: number;
}

export function Avatar({ name, image, size }: AvatarProps) {
  const style = size ? { width: size, height: size } : undefined;
  if (image) {
    return (
      <span className="avatar" style={style}>
        <img src={image} alt={name} />
      </span>
    );
  }
  return (
    <span className="avatar" style={style}>
      {initials(name || "?")}
    </span>
  );
}
