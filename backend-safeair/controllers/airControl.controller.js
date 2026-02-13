const AirControl = require('../models/AirControl.model');

const CONTROL_FIELDS = ['modo_manual', 'ventana', 'ventilador', 'alarma'];
const VENTANA_VALUES = new Set(['ABIERTA', 'MEDIA', 'CERRADA']);
const ONOFF_VALUES = new Set(['ON', 'OFF']);

const normalizeUpper = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
};

const buildPatch = (body) => {
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, 'modo_manual')) {
    if (typeof body.modo_manual === 'boolean') {
      patch.modo_manual = body.modo_manual;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ventana')) {
    const v = normalizeUpper(body.ventana);
    if (VENTANA_VALUES.has(v)) patch.ventana = v;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'ventilador')) {
    const v = normalizeUpper(body.ventilador);
    if (ONOFF_VALUES.has(v)) patch.ventilador = v;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'alarma')) {
    const v = normalizeUpper(body.alarma);
    if (ONOFF_VALUES.has(v)) patch.alarma = v;
  }

  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date();
  }

  return patch;
};

exports.getControl = async (req, res) => {
  try {
    let control = await AirControl.findOne();
    if (!control) {
      control = await AirControl.create({});
    }
    res.json(control);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch controls', error: error.message });
  }
};

exports.updateControl = async (req, res) => {
  try {
    const patch = buildPatch(req.body || {});

    if (Object.keys(patch).length === 0) {
      const current = await AirControl.findOne();
      return res.json(current || await AirControl.create({}));
    }

    const updated = await AirControl.findOneAndUpdate(
      {},
      { $set: patch },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update controls', error: error.message });
  }
};
