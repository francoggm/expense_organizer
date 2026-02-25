"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset = exports.remove = exports.update = exports.create = exports.getById = exports.getAll = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
// Default categories in Portuguese
const DEFAULT_CATEGORIES = [
    { id: '1', name: 'Moradia', icon: 'Home', color: '#4CAF50', type: 'fixed' },
    { id: '2', name: 'Água', icon: 'Water', color: '#2196F3', type: 'fixed' },
    { id: '3', name: 'Luz', icon: 'ElectricBolt', color: '#FF9800', type: 'fixed' },
    { id: '4', name: 'Internet', icon: 'Wifi', color: '#9C27B0', type: 'fixed' },
    { id: '5', name: 'Telefone', icon: 'Phone', color: '#00BCD4', type: 'fixed' },
    { id: '6', name: 'Seguro', icon: 'Security', color: '#607D8B', type: 'fixed' },
    { id: '7', name: 'Assinaturas', icon: 'Subscriptions', color: '#E91E63', type: 'fixed' },
    { id: '8', name: 'Alimentação', icon: 'ShoppingCart', color: '#8BC34A', type: 'variable' },
    { id: '9', name: 'Restaurante', icon: 'Restaurant', color: '#FF5722', type: 'variable' },
    { id: '10', name: 'Transporte', icon: 'DirectionsCar', color: '#00BCD4', type: 'both' },
    { id: '11', name: 'Entretenimento', icon: 'Movie', color: '#673AB7', type: 'variable' },
    { id: '12', name: 'Compras', icon: 'ShoppingBag', color: '#F44336', type: 'variable' },
    { id: '13', name: 'Saúde', icon: 'LocalHospital', color: '#4DD0E1', type: 'both' },
    { id: '14', name: 'Educação', icon: 'School', color: '#3F51B5', type: 'both' },
    { id: '15', name: 'Viagem', icon: 'Flight', color: '#FFEB3B', type: 'variable' },
    { id: '16', name: 'Cuidados Pessoais', icon: 'Spa', color: '#E1BEE7', type: 'variable' },
    { id: '17', name: 'Presentes', icon: 'CardGiftcard', color: '#FF4081', type: 'variable' },
    { id: '18', name: 'Outros', icon: 'MoreHoriz', color: '#9E9E9E', type: 'both' },
];
// Convert database row to Category object
const rowToCategory = (row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    type: row.type,
});
// Get all categories
const getAll = async (_req, res) => {
    try {
        const result = await (0, database_1.query)('SELECT * FROM categories ORDER BY name ASC');
        // If no categories exist, insert defaults
        if (result.rows.length === 0) {
            for (const cat of DEFAULT_CATEGORIES) {
                await (0, database_1.query)('INSERT INTO categories (id, name, icon, color, type) VALUES ($1, $2, $3, $4, $5)', [cat.id, cat.name, cat.icon, cat.color, cat.type]);
            }
            res.json({
                success: true,
                data: DEFAULT_CATEGORIES,
            });
            return;
        }
        const categories = result.rows.map(rowToCategory);
        res.json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
        });
    }
};
exports.getAll = getAll;
// Get category by ID
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)('SELECT * FROM categories WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Category not found',
            });
            return;
        }
        res.json({
            success: true,
            data: rowToCategory(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch category',
        });
    }
};
exports.getById = getById;
// Create new category
const create = async (req, res) => {
    try {
        const { name, icon, color, type } = req.body;
        if (!name || !icon || !color || !type) {
            res.status(400).json({
                success: false,
                error: 'Name, icon, color, and type are required',
            });
            return;
        }
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO categories (id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [id, name, icon, color, type]);
        res.status(201).json({
            success: true,
            data: rowToCategory(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create category',
        });
    }
};
exports.create = create;
// Update category
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon, color, type } = req.body;
        if (!name || !icon || !color || !type) {
            res.status(400).json({
                success: false,
                error: 'Name, icon, color, and type are required',
            });
            return;
        }
        const result = await (0, database_1.query)(`UPDATE categories
       SET name = $1, icon = $2, color = $3, type = $4
       WHERE id = $5
       RETURNING *`, [name, icon, color, type, id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Category not found',
            });
            return;
        }
        res.json({
            success: true,
            data: rowToCategory(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update category',
        });
    }
};
exports.update = update;
// Delete category
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Category not found',
            });
            return;
        }
        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete category',
        });
    }
};
exports.remove = remove;
// Reset categories to defaults
const reset = async (_req, res) => {
    try {
        // Delete all existing categories
        await (0, database_1.query)('DELETE FROM categories');
        // Insert default categories
        for (const cat of DEFAULT_CATEGORIES) {
            await (0, database_1.query)('INSERT INTO categories (id, name, icon, color, type) VALUES ($1, $2, $3, $4, $5)', [cat.id, cat.name, cat.icon, cat.color, cat.type]);
        }
        res.json({
            success: true,
            data: DEFAULT_CATEGORIES,
            message: 'Categories reset to defaults',
        });
    }
    catch (error) {
        console.error('Error resetting categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset categories',
        });
    }
};
exports.reset = reset;
//# sourceMappingURL=categoriesController.js.map