const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = mongoose.model('User');

module.exports = (req, res, next) => {
    const { token } = req.body;
    // authorization === 'Bearer laksjdflaksdjasdfklj'

    if (!token) {
        return res.status(401).send({ error: 'You must Provide a token' });
    }


    jwt.verify(token, process.env.RESET_SECRET || 'Theriyala', async (err, payload) => {
        if (err) {
            return res.status(401).send({ error: 'Token expired' });
        }
        const { userId } = payload;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).send({ error: 'Reset password link expired or unauthorized entry' });
        }
        req.user = user;
        next();
    });
};
