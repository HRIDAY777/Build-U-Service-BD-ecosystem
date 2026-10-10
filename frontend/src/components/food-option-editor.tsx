"use client";
import { useState } from "react";
import { api } from "@/lib/api";
type Choice = {
  id?: number;
  name: string;
  name_bn: string;
  price: string;
  active: boolean;
};
type Group = {
  id?: number;
  name: string;
  name_bn: string;
  min_choices: number;
  max_choices: number;
  active: boolean;
  options: Choice[];
};
export function FoodOptionEditor({ id }: { id: number }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const endpoint = `partner-offerings/${id}/food_options/`;
  async function load() {
    setBusy(true);
    try {
      setGroups(await api<Group[]>(endpoint));
      setMessage("");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  function edit(index: number, patch: Partial<Group>) {
    setGroups((rows) =>
      rows!.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  async function save() {
    setBusy(true);
    try {
      setGroups(await api<Group[]>(endpoint, "PUT", groups));
      setMessage("সংরক্ষিত হয়েছে / Saved");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Food options">
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={load}
      >
        খাবারের অপশন পরিচালনা / Manage food options
      </button>
      {message && <p role="status">{message}</p>}
      {groups && (
        <>
          <p>
            প্রতিটি অপশনের মূল্য খাবারের মূল্যের সাথে যোগ হবে। / Option prices
            are added to the meal price.
          </p>
          {groups.map((group, index) => (
            <fieldset key={group.id ?? `new-${index}`} disabled={busy}>
              <legend>অপশন গ্রুপ / Option group {index + 1}</legend>
              <div className="form-grid">
                <label className="field">
                  English name
                  <input
                    value={group.name}
                    maxLength={100}
                    onChange={(e) => edit(index, { name: e.target.value })}
                  />
                </label>
                <label className="field">
                  বাংলা নাম
                  <input
                    value={group.name_bn}
                    maxLength={100}
                    onChange={(e) => edit(index, { name_bn: e.target.value })}
                  />
                </label>
                <label className="field">
                  কমপক্ষে বাছাই / Minimum
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={group.min_choices}
                    onChange={(e) =>
                      edit(index, { min_choices: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  সর্বোচ্চ বাছাই / Maximum
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={group.max_choices}
                    onChange={(e) =>
                      edit(index, { max_choices: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={group.active}
                    onChange={(e) => edit(index, { active: e.target.checked })}
                  />
                  চালু / Active
                </label>
              </div>
              {group.options.map((option, n) => (
                <div className="form-grid" key={option.id ?? `new-${n}`}>
                  <label className="field">
                    Option name
                    <input
                      value={option.name}
                      maxLength={100}
                      onChange={(e) =>
                        edit(index, {
                          options: group.options.map((o, i) =>
                            i === n ? { ...o, name: e.target.value } : o,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    অপশনের বাংলা নাম
                    <input
                      value={option.name_bn}
                      maxLength={100}
                      onChange={(e) =>
                        edit(index, {
                          options: group.options.map((o, i) =>
                            i === n ? { ...o, name_bn: e.target.value } : o,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    অতিরিক্ত মূল্য / Extra price (৳)
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={option.price}
                      onChange={(e) =>
                        edit(index, {
                          options: group.options.map((o, i) =>
                            i === n ? { ...o, price: e.target.value } : o,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={option.active}
                      onChange={(e) =>
                        edit(index, {
                          options: group.options.map((o, i) =>
                            i === n ? { ...o, active: e.target.checked } : o,
                          ),
                        })
                      }
                    />
                    চালু / Active
                  </label>
                </div>
              ))}
              <button
                type="button"
                disabled={group.options.length >= 40}
                onClick={() =>
                  edit(index, {
                    options: [
                      ...group.options,
                      { name: "", name_bn: "", price: "0", active: true },
                    ],
                  })
                }
              >
                অপশন যোগ করুন / Add option
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={busy || groups.length >= 20}
            onClick={() =>
              setGroups([
                ...groups,
                {
                  name: "",
                  name_bn: "",
                  min_choices: 0,
                  max_choices: 1,
                  active: true,
                  options: [],
                },
              ])
            }
          >
            গ্রুপ যোগ করুন / Add group
          </button>
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={save}
          >
            সংরক্ষণ / Save options
          </button>
        </>
      )}
    </section>
  );
}
