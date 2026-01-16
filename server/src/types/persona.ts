export interface Skill {
  name: string;
  value: number;
}

export interface Education {
  degree: string;
  institution: string;
  fieldOfStudy: string;
}

export interface TechnicalMetadata {
  email: string;
  username: string;
  userAgent: string;
  browser: string;
  platform: "Desktop" | "Mobile" | "Tablet";
  paymentPreference: string;
}

export interface Persona {
  id: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: "Male" | "Female" | "Non-binary" | "Other";
  maritalStatus: "Single" | "Married" | "Divorced" | "Widowed" | "In a relationship";
  region: string;
  occupation: string;
  ethnicity: string;
  primaryLanguage: string;
  education: Education;
  shortBiography: string;
  biography: string;
  interests: string[];
  personalityTraits: string[];
  skills: Skill[];
  technicalMetadata: TechnicalMetadata;
  actionPhotoUrl?: string;
}
