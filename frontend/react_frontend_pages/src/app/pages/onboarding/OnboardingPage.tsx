import { useState } from "react";
import { useNavigate } from "react-router";
import { Camera, User, Building2, BookOpen, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { GlowButton } from "../../components/lms/GlowButton";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { motion, AnimatePresence } from "motion/react";

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    photo: null as File | null,
    firstName: "",
    lastName: "",
    role: "",
    organization: "",
    interests: [] as string[],
  });
  
  const interests = [
    "Web Development", "Mobile Development", "Data Science", "Machine Learning",
    "UI/UX Design", "DevOps", "Cloud Computing", "Cybersecurity"
  ];
  
  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/app");
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };
  
  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden">
      {/* Background Gradient Blobs */}
      <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]" />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${step < currentStep 
                      ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white" 
                      : step === currentStep
                      ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-[#12121A] text-[#6B6B80]"
                    }
                  `}>
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < TOTAL_STEPS && (
                    <div className={`flex-1 h-1 mx-2 transition-all ${
                      step < currentStep ? "bg-gradient-to-r from-purple-500 to-violet-600" : "bg-[#12121A]"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-[#A0A0B5]">Step {currentStep} of {TOTAL_STEPS}</p>
          </div>
          
          {/* Content */}
          <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step 1: Upload Photo */}
                {currentStep === 1 && (
                  <div className="text-center space-y-6">
                    <Camera className="w-16 h-16 text-purple-500 mx-auto" />
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">Upload Profile Photo</h2>
                      <p className="text-[#A0A0B5]">Add a photo to personalize your profile</p>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-32 h-32 rounded-full bg-[#12121A] border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                        {formData.photo ? (
                          <img src={URL.createObjectURL(formData.photo)} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-[#6B6B80]" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload">
                        <GlowButton variant="secondary" as="span">
                          Choose Photo
                        </GlowButton>
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Step 2: Personal Info */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <User className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold text-white mb-2">Personal Information</h2>
                      <p className="text-[#A0A0B5]">Tell us a bit about yourself</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-white mb-2 block">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="John"
                          className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-white mb-2 block">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Doe"
                          className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="role" className="text-white mb-2 block">I am a...</Label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4"
                      >
                        <option value="">Select your role</option>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Organization */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <Building2 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold text-white mb-2">Join Organization</h2>
                      <p className="text-[#A0A0B5]">Join an existing organization or create a new one</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="organization" className="text-white mb-2 block">Organization Name</Label>
                      <Input
                        id="organization"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        placeholder="Enter organization name or code"
                        className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button className="p-6 bg-[#12121A] border border-white/10 rounded-xl hover:border-purple-500/50 transition-all text-left">
                        <p className="text-white font-medium mb-1">Join Existing</p>
                        <p className="text-[#6B6B80] text-sm">Use invitation code</p>
                      </button>
                      <button className="p-6 bg-[#12121A] border border-white/10 rounded-xl hover:border-purple-500/50 transition-all text-left">
                        <p className="text-white font-medium mb-1">Create New</p>
                        <p className="text-[#6B6B80] text-sm">Start your own</p>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Step 4: Interests */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <BookOpen className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold text-white mb-2">Select Your Interests</h2>
                      <p className="text-[#A0A0B5]">Choose topics you want to learn about</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {interests.map((interest) => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`
                            p-4 rounded-xl border transition-all text-left
                            ${formData.interests.includes(interest)
                              ? "bg-gradient-to-r from-purple-500/20 to-violet-600/20 border-purple-500/50 text-white"
                              : "bg-[#12121A] border-white/10 text-[#A0A0B5] hover:border-purple-500/30"
                            }
                          `}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            
            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
              <GlowButton 
                variant="ghost" 
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </GlowButton>
              
              <GlowButton variant="primary" onClick={handleNext}>
                {currentStep === TOTAL_STEPS ? "Get Started" : "Continue"}
                <ArrowRight className="w-5 h-5" />
              </GlowButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}