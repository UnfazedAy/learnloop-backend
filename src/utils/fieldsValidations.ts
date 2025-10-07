import { Gender } from "../types/types";

interface Data {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: Gender;
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const isValidGender = (gender: Gender): boolean => {
  return Object.values(Gender).includes(gender);
};

export const sanitizeInput = (data: Data): Data => {
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    gender: data.gender,
  };
};

export const validateSignUpData = (data: Data): string[] => {
  const errors: string[] = [];

  if (!data.firstName) {
    errors.push("First name is required");
  }
  if (!data.lastName) {
    errors.push("Last name is required");
  }
  if (!isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }
  if (!isValidPassword(data.password)) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!isValidGender(data.gender)) {
    errors.push("Invalid gender");
  }

  return errors;
};
