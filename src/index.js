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

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  req.user = decoded;
  next();
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
//obtain all animes: GET
server.get('/animes', async (req, res) => {
  try {
    const sql = 'SELECT * FROM animes';
    const conn = await getConnection();
    const [results] = await conn.query(sql);
    const animes = results.length;

    res.json({
      success: true,
      info: { count: animes },
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

//obtain anime by ID: GET by ID
server.get('/animes/:id', async (req, res) => {
  try {
    const id = req.params.id;

    //validate info in url params is number
    if (isNaN(id)) {
      return res.json({
        success: false,
        message: 'El ID debe ser un número válido',
      });
    }
    const sql = 'SELECT * FROM animes WHERE id = ?';
    const conn = await getConnection();
    const [results] = await conn.query(sql, id);

    //validate there's an anime asociated with the ID searched
    if (results.length === 0) {
      return res.json({
        success: false,
        message: 'No se encontró ningún anime con ese ID',
      });
    }

    const anime = results[0];

    res.json({
      title: anime.title,
      genre: anime.genre,
      release_year: anime.release_year,
      image: anime.image,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//add new anime: POST
server.post('/animes', async (req, res) => {
  try {
    const newAnime = req.body;

    //validate required fields before inserto intro DB
    if (!newAnime.title || !newAnime.release_year) {
      return res.json({
        success: false,
        message: 'Los datos "title" y "release_year" son obligatorios',
      });
    }

    // validate data type of year
    if (newAnime.release_year !== '' && isNaN(newAnime.release_year)) {
      return res.json({
        success: false,
        message: 'El campo "release_year" debe ser un número',
      });
    }

    //validate if a anime with the same name already exists
    const checkDuplicateSql = 'SELECT * FROM animes WHERE title = ?';
    const conn = await getConnection();
    const [duplicateResults] = await conn.query(checkDuplicateSql, [
      newAnime.title,
    ]);

    if (duplicateResults.length > 0) {
      return res.json({
        success: false,
        message: 'Ya existe un anime con ese nombre',
      });
    }

    const sql =
      'INSERT INTO animes (title, genre, release_year, image) VALUES (?, ?, ?, ?)';
    const [results] = await conn.query(sql, [
      newAnime.title,
      newAnime.genre,
      newAnime.release_year,
      newAnime.image,
    ]);

    const newAnimeId = results.insertId;

    res.json({
      success: true,
      id: newAnimeId,
    });

    conn.end();
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});

//modify an existing anime: PUT
server.put('/animes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { title, genre, release_year, image } = req.body;

    //validate required fields before modify DB info
    if (!title || !release_year) {
      return res.json({
        success: false,
        message: 'Los datos "title" y "release_year" son obligatorios',
      });
    }

    //validate data type of year
    if (release_year !== '' && isNaN(release_year)) {
      return res.json({
        success: false,
        message: 'El campo "release_year" debe ser un número',
      });
    }

    //validate if the anime to be updated exists
    const checkExistenceSql = 'SELECT * FROM animes WHERE id = ?';
    const conn = await getConnection();
    const [existenceResults] = await conn.query(checkExistenceSql, [id]);

    if (existenceResults.length === 0) {
      return res.json({
        success: false,
        message: 'No se encontró ningún anime con ese ID',
      });
    }

    const sql =
      'UPDATE animes SET title = ?, genre = ?, release_year = ?, image= ? WHERE id= ?';
    const [results] = await conn.query(sql, [
      title,
      genre,
      release_year,
      image,
      id,
    ]);

    res.json({
      success: true,
      message: `Se ha modificado el anime con el ID ${id}`,
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
server.delete('/animes/:id', async (req, res) => {
  try {
    const id = req.params.id;

    //validate if the hero to be updated exists
    const checkExistenceSql = 'SELECT * FROM animes WHERE id = ?';
    const conn = await getConnection();
    const [existenceResults] = await conn.query(checkExistenceSql, [id]);

    if (existenceResults.length === 0) {
      return res.json({
        success: false,
        message: 'No se encontró ningún anime con ese ID',
      });
    }

    const sql = 'DELETE FROM animes WHERE id = ?';
    const [results] = await conn.query(sql, id);

    res.json({
      success: true,
      message: `Se ha eliminado el anime con el ID ${id}`,
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

server.post('/register', authenticateToken, async (req, res) => {
  const newUser = req.body;
  //verificate required fields before add new user
  const requiredFields = ['email', 'name', 'password'];

  for (const field of requiredFields) {
    if (!newUser[field]) {
      return res.json({
        success: false,
        message: `El campo "${field}" es obligatorio.`,
      });
    }
  }

  //verificate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(newUser.email)) {
    return res.json({
      success: false,
      message:
        'Por favor, introduce una dirección de correo electrónico válida.',
    });
  }

  try {
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

server.post('/login', authenticateToken, async (req, res) => {
  const body = req.body;
  try {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const conn = await getConnectionTwo();
    const [results] = await conn.query(sql, [body.email]);
    conn.end();

    const user = results[0];
    const passwordMatch =
      user === null
        ? false
        : await bcrypt.compare(body.password, user['password']);

    if (!user || !passwordMatch) {
      return res.status(401).json({
        error: 'Usuario o contraseña incorrectos',
      });
    }

    const userForToken = {
      email: user.email,
      password: user['password'],
    };

    const token = generateToken(userForToken);

    res.json({
      token,
      email: user.email,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error,
    });
  }
});
