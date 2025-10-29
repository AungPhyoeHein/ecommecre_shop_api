const media_helper = require("../../helpers/media_helper");
const util = require('util');
const { Category } = require("../../models");
const { validationResult } = require("express-validator");

const addCategory = async (req,res,next) =>{
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
        }]));

        try {
            await uploadImage(req,res);

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                type: error.code,
                message: `${error.message}{${error.fields}}`,
                storageErrors: error.storageErrors,
            })
        }

         const imageArray = req.files && req.files['image'];
        
        if (!imageArray || imageArray.length === 0) {
            res.code = 400;
            throw new Error("Image file is required.");
        }
        
        const image = imageArray[0];

        req.body['image'] = `${req.protocol}://${req.get('host')}/${image.path}`;
        let category = new Category(req.body);

        category = await category.save();
        if(!category) {
            throw new Error("The Category could not be created");
        }

        return res.status(201).json(category);

    } catch (err) {
        next(err);
    }
}

const editCategory = async (req,res,next) =>{
    try {
        const {name,icon,color} = req.body;
        const category = await Category.findByIdAndUpdate(req.params.id,{name,icon,color},{new:true});
        if(!category){
            res.code = 404;
            throw new Error("Category not found.");
        }

        return res.json(category);
    } catch (err) {
        next(err);
    }
}
const deleteCategory = async (req,res,next) =>{
    try {
        const category = await Category.findById(req.params.id);
        if(!category){
            res.code = 404;
            throw new Error("Category not found");
        }

        category.markedForDeletion = true;
        await category.save();
        return res.status(204).end();
    } catch (err) {
        next(err);
    }
}

module.exports = {addCategory,editCategory,deleteCategory};