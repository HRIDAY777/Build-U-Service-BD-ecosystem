"use client";
import { TranslatedInput } from "@/components/translated-elements";

import { UiText } from "@/components/ui-text";

import { useEffect, useId, useRef, useState } from "react";
import { Text, useApp } from "./provider";
import { translateUi } from "@/lib/translations";
import { DistrictPhoto } from "./district-photo";

type Place = {
  id: number;
  name: string;
  bnName: string;
  aliases?: string[];
  districts?: Place[];
  upazilas?: Place[];
  areas?: Place[];
};
type Geography = { divisions: Place[] };
let cached: Promise<Geography> | undefined;
function geography() {
  if (!cached)
    cached = fetch("/data/bangladesh/locations.json")
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load location names");
        return response.json() as Promise<Geography>;
      })
      .catch((error) => {
        cached = undefined;
        throw error;
      });
  return cached;
}
const label = (place: Place, lang: "bn" | "en") =>
  lang === "bn" ? place.bnName : place.name;

function PlaceSelect({
  title,
  options,
  value,
  onChange,
  disabled,
}: {
  title: string;
  options: Place[];
  value: Place | null;
  onChange: (place: Place | null) => void;
  disabled: boolean;
}) {
  const { lang } = useApp();
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = options.filter((place) =>
    [place.name, place.bnName, ...(place.aliases || [])].some((name) =>
      name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    ),
  );
  function choose(place: Place) {
    onChange(place);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }
  return (
    <div className="field location-select">
      <label htmlFor={id}>
        <UiText text={title} />
      </label>
      <TranslatedInput
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 && matches[active]
            ? `${id}-${matches[active].id}`
            : undefined
        }
        autoComplete="off"
        disabled={disabled}
        value={value ? label(value, lang) : query}
        placeholder="খুঁজুন বা তালিকা থেকে বাছুন / Search or select"
        maxLength={100}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            const next = Math.max(
              0,
              Math.min(
                matches.length - 1,
                active + (e.key === "ArrowDown" ? 1 : -1),
              ),
            );
            setActive(next);
            document
              .getElementById(`${id}-${matches[next]?.id}`)
              ?.scrollIntoView({ block: "nearest" });
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (matches[active >= 0 ? active : 0])
              choose(matches[active >= 0 ? active : 0]);
          }
        }}
      />
      {open && (
        <div
          id={`${id}-list`}
          className="location-options"
          role="listbox"
          aria-label={translateUi(title, lang)}
        >
          {matches.map((place, index) => (
            <button
              type="button"
              role="option"
              aria-selected={value?.id === place.id}
              id={`${id}-${place.id}`}
              key={place.id}
              className={active === index ? "active" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(place)}
            >
              {label(place, lang)}
            </button>
          ))}
          {!matches.length && (
            <p>
              <UiText
                text={"নাম পাওয়া যায়নি—নিচে লিখুন / Not listed? Enter below."}
              />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function LocationPicker({
  prefix = "",
  districtField = false,
  defaultDistrict = "",
  onSelectionChange,
}: {
  prefix?: string;
  districtField?: boolean;
  defaultDistrict?: string;
  onSelectionChange?: (selection: {
    district: string;
    districtNames: string[];
    localities: string[];
  }) => void;
}) {
  const { lang } = useApp();
  const root = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Geography | null>(null);
  const [error, setError] = useState(false);
  const [division, setDivision] = useState<Place | null>(null);
  const [district, setDistrict] = useState<Place | null>(null);
  const [upazila, setUpazila] = useState<Place | null>(null);
  const [union, setUnion] = useState<Place | null>(null);
  const [village, setVillage] = useState("");
  useEffect(() => {
    let current = true;
    geography()
      .then((value) => {
        if (current) setData(value);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => {
    const form = root.current?.closest("form");
    const reset = () => {
      setDivision(null);
      setDistrict(null);
      setUpazila(null);
      setUnion(null);
      setVillage("");
    };
    form?.addEventListener("reset", reset);
    form?.addEventListener("address:reset", reset);
    return () => {
      form?.removeEventListener("reset", reset);
      form?.removeEventListener("address:reset", reset);
    };
  }, []);
  const selected = [
    village.trim(),
    union?.bnName,
    upazila?.bnName,
    district?.bnName,
    division?.bnName,
  ]
    .filter(Boolean)
    .join(", ");
  useEffect(() => {
    onSelectionChange?.({
      district: district?.name || "",
      districtNames: district
        ? [district.name, district.bnName, ...(district.aliases || [])]
        : [],
      localities: [
        village.trim(),
        union?.name,
        union?.bnName,
        upazila?.name,
        upazila?.bnName,
      ].filter((value): value is string => !!value),
    });
  }, [district, upazila, union, village, onSelectionChange]);
  return (
    <div className="wide location-picker" ref={root}>
      <h4>
        <Text bn="বাংলাদেশের ঠিকানা বাছুন" en="Select a Bangladesh location" />
      </h4>
      {error ? (
        <p role="alert">
          <UiText
            text={
              "এলাকার তালিকা আসেনি। সম্পূর্ণ ঠিকানা লিখুন। / Location list unavailable; enter the full address."
            }
          />
        </p>
      ) : (
        !data && (
          <p>
            <UiText text={"এলাকার নাম লোড হচ্ছে… / Loading locations…"} />
          </p>
        )
      )}
      <div className="form-grid">
        <PlaceSelect
          title="বিভাগ / Division"
          options={data?.divisions || []}
          value={division}
          disabled={!data}
          onChange={(value) => {
            setDivision(value);
            setVillage("");
            setDistrict(null);
            setUpazila(null);
            setUnion(null);
          }}
        />
        <PlaceSelect
          key={`district-${division?.id}`}
          title="জেলা / District"
          options={division?.districts || []}
          value={district}
          disabled={!division}
          onChange={(value) => {
            setDistrict(value);
            setVillage("");
            setUpazila(null);
            setUnion(null);
          }}
        />
        <PlaceSelect
          key={`upazila-${district?.id}`}
          title="উপজেলা / থানা / Upazila or thana"
          options={district?.upazilas || []}
          value={upazila}
          disabled={!district}
          onChange={(value) => {
            setUpazila(value);
            setVillage("");
            setUnion(null);
          }}
        />
        <PlaceSelect
          key={`union-${upazila?.id}`}
          title="ইউনিয়ন / পৌর এলাকা / Union or area"
          options={upazila?.areas || []}
          value={union}
          disabled={!upazila}
          onChange={setUnion}
        />
        <label className="field wide">
          <Text
            bn="গ্রাম / মহল্লার নাম (তালিকায় না থাকলে লিখুন)"
            en="Village / neighbourhood (enter if not listed)"
          />
          <TranslatedInput
            value={village}
            maxLength={120}
            placeholder="শুধু গ্রাম বা মহল্লার নাম / Village or neighbourhood only"
            onChange={(e) => setVillage(e.target.value)}
          />
        </label>
      </div>
      <input type="hidden" name={prefix + "geo_address"} value={selected} />
      {districtField && (
        <input
          type="hidden"
          name={prefix + "district"}
          value={district?.name || defaultDistrict}
        />
      )}
      {selected && (
        <p>
          {[
            village.trim(),
            union && label(union, lang),
            upazila && label(upazila, lang),
            district && label(district, lang),
            division && label(division, lang),
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      <DistrictPhoto districtId={district?.id} />
      <small>
        <Text
          bn="গ্রামের পূর্ণ তালিকা নেই—নামটি উপরের ঘরে একবার লিখুন। বাড়ি/রাস্তার তথ্য নিচে দিন; বাছাই করা জেলা-থানা আবার লিখতে হবে না।"
          en="Village lists are incomplete: enter the name once above. Add house/street details below; selected locations are included automatically."
        />
      </small>
    </div>
  );
}

export function addressLine(line: string, locality?: string) {
  const seen = new Set<string>();
  return [line, locality]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.normalize("NFC").toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

export function LocalityInput({
  name,
  defaultValue = "",
  required = false,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const { lang } = useApp();
  const id = useId();
  const [data, setData] = useState<Geography | null>(null);
  useEffect(() => {
    let current = true;
    geography()
      .then((value) => {
        if (current) setData(value);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);
  const places =
    data?.divisions
      .flatMap((division) =>
        (division.districts || []).flatMap((district) => [
          { place: district, context: label(division, lang) },
          ...(district.upazilas || []).flatMap((upazila) => [
            {
              place: upazila,
              context: `${label(district, lang)} · ${label(division, lang)}`,
            },
            ...(upazila.areas || []).map((area) => ({
              place: area,
              context: `${label(upazila, lang)}, ${label(district, lang)}`,
            })),
          ]),
        ]),
      )
      .sort((a, b) =>
        `${a.context} ${a.place.bnName}`.localeCompare(
          `${b.context} ${b.place.bnName}`,
          "bn",
        ),
      ) || [];
  return (
    <>
      <TranslatedInput
        name={name}
        list={id}
        maxLength={100}
        defaultValue={defaultValue}
        required={required}
        autoComplete="off"
        placeholder="এলাকার নাম খুঁজুন / Search locality"
      />
      <datalist id={id}>
        {places.map(({ place, context }, index) => (
          <option key={`${place.id}-${index}`} value={place.name}>
            {label(place, lang)} · {context}
          </option>
        ))}
      </datalist>
    </>
  );
}
