import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface TokenPayload {
    userId: string;
    iat: number;
    exp: number;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const tokenHeader = req.headers['x-access-token'];
        if (!tokenHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        const secret = process.env.JWT_SECRET || 'your-default-secret';
        const decoded = jwt.verify(token, secret) as unknown as TokenPayload;

        req.user = { userId: decoded.userId };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
            };
        }
    }
}