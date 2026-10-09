"use client";
import { useApp } from "./provider";
import { translateUi } from "@/lib/translations";
export function UiText({ text }: { text: string }) {
  const { lang } = useApp();
  return translateUi(text, lang);
}
