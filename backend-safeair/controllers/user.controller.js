const User = require('../models/User.Model');
const bcrypt = require('bcryptjs');

// REGEX password: letras + números, mínimo 6
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

// REGISTRO
exports.createUser = async (req, res) => {
  const { email, password } = req.body;

  //  Validar email
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      message: 'Email inválido'
    });
  }

  // Validar password
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        'La clave debe tener mínimo 6 caracteres e incluir letras y números'
    });
  }

  //  Verificar si el correo ya existe
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: 'El correo ya está registrado'
    });
  }

  // Encriptar password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear usuario
  const user = await User.create({
    email,
    password: hashedPassword
  });

  res.json({
    id: user._id,
    email: user.email,
    role: user.role
  });
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Buscar usuario por correo
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      message: 'El correo no existe'
    });
  }

  // Comparar password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      message: 'Contraseña incorrecta'
    });
  }

  // Login exitoso
  res.json({
    id: user._id,
    email: user.email,
    role: user.role
  });
};

// CRUD restante (sin cambios)
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

exports.updateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(user);
};

exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
};
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 1. Validaciones
    if (!email || !newPassword) {
      return res.status(400).json({
        message: 'Email y nueva contraseña son obligatorios'
      });
    }

    if (newPassword.length < 6 || 
        !/[A-Za-z]/.test(newPassword) || 
        !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        message: 'La clave debe tener mínimo 6 caracteres e incluir letras y números'
      });
    }

    // 2. Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'El correo no existe'
      });
    }

    // 3. Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // 4. Guardar cambios
    await user.save();

    // 5. Respuesta OK
    res.json({
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error al actualizar la contraseña'
    });
  }
};