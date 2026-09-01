import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Check, Pencil, Share2, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/hooks/use-scope";
import { useIdentity } from "@/hooks/use-identity";
import { useLocale } from "@/hooks/use-locale";
import { Empty } from "@/components/empty";
import { Confirm } from "@/components/confirm";
import { ImagePicker } from "@/components/image-picker";
import { Share } from "@/components/share";
import { initials } from "@/lib/utils";
import type { Role } from "@/types";

const ROLES: Role[] = ["admin", "editor", "viewer"];

const webBase = (import.meta.env.VITE_WEB_APP_URL ?? "https://app.hevai.org").replace(/\/+$/, "");
const inviteBase = `${webBase}/invite`;

function CreateOrg() {
  const { createOrg } = useScope();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error(t("org.nameFirst"));
      return;
    }
    const org = createOrg(name.trim());
    navigate(`/org/${org.id}`);
  };

  return (
    <Empty
      icon="building"
      title={t("org.create.title")}
      description={t("org.create.desc")}
      action={
        <div style={{ display: "flex", gap: "var(--sp-2)", width: "min(360px, 90%)" }}>
          <input
            className="input"
            value={name}
            placeholder={t("org.create.placeholder")}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            {t("org.create.action")}
          </button>
        </div>
      }
    />
  );
}

export function OrgPage() {
  const { id } = useParams<{ id: string }>();
  const { getOrg, updateOrg, deleteOrg, invites, createInvite, revokeInvite } = useScope();
  const { isConnected } = useIdentity();
  const { t, err, roleLabel, memberName, formatExpiry } = useLocale();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  if (!isConnected) {
    return (
      <Empty
        icon="building"
        title={t("org.connect.title")}
        description={t("org.connect.desc")}
      />
    );
  }

  if (id === "new") {
    return <CreateOrg />;
  }

  const org = id ? getOrg(id) : undefined;
  if (!org) {
    return <Empty icon="alert" title={t("org.notFound")} description={t("org.removed")} />;
  }

  const orgInvites = invites.filter((invite) => invite.org === org.id);

  const startRename = () => {
    setNameDraft(org.name);
    setRenaming(true);
  };

  const saveRename = () => {
    if (!nameDraft.trim()) {
      toast.error(t("org.needsName"));
      return;
    }
    updateOrg(org.id, { name: nameDraft.trim() });
    setRenaming(false);
  };

  const handleInvite = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const invite = await createInvite(org.id, role);
      setShared(`${inviteBase}/${invite.code}`);
    } catch (error) {
      toast.error(err(error, "org.invite.failed"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="org-page">
      <div className="card">
        <div className="card-head">
          <ImagePicker
            image={org.image}
            size={30}
            shape="circle"
            label={t("org.changeLogo")}
            fallback={<span style={{ fontSize: "var(--fs-xs)", fontWeight: 600 }}>{initials(org.name)}</span>}
            onPick={(url) => {
              updateOrg(org.id, { image: url });
              toast.success(t("org.logoUpdated"));
            }}
          />
          {renaming ? (
            <span style={{ display: "flex", gap: "var(--sp-2)", flex: 1, minWidth: 0 }}>
              <input
                className="input"
                value={nameDraft}
                autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
              />
              <button type="button" className="btn btn-icon" onClick={saveRename} aria-label={t("org.saveName")}>
                <Check size={15} />
              </button>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => setRenaming(false)} aria-label={t("org.cancelRename")}>
                <X size={15} />
              </button>
            </span>
          ) : (
            <>
              <span className="card-title">{org.name}</span>
              <span className="card-actions" style={{ opacity: 1 }}>
                <button type="button" className="card-tool" onClick={startRename} aria-label={t("org.rename")}>
                  <Pencil size={14} />
                </button>
              </span>
            </>
          )}
          <span className="chip" data-tone="accent">
            {t(org.members.length === 1 ? "org.members.one" : "org.members.many", {
              count: org.members.length,
            })}
          </span>
        </div>
        <div className="rows">
          {org.members.map((member) => (
            <div className="row" key={member.id}>
              <span className="avatar" style={{ width: 22, height: 22 }}>
                {initials(member.name)}
              </span>
              <span className="row-label">{memberName(member.name)}</span>
              <span className="chip" data-tone="accent">
                {roleLabel(member.role)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-icon">
            <UserPlus size={16} />
          </span>
          <span className="card-title">{t("org.invite.title")}</span>
        </div>
        <div className="card-body">
          {t("org.invite.desc")}
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-2)", flexWrap: "wrap" }}>
          <select className="select" style={{ minWidth: 140 }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={handleInvite} disabled={creating}>
            <UserPlus size={14} />
            {creating ? t("common.working") : t("org.invite.create")}
          </button>
        </div>

        {orgInvites.length > 0 ? (
          <div className="rows" style={{ marginTop: "var(--sp-3)" }}>
            {orgInvites.map((invite) => (
              <div className="row" key={invite.id}>
                <span className="row-dot" />
                <span className="row-label" style={{ fontFamily: "var(--mono)" }}>
                  {inviteBase}/{invite.code}
                </span>
                <span className="chip">{roleLabel(invite.role)}</span>
                <span className="chip">{formatExpiry(invite.expires)}</span>
                <button
                  type="button"
                  className="card-tool"
                  onClick={() => setShared(`${inviteBase}/${invite.code}`)}
                  aria-label={t("org.invite.share")}
                >
                  <Share2 size={13} />
                </button>
                <button type="button" className="card-tool" onClick={() => revokeInvite(invite.code)} aria-label={t("org.invite.revoke")}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-icon">
            <Building2 size={16} />
          </span>
          <span className="card-title">{t("org.projects.title")}</span>
        </div>
        <div className="card-body">
          {t("org.projects.desc")}
        </div>
      </div>

      <div className="card danger-zone">
        <div className="card-head">
          <span className="card-title" style={{ color: "var(--danger)" }}>
            {t("org.danger")}
          </span>
        </div>
        <div
          className="card-body"
          style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap" }}
        >
          <span style={{ flex: 1, minWidth: 200 }}>
            {t("org.danger.desc")}
          </span>
          <button type="button" className="btn btn-danger-fill" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} />
            {t("org.deleteConfirm")}
          </button>
        </div>
      </div>

      <Share open={shared !== null} url={shared ?? ""} name={org.name} onClose={() => setShared(null)} />

      <Confirm
        open={deleteOpen}
        title={t("org.deleteTitle")}
        description={t("org.deleteDesc", { name: org.name })}
        confirmLabel={t("org.deleteConfirm")}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteOrg(org.id);
          toast.success(t("org.deleted"));
          setDeleteOpen(false);
          navigate("/");
        }}
      />
    </div>
  );
}
