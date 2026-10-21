"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  FileCheck2,
  FolderKanban,
  WalletCards,
} from "lucide-react";
import { useApp } from "./provider";

export function InvestorNavigation({ account = false }: { account?: boolean }) {
  const { lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  return (
    <nav
      className="investor-nav"
      aria-label={t("প্রজেক্ট নেভিগেশন", "Project navigation")}
    >
      <Link href="/projects" aria-current={!account ? "page" : undefined}>
        {t("পরিকল্পনা ও প্রকল্প", "Plans & projects")}
      </Link>
      <Link href="/project-account" aria-current={account ? "page" : undefined}>
        {t("আমার আবেদন ও হিসাব", "Applications & statements")}
      </Link>
      <Link href="/support">
        {t("সহায়তা", "Support")} <ArrowUpRight size={15} />
      </Link>
    </nav>
  );
}

export function InvestorGuide() {
  const { lang } = useApp();
  const t = (bn: string, en: string) => (lang === "bn" ? bn : en);
  return (
    <section className="investor-guide" aria-labelledby="investor-guide-title">
      <div>
        <span className="eyebrow">
          {t("পরিষ্কার প্রক্রিয়া", "A clear process")}
        </span>
        <h2 id="investor-guide-title">
          {t(
            "পরিকল্পনা থেকে নিজের হিসাব—এক জায়গায়",
            "From a plan to your own statement",
          )}
        </h2>
      </div>
      <div className="investor-steps">
        {[
          [
            FolderKanban,
            "০১",
            "01",
            "পরিকল্পনা বুঝে আবেদন",
            "Explore, then apply",
            "মূলধন, মেয়াদ ও নমুনা হিসাব দেখুন। নিজের অ্যাকাউন্ট থেকে বিবরণসহ আবেদন দিন।",
            "Review capital, duration and illustrations. Submit your project details from your account.",
          ],
          [
            FileCheck2,
            "০২",
            "02",
            "প্রকল্প ও চুক্তি পর্যালোচনা",
            "Review the project & agreement",
            "টিম প্রকল্প নির্ধারণ ও শর্ত যাচাই করবে। অনুমোদনের পরে ব্যক্তিগত PDF পড়ে সম্মতি দিন।",
            "The team assigns a project and reviews terms. Read your private PDF before acknowledging approval.",
          ],
          [
            WalletCards,
            "০৩",
            "03",
            "অগ্রগতি ও হিসাব অনুসরণ",
            "Follow progress & records",
            "শুরুর তারিখ নিশ্চিত হলে সময়সূচি দেখুন। নথিভুক্ত লেনদেন, আপডেট ও হিসাব ডাউনলোড করুন।",
            "Once the start date is confirmed, follow the schedule, recorded transactions and updates. Download your statement.",
          ],
        ].map(
          ([Icon, bnNumber, enNumber, bnTitle, enTitle, bnText, enText]) => {
            const Glyph = Icon as typeof FolderKanban;
            return (
              <article key={String(enNumber)}>
                <div className="investor-step-top">
                  <Glyph size={23} />
                  <span>{t(String(bnNumber), String(enNumber))}</span>
                </div>
                <h3>{t(String(bnTitle), String(enTitle))}</h3>
                <p>{t(String(bnText), String(enText))}</p>
              </article>
            );
          },
        )}
      </div>
      <details className="investor-help">
        <summary>
          {t(
            "আবেদনের আগে কী প্রস্তুত রাখব?",
            "What should I prepare before applying?",
          )}
        </summary>
        <p>
          {t(
            "নিজের নাম, যোগাযোগের নম্বর, ঠিকানা, নির্বাচিত পরিকল্পনা ও প্রকল্প সম্পর্কে প্রশ্ন প্রস্তুত রাখুন। টিম পর্যালোচনার সময় প্রয়োজনীয় নথি জানাবে। সহায়তার বার্তায় ব্যাংক পাসওয়ার্ড বা গোপন তথ্য দেবেন না।",
            "Have your name, phone, address, selected plan and project questions ready. The team will explain any documents needed during review. Do not include bank passwords or secrets in support messages.",
          )}
        </p>
      </details>
      <details className="investor-help">
        <summary>
          {t(
            "এখানে কি টাকা জমা বা উত্তোলন করা যাবে?",
            "Can I deposit or withdraw money here?",
          )}
        </summary>
        <p>
          {t(
            "এখন আবেদন, চুক্তি পর্যালোচনা ও টিমের নথিভুক্ত হিসাব দেখা যায়। অনলাইন অর্থ গ্রহণ, স্বয়ংক্রিয় পেআউট ও প্রত্যয়িত ডিজিটাল স্বাক্ষর এখনো চালু হয়নি। হিসাবের কোনো রেকর্ড নিজে থেকে টাকা পাঠায় না।",
            "Applications, agreement review and team-recorded statements are available. Online funding, automatic payouts and certified digital signing are not active. A statement entry does not transfer money.",
          )}
        </p>
      </details>
    </section>
  );
}

export function InvestorNextStep({
  status,
  accepted,
}: {
  status: string;
  accepted: boolean;
}) {
  const { lang } = useApp();
  const messages: Record<string, [string, string]> = {
    submitted: [
      "আবেদন জমা হয়েছে। টিমের পর্যালোচনার জন্য অপেক্ষা করুন; প্রয়োজনে নিচের ইতিহাসে আপডেট দেখুন।",
      "Application submitted. Await team review and follow updates in the history below.",
    ],
    reviewing: [
      "টিম আপনার আবেদন পর্যালোচনা করছে। অতিরিক্ত তথ্য চাইলে পর্যালোচনার নোটে দেখবেন।",
      "Your application is under review. Check the review note for any requested information.",
    ],
    approved: accepted
      ? [
          "আপনার সম্মতি সংরক্ষিত। অর্থের রেকর্ড ও শুরুর তারিখ টিম নিশ্চিত করলে অ্যাকাউন্ট চালু হবে।",
          "Your acknowledgement is saved. Activation awaits the team's funding records and confirmed start date.",
        ]
      : [
          "নিচে অনুমোদিত শর্ত ও ব্যক্তিগত চুক্তির PDF পড়ুন। সবকিছু মিললে নিজের নাম দিয়ে সম্মতি দিন।",
          "Read the approved terms and private agreement PDF below. Acknowledge with your name only after reviewing them.",
        ],
    active: [
      "অ্যাকাউন্ট চালু আছে। সময়সূচি, প্রকল্পের আপডেট ও নথিভুক্ত লেনদেন অনুসরণ করুন।",
      "Your account is active. Follow the schedule, project updates and recorded transactions.",
    ],
    completed: [
      "অ্যাকাউন্ট সম্পন্ন হিসেবে নথিভুক্ত। নিজের হিসাব ডাউনলোড করে সংরক্ষণ করতে পারেন।",
      "This account is recorded as completed. Download your statement for your records.",
    ],
    rejected: [
      "আবেদন অনুমোদিত হয়নি। নিচের পর্যালোচনার কারণ পড়ুন; প্রশ্ন থাকলে সহায়তায় যোগাযোগ করুন।",
      "This application was not approved. Read the review note below and contact support with any questions.",
    ],
    cancelled: [
      "আবেদন বাতিল হয়েছে। আগের হিসাব ও ইতিহাস এখানেই দেখা যাবে।",
      "This application was cancelled. Previous records and history remain available here.",
    ],
  };
  const message = messages[status];
  if (!message) return null;
  return (
    <aside className="investor-next-step">
      <strong>{lang === "bn" ? "আপনার পরবর্তী ধাপ" : "Your next step"}</strong>
      <p>{message[lang === "bn" ? 0 : 1]}</p>
    </aside>
  );
}
