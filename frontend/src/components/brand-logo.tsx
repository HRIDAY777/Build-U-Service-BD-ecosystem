import Image from "next/image";

export function BrandLogo({
  className = "",
  eager = false,
}: {
  className?: string;
  eager?: boolean;
}) {
  return (
    <Image
      className={`company-logo ${className}`}
      src="/images/brand/u-service-logo.png"
      alt="U Service — কোম্পানির মূল লোগো"
      width={678}
      height={311}
      unoptimized
      loading={eager ? "eager" : "lazy"}
    />
  );
}
