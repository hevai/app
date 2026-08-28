import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Block, Component, Dated, Field, Pair, Rank, Slice } from "@/types";
import { Bars } from "./bars";
import { uid } from "@/schema";
import { BRIEF_WORDS, countWords, normalizeData } from "@/lib/utils";

interface Patch {
  brief: string;
  data: Record<string, unknown>;
  options: Record<string, string[]>;
}

interface EditorProps {
  block: Block;
  component?: Component;
  open: boolean;
  submitLabel?: string;
  onClose: () => void;
  onSave: (patch: Patch) => void;
}

function FieldLabel({ field }: { field: Field }) {
  return <label className="label" htmlFor={`field-${field.name}`}>{field.label}</label>;
}

export function Editor({ block, component, open, submitLabel = "Save", onClose, onSave }: EditorProps) {
  const [brief, setBrief] = useState(block.brief ?? "");
  const [data, setData] = useState<Record<string, unknown>>(() => normalizeData(block.data, component));
  const [options, setOptions] = useState<Record<string, string[]>>(block.options ?? {});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of component?.fields ?? []) {
      const base = block.options?.[field.name] ?? field.options ?? [];
      if (base.length > 0) initial[field.name] = base[0];
    }
    return initial;
  });
  const [dates, setDates] = useState<Record<string, string>>({});

  if (!open) return null;

  const words = countWords(brief);
  const briefValid = words >= BRIEF_WORDS;

  const setField = (name: string, value: unknown) =>
    setData((current) => ({ ...current, [name]: value }));

  const setText = (key: string, value: string) =>
    setTexts((current) => ({ ...current, [key]: value }));

  const optionsFor = (field: Field): string[] => options[field.name] ?? field.options ?? [];

  const rows = <T,>(field: Field): T[] => (Array.isArray(data[field.name]) ? (data[field.name] as T[]) : []);

  const removeAt = (field: Field, index: number) => {
    const list = [...rows<unknown>(field)];
    list.splice(index, 1);
    setField(field.name, list);
  };

  const addString = (field: Field) => {
    const value = (texts[field.name] ?? "").trim();
    if (!value) return;
    setField(field.name, [...rows<string>(field), value]);
    setText(field.name, "");
  };

  const addMember = (field: Field) => {
    const name = (texts[field.name] ?? "").trim();
    if (!name) return;
    const role = picks[field.name] ?? optionsFor(field)[0] ?? "";
    setField(field.name, [...rows<{ id: string; name: string; role: string }>(field), { id: uid(), name, role }]);
    setText(field.name, "");
  };

  const addPair = (field: Field) => {
    const label = (texts[field.name] ?? "").trim();
    if (!label) return;
    setField(field.name, [...rows<Pair>(field), { label, value: "" }]);
    setText(field.name, "");
  };

  const updatePair = (field: Field, index: number, patch: Partial<Pair>) => {
    setField(
      field.name,
      rows<Pair>(field).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addRank = (field: Field) => {
    const label = (texts[field.name] ?? "").trim();
    if (!label) return;
    const level = picks[field.name] ?? optionsFor(field)[0] ?? "";
    setField(field.name, [...rows<Rank>(field), { label, level }]);
    setText(field.name, "");
  };

  const updateRank = (field: Field, index: number, patch: Partial<Rank>) => {
    setField(
      field.name,
      rows<Rank>(field).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addDated = (field: Field) => {
    const label = (texts[field.name] ?? "").trim();
    if (!label) return;
    const level = picks[field.name] ?? optionsFor(field)[0] ?? "";
    setField(field.name, [...rows<Dated>(field), { label, date: dates[field.name] ?? "", level }]);
    setText(field.name, "");
    setDates((current) => ({ ...current, [field.name]: "" }));
  };

  const updateDated = (field: Field, index: number, patch: Partial<Dated>) => {
    setField(
      field.name,
      rows<Dated>(field).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const updateMember = (field: Field, index: number, patch: Partial<{ id: string; name: string; role: string }>) => {
    setField(
      field.name,
      rows<{ id: string; name: string; role: string }>(field).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addOption = (field: Field) => {
    const value = (texts[`${field.name}:option`] ?? "").trim();
    if (!value) return;
    const base = optionsFor(field);
    if (base.some((entry) => entry.toLowerCase() === value.toLowerCase())) return;
    setOptions((current) => ({ ...current, [field.name]: [...base, value] }));
    setText(`${field.name}:option`, "");
  };

  const removeOption = (field: Field, index: number) => {
    const next = [...optionsFor(field)];
    next.splice(index, 1);
    setOptions((current) => ({ ...current, [field.name]: next }));
  };

  const save = () => {
    if (!briefValid) return;
    const cleanOptions: Record<string, string[]> = {};
    for (const [name, list] of Object.entries(options)) {
      if (Array.isArray(list) && list.length > 0) cleanOptions[name] = list;
    }
    onSave({ brief: brief.trim(), data, options: cleanOptions });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-titles">
            <span className="modal-title">Fill {component?.label ?? block.title}</span>
            {component?.description ? <span className="modal-sub">{component.description}</span> : null}
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field-group" style={{ marginBottom: "var(--sp-3)" }}>
            <label className="label" htmlFor="field-brief">
              <span className="req" aria-hidden="true">*</span>
              Brief
            </label>
            <textarea
              id="field-brief"
              className="textarea"
              value={brief}
              autoFocus={words < BRIEF_WORDS}
              aria-required="true"
              placeholder="Short context for the block agent: what should it know about this area of the project?"
              onChange={(e) => setBrief(e.target.value)}
            />
            <span className="counter" data-ok={words >= BRIEF_WORDS || undefined}>
              {words}/{BRIEF_WORDS} words · feeds the block agent
            </span>
          </div>

          {component?.fields.map((field) => {
            const value = data[field.name];
            const fieldOptions = optionsFor(field);
            return (
              <div className="field-group" key={field.name} style={{ marginBottom: "var(--sp-3)" }}>
                <FieldLabel field={field} />

                {field.kind === "text" ? (
                  <textarea
                    id={`field-${field.name}`}
                    className="textarea"
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                ) : null}

                {field.kind === "number" ? (
                  <input
                    id={`field-${field.name}`}
                    className="input"
                    type="number"
                    value={typeof value === "number" ? value : 0}
                    onChange={(e) => setField(field.name, Number(e.target.value))}
                  />
                ) : null}

                {field.kind === "select" ? (
                  <select
                    id={`field-${field.name}`}
                    className="select"
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                  >
                    {fieldOptions.map((option) => (
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
                      {rows<string>(field).map((item, index) => (
                        <div className="row" key={index}>
                          <span className="row-dot" />
                          <span className="row-label">{item}</span>
                          <button
                            type="button"
                            className="card-tool"
                            onClick={() => removeAt(field, index)}
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        id={`field-${field.name}`}
                        className="input"
                        value={texts[field.name] ?? ""}
                        placeholder={`Add ${field.label.toLowerCase()}`}
                        onChange={(e) => setText(field.name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addString(field);
                        }}
                      />
                      <button type="button" className="btn btn-icon" onClick={() => addString(field)} aria-label="Add">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {field.kind === "roles" ? (
                  <div>
                    <div className="rows" style={{ marginBottom: "var(--sp-2)" }}>
                      {rows<{ name: string; role: string }>(field).map((member, index) => (
                        <div className="row" key={index}>
                          <span className="row-label">{member.name}</span>
                          <select
                            className="select row-select"
                            value={member.role}
                            onChange={(e) => updateMember(field, index, { role: e.target.value })}
                            aria-label={`Role for ${member.name}`}
                          >
                            {member.role && !fieldOptions.includes(member.role) ? (
                              <option value={member.role}>{member.role}</option>
                            ) : null}
                            {fieldOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="card-tool"
                            onClick={() => removeAt(field, index)}
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        id={`field-${field.name}`}
                        className="input"
                        value={texts[field.name] ?? ""}
                        placeholder="Member name"
                        onChange={(e) => setText(field.name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addMember(field);
                        }}
                      />
                      <select
                        className="select"
                        style={{ width: 130 }}
                        value={picks[field.name] ?? fieldOptions[0] ?? ""}
                        onChange={(e) => setPicks((current) => ({ ...current, [field.name]: e.target.value }))}
                      >
                        {fieldOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-icon" onClick={() => addMember(field)} aria-label="Add member">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {field.kind === "pairs" ? (
                  <div>
                    <div className="rows" style={{ marginBottom: "var(--sp-2)" }}>
                      {rows<Pair>(field).map((row, index) => (
                        <div className="row" key={index}>
                          <input
                            className="input row-input"
                            value={row.label}
                            placeholder="Name"
                            onChange={(e) => updatePair(field, index, { label: e.target.value })}
                          />
                          <input
                            className="input row-input"
                            value={row.value}
                            placeholder="Target / value"
                            onChange={(e) => updatePair(field, index, { value: e.target.value })}
                          />
                          <button
                            type="button"
                            className="card-tool"
                            onClick={() => removeAt(field, index)}
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        id={`field-${field.name}`}
                        className="input"
                        value={texts[field.name] ?? ""}
                        placeholder={`Add ${field.label.toLowerCase()}`}
                        onChange={(e) => setText(field.name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addPair(field);
                        }}
                      />
                      <button type="button" className="btn btn-icon" onClick={() => addPair(field)} aria-label="Add">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {field.kind === "ranked" ? (
                  <div>
                    <div className="rows" style={{ marginBottom: "var(--sp-2)" }}>
                      {rows<Rank>(field).map((row, index) => (
                        <div className="row" key={index}>
                          <input
                            className="input row-input"
                            value={row.label}
                            placeholder={field.label}
                            onChange={(e) => updateRank(field, index, { label: e.target.value })}
                          />
                          <select
                            className="select row-select"
                            value={row.level}
                            onChange={(e) => updateRank(field, index, { level: e.target.value })}
                          >
                            <option value="">level</option>
                            {fieldOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="card-tool"
                            onClick={() => removeAt(field, index)}
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        id={`field-${field.name}`}
                        className="input"
                        value={texts[field.name] ?? ""}
                        placeholder={`Add ${field.label.toLowerCase()}`}
                        onChange={(e) => setText(field.name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addRank(field);
                        }}
                      />
                      <select
                        className="select"
                        style={{ width: 110 }}
                        value={picks[field.name] ?? fieldOptions[0] ?? ""}
                        onChange={(e) => setPicks((current) => ({ ...current, [field.name]: e.target.value }))}
                      >
                        {fieldOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-icon" onClick={() => addRank(field)} aria-label="Add">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {field.kind === "dated" ? (
                  <div>
                    <div className="rows" style={{ marginBottom: "var(--sp-2)" }}>
                      {rows<Dated>(field).map((row, index) => (
                        <div className="row" key={index}>
                          <input
                            className="input row-input"
                            value={row.label}
                            placeholder={field.label}
                            onChange={(e) => updateDated(field, index, { label: e.target.value })}
                          />
                          <input
                            className="input row-date"
                            type="date"
                            value={row.date}
                            onChange={(e) => updateDated(field, index, { date: e.target.value })}
                          />
                          <select
                            className="select row-select"
                            value={row.level}
                            onChange={(e) => updateDated(field, index, { level: e.target.value })}
                          >
                            <option value="">status</option>
                            {fieldOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="card-tool"
                            onClick={() => removeAt(field, index)}
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        id={`field-${field.name}`}
                        className="input"
                        value={texts[field.name] ?? ""}
                        placeholder={`Add ${field.label.toLowerCase()}`}
                        onChange={(e) => setText(field.name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addDated(field);
                        }}
                      />
                      <input
                        className="input row-date"
                        type="date"
                        value={dates[field.name] ?? ""}
                        onChange={(e) => setDates((current) => ({ ...current, [field.name]: e.target.value }))}
                      />
                      <select
                        className="select"
                        style={{ width: 110 }}
                        value={picks[field.name] ?? fieldOptions[0] ?? ""}
                        onChange={(e) => setPicks((current) => ({ ...current, [field.name]: e.target.value }))}
                      >
                        {fieldOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-icon" onClick={() => addDated(field)} aria-label="Add">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {field.open && field.kind !== "bars" && fieldOptions.length > 0 ? (
                  <div className="options-editor">
                    <span className="hint">Customize {field.label.toLowerCase()} options · saved with this block</span>
                    <div className="tags">
                      {fieldOptions.map((option, index) => (
                        <span className="chip" key={option}>
                          {option}
                          <button
                            type="button"
                            className="chip-x"
                            onClick={() => removeOption(field, index)}
                            aria-label={`Remove ${option}`}
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <input
                        className="input"
                        value={texts[`${field.name}:option`] ?? ""}
                        placeholder="Add option"
                        onChange={(e) => setText(`${field.name}:option`, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addOption(field);
                        }}
                      />
                      <button type="button" className="btn btn-icon" onClick={() => addOption(field)} aria-label="Add option">
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
          <span className="hint" style={{ marginRight: "auto" }}>
            <span className="req">*</span> brief needs at least {BRIEF_WORDS} words
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!briefValid} onClick={save}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
