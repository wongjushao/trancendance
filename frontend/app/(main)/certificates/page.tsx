// frontend/app/(main)/certificates/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Download,
  Share2,
  Search,
  Calendar,
  BookOpen,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Certificate {
  id: number;
  user_id: string;
  course_id: number;
  certificate_url: string | null;
  certificate_id: string;
  issued_at: string;
  course: {
    id: number;
    title: string;
    thumbnail: string | null;
    level: string;
  };
}

export default function CertificatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);
  
  useEffect(() => {
    const loadCertificates = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }
        
        // Get certificates with course details
        const { data, error } = await supabase
          .from("certificates")
          .select(`
            *,
            course:courses!course_id (
              id,
              title,
              thumbnail,
              level
            )
          `)
          .eq("user_id", user.id)
          .order("issued_at", { ascending: false });
        
        if (error) throw error;
        
        setCertificates(data || []);
        
      } catch (error) {
        console.error("Error loading certificates:", error);
        toast.error("Failed to load certificates");
      } finally {
        setLoading(false);
      }
    };
    
    loadCertificates();
  }, [router]);
  
  const handleDownload = async (certificate: Certificate) => {
    setDownloading(certificate.id);
    try {
      // If certificate has a URL, open it
      if (certificate.certificate_url) {
        window.open(certificate.certificate_url, "_blank");
      } else {
        // In production, generate certificate PDF here
        toast.info("Certificate generation will be available soon");
      }
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast.error("Failed to download certificate");
    } finally {
      setDownloading(null);
    }
  };
  
  const handleShare = async (certificate: Certificate) => {
    const shareUrl = `${window.location.origin}/certificates/${certificate.id}/view`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate of Completion - ${certificate.course.title}`,
          text: `I completed ${certificate.course.title}!`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Certificate link copied to clipboard!");
    }
  };
  
  const filteredCertificates = certificates.filter(cert =>
    cert.course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
            <Award className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">My Certificates</h1>
          <p className="text-gray-400 mt-2">
            Certificates you've earned for completing courses
          </p>
        </div>
        
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search certificates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Certificates List */}
        {filteredCertificates.length === 0 ? (
          <GlowCard>
            <div className="text-center py-12">
              <Award className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No Certificates Yet</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm 
                  ? "No certificates match your search" 
                  : "Complete courses to earn certificates"}
              </p>
              {!searchTerm && (
                <GlowButton onClick={() => router.push("/courses")}>
                  Browse Courses
                </GlowButton>
              )}
            </div>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((certificate) => (
              <GlowCard key={certificate.id} className="hover:scale-105 transition-transform duration-200">
                <div className="p-6">
                  {/* Certificate Icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Award className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  
                  {/* Course Info */}
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-white text-lg mb-1 line-clamp-2">
                      {certificate.course.title}
                    </h3>
                    <Badge variant="secondary" className="mt-1">
                      {certificate.course.level?.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {/* Certificate ID */}
                  <div className="text-center mb-4">
                    <p className="text-xs text-gray-500">Certificate ID</p>
                    <p className="text-sm font-mono text-gray-400">
                      {certificate.certificate_id}
                    </p>
                  </div>
                  
                  {/* Issued Date */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>Issued: {new Date(certificate.issued_at).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <GlowButton
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onClick={() => handleDownload(certificate)}
                      isLoading={downloading === certificate.id}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </GlowButton>
                    <GlowButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleShare(certificate)}
                    >
                      <Share2 className="w-4 h-4" />
                    </GlowButton>
                  </div>
                  
                  {/* View Button */}
                  <div className="mt-3">
                    <GlowButton
                      size="sm"
                      variant="outline"
                      fullWidth
                      onClick={() => router.push(`/certificates/${certificate.id}/view`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Certificate
                    </GlowButton>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
        
        {/* Stats Summary */}
        {certificates.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-400">
            You've earned {certificates.length} certificate{certificates.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}