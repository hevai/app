import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Block, Component, Slice } from "@/types";
import { Bars } from "./bars";

const ROLES = ["owner", "admin", "editor", "viewer"];

interface EditorProps {
  block: Block;
  component?: Component;
  open: boolean;
  onClose: () => void;
  onSave: (patch: { title: string; data: Record<string, unknown> }) => void;
}

export function Editor({ block, component, open, onClose, onSave }: EditorProps) {
  const [title, setTitle] = useState(block.title);
  const [data, setData] = useState<Record<string, unknown>>(block.data);
  const [newItem, setNewItem] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("editor");

  useEffect(() => {
    if (open) {
      setTitle(block.title);
      setData(block.data);
      setNewItem("");
      setMemberName("");
      setMemberRole("editor");
    }
  }, [open, block]);

  if (!open) return null;

  const setField = (name: string, value: unknown) =>
    setData((current) => ({ ...current, [name]: value }));

  const addString = (field: string) => {
    const value = newItem.trim();
    if (!value) return;
    const list = Array.isArray(data[field]) ? [...(data[field] as string[])] : [];
    setField(field, [...list, value]);
    setNewItem("");
  };

  const removeAt = (field: string, index: number) => {
    const list = Array.isArray(data[field]) ? [...(data[field] as unknown[])] : [];
    list.splice(index, 1);
    setField(field, list);
  };

  const addMember = (field: string) => {
    const name = memberName.trim();
    if (!name) return;
    const members = Array.isArray(data[field])
      ? [...(data[field] as { name: string; role: string }[])]
      : [];
    setField(field, [...members, { name, role: memberRole }]);
    setMemberName("");
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Edit {component?.label ?? block.title}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field-group" style={{ marginBottom: "var(--sp-3)" }}>
            <label className="label">Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {component?.fields.map((field) => {
            const value = data[field.name];
            return (
              <div className="field-group" key={field.name} style={{ marginBottom: "var(--sp-3)" }}>
                <label className="label">{field.label}</label>

                {field.kind === "text" ? (
                  <textarea
                    className="textarea"
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                ) : null}

                {field.kind === "number" ? (
                  <input
                    className="input"
                    type="number"
                    value={typeof value === "number" ? value : 0}
                    onChange={(e) => setField(field.name, Number(e.target.value))}
                  />
                ) : null}

                {field.kind === "select" ? (
                  <select
                    className="select"
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}

                {field.kind === "bars" ? (
                  <Bars
                    slices={Array.isArray(value) ? (value as Slice[]) : []}
                    editable
                    onChange={(slices) => setField(field.name, slices)}
                  />
                ) : null}

                {field.kind === "list" || field.kind === "tags" ? (
                  <div>
                    <div className="rows" style={{ marginBottom: "var(--sp-2)" }}>
                      {(Array.isArray(value) ? (value as string[]) : []).map((item, index) => (
                        <div className="row" key={index}>
                          <span className="row-dot" />
                          <span className="row-label">{item}</span>
                          <button
                            type="button"
                            className="card-tool"
                            onClick={() => removeAt(field.name, index)}
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        className="input"
                        value={newItem}
                        placeholder={`Add ${field.label.toLowerCase()}`}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addString(field.name);
                        }}
                      />
                      <button type="button" className="btn btn-icon" onClick={() => addString(field.name)} aria-label="Add">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {field.kind === "roles" ? (
                  <div>
                    <div className="rows" style={{ marginBottom: "var(--sp-2)" }}>
                      {(Array.isArray(value) ? (value as { name: string; role: string }[]) : []).map(
                        (member, index) => (
                          <div className="row" key={index}>
                            <span className="row-dot" />
                            <span className="row-label">{member.name}</span>
                            <span className="chip" data-tone="accent">
                              {member.role}
                            </span>
                            <button
                              type="button"
                              className="card-tool"
                              onClick={() => removeAt(field.name, index)}
                              aria-label="Remove"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        className="input"
                        value={memberName}
                        placeholder="Member name"
                        onChange={(e) => setMemberName(e.target.value)}
                      />
                      <select
                        className="select"
                        style={{ width: 120 }}
                        value={memberRole}
                        onChange={(e) => setMemberRole(e.target.value)}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-icon" onClick={() => addMember(field.name)} aria-label="Add member">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSave({ title, data })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
