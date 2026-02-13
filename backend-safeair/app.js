const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Configuración
app.set('port', process.env.PORT || 3000);

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rutas
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/air-data', require('./routes/air.routes'));
app.use('/api/air-control', require('./routes/air-control.routes'));
app.use('/api/reports', require('./routes/report.routes'));

module.exports = app;







