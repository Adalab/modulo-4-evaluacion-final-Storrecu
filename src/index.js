//imports
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

//create and config server
const server = express();
server.use(cors());
server.use(express.json());

//token
const generateToken = (payload) => {
  const token = jwt.sign(payload, 'secret', { expiresIn: '24h' });
  return token;
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, 'secret');
    return decoded;
  } catch (err) {
    return null;
  }
};

//init express aplication
const serverPort = 2115;
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

//conexion with DB series_db
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

//CRUD: endpoints
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

//obtain hero by ID: GET by ID
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

    // validate data type of year
    if (newHero.year !== '' && isNaN(newHero.year)) {
      return res.json({
        success: false,
        message: 'El campo "year" debe ser un número',
      });
    }

    //validate if a hero with the same name already exists
    const checkDuplicateSql = 'SELECT * FROM heroes WHERE name = ?';
    const conn = await getConnection();
    const [duplicateResults] = await conn.query(checkDuplicateSql, [
      newHero.name,
    ]);

    if (duplicateResults.length > 0) {
      return res.json({
        success: false,
        message: 'Ya existe un héroe con ese nombre',
      });
    }

    const sql =
      'INSERT INTO heroes (name, super_power, serie, `year`, image) VALUES (?, ?, ?, ?, ?)';
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

//modify an existing hero: PUT
server.put('/heroes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, super_power, serie, year, image } = req.body;

    //validate required fields before modify DB info
    if (!name || !super_power || !serie || !year) {
      return res.json({
        success: false,
        message:
          'Los datos "name", "super_power", "serie" y "year" son obligatorios',
      });
    }

    //validate data type of year
    if (year !== '' && isNaN(year)) {
      return res.json({
        success: false,
        message: 'El campo "year" debe ser un número',
      });
    }

    //validate if the hero to be updated exists
    const checkExistenceSql = 'SELECT * FROM heroes WHERE id = ?';
    const conn = await getConnection();
    const [existenceResults] = await conn.query(checkExistenceSql, [id]);

    if (existenceResults.length === 0) {
      return res.json({
        success: false,
        message: 'No se encontró ningún héroe con ese ID',
      });
    }

    const sql =
      'UPDATE heroes SET name = ?, super_power = ?, serie = ?, `year`= ?, image= ? WHERE id= ?';
    const [results] = await conn.query(sql, [
      name,
      super_power,
      serie,
      year,
      image,
      id,
    ]);

    res.json({
      success: true,
      message: `Se ha modificado al héroe con el ID ${id}`,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//eliminate an existing hero: DELETE
server.delete('/heroes/:id', async (req, res) => {
  try {
    const id = req.params.id;

    //validate if the hero to be updated exists
    const checkExistenceSql = 'SELECT * FROM heroes WHERE id = ?';
    const conn = await getConnection();
    const [existenceResults] = await conn.query(checkExistenceSql, [id]);

    if (existenceResults.length === 0) {
      return res.json({
        success: false,
        message: 'No se encontró ningún héroe con ese ID',
      });
    }

    const sql = 'DELETE FROM heroes WHERE id = ?';
    const [results] = await conn.query(sql, id);

    res.json({
      success: true,
      message: `Se ha eliminado al héroe con el ID ${id}`,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//BONUS: register/login

//conexion with DB users_db
async function getConnectionTwo() {
  const connection = await mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.PASS,
    database: process.env.DBNAMETWO,
  });
  await connection.connect();
  console.log(
    `Conexión establecida con la base de datos (identificador=${connection.threadId})`
  );

  return connection;
}

server.post('/register', async (req, res) => {
  try {
    const newUser = req.body;
    const passwordHash = await bcrypt.hash(newUser.password, 10);
    const sql = 'INSERT INTO users (email, name, `password`) VALUES (?, ?, ?)';
    const conn = await getConnectionTwo();

    const [results] = await conn.query(sql, [
      newUser.email,
      newUser.name,
      passwordHash,
    ]);

    const newUserId = results.insertId;

    const token = generateToken({ id: newUserId, email: newUser.email });

    conn.end();

    res.json({
      success: true,
      token: token,
      id: newUserId,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});
