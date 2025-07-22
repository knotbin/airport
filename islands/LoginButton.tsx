import { useEffect, useState } from "preact/hooks";
import { Button } from "../components/Button.tsx";

export default function LoginButton() {
  const [isMobile, setIsMobile] = useState(true); // Default to mobile for SSR

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(globalThis.innerWidth < 640);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    globalThis.addEventListener('resize', checkMobile);
    return () => globalThis.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div class="mt-6 sm:mt-8 text-center w-fit mx-auto">
      <Button
        href={isMobile ? undefined : "/login"}
        color="blue"
        label={isMobile ? "MOBILE NOT SUPPORTED" : "GET STARTED"}
        className={isMobile ? "opacity-50 cursor-not-allowed" : "opacity-100 cursor-pointer"}
        onClick={(e: MouseEvent) => {
          if (isMobile) {
            e.preventDefault();
          }
        }}
      />
    </div>
  );
}
