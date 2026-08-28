interface LogoProps {
  size?: number;
}

export function Logo({ size = 40 }: LogoProps) {
  return (
    <img
      src="/assets/icon.png"
      alt="hevai"
      width={size}
      height={size}
      draggable={false}
      style={{ display: "block", objectFit: "contain", pointerEvents: "none" }}
    />
  );
}
