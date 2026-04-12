"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface Skill {
  id: number;
  name: string;
}

interface UserSkill {
  skill_id: number;
  name: string;
  level: number;
  years: number;
}

export function SkillsSelector() {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
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
        
        // Handle different response formats
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
        console.log(`Loaded ${skillsArray.length} skills from API`);
      } else {
        console.error("API returned error status:", response.status);
        setAvailableSkills([]);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
      setAvailableSkills([]);
    }
  };

  // Fetch user's current skills
  const fetchUserSkills = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserSkills([]);
        return;
      }

      const { data, error } = await supabase
        .from('user_skills')
        .select('*, skills(name)')
        .eq('user_id', user.id);

      if (!error && data) {
        const formatted = data.map(us => ({
          skill_id: us.skill_id,
          name: us.skills?.name || 'Unknown',
          level: us.level,
          years: us.years
        }));
        setUserSkills(formatted);
      } else {
        setUserSkills([]);
      }
    } catch (error) {
      console.error("Error fetching user skills:", error);
      setUserSkills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSkills();
    fetchUserSkills();
  }, []);

  // Filter skills based on search term and exclude already selected ones
  const filteredSkills = Array.isArray(availableSkills) 
    ? availableSkills.filter(skill => 
        skill.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !userSkills.some(us => us.name.toLowerCase() === skill.name.toLowerCase())
      )
    : [];

  const addSkill = async (skill: Skill) => {
    setEditingSkill({
      skill_id: skill.id,
      name: skill.name,
      level: 1,
      years: 0
    });
    setLevel(1);
    setYears(0);
  };

  const saveSkill = async () => {
    if (!editingSkill) return;

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from('user_skills')
        .insert({
          user_id: user.id,
          skill_id: editingSkill.skill_id,
          level: level,
          years: years
        });

      if (error) throw error;

      toast.success("Skill added");
      await fetchUserSkills();
      setEditingSkill(null);
      setSearchTerm("");
      setShowDropdown(false);
    } catch (error) {
      console.error("Error adding skill:", error);
      toast.error("Failed to add skill");
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (skillId: number) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', user.id)
        .eq('skill_id', skillId);

      if (error) throw error;

      toast.success("Skill removed");
      await fetchUserSkills();
    } catch (error) {
      console.error("Error removing skill:", error);
      toast.error("Failed to remove skill");
    }
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
        
        {/* Dropdown */}
        {showDropdown && searchTerm && filteredSkills.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredSkills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => {
                  addSkill(skill);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
              >
                {skill.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Level Selection Modal */}
      {editingSkill && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Set proficiency for {editingSkill.name}
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
                onClick={saveSkill}
                isLoading={saving}
                fullWidth
              >
                Add Skill
              </GlowButton>
            </div>
          </div>
        </div>
      )}

      {/* Current Skills List */}
      <div>
        <Label className="text-gray-300 mb-2 block">Your Skills</Label>
        <div className="flex flex-wrap gap-2">
          {userSkills.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 w-full text-center">No skills added yet</p>
          ) : (
            userSkills.map((skill) => (
              <div
                key={skill.skill_id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm"
              >
                <span>{skill.name}</span>
                <span className="text-xs text-purple-300">Lv.{skill.level}</span>
                {skill.years > 0 && (
                  <span className="text-xs text-purple-300">{skill.years}yrs</span>
                )}
                <button
                  onClick={() => removeSkill(skill.skill_id)}
                  className="ml-1 hover:text-purple-200 transition-colors"
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