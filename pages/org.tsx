import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Check, Copy, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useScope } from "@/contexts/scope";
import { useIdentity } from "@/contexts/identity";
import { Empty } from "@/components/empty";
import { Confirm } from "@/components/confirm";
import { ImagePicker } from "@/components/image-picker";
import { initials } from "@/lib/utils";
import type { Role } from "@/types";

const ROLES: Role[] = ["admin", "editor", "viewer"];

const inviteBase = (import.meta.env.VITE_INVITE_URL ?? "https://hevai.org/invite").replace(/\/+$/, "");

function CreateOrg() {
  const { createOrg } = useScope();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Name your organization first.");
      return;
    }
    const org = createOrg(name.trim());
    navigate(`/org/${org.id}`);
  };

  return (
    <Empty
      icon="building"
      title="Create an organization"
      description="An organization lets you invite teammates and share projects together."
      action={
        <div style={{ display: "flex", gap: "var(--sp-2)", width: "min(360px, 90%)" }}>
          <input
            className="input"
            value={name}
            placeholder="Organization name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            Create
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
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!isConnected) {
    return (
      <Empty
        icon="building"
        title="Connect to manage organizations"
        description="Your organizations appear after your wallet is connected."
      />
    );
  }

  if (id === "new") {
    return <CreateOrg />;
  }

  const org = id ? getOrg(id) : undefined;
  if (!org) {
    return <Empty icon="alert" title="Organization not found" description="It may have been removed." />;
  }

  const orgInvites = invites.filter((invite) => invite.org === org.id);

  const startRename = () => {
    setNameDraft(org.name);
    setRenaming(true);
  };

  const saveRename = () => {
    if (!nameDraft.trim()) {
      toast.error("The organization needs a name.");
      return;
    }
    updateOrg(org.id, { name: nameDraft.trim() });
    setRenaming(false);
  };

  const handleInvite = () => {
    const invite = createInvite(org.id, role);
    const link = `${inviteBase}/${invite.code}`;
    navigator.clipboard?.writeText(link).catch(() => undefined);
    toast.success("Invite link copied", { description: link });
  };

  return (
    <div className="org-page">
      <div className="card">
        <div className="card-head">
          <ImagePicker
            image={org.image}
            size={30}
            shape="circle"
            label="Change organization logo"
            fallback={<span style={{ fontSize: "var(--fs-xs)", fontWeight: 600 }}>{initials(org.name)}</span>}
            onPick={(url) => {
              updateOrg(org.id, { image: url });
              toast.success("Organization logo updated");
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
              <button type="button" className="btn btn-icon" onClick={saveRename} aria-label="Save name">
                <Check size={15} />
              </button>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => setRenaming(false)} aria-label="Cancel rename">
                <X size={15} />
              </button>
            </span>
          ) : (
            <>
              <span className="card-title">{org.name}</span>
              <span className="card-actions" style={{ opacity: 1 }}>
                <button type="button" className="card-tool" onClick={startRename} aria-label="Rename organization">
                  <Pencil size={14} />
                </button>
              </span>
            </>
          )}
          <span className="chip" data-tone="accent">
            {org.members.length} member{org.members.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="rows">
          {org.members.map((member) => (
            <div className="row" key={member.id}>
              <span className="avatar" style={{ width: 22, height: 22 }}>
                {initials(member.name)}
              </span>
              <span className="row-label">{member.name}</span>
              <span className="chip" data-tone="accent">
                {member.role}
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
          <span className="card-title">Invite a teammate</span>
        </div>
        <div className="card-body">
          Anyone with the link can join and choose how to sign in — they pick their own credentials.
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
          <select className="select" style={{ width: 140 }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={handleInvite}>
            <Copy size={14} />
            Copy invite link
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
                <span className="chip">{invite.role}</span>
                <button type="button" className="card-tool" onClick={() => revokeInvite(invite.id)} aria-label="Revoke invite">
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
          <span className="card-title">Organization projects</span>
        </div>
        <div className="card-body">
          Shared projects arrive in the next iteration — for now projects live in your personal workspace.
        </div>
      </div>

      <div className="card danger-zone">
        <div className="card-head">
          <span className="card-title" style={{ color: "var(--danger)" }}>
            Danger zone
          </span>
        </div>
        <div
          className="card-body"
          style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap" }}
        >
          <span style={{ flex: 1, minWidth: 200 }}>
            Deleting this organization removes it for every member. This cannot be undone.
          </span>
          <button type="button" className="btn btn-danger-fill" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} />
            Delete organization
          </button>
        </div>
      </div>

      <Confirm
        open={deleteOpen}
        title="Delete organization"
        description={`"${org.name}" will be permanently deleted, and its members will lose access. This cannot be undone.`}
        confirmLabel="Delete organization"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteOrg(org.id);
          toast.success("Organization deleted");
          setDeleteOpen(false);
          navigate("/");
        }}
      />
    </div>
  );
}
