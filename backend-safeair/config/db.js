const mongoose = require('mongoose');

// URI de MongoDB Atlas
const uri
mongoose.connect(uri)
  .then(() => console.log('MongoDB Atlas conectado'))
  .catch(err => console.error(err));

module.exports = mongoose;
