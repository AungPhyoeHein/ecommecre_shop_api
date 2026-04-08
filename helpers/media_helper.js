const { unlink } = require('fs');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ALLOWED_EXTENSION = {
    'image/png' : 'png',
    'image/jpg': 'jpg',
    'image/jpeg' : 'jpeg',
    'image/webp' : 'webp'
}

const stroage = multer.diskStorage({
    destination: (_,__,cb)=> {cb(null,'public/uploads')},
    filename: (_,file,cb) => {
    const filename = file.originalname.replace(' ','-').replace('.png','').replace('.jpg','').replace('.jpeg','');
    const extension = ALLOWED_EXTENSION[file.mimetype];
    cb(null,`${filename}-${Date.now()}.${extension}`);
}});

const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ecommerce_uploads',
        format: async (req, file) => ALLOWED_EXTENSION[file.mimetype], 
        public_id: (req, file) => {
            const filename = file.originalname.replace(' ','-').replace('.png','').replace('.jpg','').replace('.jpeg','');
            return `${filename}-${Date.now()}`;
        },
    },
});

const fileFilter = (_,file,cb) => {
    const isValid = ALLOWED_EXTENSION[file.mimetype];
    let uploadError = new Error(`Invalid image type ${file.mimetype} is not allowed`)
    if(!isValid){
        return cb(uploadError);
    }
    return cb(null,true);
};

const localUpload = multer({
    storage: stroage,
    limits: {fileSize: 1024 * 1024 * 10},
    fileFilter: fileFilter
});

const cloudinaryUpload = multer({
    storage: cloudinaryStorage,
    limits: {fileSize: 1024 * 1024 * 10},
    fileFilter: fileFilter
});

const upload = cloudinaryUpload; // Using cloudinary as default, but localUpload is kept

const deleteImages = async (imageUrls, continueOnErrorName) => {
    await Promise.all(imageUrls.map(async (imageUrl) => {
        try {
            if (imageUrl.includes('res.cloudinary.com')) {
                // Extract public_id from Cloudinary URL
                // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.ext
                const parts = imageUrl.split('/');
                const filenameWithExt = parts.pop();
                const folder = parts.pop();
                const filename = filenameWithExt.split('.')[0];
                const public_id = `${folder}/${filename}`;
                
                await cloudinary.uploader.destroy(public_id);
            } else {
                const imagePath = path.resolve(
                    __dirname,
                    '..',
                    'public/uploads',
                    path.basename(imageUrl)
                );
                unlink(imagePath, (err) => {
                    if (err) throw err;
                });
            }
        } catch (err) {
            if(err.code === continueOnErrorName){
                console.error(`Continuing with the next image: ${err.message}`)
            } else {
                console.error(`Error deleting image : ${err.message}`);
            }
        }
    }))
}

module.exports = {upload, localUpload, cloudinaryUpload, deleteImages};