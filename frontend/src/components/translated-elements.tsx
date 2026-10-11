"use client";

import { createElement, ComponentPropsWithRef } from "react";
import { useApp } from "./provider";
import { translateUi } from "@/lib/translations";

function translatedElement<
  Tag extends "input" | "select" | "textarea" | "button" | "img" | "form",
>(tag: Tag) {
  return function TranslatedElement(props: ComponentPropsWithRef<Tag>) {
    const { lang } = useApp();
    const attributes = { ...props } as Record<string, unknown>;
    for (const name of ["placeholder", "title", "aria-label", "alt"]) {
      if (typeof attributes[name] === "string")
        attributes[name] = translateUi(attributes[name], lang);
    }
    return createElement(tag, attributes);
  };
}

export const TranslatedInput = translatedElement("input");
export const TranslatedSelect = translatedElement("select");
export const TranslatedTextarea = translatedElement("textarea");
export const TranslatedButton = translatedElement("button");
export const TranslatedImg = translatedElement("img");
export const TranslatedForm = translatedElement("form");
