const express = require("express");
const app = express();
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const path = require('path');
const crypto = require('crypto');


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));


const url = 'put your url';

try {
    mongoose.connect(url);
} catch (error) {
    handleError(error);
}

mongoose.set('strictQuery', true);
process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error.message);
});

let bucket;
mongoose.connection.on("connected", () => {
    const client = mongoose.connections[0].client;
    const db = mongoose.connections[0].db;
    bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: "uploads"
    });
    /* console.log(bucket); */
});




const storage = new GridFsStorage({
    url,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
    res.render('overview');
});

app.get("/fileinfo/:filename", (req, res) => {
    const file = bucket
        .find({
            filename: req.params.filename
        })
        .toArray((err, files) => {
            if (!files || files.length === 0) {
                return res.status(404)
                    .json({
                        err: "no files exist"
                    });
            }
            bucket.openDownloadStreamByName(req.params.filename)
                .pipe(res);
        });
});

app.post("/upload", upload.single("file"), (req, res) => {
    try {
        res.status(200).json({
            file: req.file
        })
    }
    catch (err) {
        console.log(err);
    }
});

app.listen(4000, () => {
    console.log('Server is running on port 4000');
})