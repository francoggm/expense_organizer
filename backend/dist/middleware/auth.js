"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                error: 'No authorization header provided',
            });
            return;
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'No token provided',
            });
            return;
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not configured');
            res.status(500).json({
                success: false,
                error: 'Server configuration error',
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (!decoded.authenticated) {
            res.status(401).json({
                success: false,
                error: 'Invalid token',
            });
            return;
        }
        req.isAuthenticated = true;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                error: 'Token expired',
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token',
            });
            return;
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
        });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map