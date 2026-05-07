import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import LegalPage from "../_landing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Educatorio",
  description: "Learn how Educatorio collects, uses, and protects learner and organization data.",
};

const sections = [
  {
    title: "Information We Collect",
    body: [
      "We collect the information needed to provide learning accounts, course access, certificates, organization workspaces, support, and security. This may include your name, email address, profile details, authentication information, course enrollments, assignments, quiz attempts, certificates, messages, notifications, and organization membership.",
      "When you use Educatorio, we also collect technical information such as device type, browser, pages visited, approximate location derived from your connection, log data, and usage events that help us keep the service reliable and improve the learning experience.",
    ],
    items: [
      "Account and profile details you provide when signing up or joining an organization.",
      "Learning activity such as course progress, submissions, scores, completion records, and certificates.",
      "Billing and subscription information handled directly by our payment providers when paid plans are available.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use personal information to operate Educatorio, personalize course recommendations, track progress, issue certificates, enable teacher and organization workflows, provide customer support, process payments, prevent abuse, and comply with legal obligations.",
      "We may use aggregated or de-identified information to understand learning trends, improve course quality, and report platform performance without identifying individual learners.",
    ],
  },
  {
    title: "Organizations and Teachers",
    body: [
      "If your account is connected to an organization, school, employer, or class, authorized administrators and teachers may see information related to that workspace. This can include your enrollment status, progress, submissions, grades, attendance, certificates, and other activity needed to manage learning.",
      "Organizations are responsible for ensuring they have the right to invite learners and manage learning records in their workspace. If you leave an organization, some records may remain available to that organization where needed for compliance, reporting, or academic administration.",
    ],
  },
  {
    title: "Sharing and Service Providers",
    body: [
      "We do not sell your personal information. We share information only when needed to run the platform, such as with hosting providers, authentication services, analytics tools, payment processors, support systems, and other vendors that help us provide Educatorio.",
      "We may also disclose information if required by law, to protect the rights and safety of Educatorio or others, to investigate fraud or abuse, or as part of a merger, acquisition, financing, or sale of business assets.",
    ],
  },
  {
    title: "Data Security and Retention",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect your information. No online service can guarantee perfect security, so you should use a strong password and keep your account credentials private.",
      "We retain information for as long as necessary to provide the service, maintain learning records, comply with legal obligations, resolve disputes, prevent fraud, and enforce our agreements. Retention periods may differ depending on the type of information and whether your account is tied to an organization.",
    ],
  },
  {
    title: "Your Choices and Rights",
    body: [
      "You may update account information through your profile settings where available. You can also ask us to access, correct, export, or delete personal information, subject to identity verification and legal or organizational recordkeeping requirements.",
      "You may opt out of non-essential marketing emails by using the unsubscribe link in those messages. We may still send important service, security, billing, and account notices.",
    ],
  },
  {
    title: "Children and Students",
    body: [
      "Educatorio is intended for learners who can use online learning services under applicable law or with appropriate parent, guardian, school, or organization consent. If you believe a child has provided personal information without proper consent, please contact us so we can review the account.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy as Educatorio evolves. When changes are material, we will take reasonable steps to notify users, such as by updating the date on this page or providing an in-product notice.",
      "This policy is provided for transparency and should be reviewed with qualified counsel before relying on it for legal compliance in production.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="How Educatorio protects your learning data."
      description="This policy explains what information we collect, how we use it, when we share it, and the choices learners, teachers, and organizations have."
      updatedAt="May 4, 2026"
      icon={LockKeyhole}
      highlights={[
        "We use data to operate courses, accounts, certificates, organizations, billing, support, and security.",
        "Organization administrators and teachers may see learning records connected to their workspace.",
        "We do not sell personal information, and we limit sharing to trusted service providers and legal requirements.",
      ]}
      sections={sections}
    />
  );
}
