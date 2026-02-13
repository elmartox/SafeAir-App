const Report = require('../models/Report.model');

exports.createReport = async (req, res) => {
  const report = await Report.create(req.body);
  res.json(report);
};

exports.getReports = async (req, res) => {
  const reports = await Report.find();
  res.json(reports);
};

exports.updateReport = async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(report);
};

exports.deleteReport = async (req, res) => {
  await Report.findByIdAndDelete(req.params.id);
  res.json({ message: 'Report deleted' });
};
