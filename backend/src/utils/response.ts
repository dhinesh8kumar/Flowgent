import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(res: Response, data: T, message?: string, statusCode = 200): void => {
  const body: ApiResponse<T> = { success: true, data, message };
  res.status(statusCode).json(body);
};

export const sendError = (res: Response, error: string, statusCode = 400): void => {
  const body: ApiResponse = { success: false, error };
  res.status(statusCode).json(body);
};
