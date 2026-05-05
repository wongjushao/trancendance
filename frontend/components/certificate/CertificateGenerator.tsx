// frontend/components/certificate/CertificateGenerator.tsx
"use client";

import { useState } from "react";
import { Download, Share2, Printer, Award, Calendar, CheckCircle, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface CertificateGeneratorProps {
  userId: string;
  courseId: number;
  courseTitle: string;
  courseDescription?: string;
  userName: string;
  completedAt: string;
  onGenerated?: (certificateUrl: string) => void;
}

export function CertificateGenerator({
  userId,
  courseId,
  courseTitle,
  courseDescription,
  userName,
  completedAt,
  onGenerated,
}: CertificateGeneratorProps) {
  const supabase = getSupabaseBrowserClient();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);

  const generateCertificateId = () => {
    return `CERT-${courseId}-${userId.slice(0, 8)}-${Date.now()}`;
  };

  const generatePDF = async (certificateData: any): Promise<string> => {
    // This is a simplified version - in production, you'd use a proper PDF library
    // or call an API endpoint that generates the PDF
    
    // For now, we'll create an HTML canvas and convert to data URL
    // In a real implementation, you'd use @react-pdf/renderer or similar
    
    return new Promise((resolve) => {
      // Simulate PDF generation
      setTimeout(() => {
        // In production, this would return an actual PDF URL
        const fakeUrl = `/certificates/${certificateData.certificate_id}.pdf`;
        resolve(fakeUrl);
      }, 1500);
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      // Check if certificate already exists
      const { data: existing } = await supabase
        .from("certificates")
        .select("id, certificate_url, certificate_id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .single();

      if (existing) {
        setCertificateId(existing.certificate_id);
        setCertificateUrl(existing.certificate_url);
        setGenerated(true);
        toast.success("Certificate already generated!");
        setGenerating(false);
        return;
      }

      const newCertificateId = generateCertificateId();
      const issuedDate = new Date().toISOString();

      // Prepare certificate data
      const certificateData = {
        user_id: userId,
        course_id: courseId,
        certificate_id: newCertificateId,
        issued_at: issuedDate,
      };

      // Generate PDF (in production, this would be a real PDF)
      const pdfUrl = await generatePDF({
        certificate_id: newCertificateId,
        user_name: userName,
        course_title: courseTitle,
        course_description: courseDescription,
        issued_date: new Date(issuedDate).toLocaleDateString(),
        completed_date: new Date(completedAt).toLocaleDateString(),
      });

      // Save to database
      const { data: certificate, error } = await supabase
        .from("certificates")
        .insert({
          user_id: userId,
          course_id: courseId,
          certificate_id: newCertificateId,
          certificate_url: pdfUrl,
          issued_at: issuedDate,
        })
        .select()
        .single();

      if (error) throw error;

      setCertificateId(certificate.certificate_id);
      setCertificateUrl(certificate.certificate_url);
      setGenerated(true);
      toast.success("Certificate generated successfully!");
      onGenerated?.(certificate.certificate_url || "");

    } catch (error: any) {
      console.error("Error generating certificate:", error);
      toast.error(error.message || "Failed to generate certificate");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (certificateUrl) {
      window.open(certificateUrl, "_blank");
    } else {
      toast.error("Certificate not available for download");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (certificateUrl && navigator.share) {
      try {
        await navigator.share({
          title: `Certificate of Completion: ${courseTitle}`,
          text: `I've successfully completed ${courseTitle}!`,
          url: certificateUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else if (certificateUrl) {
      await navigator.clipboard.writeText(certificateUrl);
      toast.success("Certificate link copied to clipboard!");
    }
  };

  if (generated && certificateUrl) {
    return (
      <div className="space-y-6">
        {/* Certificate Display - Printable Card */}
        <div className="certificate-print p-8 bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/30 rounded-lg">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Award className="w-16 h-16 text-purple-400" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Certificate of Completion</h2>
              <div className="w-24 h-0.5 bg-purple-500 mx-auto" />
            </div>

            <div className="space-y-2">
              <p className="text-gray-400">This certificate is proudly presented to</p>
              <p className="text-2xl font-semibold text-white">{userName}</p>
            </div>

            <div className="space-y-2">
              <p className="text-gray-400">for successfully completing</p>
              <p className="text-xl font-medium text-purple-400">{courseTitle}</p>
              {courseDescription && (
                <p className="text-sm text-gray-400 max-w-md mx-auto">{courseDescription}</p>
              )}
            </div>

            <div className="flex justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Issued: {new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Certificate ID: {certificateId}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-700">
              <div className="flex justify-center gap-4">
                <div className="text-center">
                  <div className="w-32 h-0.5 bg-gray-600 mb-2" />
                  <p className="text-xs text-gray-500">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3">
          <GlowButton onClick={handleDownload} variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </GlowButton>
          <GlowButton onClick={handlePrint} variant="secondary">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </GlowButton>
          <GlowButton onClick={handleShare} variant="secondary">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </GlowButton>
        </div>

        <style jsx global>{`
          @media print {
            .certificate-print {
              border: none;
              background: white;
              color: black;
            }
            .certificate-print h2,
            .certificate-print p,
            .certificate-print span {
              color: black !important;
            }
            button {
              display: none;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 p-8 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex justify-center">
        <Award className="w-16 h-16 text-purple-400" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Generate Your Certificate</h3>
        <p className="text-gray-400">
          You've successfully completed {courseTitle}! <br />
          Generate your official certificate of completion.
        </p>
      </div>

      <GlowButton onClick={handleGenerate} isLoading={generating} size="lg">
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Certificate...
          </>
        ) : (
          <>
            <Award className="w-4 h-4 mr-2" />
            Generate Certificate
          </>
        )}
      </GlowButton>

      <p className="text-xs text-gray-500">
        Your certificate will be stored in your account and can be shared on LinkedIn or other platforms.
      </p>
    </div>
  );
}