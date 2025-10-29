const corn = require('node-cron');
const { Category, Product } = require('../models');

corn.schedule('0 0 * * *', async () => {
    try {
        const categoriesToBeDeleted = await Category.find({
            markedForDeletion: true,
        });
        for(const category of categoriesToBeDeleted){
            const categoryProductsCount = await Product.countDocuments({
                category: category.id,
            });
            if(categoryProductsCount < 1) await category.deleteOne();
        }
        console.log('CRON job completed at ',new Date());
    } catch (err) {
        console.error('CRON job error: ',err)
    }
});
