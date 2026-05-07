import type { Metadata } from "next";
import { Scale } from "lucide-react";
import LegalPage from "../_landing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | Educatorio",
  description: "Review the terms that apply when using Educatorio courses, accounts, certificates, and organization workspaces.",
};

const sections = [
  {
    title: "Using Educatorio",
    body: [
      "These Terms of Service govern your access to Educatorio, including learner accounts, courses, assignments, certificates, messaging, organization workspaces, and related services. By creating an account or using the platform, you agree to follow these terms.",
      "You must provide accurate account information, keep your credentials secure, and use Educatorio only for lawful educational, professional, and organizational purposes.",
    ],
    items: [
      "You are responsible for activity under your account unless caused by our security failure.",
      "You may not share accounts, impersonate others, bypass access controls, or interfere with platform security.",
      "You must follow any additional course, class, organization, or instructor rules that apply to your use.",
    ],
  },
  {
    title: "Courses and Certificates",
    body: [
      "Educatorio provides access to learning materials, assessments, discussions, certificates, and progress tracking. Course availability, content, instructors, completion rules, and certificate requirements may change over time.",
      "Certificates reflect completion of the relevant course requirements in Educatorio. They do not guarantee employment, admission, professional licensing, salary outcomes, or third-party recognition unless expressly stated by the issuing partner.",
    ],
  },
  {
    title: "Payments and Subscriptions",
    body: [
      "Some features, certificates, organization seats, or courses may require payment. Prices, billing intervals, trial terms, renewal dates, and cancellation rules will be shown before purchase where applicable.",
      "Unless otherwise stated, subscription fees renew automatically until canceled. You are responsible for taxes, payment method accuracy, and any charges incurred before cancellation takes effect. Refunds are provided only when required by law or expressly stated in a purchase flow.",
    ],
  },
  {
    title: "Organizations and Classes",
    body: [
      "Organizations, schools, employers, and teachers may invite users, assign courses, review submissions, manage certificates, and access learning records for their workspace. If you join an organization, your use may also be subject to that organization's policies.",
      "Organization administrators are responsible for managing invitations, roles, content they upload, and their users' access. Educatorio may remove organization content or restrict access if we reasonably believe it violates these terms or applicable law.",
    ],
  },
  {
    title: "Your Content",
    body: [
      "You may submit assignments, messages, profile information, comments, course materials, organization materials, and other content. You retain ownership of your content, but you grant Educatorio a license to host, process, display, reproduce, and use it as needed to provide and improve the service.",
      "You represent that you have the necessary rights to upload your content and that it does not violate the law, infringe intellectual property rights, disclose confidential information without permission, or harm others.",
    ],
  },
  {
    title: "Acceptable Use",
    body: [
      "Educatorio should remain a safe and trustworthy learning environment. You may not misuse the platform, attack the service, scrape data at scale, upload malware, harass others, cheat on assessments, submit work that is not your own when originality is required, or use Educatorio to distribute illegal or harmful content.",
      "We may suspend or terminate accounts, remove content, limit features, or notify affected organizations when we reasonably believe these terms have been violated.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "Educatorio and its licensors own the platform, brand, software, design, course presentation, and related intellectual property. Except for rights expressly granted to you, no rights are transferred by these terms.",
      "Course content may be owned by Educatorio, instructors, partner organizations, or third-party licensors. You may use course materials for personal learning or authorized organizational training, but you may not copy, resell, redistribute, or publicly share them unless permitted.",
    ],
  },
  {
    title: "Disclaimers and Liability",
    body: [
      "Educatorio is provided on an as-is and as-available basis. We work to keep the platform reliable, but we do not guarantee uninterrupted access, error-free content, specific learning results, or that every course will meet your expectations.",
      "To the fullest extent permitted by law, Educatorio is not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost data, or business interruption arising from use of the service.",
    ],
  },
  {
    title: "Changes and Termination",
    body: [
      "We may update Educatorio, add or remove features, change these terms, or discontinue parts of the service. If changes are material, we will take reasonable steps to notify users. Continued use after changes become effective means you accept the updated terms.",
      "You may stop using Educatorio at any time. We may suspend or terminate access if required by law, if your use creates risk, or if you violate these terms. This page is provided as a practical template and should be reviewed with qualified counsel before production use.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title="The rules for learning, teaching, and building skills on Educatorio."
      description="These terms explain what users, teachers, and organizations can expect when accessing courses, certificates, subscriptions, and workspaces."
      updatedAt="May 4, 2026"
      icon={Scale}
      highlights={[
        "Use Educatorio for lawful learning, teaching, and organization training purposes.",
        "Certificates show course completion but do not guarantee employment, licensing, or third-party recognition.",
        "Organizations manage their own workspace users, roles, assignments, and uploaded content.",
      ]}
      sections={sections}
    />
  );
}
