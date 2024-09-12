import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.render('log', {title: 'log'});
});

export default router;