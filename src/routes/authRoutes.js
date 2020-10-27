const express = require('express');
const mailer = require('nodemailer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const bcrypt = require('bcrypt');
const queryString = require('query-string');
const resetPassAuth = require('../middlewares/resetPassAuth');
const router = express.Router();
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const clientUrl = process.env.CLIENT_URI || 'http://localhost:3001';
const serverBaseURL = process.env.APPURL || 'http://localhost:3000';
const mailPassword = process.env.MAIL_PASS;
const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;
const uriShortlyEmail_ID = process.env.MAIL_ID;

const oauth2Client = new OAuth2(
    clientID,
    clientSecret,
    "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
    refresh_token: refreshToken
});
const accessToken = oauth2Client.getAccessToken()

const transporter = mailer.createTransport({
    service: 'gmail',
    auth: {
        type: "OAuth2",
        user: uriShortlyEmail_ID,
        clientId: clientID,
        clientSecret: clientSecret,
        refreshToken: refreshToken,
        accessToken: accessToken
    }
});

// router.get('/forgotPassword', async (req, res) => {
//     const { email, token } = req.query;

//     try {
//         if (!email || !token) {
//             throw new Error('Email or token missing');
//         }
//         const user = await User.find({ email: email, verified: true });
//         if (user) {
//             // return res.render('reset', { clientUrl, serverBaseURL, email, token });           
//         } else {
//             throw new Error('Email not found or don\'t be so cheeky!');
//         }
//     } catch (error) {
//         return res.render('error', { clientUrl, message: 'Reset Password Failed', error: error.message });
//     }
// });


router.get('/verify/:userId', async (req, res) => {

    try {
        if (!req.params.userId) {
            throw new Error('Must provide userId params');
        }
        const user = await User.updateOne({ _id: mongoose.Types.ObjectId(req.params.userId), verified: false }, { verified: true });
        if (user.nModified > 0) {
            // return res.render('verify', { clientUrl, email: user.email });

            const messageQuery = queryString.stringify({ email: user.email });

            return res.redirect(`${clientUrl}/verify?${messageQuery}`);
        } else {
            throw new Error('Email already verified or invalid url');
        }
    } catch (error) {
        // return res.render('error', { clientUrl, message: 'Email Verification Failed', error: error.message });
        const messageQuery = queryString.stringify({ message: 'Email Verification Failed', error: error.message })
        return res.redirect(`${clientUrl}/error?${messageQuery}`);
    }
});

router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    // console.log(req.body);
    if (!email || !password) {
        return res.status(422).send({ error: 'Must provide email and password' });
    }
    try {
        const user = new User({ email, password });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.SIGN_SECRET || 'Poradalam');

        const info = await transporter.sendMail({
            from: '"uriShortly" <urishorty.heroku@gmail.com>', // sender address
            to: `${user.email}`, // list of receivers
            subject: "Welcome to uriShortly, Email Verification", // Subject line
            text: "How are you doing? Thanks for Signing up", // plain text body
            html: `<b>Click on below uri to verify your email address</b><br/> <a href="${serverBaseURL}/verify/${user._id}">Verify</a>`, // html body
        });
        res.send({ token });
    } catch (err) {
        return res.status(422).send({ message: "unable to signup or please login if you already have an account with us", error: err.message });
    }
});

router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    // console.log(req.body);
    if (!email || !password) {
        return res.status(422).send({ error: 'Must provide email and password' });
    }

    const user = await User.findOne({ email, verified: true });
    if (!user) {
        return res.status(422).send({ error: 'Invalid password or email or not verified' });
    }

    try {
        await user.comparePassword(password);
        const token = jwt.sign({ userId: user._id }, process.env.SIGN_SECRET);
        res.send({ token });
    } catch (err) {
        return res.status(422).send({ error: 'Invalid password or email' });
    }
});


router.post('/forgotPassword', async (req, res) => {
    const { email } = req.body;
    // console.log('body', req.body);
    if (!email) {
        return res.status(422).send({ error: 'Must provide email' });
    }
    try {
        const user = await User.findOne({ email, verified: true });

        if (!user) {
            throw new Error(`Email not found or not verfied or don't try to be cheeky!`);
        }

        await User.updateOne({ _id: mongoose.Types.ObjectId(user._id) }, { reset: true });

        const token = jwt.sign({ userId: user._id }, process.env.RESET_SECRET || 'Theriyala', { expiresIn: 60 * 10 });


        const info = await transporter.sendMail({
            from: '"uriShortly" <urishorty.heroku@gmail.com>', // sender address
            to: `${email}`, // list of receivers
            subject: "Welcome to uriShortly, Reset Password", // Subject line
            text: "How are you doing? Thanks for Signing up Please", // plain text body
            html: `<b>Click on below uri to reset your password</b><br/><a href="${clientUrl}/reset?email=${email}&token=${token}">Reset Password</a>
      <p>This Link will get expired in 10 minutes</p>
      `, // html body
        });

        res.send({ message: 'password reset link send over email' });
    } catch (error) {
        return res.status(500).send({ error: error.message, serverError: error });
    }
});

router.post('/resetPassword', resetPassAuth, async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body)
    if (!password) {
        return res.status(422).send({ error: 'Must provide password' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatedUser = await User.updateOne({ _id: mongoose.Types.ObjectId(req.user._id), reset: true }, { password: hashedPassword, reset: false });
        if (updatedUser.nModified == 0) {
            return res.status(500).send({ clientUrl, message: 'Password Reset Attempted more than once or Unauthorised Entry!' });
        }

        return res.send({ message: 'Password Reset Successful!', clientUrl, email: email });
    } catch (err) {
        return res.status(500).send({ clientUrl, message: 'Password Reset Failed!', error: err.message });
    }
});



module.exports = router;
