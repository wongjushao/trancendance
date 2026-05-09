// frontend/lib/teacher-requests.ts
"use client";

import { getSupabaseBrowserClient } from "./supabase/browser-client";

export interface TeacherRequest {
  id: string;
  user_id: string;
  organization_id: number;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  message: string | null;
}

// Create teacher request from existing student member
export async function createTeacherRequest(
  userId: string, 
  organizationId: number, 
  message?: string
): Promise<TeacherRequest> {
  const supabase = getSupabaseBrowserClient();
  
  // First check if user is already a teacher
  const { data: membership } = await supabase
    .from("organization_members")
    .select("member_role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();
  
  if (membership?.member_role === "teacher") {
    throw new Error("You are already a teacher in this organization");
  }
  
  if (membership?.member_role !== "student") {
    throw new Error("You must be a student member to request teacher role");
  }
  
  // Check for existing pending request
  const { data: existingRequest } = await supabase
    .from("teacher_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .maybeSingle();
  
  if (existingRequest) {
    throw new Error("You already have a pending teacher request");
  }
  
  const { data, error } = await supabase
    .from("teacher_requests")
    .insert({
      user_id: userId,
      organization_id: organizationId,
      status: 'pending',
      message: message || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Get pending teacher requests for organization admin
export async function getPendingTeacherRequests(organizationId: number): Promise<(TeacherRequest & { user: any })[]> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("teacher_requests")
    .select(`
      *,
      user:profiles!user_id (
        id,
        first_name,
        last_name,
        username,
        email,
        avatar_url
      )
    `)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Approve teacher request - upgrade student to teacher
export async function approveTeacherRequest(requestId: string, reviewerId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  // Get request details first
  const { data: request, error: fetchError } = await supabase
    .from("teacher_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Update request status
  const { error: updateError } = await supabase
    .from("teacher_requests")
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", requestId);
  
  if (updateError) throw updateError;
  
  // Update user's role from student to teacher in organization_members
  const { error: memberError } = await supabase
    .from("organization_members")
    .update({ member_role: 'teacher' })
    .eq("organization_id", request.organization_id)
    .eq("user_id", request.user_id);
  
  if (memberError) throw memberError;
}

// Reject teacher request
export async function rejectTeacherRequest(requestId: string, reviewerId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from("teacher_requests")
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", requestId);
  
  if (error) throw error;
}

// Get user's teacher request status for an organization
export async function getUserTeacherRequestStatus(userId: string, organizationId: number): Promise<TeacherRequest | null> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("teacher_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}