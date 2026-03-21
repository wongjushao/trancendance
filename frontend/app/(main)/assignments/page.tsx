"use client";

import { useState } from "react";
import Link from "next/link"; // Updated from react-router
import { FileText, Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";

const assignments = [
  {
    id: 1,
    title: "React Hooks Implementation",
    course: "Advanced React Development",
    dueDate: "2026-03-08",
    status: "pending",
    points: 100,
    description: "Implement custom hooks for form validation",
  },
  {
    id: 2,
    title: "Database Schema Design",
    course: "Backend Development",
    dueDate: "2026-03-10",
    status: "submitted",
    points: 150,
    description: "Design a normalized database schema",
    submittedDate: "2026-03-09",
  },
  {
    id: 3,
    title: "UI/UX Case Study",
    course: "Design Principles",
    dueDate: "2026-03-12",
    status: "in-progress",
    points: 120,
    description: "Analyze and redesign a mobile app",
  },
  {
    id: 4,
    title: "API Integration Project",
    course: "Backend Development",
    dueDate: "2026-03-15",
    status: "graded",
    points: 180,
    grade: 165,
    description: "Build a REST API with authentication",
  },
  {
    id: 5,
    title: "Component Library",
    course: "Advanced React Development",
    dueDate: "2026-02-28",
    status: "overdue",
    points: 200,
    description: "Create reusable React components",
  },
];

export default function AssignmentsPage() {
  const [filter, setFilter] = useState<string>("all");
  
  const filteredAssignments = assignments.filter(assignment => {
    if (filter === "all") return true;
    return assignment.status === filter;
  });
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { color: "yellow", icon: Clock, text: "Pending" };
      case "in-progress":
        return { color: "blue", icon: AlertCircle, text: "In Progress" };
      case "submitted":
        return { color: "purple", icon: CheckCircle, text: "Submitted" };
      case "graded":
        return { color: "green", icon: CheckCircle, text: "Graded" };
      case "overdue":
        return { color: "red", icon: AlertCircle, text: "Overdue" };
      default:
        return { color: "gray", icon: FileText, text: status };
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Assignments</h1>
        <p className="text-[#A0A0B5]">Manage your coursework and submissions</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlowCard className="text-center">
          <p className="text-[#A0A0B5] text-sm mb-2">Pending</p>
          <p className="text-3xl font-bold text-yellow-400">
            {assignments.filter(a => a.status === "pending").length}
          </p>
        </GlowCard>
        <GlowCard className="text-center">
          <p className="text-[#A0A0B5] text-sm mb-2">In Progress</p>
          <p className="text-3xl font-bold text-blue-400">
            {assignments.filter(a => a.status === "in-progress").length}
          </p>
        </GlowCard>
        <GlowCard className="text-center">
          <p className="text-[#A0A0B5] text-sm mb-2">Submitted</p>
          <p className="text-3xl font-bold text-purple-400">
            {assignments.filter(a => a.status === "submitted").length}
          </p>
        </GlowCard>
        <GlowCard className="text-center">
          <p className="text-[#A0A0B5] text-sm mb-2">Graded</p>
          <p className="text-3xl font-bold text-green-400">
            {assignments.filter(a => a.status === "graded").length}
          </p>
        </GlowCard>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "pending", "in-progress", "submitted", "graded", "overdue"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`
              px-4 py-2 rounded-xl font-medium transition-all
              ${filter === status
                ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                : "bg-[#12121A] text-[#A0A0B5] border border-white/10 hover:border-purple-500/50"
              }
            `}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
          </button>
        ))}
      </div>
      
      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment) => {
          const statusConfig = getStatusConfig(assignment.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <Link key={assignment.id} href={`/assignments/${assignment.id}`}>
              <GlowCard className="hover:scale-[1.01] transition-transform cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center
                        ${statusConfig.color === "yellow" && "bg-yellow-500/20"}
                        ${statusConfig.color === "blue" && "bg-blue-500/20"}
                        ${statusConfig.color === "purple" && "bg-purple-500/20"}
                        ${statusConfig.color === "green" && "bg-green-500/20"}
                        ${statusConfig.color === "red" && "bg-red-500/20"}
                      `}>
                        <FileText className={`
                          w-6 h-6
                          ${statusConfig.color === "yellow" && "text-yellow-400"}
                          ${statusConfig.color === "blue" && "text-blue-400"}
                          ${statusConfig.color === "purple" && "text-purple-400"}
                          ${statusConfig.color === "green" && "text-green-400"}
                          ${statusConfig.color === "red" && "text-red-400"}
                        `} />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">{assignment.title}</h3>
                        <p className="text-[#A0A0B5] text-sm mb-3">{assignment.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-[#6B6B80]">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {assignment.course}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {assignment.dueDate}
                          </span>
                          <span>{assignment.points} points</span>
                        </div>
                        
                        {assignment.status === "graded" && assignment.grade && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-lg">
                            <span className="text-green-400 font-medium">
                              Score: {assignment.grade}/{assignment.points}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <span className={`
                      px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2
                      ${statusConfig.color === "yellow" && "bg-yellow-500/20 text-yellow-400"}
                      ${statusConfig.color === "blue" && "bg-blue-500/20 text-blue-400"}
                      ${statusConfig.color === "purple" && "bg-purple-500/20 text-purple-400"}
                      ${statusConfig.color === "green" && "bg-green-500/20 text-green-400"}
                      ${statusConfig.color === "red" && "bg-red-500/20 text-red-400"}
                    `}>
                      <StatusIcon className="w-4 h-4" />
                      {statusConfig.text}
                    </span>
                    
                    {assignment.status === "pending" && (
                      <GlowButton variant="primary" onClick={(e) => e.preventDefault()}>
                        Start Assignment
                      </GlowButton>
                    )}
                  </div>
                </div>
              </GlowCard>
            </Link>
          );
        })}
      </div>
      
      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-[#6B6B80] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No assignments found</h3>
          <p className="text-[#A0A0B5]">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}