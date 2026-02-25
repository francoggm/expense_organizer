import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            isAuthenticated?: boolean;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map