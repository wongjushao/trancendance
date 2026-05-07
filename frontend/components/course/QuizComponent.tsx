// frontend/components/course/QuizComponent.tsx
"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface QuizQuestion {
  id: string;
  text: string;
  type: "multiple_choice" | "single_choice" | "true_false";
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
}

interface QuizComponentProps {
  lessonId: number;
  courseClassId: number; // For tracking progress per offering
  quizData: {
    questions: QuizQuestion[];
    passing_score: number;
    time_limit_minutes?: number;
    attempts_allowed?: number;
  };
  onComplete?: (score: number, passed: boolean) => void;
}

interface QuizAttempt {
  id?: number;
  lesson_id: number;
  user_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string | string[]>;
  started_at: string;
  completed_at?: string;
  attempt_number: number;
}

export function QuizComponent({
  lessonId,
  courseClassId,
  quizData,
  onComplete,
}: QuizComponentProps) {
  const supabase = getSupabaseBrowserClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quizData.time_limit_minutes ? quizData.time_limit_minutes * 60 : null
  );
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [classMemberId, setClassMemberId] = useState<number | null>(null);

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const totalQuestions = quizData.questions.length;
  const currentAnswer = answers[currentQuestion?.id];

  // Get current user and class member ID
  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get class member ID for this offering
      const { data: classMember } = await supabase
        .from("class_members")
        .select("id")
        .eq("course_class_id", courseClassId)
        .eq("user_id", user.id)
        .single();

      if (classMember) {
        setClassMemberId(classMember.id);
      }

      // Load previous quiz attempts
      await loadPreviousAttempts(user.id);
    };

    initialize();
  }, [courseClassId]);

  // Timer effect
  useEffect(() => {
    if (!timeRemaining || submitted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (prev === 0 || prev === 1) {
            handleSubmit(); // Auto-submit when time runs out
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, submitted]);

  const loadPreviousAttempts = async (userId: string) => {
    // Get previous attempts from lesson_progress? 
    // Or store quiz attempts in a separate table?
    // For now, we'll check lesson_progress for quiz completion status
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("status, completed_at")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .eq("class_member_id", classMemberId || 0)
      .single();

    if (progress && progress.status === "completed") {
      // User already completed this quiz
      setSubmitted(true);
      setShowResults(true);
      // We would need to load previous score from somewhere
      // This suggests we need a quiz_attempts table, but per your constraint,
      // we'll work with existing tables and note this limitation
    }
  };

  const handleAnswer = (answer: string | string[]) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: answer,
    });
  };

  const handleMultipleChoice = (option: string) => {
    const current = (answers[currentQuestion.id] as string[]) || [];
    if (current.includes(option)) {
      handleAnswer(current.filter((o) => o !== option));
    } else {
      handleAnswer([...current, option]);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let earnedPoints = 0;

    quizData.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      if (!userAnswer) return;

      totalPoints += question.points;

      if (question.type === "multiple_choice") {
        const userAnswers = userAnswer as string[];
        const correctAnswers = question.correct_answer as string[];
        const isCorrect =
          userAnswers.length === correctAnswers.length &&
          userAnswers.every((a) => correctAnswers.includes(a));
        if (isCorrect) earnedPoints += question.points;
      } else {
        // Single choice or true/false
        const isCorrect = userAnswer === question.correct_answer;
        if (isCorrect) earnedPoints += question.points;
      }
    });

    const calculatedScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    return { score: calculatedScore, earnedPoints, totalPoints };
  };

  const handleSubmit = async () => {
    // Check if all questions answered
    const allAnswered = quizData.questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    setLoading(true);

    const { score: calculatedScore, earnedPoints, totalPoints } = calculateScore();
    const hasPassed = calculatedScore >= quizData.passing_score;

    setScore(calculatedScore);
    setPassed(hasPassed);
    setSubmitted(true);
    setShowResults(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user && classMemberId) {
      // Update lesson progress
      const { error: progressError } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          class_member_id: classMemberId,
          status: hasPassed ? "completed" : "in_progress",
          progress_percent: hasPassed ? 100 : calculatedScore,
          completed_at: hasPassed ? new Date().toISOString() : null,
          last_accessed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,lesson_id,class_member_id",
        });

      if (progressError) {
        console.error("Error updating progress:", progressError);
      } else if (hasPassed && onComplete) {
        onComplete(calculatedScore, hasPassed);
      }
    }

    setLoading(false);
    toast.success(
      hasPassed
        ? `Quiz passed! Score: ${calculatedScore.toFixed(1)}%`
        : `Quiz failed. Score: ${calculatedScore.toFixed(1)}%. Minimum passing: ${quizData.passing_score}%`
    );
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Results view
  if (showResults) {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-lg border ${
          passed
            ? "bg-green-500/10 border-green-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {passed ? (
              <CheckCircle className="w-8 h-8 text-green-400" />
            ) : (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h3 className="text-xl font-semibold text-white">
                {passed ? "Quiz Passed!" : "Quiz Failed"}
              </h3>
              <p className="text-gray-400">
                Your Score: {score.toFixed(1)}% (Required: {quizData.passing_score}%)
              </p>
            </div>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all ${
                passed ? "bg-green-500" : "bg-red-500"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>

          {!passed && quizData.attempts_allowed && attemptNumber >= quizData.attempts_allowed ? (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                You've used all {quizData.attempts_allowed} attempts. Please contact your instructor.
              </p>
            </div>
          ) : !passed && (
            <GlowButton
              onClick={() => {
                setSubmitted(false);
                setShowResults(false);
                setAnswers({});
                setCurrentQuestionIndex(0);
                setAttemptNumber(attemptNumber + 1);
                if (quizData.time_limit_minutes) {
                  setTimeRemaining(quizData.time_limit_minutes * 60);
                }
              }}
              className="mt-4"
            >
              Retry Quiz
            </GlowButton>
          )}
        </div>

        {/* Review answers */}
        <div className="space-y-4">
          <h4 className="font-semibold text-white">Review Answers</h4>
          {quizData.questions.map((question, idx) => {
            const userAnswer = answers[question.id];
            let isCorrect = false;

            if (question.type === "multiple_choice") {
              const userAnswers = userAnswer as string[];
              const correctAnswers = question.correct_answer as string[];
              isCorrect =
                userAnswers?.length === correctAnswers.length &&
                userAnswers?.every((a) => correctAnswers.includes(a));
            } else {
              isCorrect = userAnswer === question.correct_answer;
            }

            return (
              <div
                key={question.id}
                className={`p-4 rounded-lg border ${
                  isCorrect
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {idx + 1}. {question.text}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Your answer:{" "}
                      {Array.isArray(userAnswer)
                        ? userAnswer.join(", ")
                        : userAnswer || "Not answered"}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-green-400 mt-1">
                        Correct answer:{" "}
                        {Array.isArray(question.correct_answer)
                          ? question.correct_answer.join(", ")
                          : question.correct_answer}
                      </p>
                    )}
                    {question.explanation && (
                      <p className="text-sm text-gray-400 mt-2 italic">
                        {question.explanation}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Quiz taking view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div>
          <p className="text-sm text-gray-400">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
          <p className="text-sm text-gray-400">
            Points: {currentQuestion?.points}
          </p>
        </div>
        {timeRemaining !== null && (
          <div className={`px-3 py-1 rounded-lg ${
            timeRemaining < 60 ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-gray-300"
          }`}>
            <span className="text-sm font-mono">⏱ {formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">{currentQuestion?.text}</h3>

        {/* Answer options based on question type */}
        {currentQuestion?.type === "true_false" && (
          <div className="space-y-2">
            {["True", "False"].map((option) => (
              <label
                key={option}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentAnswer === option
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="quiz-question"
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="mr-3"
                />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion?.type === "single_choice" && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <label
                key={option}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentAnswer === option
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="quiz-question"
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="mr-3"
                />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion?.type === "multiple_choice" && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <label
                key={option}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  (currentAnswer as string[])?.includes(option)
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                }`}
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={(currentAnswer as string[])?.includes(option) || false}
                  onChange={() => handleMultipleChoice(option)}
                  className="mr-3"
                />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-800">
        <GlowButton
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </GlowButton>

        {currentQuestionIndex < totalQuestions - 1 ? (
          <GlowButton onClick={handleNext}>Next Question</GlowButton>
        ) : (
          <GlowButton onClick={handleSubmit} isLoading={loading}>
            Submit Quiz
          </GlowButton>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-purple-500 h-2 rounded-full transition-all"
          style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>
    </div>
  );
}