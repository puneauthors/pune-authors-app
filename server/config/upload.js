const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

function SharpStorage(opts) {
  this.getDestination = opts.destination;
}

SharpStorage.prototype._handleFile = function _handleFile(req, file, cb) {
  this.getDestination(req, file, function(err, destination) {
    if (err) return cb(err);
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalExt = path.extname(file.originalname).toLowerCase();
    
    // We will save all images as WEBP to drastically reduce file size,
    // unless they are PDFs or other documents which keep their original extension.
    const isImage = file.mimetype.startsWith('image/');
    const filename = isImage 
      ? uniqueSuffix + '.webp' 
      : uniqueSuffix + '-' + file.originalname;
      
    const finalPath = path.join(destination, filename);
    const outStream = fs.createWriteStream(finalPath);
    
    if (isImage) {
        let pipeline = sharp().resize({ width: 1920, withoutEnlargement: true });
        
        // Convert all images to WebP for massive space savings
        pipeline = pipeline.webp({ quality: 75 });
        
        file.stream.pipe(pipeline).pipe(outStream);
    } else {
        file.stream.pipe(outStream);
    }

    outStream.on('error', cb);
    outStream.on('finish', function() {
      cb(null, {
        destination: destination,
        filename: filename,
        path: finalPath,
        size: outStream.bytesWritten
      });
    });
  });
};

SharpStorage.prototype._removeFile = function _removeFile(req, file, cb) {
  fs.unlink(file.path, cb);
};

const storage = new SharpStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  }
});

const upload = multer({ storage });
module.exports = { upload, uploadDir };
