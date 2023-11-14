//imports
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
const serverPort = 2115;
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

// conexion with DB
async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.PASS,
    database: process.env.DBNAME,
  });
  await connection.connect();
  console.log(
    `Conexión establecida con la base de datos (identificador=${connection.threadId})`
  );

  return connection;
}

//endpoints
//obtain all heroes: GET
server.get('/heroes', async (req, res) => {
  try {
    const sql = 'SELECT * FROM heroes';
    const conn = await getConnection();
    const [results] = await conn.query(sql);
    const heroes = results.length;

    res.json({
      success: true,
      info: { count: heroes },
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

//obtain hero by ID: GET
server.get('/heroes/:id', async (req, res) => {
  try {
    const id = req.params.id;

    //validate info in url params is number
    if (isNaN(id)) {
      return res.json({
        success: false,
        message: 'El ID debe ser un número válido',
      });
    }
    const sql = 'SELECT * FROM heroes WHERE id = ?';
    const conn = await getConnection();
    const [results] = await conn.query(sql, id);

    //validate there's a hero asociated with the ID searched
    if (results.length === 0) {
      return res.json({
        success: false,
        message: 'No se encontró ningún héroe con ese ID',
      });
    }

    const hero = results[0];

    res.json({
      name: hero.name,
      super_power: hero.super_power,
      serie: hero.serie,
      year: hero.year,
      image: hero.image,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//add new hero: POST
server.post('/heroes', async (req, res) => {
  try {
    const newHero = req.body;

    //validate required fields before inserto intro DB
    if (
      !newHero.name ||
      !newHero.super_power ||
      !newHero.serie ||
      !newHero.year
    ) {
      return res.json({
        success: false,
        message:
          'Los datos "name", "super_power", "serie" y "year" son obligatorios',
      });
    }

    const sql =
      'INSERT INTO heroes (name, super_power, serie, `year`, image) VALUES (?, ?, ?, ?, ?)';
    const conn = await getConnection();
    const [results] = await conn.query(sql, [
      newHero.name,
      newHero.super_power,
      newHero.serie,
      newHero.year,
      newHero.image,
    ]);

    const newHeroId = results.insertId;

    res.json({
      success: true,
      id: newHeroId,
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
