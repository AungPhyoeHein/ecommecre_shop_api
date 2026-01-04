const mongoose = require("mongoose");
const { Category } = require("../models")

const getCategories = async (req,res,next) => {
    try {
        const categories = await Category.find();
        if(!categories) {
            res.code = 404;
            throw new Error("Categoires not found");
        }
        return res.json(categories);
    } catch (err) {
        next(err)
    }
}

const getCategoryById = async (req,res,next) => {
    try {
        const categoryId = req.params.id;
        if(!mongoose.isValidObjectId(categoryId)){
            res.code = 400;
            throw new Error("Invalid request data");
        }
        const category = await Category.findById(categoryId);
        if(!category){
            res.code = 404;
            throw new Error("Category not found");
        }
        return res.json(category);
    } catch (err) {
        next(err)
    }
}

module.exports = {getCategories,getCategoryById}