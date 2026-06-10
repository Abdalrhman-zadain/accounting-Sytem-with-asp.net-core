import Image from "next/image";

export const APP_LOGO_PATH = "/brand/logo.png";

const LOGO_ASPECT_RATIO = 313 / 198;

type AppLogoProps = {
  className?: string;
  height?: number;
  priority?: boolean;
};

export function AppLogo({ className, height = 40, priority }: AppLogoProps) {
  const width = Math.round(height * LOGO_ASPECT_RATIO);

  return (
    <Image
      src={APP_LOGO_PATH}
      alt="Genius ERP"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
