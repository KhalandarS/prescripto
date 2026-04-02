const express = require('express');
const router = express.Router();
const { User } = require('../models');

// MOCK AUTH - For submission purposes
// In a real app, use bcrypt and JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Mock password check: any password works for dev
    res.json({
      token: 'mock-jwt-token-' + user.id,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/me', async (req, res) => {
    // Return first user for dev purposes if no token provided
    const user = await User.findOne();
    res.json(user);
});

module.exports = router;
