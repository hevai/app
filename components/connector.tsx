import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { Building2, Check, Copy, LogOut, ChevronDown, Pencil, Plus, User, X } from "lucide-react";
import { toast } from "sonner";
import { client, getAccountAbstraction, getIdentityChain } from "@/lib/chains";
import { useIdentity } from "@/contexts/identity";
import { useScope } from "@/contexts/scope";
import { useSession } from "@/hooks/use-session";
import { getDeviceId, isDesktop } from "@/lib/platform";
import { useNetwork } from "@/contexts/network";
import { useLocale } from "@/contexts/locale";
import { Avatar } from "./avatar";
import { ImagePicker } from "./image-picker";
import { initials } from "@/lib/utils";

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "email",
        "google",
        "github",
        "apple",
        "discord",
        "x",
        "farcaster",
        "passkey",
        "guest",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("walletConnect"),
  createWallet("io.rabby"),
  createWallet("me.rainbow"),
];

const theme = {
  type: "dark" as const,
  colors: {
    primaryButtonBg: "#f4a259",
    primaryButtonText: "#1a1208",
    accentButtonBg: "#191c21",
    accentButtonText: "#f5f4f2",
    accentText: "#f4a259",
    borderColor: "rgba(255,255,255,0.16)",
    separatorLine: "rgba(255,255,255,0.08)",
    modalBg: "#121417",
    modalOverlayBg: "rgba(6,7,9,0.66)",
    inputAutofillBg: "#191c21",
    secondaryButtonBg: "#191c21",
    secondaryButtonHoverBg: "#23272e",
    secondaryButtonText: "#f5f4f2",
    connectedButtonBg: "#121417",
    connectedButtonBgHover: "#191c21",
    secondaryText: "#9d9c99",
    primaryText: "#f5f4f2",
    danger: "#f0655a",
    success: "#4cc38a",
    selectedTextBg: "rgba(244,162,89,0.14)",
    selectedTextColor: "#f4a259",
    skeletonBg: "rgba(255,255,255,0.08)",
    tertiaryBg: "#0a0b0d",
    tooltipBg: "#191c21",
    tooltipText: "#f5f4f2",
    scrollbarBg: "rgba(255,255,255,0.08)",
    secondaryIconColor: "#9d9c99",
    secondaryIconHoverBg: "#191c21",
    secondaryIconHoverColor: "#f4a259",
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

export function Connector() {
  const { address, isConnected, isConnecting, disconnect, user, updateProfile } = useIdentity();
  const { orgs } = useScope();
  const { clearSession } = useSession();
  const { selectedNetwork } = useNetwork();
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const chain = getIdentityChain();
  const accountAbstraction = getAccountAbstraction();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!isConnected) {
    if (isDesktop()) {
      return (
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            const { openUrl } = await import("@tauri-apps/plugin-opener");
            const base = (import.meta.env.VITE_WEB_APP_URL ?? "https://app.hevai.org").replace(/\/+$/, "");
            const params = new URLSearchParams({ device_id: getDeviceId(), network: selectedNetwork });
            await openUrl(`${base}/connect-local?${params.toString()}`);
          }}
          >
          {t("connector.connect")}
        </button>
      );
    }
    if (!chain || !accountAbstraction) {
      return (
        <button type="button" className="btn" disabled>
          {isConnecting ? t("connector.signingIn") : t("connector.loading")}
        </button>
      );
    }
    return (
      <ConnectButton
        client={client}
        wallets={wallets}
        chain={chain}
        accountAbstraction={accountAbstraction}
        autoConnect
        connectButton={{
          label: t("connector.connect"),
          className: "btn btn-primary",
        }}
        connectModal={{
          size: "compact",
          title: t("connector.modalTitle"),
          titleIcon: undefined,
          showThirdwebBranding: false,
        }}
        theme={theme}
      />
    );
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const name = user?.name || user?.email || shortAddress;

  const isPersonal = location.pathname === "/";
  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <>
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <Avatar name={name} image={user?.image} />
        <span className="connector-name">{name}</span>
        <ChevronDown size={14} />
      </button>

      {menuOpen ? (
        <div className="menu" style={{ position: "absolute", right: 0, top: 40 }}>
          <div style={{ padding: "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600, fontFamily: user?.name ? undefined : "var(--mono)" }}>
                {user?.name || shortAddress}
              </span>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                style={{ width: 24, height: 24 }}
                aria-label={t("connector.copyAddress")}
                title={t("connector.copyAddress")}
                onClick={async () => {
                  if (!address) return;
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                  toast.success(t("connector.addressCopied"));
                  window.setTimeout(() => setCopied(false), 2_000);
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            {user?.email ? (
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                {user.email}
              </div>
            ) : null}
            <button
              type="button"
              className="menu-item"
              style={{ marginTop: 6 }}
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
            >
              <Pencil size={14} />
              {t("connector.editProfile")}
            </button>
          </div>
          <div className="menu-sep" />

          <div className="menu-label">{t("connector.workspace")}</div>
          <button
            type="button"
            className="menu-item"
            data-active={isPersonal || undefined}
            onClick={() => go("/")}
          >
            <User size={15} />
            <span style={{ flex: 1 }}>{t("connector.personal")}</span>
            {isPersonal ? <Check size={14} style={{ color: "var(--accent)" }} /> : null}
          </button>

          {orgs.length > 0 ? <div className="menu-label">{t("connector.organizations")}</div> : null}
          {orgs.map((org) => {
            const active = location.pathname === `/org/${org.id}`;
            return (
              <button
                key={org.id}
                type="button"
                className="menu-item"
                data-active={active || undefined}
                onClick={() => go(`/org/${org.id}`)}
              >
                {org.image ? (
                  <img src={org.image} alt="" style={{ width: 16, height: 16, borderRadius: "var(--r-sm)", objectFit: "cover" }} />
                ) : (
                  <Building2 size={15} />
                )}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {org.name}
                </span>
                {active ? <Check size={14} style={{ color: "var(--accent)" }} /> : null}
              </button>
            );
          })}
          <button type="button" className="menu-item" onClick={() => go("/org/new")}>
            <Plus size={15} />
            {t("connector.createOrg")}
          </button>

          <div className="menu-sep" />
          <button
            type="button"
            className="menu-item"
            data-danger="true"
            onClick={() => {
              setMenuOpen(false);
              clearSession();
              disconnect();
            }}
          >
            <LogOut size={15} />
            {t("connector.signOut")}
          </button>
        </div>
      ) : null}
    </div>

    <ProfileModal
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      name={user?.name ?? ""}
      image={user?.image ?? ""}
      onSave={async (patch) => {
        await updateProfile(patch);
        toast.success(t("connector.profileUpdated"));
        setProfileOpen(false);
      }}
    />
    </>
  );
}

function ProfileModal({
  open,
  onClose,
  name,
  image,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  image: string;
  onSave: (patch: { name?: string; image?: string }) => Promise<void>;
}) {
  const { t } = useLocale();
  const [nameDraft, setNameDraft] = useState("");
  const [imageDraft, setImageDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNameDraft(name);
      setImageDraft(image);
      setBusy(false);
    }
  }, [open, name, image]);

  if (!open) return null;

  const save = async () => {
    setBusy(true);
    try {
      const patch: { name?: string; image?: string } = {};
      if (nameDraft.trim() !== name) patch.name = nameDraft.trim();
      if (imageDraft !== image) patch.image = imageDraft;
      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }
      await onSave(patch);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{t("connector.editProfile")}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ImagePicker
              image={imageDraft}
              size={72}
              shape="circle"
              label={t("connector.changeAvatar")}
              fallback={<span style={{ fontSize: "var(--fs-lg)", fontWeight: 600 }}>{initials(nameDraft || "?")}</span>}
              onPick={(url) => setImageDraft(url)}
            />
          </div>
          {imageDraft ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: "center" }}
              onClick={() => setImageDraft("")}
            >
              {t("connector.removeAvatar")}
            </button>
          ) : null}
          <div className="field-group">
            <label className="label">{t("connector.displayName")}</label>
            <input
              className="input"
              value={nameDraft}
              placeholder={t("connector.namePlaceholder")}
              onChange={(e) => setNameDraft(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? t("connector.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
