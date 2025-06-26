const express = require('express');
const router = express.Router();

const {
    rateProduct,
    getProductRating,
    getTopFeaturedProducts,
    getProducts,
    getProductById,
    getProductsBySeason,
    getRandomProducts,
    addProduct,
    updateProduct,
    deleteProducts
} = require('../controllers/productController');
const { verifyAdmin,verifyUser} = require('../middleware/authMiddleware');
const upload = require('../middleware/multerMiddleware');
router.post("/addProducts", verifyAdmin, upload, addProduct);
router.put('/:id', verifyAdmin,upload, updateProduct);
router.post('/rate',verifyUser, rateProduct);
router.get('/:productId/rating',verifyAdmin, getProductRating);
router.get('/top-featured',getTopFeaturedProducts);
router.get('/', getProducts);
router.get("/random", getRandomProducts);
router.get('/:id', getProductById);
router.get("/season/:season", getProductsBySeason);
router.delete('/delete', verifyAdmin, deleteProducts);
module.exports = router;