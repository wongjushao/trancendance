// frontend/lib/supabase/organization.ts
import { getSupabaseBrowserClient } from './browser-client';

export async function isUserInOrganization(userId: string, organizationId: number): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .not('member_role', 'eq', 'pending')
    .maybeSingle();
  
  if (error) {
    console.error('Error checking organization membership:', error);
    return false;
  }
  
  return !!data;
}

export async function addUserToOrganization(userId: string, organizationId: number, role: string = 'member'): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  
  // Check if already a member
  const { data: existing } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existing) {
    return true; // Already a member
  }
  
  const { error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      member_role: role,
    });
  
  if (error) {
    console.error('Error adding user to organization:', error);
    return false;
  }
  
  return true;
}

export async function sendJoinOrganizationRequest(userId: string, organizationId: number, message?: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  
  // Check if request already exists
  const { data: existing } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('member_role', 'pending')
    .maybeSingle();
  
  if (existing) {
    return true; // Request already sent
  }
  
  const { error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      member_role: 'pending',
    });
  
  if (error) {
    console.error('Error sending join request:', error);
    return false;
  }
  
  return true;
}