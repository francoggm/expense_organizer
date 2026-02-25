"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.verify = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Hash the access password on startup for comparison
let hashedPassword = null;
const initializePassword = async () => {
    const accessPassword = process.env.ACCESS_PASSWORD;
    if (accessPassword) {
        hashedPassword = await bcryptjs_1.default.hash(accessPassword, 10);
    }
};
// Initialize on module load
initializePassword();
// Parse expires in string to seconds
const parseExpiresIn = (expiresIn) => {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
        return 7 * 24 * 60 * 60; // Default 7 days in seconds
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 24 * 60 * 60;
        default: return 7 * 24 * 60 * 60;
    }
};
const login = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            res.status(400).json({
                success: false,
                error: 'Password is required',
            });
            return;
        }
        const accessPassword = process.env.ACCESS_PASSWORD;
        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        if (!accessPassword || !jwtSecret) {
            console.error('ACCESS_PASSWORD or JWT_SECRET not configured');
            res.status(500).json({
                success: false,
                error: 'Server configuration error',
            });
            return;
        }
        // Direct comparison (simpler for single password system)
        const isValid = password === accessPassword;
        if (!isValid) {
            res.status(401).json({
                success: false,
                error: 'Invalid password',
            });
            return;
        }
        // Generate JWT token
        const expiresInSeconds = parseExpiresIn(jwtExpiresIn);
        const token = jsonwebtoken_1.default.sign({ authenticated: true }, jwtSecret, { expiresIn: expiresInSeconds });
        res.json({
            success: true,
            data: {
                token,
                expiresIn: jwtExpiresIn,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
exports.login = login;
const verify = async (req, res) => {
    // If we reach here, the auth middleware has already validated the token
    res.json({
        success: true,
        data: { authenticated: true },
    });
};
exports.verify = verify;
const logout = async (_req, res) => {
    // For JWT-based auth, logout is handled client-side by removing the token
    // This endpoint is just for API completeness
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map