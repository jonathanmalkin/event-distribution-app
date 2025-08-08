import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key.' });
  }

  if (!process.env.ADMIN_API_KEY) {
    console.warn('ADMIN_API_KEY is not set. Authentication is currently insecure.');
    // In a real production environment, you might want to deny all requests if the key isn't set.
    // For now, we will allow the request but log a warning.
  }

  next();
};
