import { useRef, useState, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { pickImageFile, uploadImage } from "@/lib/media";
import { useLocale } from "@/hooks/use-locale";

interface ImagePickerProps {
  image: string;
  fallback: ReactNode;
  onPick: (url: string) => void;
  size?: number;
  shape?: "circle" | "rounded";
  label?: string;
}

export function ImagePicker({
  image,
  fallback,
  onPick,
  size = 44,
  shape = "rounded",
  label,
}: ImagePickerProps) {
  const { t, err } = useLocale();
  const labelText = label ?? t("picker.choose");
  const [busy, setBusy] = useState(false);
  const activeRef = useRef(false);

  const handlePick = async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    try {
      const file = await pickImageFile();
      if (!file) return;
      setBusy(true);
      const url = await uploadImage(file);
      onPick(url);
    } catch (error) {
      toast.error(err(error, "picker.failed"));
    } finally {
      setBusy(false);
      activeRef.current = false;
    }
  };

  const radius = shape === "circle" ? "var(--r-full)" : "var(--r-md)";

  return (
    <button
      type="button"
      className="image-picker"
      onClick={handlePick}
      disabled={busy}
      aria-label={labelText}
      title={labelText}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {image ? (
        <img src={image} alt="" style={{ borderRadius: radius }} />
      ) : (
        <span className="image-picker-fallback" style={{ borderRadius: radius }}>
          {fallback}
        </span>
      )}
      <span className="image-picker-badge" style={{ borderRadius: "var(--r-full)" }}>
        <Camera size={Math.max(11, Math.round(size / 4))} />
      </span>
    </button>
  );
}
