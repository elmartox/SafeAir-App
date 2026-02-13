const AirData = require('../models/AirData.model');

exports.createReading = async (req, res) => {
  try {
    const payload = { ...req.body };
    // Be tolerant with fecha_hora: allow missing/invalid and fallback to default
    if (Object.prototype.hasOwnProperty.call(payload, 'fecha_hora')) {
      const parsed = new Date(payload.fecha_hora);
      if (Number.isNaN(parsed.getTime())) {
        delete payload.fecha_hora;
      } else {
        payload.fecha_hora = parsed;
      }
    }
    const reading = await AirData.create(payload);
    res.status(201).json(reading);
  } catch (error) {
    res.status(400).json({ message: 'Invalid air data payload', error: error.message });
  }
};

exports.getReadings = async (req, res) => {
  try {
    const readings = await AirData.find().sort({ fecha_hora: -1 });
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch readings', error: error.message });
  }
};

exports.getReadingById = async (req, res) => {
  try {
    const reading = await AirData.findById(req.params.id);
    if (!reading) {
      return res.status(404).json({ message: 'Reading not found' });
    }
    res.json(reading);
  } catch (error) {
    res.status(400).json({ message: 'Invalid reading id', error: error.message });
  }
};

exports.updateReading = async (req, res) => {
  try {
    const reading = await AirData.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!reading) {
      return res.status(404).json({ message: 'Reading not found' });
    }
    res.json(reading);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update reading', error: error.message });
  }
};

exports.deleteReading = async (req, res) => {
  try {
    const deleted = await AirData.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Reading not found' });
    }
    res.json({ message: 'Reading deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete reading', error: error.message });
  }
};
