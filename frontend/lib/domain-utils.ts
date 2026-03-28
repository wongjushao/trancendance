// frontend/lib/domain-utils.ts
import { Organization } from './role';

export function extractDomainFromEmail(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

export function findOrganizationByDomain(domain: string, organizations: Organization[]): Organization | undefined {
  if (!domain) return undefined;
  return organizations.find(org => org.domain.toLowerCase() === domain.toLowerCase());
}

export function getOrganizationDisplayName(org: Organization | null): string {
  if (!org) return 'None';
  return `${org.name} (${org.domain})`;
}