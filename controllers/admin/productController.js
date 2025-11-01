const media_helper = require("../../helpers/media_helper");
const util = require('util');
const {validationResult} = require('express-validator');

const { Category,Product, Review } = require("../../models");
const { default: mongoose } = require("mongoose");

const getProductCount = async (req,res,next) =>{
    try {
        const count = Product.countDocuments();
        if(!count && count != 0) {
            throw new Error("Could not count orders!");
            
        }
        return res.json({count});
    } catch (err) {
        next(err);
    }
}

const addProduct = async (req,res,next) =>{
      const errors = validationResult(req);
        if(!errors.isEmpty()){
            const errorMessage = errors.array().map((error)=>({
                field: error.path,
                message: error.msg,
            }));
            return res.status(400).json({errors: errorMessage});
        }
    try {
        const uploadImage = util.promisify(media_helper.upload.fields([{
            name: 'image',
            maxCount: 1
        },{
            name: 'images',
            maxCount: 10
        }]));
        
        
        try {
            await uploadImage(req,res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                type: error.code,
                message: `${error.message}{${error.fields}}`,
                storageErrors: error.storageErrors,
        })}

        const category = await Category.findById(req.body.category );
        if(!category){
            res.code = 404;
            throw new Error("Invalid Category");
        }

        if(category.markedForDeletion){
            res.code=404;
            throw new Error("Category marked for deletion, you cann't add products to this category.");
        }

        const imageArray= req.files['image'];
        if (!imageArray || imageArray.length === 0) {
            res.code = 400;
            throw new Error("Image file is required.");
        }
        const image = imageArray[0];
        req.body['image'] = `${req.protocol}://${req.get('host')}/${image.path}`;

         const gallery = req.files['images'];
         const imagePaths = [];
        if (gallery){
            for(const image of gallery){
                const imagePath = `${req.protocol}://${req.get('host')}/${image.path}`;
                imagePaths.push(imagePath);
            }
        }

        if(imagePaths.length>0){
            req.body['images']=imagePaths;
        }
        const product = await new Product(req.body).save();
        if(!product){
            throw new Error('The product could not be created');
        }

        return res.status(201).json(product);
        
    } catch (err) {
        next(err);
    }
}

const editProduct = async (req,res,next) =>{
    try {
        if(!mongoose.isValidObjectId(req.params.id) || !(await Product.findById(req.params.id))) {
            return res.status(404).json({message: 'Invalid Products'});
        }

        if(req.body.category) {
            const category = await Category.findById(req.body.category);
            if(!category) {
                return res.status(404),json({ message: 'Invalid Category'})
            }

            if(category.markedForDeletion) {
                return res.status(404).json({ message: 'Category marked for deletion, you cannot add products o this category.'})
            }

            const product = await Product.findById(req.params.id);
            if(req.body.images) {
                const limit = 10 - product.images.length;
                const galleryUpload = util.promisify(
                    media_helper.upload.fields([{name:'images',maxCount: limit},])
                );

                try {
                    await galleryUpload(req,res);
                } catch(error) {
                    console.error(error);
                    return res.status(500).json({
                    type: error.code,
                    message: `${error.message}{${error.fields}}`,
                    storageErrors: error.storageErrors,
                })};

                const imageFiles = req.files['images'];
                const updateGallery = imageFiles && imageFiles.length > 0;
                if(updateGallery){
                    const imagePaths = [];
                    for(const image of gallery) {
                        const imagePath = `${req.protocol}:://${req.get('host')}/${image.path}`;
                        imagePaths.push(imagePath);
                    }
                    req.body['images'] = [...product.images,...imagePaths];
                }

            }

            if(req.body.image) {
                const uploadImage = util.promisify(media_helper.upload.fields([{name: 'image',maxCount: 1}]));
                try {
                    await uploadImage(req,res);
                }catch (error) {
                    console.error(error);
                    return res.status(500).json({
                        type: error.code,
                        message: `${error.message}{${error.field}}`,
                        storageErrors: error.storageErrors,
                    });
                }

                const image = req.files['image'][0];
                if(!image){
                    res.code = 404;
                    throw new Error("No file found!");
                }
                req.body['image'] = `${req.protocol}:://${req.get('host')}/${image.path}`;
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id,req.body,{ new : true });
        if(!updatedProduct){
            res.code = 404;
            throw new Error("Product not found");
        }
        return res.json(updatedProduct);
    } catch (err) {
        next(err);
    }
}
const deleteProductImages = async (req,res,next) =>{
    try {
        const productId = req.params.id;
        const {deletedImageUrls} = req.body;
        if(!mongoose.isValidObjectId(productId) || !Array.isArray(deletedImageUrls)) {
            res.code = 400;
            throw new Error("Invalid requrest data");
        };

        await media_helper.deleteImages(deletedImageUrls);
        const product = await Product.findById(productId);
        if(!product) {
            res.code = 404;
            throw new Error("Product not found");
        }

        product.images = product.images.filter((image) => !deletedImageUrls.includes(image));
        await product.save();

        return res.status(204).end();

    } catch (err) {
        if(err.code == 'ENOENT') {
            return res.status(404).json({message: "Image not found"});
        } 
        next(err);
    }
}

const deleteProduct = async (req,res,next) =>{
    try {
        const productId = req.params.id;
        if(!mongoose.isValidObjectId(productId)){
            res.code = 400;
            throw new Error("Invalid request data");
        }

        const product = Product.findById(req.params.id);
        if(!product) {
            res.code = 404;
            throw new Error("Product not found");
        }

        await media_helper.deleteImages([...product.images,product.image],'ENOENT');

        await Review.deleteMany({_id: {$in: product.reviews}});


        await Product.findByIdAndDelete(productId);

        return res.status(204).end();
    } catch (err) {
        next(err);
    }
}

const getProducts = async function(req,res,next) {
    try {
        const page = req.query.page || 1;
        const pageSize = 10;

        const products = await Product.find().select('-reviews -ratings').skip((page -1) * pageSize).limit(pageSize);

        if(!products) {
            res.code = 404;
            throw new Error("Products not found");
        }
        return res.json(products);
    } catch (err) {
        next(err);
    }
}

module.exports = {getProductCount,addProduct,editProduct,deleteProductImages,deleteProduct,getProducts}