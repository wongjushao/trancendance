// frontend/app/(main)/certificates/[id]/view/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  Download,
  Share2,
  CheckCircle,
  Loader2,
  Printer,
  Mail,
} from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface CertificateData {
  id: number;
  user_id: string;
  course_id: number;
  certificate_url: string | null;
  certificate_id: string;
  issued_at: string;
  user: {
    first_name: string;
    last_name: string;
    username: string;
  };
  course: {
    id: number;
    title: string;
    description: string;
    level: string;
  };
}

export default function CertificateViewPage() {
  const params = useParams();
  const router = useRouter();
  const certificateId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  useEffect(() => {
    const loadCertificate = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }
        
        // Get certificate with user and course details
        const { data, error } = await supabase
          .from("certificates")
          .select(`
            *,
            user:profiles!user_id (
              first_name,
              last_name,
              username
            ),
            course:courses!course_id (
              id,
              title,
              description,
              level
            )
          `)
          .eq("id", certificateId)
          .single();
        
        if (error) throw error;
        
        // Verify ownership
        if (data.user_id !== user.id) {
          toast.error("You don't have permission to view this certificate");
          router.push("/certificates");
          return;
        }
        
        setCertificate(data);
        
      } catch (error) {
        console.error("Error loading certificate:", error);
        toast.error("Failed to load certificate");
        router.push("/certificates");
      } finally {
        setLoading(false);
      }
    };
    
    loadCertificate();
  }, [certificateId, router]);
  
  const handleDownload = async () => {
    if (!certificate) return;
    
    setDownloading(true);
    try {
      if (certificate.certificate_url) {
        window.open(certificate.certificate_url, "_blank");
      } else {
        // In production, generate PDF here
        toast.info("Certificate download will be available soon");
      }
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast.error("Failed to download certificate");
    } finally {
      setDownloading(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate of Completion - ${certificate?.course.title}`,
          text: `I completed ${certificate?.course.title}!`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Certificate link copied to clipboard!");
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (!certificate) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Link href="/certificates">
            <GlowButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Certificates
            </GlowButton>
          </Link>
          <div className="flex gap-2">
            <GlowButton variant="secondary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </GlowButton>
            <GlowButton variant="secondary" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </GlowButton>
            <GlowButton variant="primary" size="sm" onClick={handleDownload} isLoading={downloading}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </GlowButton>
          </div>
        </div>
        
        {/* Certificate Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none">
          {/* Certificate Border */}
          <div className="border-8 border-double border-purple-200 m-4 rounded-xl">
            <div className="p-8 md:p-12">
              {/* Decorative Top */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <Award className="w-10 h-10 text-white" />
                </div>
              </div>
              
              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="text-3xl md:text-4xl font-serif text-gray-800">Certificate of Completion</h1>
                <div className="w-24 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mt-4"></div>
              </div>
              
              {/* Body */}
              <div className="text-center mb-8">
                <p className="text-gray-600 text-lg mb-2">This certificate is proudly presented to</p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                  {certificate.user.first_name} {certificate.user.last_name}
                </h2>
                <p className="text-gray-600 mb-2">for successfully completing</p>
                <h3 className="text-xl md:text-2xl font-semibold text-purple-600 mb-4">
                  {certificate.course.title}
                </h3>
                {certificate.course.description && (
                  <p className="text-gray-500 text-sm max-w-md mx-auto">
                    {certificate.course.description}
                  </p>
                )}
              </div>
              
              {/* Details */}
              <div className="flex flex-wrap justify-center gap-6 text-center text-sm text-gray-500 mb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Issued: {new Date(certificate.issued_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Level: {certificate.course.level?.toUpperCase()}</span>
                </div>
              </div>
              
              {/* Certificate ID */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  Certificate ID: {certificate.certificate_id}
                </p>
              </div>
              
              {/* Seal */}
              <div className="absolute right-8 bottom-8 opacity-50 print:opacity-100">
                <div className="w-16 h-16 rounded-full border-2 border-purple-400 flex items-center justify-center">
                  <Award className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Verify Section */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Verify this certificate at: {typeof window !== 'undefined' ? window.location.origin : ''}/verify/{certificate.certificate_id}</p>
        </div>
      </div>
    </div>
  );
}