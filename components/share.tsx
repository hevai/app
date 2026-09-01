import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Mail, MessageSquare, Share2, X } from "lucide-react";
import qrcode from "qrcode-generator";
import { toast } from "sonner";
import { useLocale } from "@/hooks/use-locale";
import { isDesktop } from "@/lib/platform";

// Brand glyphs (simple-icons / bootstrap-icons path data, monochrome).
const BRANDS = {
  whatsapp: { d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z", box: "0 0 24 24" },
  telegram: { d: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z", box: "0 0 24 24" },
  x: { d: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z", box: "0 0 24 24" },
  linkedin: { d: "M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z", box: "0 0 16 16" },
  reddit: { d: "M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z", box: "0 0 24 24" },
  facebook: { d: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z", box: "0 0 24 24" },
  discord: { d: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z", box: "0 0 24 24" },
  slack: { d: "M3.362 10.11c0 .926-.756 1.681-1.681 1.681S0 11.036 0 10.111.756 8.43 1.68 8.43h1.682zm.846 0c0-.924.756-1.68 1.681-1.68s1.681.756 1.681 1.68v4.21c0 .924-.756 1.68-1.68 1.68a1.685 1.685 0 0 1-1.682-1.68zM5.89 3.362c-.926 0-1.682-.756-1.682-1.681S4.964 0 5.89 0s1.68.756 1.68 1.68v1.682zm0 .846c.924 0 1.68.756 1.68 1.681S6.814 7.57 5.89 7.57H1.68C.757 7.57 0 6.814 0 5.89c0-.926.756-1.682 1.68-1.682zm6.749 1.682c0-.926.755-1.682 1.68-1.682S16 4.964 16 5.889s-.756 1.681-1.68 1.681h-1.681zm-.848 0c0 .924-.755 1.68-1.68 1.68A1.685 1.685 0 0 1 8.43 5.89V1.68C8.43.757 9.186 0 10.11 0c.926 0 1.681.756 1.681 1.68zm-1.681 6.748c.926 0 1.682.756 1.682 1.681S11.036 16 10.11 16s-1.681-.756-1.681-1.68v-1.682h1.68zm0-.847c-.924 0-1.68-.755-1.68-1.68s.756-1.681 1.68-1.681h4.21c.924 0 1.68.756 1.68 1.68 0 .926-.756 1.681-1.68 1.681z", box: "0 0 16 16" },
} as const;

function Brand({ name }: { name: keyof typeof BRANDS }) {
  const icon = BRANDS[name];
  return (
    <svg viewBox={icon.box} fill="currentColor" aria-hidden="true">
      <path d={icon.d} />
    </svg>
  );
}

interface ShareProps {
  open: boolean;
  url: string;
  name?: string;
  onClose: () => void;
}

export function Share({ open, url, name, onClose }: ShareProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const text = name ? t("share.text", { name }) : "hevai";

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const qr = useMemo(() => {
    if (!url) return "";
    const code = qrcode(0, "M");
    code.addData(url);
    code.make();
    return code.createDataURL(5, 8);
  }, [url]);

  if (!open) return null;

  const encoded = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const writeClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // non-fatal
    }
  };

  const copy = async () => {
    await writeClipboard();
    setCopied(true);
    toast.success(t("share.copied"));
    window.setTimeout(() => setCopied(false), 2_000);
  };

  const openExternal = async (href: string) => {
    if (isDesktop()) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(href);
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: text, text, url });
    } catch {
      // dismissed — ignore
    }
  };

  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const pasteTo = async (href: string, hint: string) => {
    await writeClipboard();
    await openExternal(href);
    toast.success(hint);
  };

  const targets: Array<{ id: string; label: string; icon: ReactNode; run: () => void }> = [
    ...(canNative
      ? [
        {
          id: "system",
          label: t("share.system"),
          icon: <Share2 size={20} />,
          run: () => void nativeShare(),
        },
      ]
      : []),
    {
      id: "email",
      label: t("share.email"),
      icon: <Mail size={20} />,
      run: () => void openExternal(`mailto:?subject=${encodedText}&body=${encoded}`),
    },
    {
      id: "sms",
      label: t("share.sms"),
      icon: <MessageSquare size={20} />,
      run: () => void openExternal(`sms:?&body=${encodedText}%20${encoded}`),
    },
    {
      id: "whatsapp",
      label: t("share.whatsapp"),
      icon: <Brand name="whatsapp" />,
      run: () => void openExternal(`https://wa.me/?text=${encodedText}%20${encoded}`),
    },
    {
      id: "telegram",
      label: t("share.telegram"),
      icon: <Brand name="telegram" />,
      run: () => void openExternal(`https://t.me/share/url?url=${encoded}&text=${encodedText}`),
    },
    {
      id: "x",
      label: t("share.x"),
      icon: <Brand name="x" />,
      run: () => void openExternal(`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedText}`),
    },
    {
      id: "linkedin",
      label: t("share.linkedin"),
      icon: <Brand name="linkedin" />,
      run: () => void openExternal(`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`),
    },
    {
      id: "reddit",
      label: t("share.reddit"),
      icon: <Brand name="reddit" />,
      run: () => void openExternal(`https://reddit.com/submit?url=${encoded}&title=${encodedText}`),
    },
    {
      id: "facebook",
      label: t("share.facebook"),
      icon: <Brand name="facebook" />,
      run: () => void openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`),
    },
    {
      id: "discord",
      label: t("share.discord"),
      icon: <Brand name="discord" />,
      run: () => void pasteTo("https://discord.com/channels/@me", t("share.discordHint")),
    },
    {
      id: "slack",
      label: t("share.slack"),
      icon: <Brand name="slack" />,
      run: () => void pasteTo("https://app.slack.com/client", t("share.slackHint")),
    },
  ];

  return (
    <div className="overlay" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal share" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{t("share.title")}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body share-body">
          <div className="share-url">
            <span className="share-link">{url}</span>
            <button type="button" className="btn btn-primary share-copy" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t("share.copied") : t("share.copy")}
            </button>
          </div>
          {qr ? (
            <div className="share-qr">
              <img src={qr} alt={t("share.qr")} />
              <span className="share-qr-label">{t("share.qr")}</span>
            </div>
          ) : null}
          <div className="share-grid">
            {targets.map((target) => (
              <button key={target.id} type="button" className="share-target" onClick={target.run}>
                <span className="share-icon">{target.icon}</span>
                <span className="share-label">{target.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
