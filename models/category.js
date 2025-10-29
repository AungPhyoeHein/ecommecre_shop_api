const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    name: {
        type:String,
        required: true
    },
    color: {type: String,default: "#000000"},
    image: {type: String,required: true},
    markedForDeletion: {type:Boolean,default: false}
},{
        timestamps: true
    })


categorySchema.set('toObject',{virtuals: true});
categorySchema.set('toJSON',{virtuals:true});

const Category = mongoose.model('Category',categorySchema);
module.exports = Category;