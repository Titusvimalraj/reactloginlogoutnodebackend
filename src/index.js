require('dotenv').config()
require('./models/User');
require('./models/Url');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const urlRoutes = require('./routes/url');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

app.get("/", function (req, res) {
    // res.redirect('https://documenter.getpostman.com/view/7987415/TVKHUFWo');
    let apiResponse = { message: 'route not available in the application, params not proper or missing', error: 'Server Error', status: 404 };
    res.status(500).json(apiResponse);
});
app.use(authRoutes);
app.use(urlRoutes);

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/uriShortly';
if (!mongoUri) {
    throw new Error(
        `MongoURI was not supplied.`
    );
}
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});
mongoose.connection.on('connected', () => {
    console.log('Connected to mongo instance');
});
mongoose.connection.on('error', err => {
    console.error('Error connecting to mongo', err);
});




app.listen(process.env.PORT || 3000, () => {
    console.log('Listening on port 3000');
});
