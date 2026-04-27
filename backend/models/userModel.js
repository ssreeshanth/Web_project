import { AppError } from '../utils/errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role === 'admin' || user.isAdmin ? 'admin' : 'user',
  isAdmin: !!user.isAdmin,
});

export const validateNewUserInput = ({ email, password, name }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const normalizedName = String(name || '').trim();

  if (!normalizedEmail || !normalizedPassword) {
    throw new AppError('Email and password required', 400);
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError('Invalid email format', 400);
  }

  return {
    email: normalizedEmail,
    password: normalizedPassword,
    name: normalizedName,
  };
};

export const validateLoginInput = ({ email, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');

  if (!normalizedEmail || !normalizedPassword) {
    throw new AppError('Email and password required', 400);
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError('Invalid email format', 400);
  }

  return {
    email: normalizedEmail,
    password: normalizedPassword,
  };
};
