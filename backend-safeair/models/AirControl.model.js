const mongoose = require('mongoose');

const AirControlSchema = new mongoose.Schema({
  modo_manual: {
    type: Boolean,
    default: false
  },
  ventana: {
    type: String,
    enum: ['ABIERTA', 'MEDIA', 'CERRADA'],
    default: 'CERRADA',
    trim: true
  },
  ventilador: {
    type: String,
    enum: ['ON', 'OFF'],
    default: 'OFF',
    trim: true
  },
  alarma: {
    type: String,
    enum: ['ON', 'OFF'],
    default: 'OFF',
    trim: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AirControl', AirControlSchema);
