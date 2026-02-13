const mongoose = require('mongoose');

const AirDataSchema = new mongoose.Schema({
  fecha_hora: {
    type: Date,
    default: Date.now   // 🔥 CLAVE
  },
  habitacion: {
    type: String,
    required: true,
    trim: true
  },
  sensores: {
    nivel_gas: {
      type: Number,
      required: true
    },
    mq2: {
      type: Number,
      required: true
    }
  },
  controles: {
    estado_sistema: {
      type: String,
      required: true,
      trim: true
    },
    estado_alarma: {
      type: String,
      required: true,
      trim: true
    },
    estado_ventana: {
      type: String,
      required: true,
      trim: true
    }
  }
});

module.exports = mongoose.model('AirData', AirDataSchema);
