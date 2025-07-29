


import History from '../models/history.js';

export const addHistory = async ({ userId, action, metadata = {} }) => {
  return await History.create({
    user: userId,
    action,
    metadata,
  });
};