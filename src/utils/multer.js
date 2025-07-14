
import multer from 'multer';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary'



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
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'], 
  all: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
};


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



// export function Multer(customValidation = ['application/pdf']) {
//   const storage = multer.memoryStorage(); // ← استخدم memoryStorage لرفع مباشر إلى Cloudinary

//   function fileFilter(req, file, cb) {
//     if (customValidation.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       const error = new Error('Invalid file format');
//       error.status = 400;
//       cb(error, false);
//     }
//   }

//   return multer({ storage, fileFilter });
// }




export const uploadToCloudinary = (buffer, filename, folder, resource_type = 'auto') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        public_id: filename,
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};