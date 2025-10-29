const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    rating: {
        type: Number,
        default: 0.0,
    },
    colors: [{
        type: String,
    }],
    image: String,
    images: [{
        type:String
    }],
    reviews: [{
        type:mongoose.Schema.ObjectId,
        ref: 'Review'
    }],
    numberOfReview: {
        type:Number,
        default: 0
    },
    sizes: [{
        type:String
    }],
    category: {
        type:mongoose.Schema.ObjectId,
        ref: 'Category',
        required: true
    },
    genderAgeCategory: {type:String,enum: ['men','women','unisex','kids']},
    countInStock: {type:Number,required: true,min:0,max:255},
},{
        timestamps: true
    })

    productSchema.pre('save', async function (next) {
    if (this.reviews.length > 0) {
        await this.populate('reviews');
        const totalRating = this.reviews.reduce(
            (acc, review) => acc + review.rating,
            0
        );

        this.rating = totalRating / this.reviews.length;
        this.rating = parseFloat((totalRating / this.reviews.length).toFixed(1));
        this.numberOfReviews = this.reviews.length;

        next();
    }
});

productSchema.index({name: 'text',description: 'text'});
productSchema.virtual('productInitials').get(()=> {
    return this.firstBit + this.secondBit;
})
productSchema.set('toObject',{virtuals: true});
productSchema.set('toJSON',{virtuals:true});


const Product = mongoose.model('Product',productSchema)


module.exports = Product;