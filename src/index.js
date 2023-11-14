const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// create and config server
const server = express();
server.use(cors());
server.use(express.json());

// init express aplication
const serverPort = 2105;
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

// conexion con la BD
async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.PASS,
    database: process.env.DBNAME,
    // host: 'host_de_tu_bd',
    // user: 'user_de_tu_bd',
    // password: 'tu_contras',
    // database: 'tu_bd',
  });
  await connection.connect();
  console.log(
    `Conexión establecida con la base de datos (identificador=${connection.threadId})`
  );

  return connection;
}
// creamos  nuestros endpoints
//get, post, put, delete

//Obtenemos todas las recetas
server.get('/recetas', async (req, res) => {
  try {
    const sql = 'SELECT * FROM recetas';
    const conn = await getConnection();
    const [results] = await conn.query(sql);
    const items = results.length;

    res.json({
      success: true,
      info: { count: items },
      results: results,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//Obtenemos receta por su ID
server.get('/recetas/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const sql = 'SELECT * FROM recetas WHERE id = ?';
    const conn = await getConnection();
    const [results] = await conn.query(sql, id);
    const recetas = results[0];

    res.json({
      nombre: recetas.nombre,
      ingredientes: recetas.ingredientes,
      instrucciones: recetas.intrucciones,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//Añadir nueva receta
server.post('/recetas', async (req, res) => {
  try {
    const nuevaReceta = req.body;
    const sql =
      'INSERT INTO recetas (nombre, ingredientes, instrucciones) VALUES (?, ?, ?)';
    const conn = await getConnection();
    const [results] = await conn.query(sql, [
      nuevaReceta.nombre,
      nuevaReceta.ingredientes,
      nuevaReceta.instrucciones,
    ]);

    const nuevaRecetaID = results.insertId;

    res.json({
      success: true,
      id: nuevaRecetaID,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//Modificar una receta existente
server.put('/recetas/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, ingredientes, instrucciones } = req.body;
    const sql =
      'UPDATE recetas SET nombre = ?, ingredientes = ?, instrucciones = ? WHERE id= ?';
    const conn = await getConnection();
    const [results] = await conn.query(sql, [
      nombre,
      ingredientes,
      instrucciones,
      id,
    ]);

    res.json({
      success: true,
      message: `Se ha modificado la receta con el ID ${id}`,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//Eliminar una receta
server.delete('/recetas/:id', async (req, res) => {});
