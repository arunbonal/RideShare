const { body, param, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// User profile validation rules
const userProfileRules = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian mobile number'),
    body('college').isIn(['PES University Ring Road Campus', 'PES University Electronic City Campus'])
        .withMessage('Invalid college selection'),
    body('gender').isIn(['male', 'female']).withMessage('Invalid gender selection'),
];

// Driver profile validation rules
const driverProfileRules = [
    body('vehicle.model').trim().notEmpty().withMessage('Vehicle model is required'),
    body('vehicle.registrationNumber')
        .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
        .withMessage('Invalid vehicle registration number format'),
    body('vehicle.seats').isInt({ min: 0, max: 6 }).withMessage('Invalid number of seats'),
    body('pricePerKm').isFloat({ min: 1, max: 10 }).withMessage('Price must be between 1 and 10'),
];

// Ride validation rules
const rideRules = [
    body('startLocation').notEmpty().withMessage('Start location is required'),
    body('endLocation').notEmpty().withMessage('End location is required'),
    body('date').isISO8601().toDate().withMessage('Invalid date format'),
    body('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
    body('seats').isInt({ min: 1, max: 6 }).withMessage('Invalid number of seats'),
];

// Verification code validation rules
const verificationRules = [
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian mobile number'),
    body('code').optional().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Invalid verification code'),
];

// Issue report validation rules
const issueReportRules = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('type').isIn(['bug', 'feature']).withMessage('Invalid report type'),
];

module.exports = {
    handleValidationErrors,
    userProfileRules,
    driverProfileRules,
    rideRules,
    verificationRules,
    issueReportRules,
}; 