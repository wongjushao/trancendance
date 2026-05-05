// lib/certificate.ts
export async function generateCertificate(userId: string, courseId: number) {
  // Check if all lessons completed
  const progress = await getCourseProgress(courseId);
  if (progress.completed_lessons === progress.total_lessons) {
    // Generate certificate
    const certificateId = `CERT-${Date.now()}-${userId.slice(0, 8)}`;
    // Create certificate record
    await supabase.from("certificates").insert({
      user_id: userId,
      course_id: courseId,
      certificate_id: certificateId,
      issued_at: new Date().toISOString(),
    });
    return certificateId;
  }
}