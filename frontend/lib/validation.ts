// frontend/lib/validation.ts
"use client";

/**
 * Common validation utilities for user input across the application
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FieldValidation {
  validate: (value: string) => ValidationResult;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address (e.g., name@example.com)" };
  }
  
  // Check for valid domain
  const domain = email.split('@')[1];
  if (domain && !domain.includes('.') && domain !== 'localhost') {
    return { isValid: false, error: "Email domain must contain a dot" };
  }
  
  return { isValid: true };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long" };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one uppercase letter" };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number" };
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character (e.g., !@#$%^&*)" };
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /password/i, /123456/, /qwerty/i, /abc123/i, /admin/i, /welcome/i
  ];
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return { isValid: false, error: "Password is too weak. Please choose a stronger password" };
    }
  }
  
  return { isValid: true };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, error: "Username is required" };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: "Username must be at least 3 characters long" };
  }
  
  if (username.length > 30) {
    return { isValid: false, error: "Username must be less than 30 characters" };
  }
  
  if (username.includes(' ')) {
    return { isValid: false, error: "Username cannot contain spaces" };
  }
  
  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: "Username can only contain letters, numbers, dots, underscores, and hyphens" };
  }
  
  if (/^[._-]/.test(username) || /[._-]$/.test(username)) {
    return { isValid: false, error: "Username cannot start or end with dots, underscores, or hyphens" };
  }
  
  return { isValid: true };
};

// Name validation (first/last name)
export const validateName = (name: string, fieldName: string = "Name"): ValidationResult => {
  if (!name) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: `${fieldName} must be less than 50 characters` };
  }
  
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  return { isValid: true };
};

// Bio validation
export const validateBio = (bio: string): ValidationResult => {
  if (!bio) {
    return { isValid: false, error: "Bio is required" };
  }
  
  if (bio.length < 10) {
    return { isValid: false, error: "Bio must be at least 10 characters long" };
  }
  
  if (bio.length > 500) {
    return { isValid: false, error: "Bio must be less than 500 characters" };
  }
  
  // Check for excessive special characters
  const specialCharCount = (bio.match(/[^a-zA-Z0-9\s.,!?;:'"()-]/g) || []).length;
  if (specialCharCount > bio.length * 0.3) {
    return { isValid: false, error: "Bio contains too many special characters" };
  }
  
  return { isValid: true };
};

// Birthday validation
export const validateBirthday = (birthday: string): ValidationResult => {
  if (!birthday) {
    return { isValid: false, error: "Birthday is required" };
  }
  
  const date = new Date(birthday);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: "Please enter a valid date" };
  }
  
  const today = new Date();
  const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
  const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
  
  if (date > minAge) {
    return { isValid: false, error: "You must be at least 13 years old to register" };
  }
  
  if (date < maxAge) {
    return { isValid: false, error: "Please enter a valid birth year" };
  }
  
  return { isValid: true };
};

// Language validation
export const validateLanguage = (language: string): ValidationResult => {
  const validLanguages = ["EN", "CN", "BM", "ES", "FR", "DE", "JP", "KR"];
  
  if (!language) {
    return { isValid: false, error: "Language is required" };
  }
  
  if (!validLanguages.includes(language)) {
    return { isValid: false, error: "Please select a valid language" };
  }
  
  return { isValid: true };
};

// Job title validation
export const validateJobTitle = (jobTitle: string, isOther: boolean = false, customTitle: string = ""): ValidationResult => {
  if (!jobTitle && !isOther) {
    return { isValid: false, error: "Job title is required" };
  }
  
  if (isOther) {
    if (!customTitle || customTitle.trim() === "") {
      return { isValid: false, error: "Please enter your job title" };
    }
    if (customTitle.length < 2) {
      return { isValid: false, error: "Job title must be at least 2 characters" };
    }
    if (customTitle.length > 50) {
      return { isValid: false, error: "Job title must be less than 50 characters" };
    }
  }
  
  return { isValid: true };
};

// Phone number validation (optional)
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: true }; // Optional field
  }
  
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{3,4}$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: "Please enter a valid phone number (e.g., +1 234 567 8900)" };
  }
  
  return { isValid: true };
};

// Timezone validation
export const validateTimezone = (timezone: string): ValidationResult => {
  if (!timezone) {
    return { isValid: false, error: "Timezone is required" };
  }
  
  // Check if timezone is valid by trying to create a date with it
  try {
    const date = new Date().toLocaleString("en-US", { timeZone: timezone });
    if (!date) {
      return { isValid: false, error: "Invalid timezone selected" };
    }
  } catch {
    return { isValid: false, error: "Invalid timezone selected" };
  }
  
  return { isValid: true };
};

// Confirm password validation
export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: "Please confirm your password" };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }
  
  return { isValid: true };
};

// URL validation (for social links, website)
export const validateUrl = (url: string, fieldName: string = "URL"): ValidationResult => {
  if (!url) {
    return { isValid: true }; // Optional field
  }
  
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol === 'http:' && !parsedUrl.protocol === 'https:') {
      return { isValid: false, error: `${fieldName} must start with http:// or https://` };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()} (e.g., https://example.com)` };
  }
};

// Interests validation
export const validateInterests = (interests: string[]): ValidationResult => {
  if (!interests || interests.length === 0) {
    return { isValid: true }; // Optional field
  }
  
  if (interests.length > 20) {
    return { isValid: false, error: "Please select no more than 20 interests" };
  }
  
  return { isValid: true };
};

// Organization domain validation
export const validateDomain = (domain: string): ValidationResult => {
  if (!domain) {
    return { isValid: false, error: "Domain is required" };
  }
  
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(domain)) {
    return { isValid: false, error: "Please enter a valid domain (e.g., example.com)" };
  }
  
  return { isValid: true };
};

// Organization name validation
export const validateOrganizationName = (name: string): ValidationResult => {
  if (!name) {
    return { isValid: false, error: "Organization name is required" };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: "Organization name must be at least 2 characters" };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: "Organization name must be less than 100 characters" };
  }
  
  return { isValid: true };
};

// Form validation helper
export interface FormValidation {
  [key: string]: (value: any) => ValidationResult;
}

export const validateForm = (
  formData: Record<string, any>,
  validations: FormValidation
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  let isValid = true;
  
  for (const [field, validationFn] of Object.entries(validations)) {
    const result = validationFn(formData[field]);
    if (!result.isValid) {
      errors[field] = result.error || `${field} is invalid`;
      isValid = false;
    }
  }
  
  return { isValid, errors };
};