import { Request, Response } from 'express';
export declare const getAll: (_req: Request, res: Response) => Promise<void>;
export declare const getById: (req: Request, res: Response) => Promise<void>;
export declare const create: (req: Request, res: Response) => Promise<void>;
export declare const createBulk: (req: Request, res: Response) => Promise<void>;
export declare const update: (req: Request, res: Response) => Promise<void>;
export declare const remove: (req: Request, res: Response) => Promise<void>;
export declare const removeByGroup: (req: Request, res: Response) => Promise<void>;
export declare const markSplitPaid: (req: Request, res: Response) => Promise<void>;
export declare const markMonthlyPayment: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=expensesController.d.ts.map