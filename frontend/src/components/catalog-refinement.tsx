"use client";
import { ReactNode, useEffect, useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { Text } from "./provider";

export function CatalogRefinement({
  children,
  collapsed = false,
}: {
  children: ReactNode;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  useEffect(() => {
    const media = matchMedia("(min-width: 900px)");
    const sync = () => setOpen(!collapsed && media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [collapsed]);
  return (
    <aside className="catalog-refinement">
      <button
        type="button"
        className="catalog-refinement-toggle"
        aria-expanded={open}
        aria-controls="catalog-refinement-fields"
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal size={17} />
        <Text bn="খোঁজার শর্ত" en="Refine your search" />
        <ChevronDown size={17} />
      </button>
      <div id="catalog-refinement-fields" hidden={!open}>
        {children}
      </div>
    </aside>
  );
}
