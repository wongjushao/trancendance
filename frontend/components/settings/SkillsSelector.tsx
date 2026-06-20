"use client";

import { useState, useEffect } from "react";
import { Search, X, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface Skill {
  id: number;
  name: string;
}

export interface UserSkill {
  name: string;
  level: number;
  years: number;
}

interface SkillsSelectorProps {
  value?: UserSkill[];
  onChange?: (skills: UserSkill[]) => void;
}

export function SkillsSelector({ value = [], onChange }: SkillsSelectorProps) {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal state for add/edit
  const [editingSkill, setEditingSkill] = useState<{ index: number; name: string } | null>(null);
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
  const [level, setLevel] = useState(1);
  const [years, setYears] = useState(0);

  // Fetch all available skills from backend
  const fetchAvailableSkills = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAvailableSkills([]);
        return;
      }

      const response = await fetch('/api/auth-service/skills', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        let skillsArray = [];
        if (Array.isArray(data)) {
          skillsArray = data;
        } else if (data && Array.isArray(data.skills)) {
          skillsArray = data.skills;
        } else if (data && Array.isArray(data.data)) {
          skillsArray = data.data;
        } else {
          console.warn("Unexpected API response format:", data);
          skillsArray = [];
        }
        
        setAvailableSkills(skillsArray);
      } else {
        console.error("API returned error status:", response.status);
        setAvailableSkills([]);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
      setAvailableSkills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSkills();
  }, []);

  // Filter skills - EXCLUDE already selected ones
  const selectedSkillNames = value.map(s => s.name);
  const filteredSkills = availableSkills.filter(skill => 
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedSkillNames.includes(skill.name)
  );

  const openAddModal = (skill: Skill) => {
    setPendingSkill(skill);
    setLevel(1);
    setYears(0);
    setShowDropdown(false);
    setSearchTerm("");
  };

  const openEditModal = (index: number, skill: UserSkill) => {
    setEditingSkill({ index, name: skill.name });
    setLevel(skill.level);
    setYears(skill.years);
  };

  const saveNewSkill = () => {
    if (!pendingSkill) return;
    
    // Double-check skill not already selected
    if (selectedSkillNames.includes(pendingSkill.name)) {
      toast.error(`${pendingSkill.name} is already added`);
      setPendingSkill(null);
      return;
    }
    
    const newSkills = [...value, { name: pendingSkill.name, level, years }];
    onChange?.(newSkills);
    setPendingSkill(null);
    toast.success(`${pendingSkill.name} added (Level ${level}, ${years} yrs)`);
    toast.info('Click "Save All Changes" to persist');
  };

  const saveEditedSkill = () => {
    if (!editingSkill) return;
    
    const updatedSkills = [...value];
    updatedSkills[editingSkill.index] = {
      ...updatedSkills[editingSkill.index],
      level,
      years
    };
    onChange?.(updatedSkills);
    setEditingSkill(null);
    toast.success(`${editingSkill.name} updated (Level ${level}, ${years} yrs)`);
    toast.info('Click "Save All Changes" to persist');
  };

  const removeSkill = (index: number, skillName: string) => {
    const newSkills = value.filter((_, i) => i !== index);
    onChange?.(newSkills);
    toast.success(`${skillName} removed locally`);
    toast.info('Click "Save All Changes" to persist');
  };

  if (loading) {
    return <div className="text-gray-400">Loading skills...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Add Skill Section */}
      <div className="relative">
        <Label className="text-gray-300 mb-1 block">Add New Skill</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search for a skill..."
            className="pl-9 bg-gray-800 border-gray-700"
          />
        </div>
        
        {/* Dropdown - only shows skills not already selected */}
        {showDropdown && searchTerm && filteredSkills.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => openAddModal(skill)}
                className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
              >
                {skill.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {pendingSkill && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Set proficiency for {pendingSkill.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300 mb-1 block">Proficiency Level (1-5)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`flex-1 py-2 rounded-lg transition-colors ${
                        level === lvl
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  1=Beginner, 3=Intermediate, 5=Expert
                </p>
              </div>

              <div>
                <Label className="text-gray-300 mb-1 block">Years of Experience</Label>
                <Input
                  type="number"
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value) || 0)}
                  min={0}
                  max={50}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <GlowButton 
                variant="outline" 
                onClick={() => setPendingSkill(null)}
                fullWidth
              >
                Cancel
              </GlowButton>
              <GlowButton 
                onClick={saveNewSkill}
                fullWidth
              >
                Add Skill
              </GlowButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {editingSkill && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Edit proficiency for {editingSkill.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300 mb-1 block">Proficiency Level (1-5)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`flex-1 py-2 rounded-lg transition-colors ${
                        level === lvl
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  1=Beginner, 3=Intermediate, 5=Expert
                </p>
              </div>

              <div>
                <Label className="text-gray-300 mb-1 block">Years of Experience</Label>
                <Input
                  type="number"
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value) || 0)}
                  min={0}
                  max={50}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <GlowButton 
                variant="outline" 
                onClick={() => setEditingSkill(null)}
                fullWidth
              >
                Cancel
              </GlowButton>
              <GlowButton 
                onClick={saveEditedSkill}
                fullWidth
              >
                Update Skill
              </GlowButton>
            </div>
          </div>
        </div>
      )}

      {/* Current Skills List - Shows level and years */}
      <div>
        <Label className="text-gray-300 mb-2 block">Your Skills</Label>
        <div className="flex flex-wrap gap-2">
          {value.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 w-full text-center">No skills added yet</p>
          ) : (
            value.map((skill, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm"
              >
                <span>{skill.name}</span>
                <span className="text-xs text-purple-300">Lv.{skill.level}</span>
                <span className="text-xs text-purple-300/70">{skill.years} yr{skill.years !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => openEditModal(index, skill)}
                  className="ml-1 hover:text-purple-200 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeSkill(index, skill.name)}
                  className="hover:text-purple-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}