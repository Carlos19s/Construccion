import { db } from '../config/db-connection.js'

const pizzaResolver = {
    Query: {
        Pizzas(root, { id }) {
            if (id == undefined) {
                return db.any('select * from pizzas');
            } else {
                return db.any('select * from pizzas where piz_id = $1', [id]);
            }
        },
        Ingredientes(root, { id }) {
            if (id == undefined) {
                return db.any('select * from ingredientes');
            } else {
                return db.any('select * from ingredientes where ing_id = $1', [id]);
            }
        }
    },

    pizzas: {
        async ingredientes(parent) {
            return await db.any(`
                SELECT i.* FROM ingredientes i
                INNER JOIN pizza_ingredientes pi ON i.ing_id = pi.ing_id
                WHERE pi.piz_id = $1
            `, [parent.piz_id]);
        },

        async piz_total_calorias(parent) {
            const result = await db.oneOrNone(`
                SELECT SUM(i.ing_calorias) as total 
                FROM ingredientes i
                INNER JOIN pizza_ingredientes pi ON i.ing_id = pi.ing_id
                WHERE pi.piz_id = $1
            `, [parent.piz_id]);
            
            return result && result.total ? parseInt(result.total) : 0;
        }
    },

    Mutation: {
        // --- MUTACIONES PARA PIZZAS ---
        async createPizza(root, { pizza }) {
            try {
                if (pizza == undefined) {
                    return null;
                } else {
                    const nuevaPizza = await db.one(
                        'INSERT INTO pizzas (piz_name, piz_origin, piz_state) VALUES ($1,$2,$3) RETURNING *;',
                        [pizza.piz_name, pizza.piz_origin, true] 
                    );

                    if (pizza.ingredientes && pizza.ingredientes.length > 0) {
                        const queries = pizza.ingredientes.map(ing_id => {
                            return db.none('INSERT INTO pizza_ingredientes (piz_id, ing_id) VALUES ($1, $2)', [nuevaPizza.piz_id, ing_id]);
                        });
                        await Promise.all(queries); 
                    }

                    return nuevaPizza;
                }
            } catch (error) {
                console.error(error);
                throw error;
            }
        },

        async updatePizza(root, { pizza }) {
            try {
                if (pizza == undefined) {
                    return null;
                } else {
                    const pizzaActualizada = await db.one(
                        'UPDATE pizzas SET piz_name=$2, piz_origin=$3, piz_state=$4 WHERE piz_id=$1 RETURNING *;',
                        [
                            pizza.piz_id,
                            pizza.piz_name,
                            pizza.piz_origin,
                            pizza.piz_state
                        ]
                    );

                    if (pizza.ingredientes !== undefined) { 
                        await db.none('DELETE FROM pizza_ingredientes WHERE piz_id=$1', [pizza.piz_id]);
                        
                        if (pizza.ingredientes.length > 0) {
                            const queries = pizza.ingredientes.map(ing_id => {
                                return db.none('INSERT INTO pizza_ingredientes (piz_id, ing_id) VALUES ($1, $2)', [pizza.piz_id, ing_id]);
                            });
                            await Promise.all(queries);
                        }
                    }

                    return pizzaActualizada;
                }
            } catch (error) {
                console.error(error);
                throw error;
            }
        },

        async deletePizza(root, { piz_id }) {
            try {
                if (piz_id == undefined) {
                    return null;
                } else {
                    await db.none('DELETE FROM pizza_ingredientes WHERE piz_id=$1', [piz_id]);
                    
                    const response = await db.one(
                        'DELETE FROM pizzas WHERE piz_id=$1 RETURNING *;',
                        [piz_id]
                    );
                    return response;
                }
            } catch (error) {
                console.error(error);
                throw error;
            }
        },

        // --- MUTACIONES PARA INGREDIENTES ---
        async createIngrediente(root, { ingrediente }) {
            try {
                if (ingrediente == undefined) return null;
                
                return await db.one(
                    'INSERT INTO ingredientes (ing_name, ing_calorias, ing_state) VALUES ($1, $2, $3) RETURNING *;',
                    [ingrediente.ing_name, ingrediente.ing_calorias, true]
                );
            } catch (error) {
                console.error(error);
                throw error;
            }
        },

        async updateIngrediente(root, { ingrediente }) {
            try {
                if (ingrediente == undefined) return null;
                
                return await db.one(
                    'UPDATE ingredientes SET ing_name=$2, ing_calorias=$3, ing_state=$4 WHERE ing_id=$1 RETURNING *;',
                    [ingrediente.ing_id, ingrediente.ing_name, ingrediente.ing_calorias, ingrediente.ing_state]
                );
            } catch (error) {
                console.error(error);
                throw error;
            }
        },

        async deleteIngrediente(root, { ing_id }) {
            try {
                if (ing_id == undefined) return null;
                
                await db.none('DELETE FROM pizza_ingredientes WHERE ing_id=$1', [ing_id]);
                
                return await db.one(
                    'DELETE FROM ingredientes WHERE ing_id=$1 RETURNING *;',
                    [ing_id]
                );
            } catch (error) {
                console.error(error);
                throw error;
            }
        }
    }
}

export default pizzaResolver;
