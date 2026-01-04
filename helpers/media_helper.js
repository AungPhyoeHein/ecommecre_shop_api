const { unlink } = require('fs');
const multer = require('multer');
const path = require('path');

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

const upload = multer({
    storage: stroage,
    limits: {fileSize: 1024 * 1024 * 10},
    fileFilter: (_,file,cb) => {
        const isValid = ALLOWED_EXTENSION[file.mimetype];
        let uploadError = new Error(`Invalid image type ${file.mimetype} is not allowed`)
        if(!isValid){
            return cb(uploadError);
        }

        return cb(null,true);
    }
});

const deleteImages =async (imageUrls,continueOnErrorName)=>{
    await Promise.all((imageUrls.map(async (imageUrl) => {
        const imagePath= path.resolve(
            __dirname,
            '..',
            path.basename(imageUrl)
        );
        try {
            unlink(imagePath);
        } catch (err) {
            if(err.code === continueOnErrorName){
                console.err(`Continuing with the next image: ${err.message}`)
            } else {
                console.error(`Error deleting image : ${err.message}`);
                
            }
        }
    }))
    )
}

module.exports = {upload,deleteImages};