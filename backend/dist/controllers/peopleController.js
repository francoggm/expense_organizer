"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getById = exports.getAll = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
// Convert database row to Person object
const rowToPerson = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    color: row.color,
    createdAt: row.created_at.toISOString(),
});
// Get all people
const getAll = async (_req, res) => {
    try {
        const result = await (0, database_1.query)('SELECT * FROM people ORDER BY created_at ASC');
        const people = result.rows.map(rowToPerson);
        res.json({
            success: true,
            data: people,
        });
    }
    catch (error) {
        console.error('Error fetching people:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch people',
        });
    }
};
exports.getAll = getAll;
// Get person by ID
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)('SELECT * FROM people WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Person not found',
            });
            return;
        }
        res.json({
            success: true,
            data: rowToPerson(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error fetching person:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch person',
        });
    }
};
exports.getById = getById;
// Create new person
const create = async (req, res) => {
    try {
        const { name, email, color } = req.body;
        if (!name || !color) {
            res.status(400).json({
                success: false,
                error: 'Name and color are required',
            });
            return;
        }
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO people (id, name, email, color, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`, [id, name, email || null, color]);
        res.status(201).json({
            success: true,
            data: rowToPerson(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error creating person:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create person',
        });
    }
};
exports.create = create;
// Update person
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, color } = req.body;
        if (!name || !color) {
            res.status(400).json({
                success: false,
                error: 'Name and color are required',
            });
            return;
        }
        const result = await (0, database_1.query)(`UPDATE people
       SET name = $1, email = $2, color = $3
       WHERE id = $4
       RETURNING *`, [name, email || null, color, id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Person not found',
            });
            return;
        }
        res.json({
            success: true,
            data: rowToPerson(result.rows[0]),
        });
    }
    catch (error) {
        console.error('Error updating person:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update person',
        });
    }
};
exports.update = update;
// Delete person
const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)('DELETE FROM people WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                error: 'Person not found',
            });
            return;
        }
        res.json({
            success: true,
            message: 'Person deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting person:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete person',
        });
    }
};
exports.remove = remove;
//# sourceMappingURL=peopleController.js.map