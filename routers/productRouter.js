// products.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ message: "GET request received for all products." });
});

router.route('/:id')
  .get((req, res) => {
    const productId = req.params.id;
    res.status(200).json({ message: `GET request received for product with ID: ${productId}.` });
  })
  .post((req, res) => {
    res.status(201).json({ message: "POST request received to create a new product." });
  })
  .put((req, res) => {
    const productId = req.params.id;
    res.status(200).json({ message: `PUT request received to update product with ID: ${productId}.` });
  })
  .delete((req, res) => {
    const productId = req.params.id;
    res.status(200).json({ message: `DELETE request received to delete product with ID: ${productId}.` });
  });

module.exports = router;
