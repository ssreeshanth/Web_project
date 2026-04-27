import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { persistStore, store } from '../models/store.js';
import { sanitizeUser, validateLoginInput, validateNewUserInput } from '../models/userModel.js';
import { AppError } from '../utils/errors.js';

const tokenForUser = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role === 'admin' || user.isAdmin ? 'admin' : 'user',
      isAdmin: !!user.isAdmin,
    },
    env.jwtSecret,
    { expiresIn: '7d' }
  );

export const login = (req, res, next) => {
  let payload;
  try {
    payload = validateLoginInput(req.body || {});
  } catch (error) {
    return next(error);
  }

  const user = store.users.find((u) => u.email === payload.email && u.password === payload.password);
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  return res.json({
    token: tokenForUser(user),
    user: sanitizeUser(user),
  });
};

export const register = async (req, res, next) => {
  let payload;
  try {
    payload = validateNewUserInput(req.body || {});
  } catch (error) {
    return next(error);
  }

  if (store.users.some((u) => u.email === payload.email)) {
    return next(new AppError('Email already registered', 400));
  }

  const user = {
    id: String(store.users.length + 1),
    email: payload.email,
    password: payload.password,
    name: payload.name || payload.email.split('@')[0],
    role: 'user',
    isAdmin: false,
  };
  store.users.push(user);
  await persistStore();

  return res.status(201).json({
    token: tokenForUser(user),
    user: sanitizeUser(user),
  });
};

export const me = (req, res, next) => {
  const user = store.users.find((u) => u.id === req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  return res.json({ user: sanitizeUser(user) });
};
