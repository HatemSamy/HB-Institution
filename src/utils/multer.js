
import multer from 'multer';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const HME = (err, req, res, next) => {
    if (err) {
        res.status(400).json({ message: "Multer error", err });
    } else {
        next();
    }
};

export const pathName = {
    userProfile: 'user/profilpic',
    createproduct: 'products',
    CreateCategory: 'Category',
    Course: 'Course',
    Units: 'Units',

    Instructor: 'Instructor',

};
export function myMulter(pathName) {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadPath = path.join(__dirname, `uploads/${pathName}`);
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            cb(null, nanoid() + "_" + file.originalname);
        }
    });

    const fileFilter = function (req, file, cb) {
        // Customize the file filter logic here
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jif','video/mp4', 'video/quicktime', 'audio/mpeg', 'application/pdf'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            cb('Invalid file type. Allowed types: ' + allowedMimeTypes.join(', '), false); // Reject the file
        }
    };

    const upload = multer({ storage, fileFilter });
    return upload;
}


export const fileValidation = {
    image: ['image/png', 'image/jpeg', 'image/jif','image/webp'],
    pdf: ['application/pdf'],

}


export function Multer(customValidation=fileValidation.image) {
 
    const storage = multer.diskStorage({})

    function fileFilter(req, file, cb) {
        if (customValidation.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb('invalid format', false)
        }
    }
    const upload = multer({ fileFilter, storage })
    return upload
}