// controllers/category.controller.js
import { AppError, asynchandler } from '../middleware/erroeHandling.js';
import { paginate } from '../middleware/pagination.js';
import CategoryModel from '../models/category.js';
import Course from '../models/Course.js';
import cloudinary from "../utils/cloudinary.js";

// Get all categories
// Get all categories
// Get recommended categories
export const getRecommendedCategories = asynchandler(async (req, res, next) => {
    
    const{page,size}=req.query
    
    const {skip,limit}=paginate(page,size)
    const recommendedCategories = await CategoryModel.find({ recommended: true })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        data: recommendedCategories,
        count: recommendedCategories.length
    });
});

// export const getAllCategories = asynchandler(async (req, res, next) => {

//   const{page,size}=req.query
    
//     const {skip,limit}=paginate(page,size)
  
//     const categories = await CategoryModel.find({})
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit));
        
//     const totalCategories = await CategoryModel.countDocuments()
//     const totalPages = Math.ceil(totalCategories / limit);

//     res.status(200).json({
//         success: true,
//         data: categories,
//         pagination: {
//             currentPage: parseInt(page),
//             totalPages,
//             totalCategories,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1
//         }
//     });
// });
// Get category by ID




export const getAllCategories = asynchandler(async (req, res, next) => {
 const{page,size}=req.query
    
  const {skip,limit}=paginate(page,size)

  const categories = await CategoryModel.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalCategories = await CategoryModel.countDocuments();
  const totalPages = Math.ceil(totalCategories / limit);

  // Get courses for each category
  const categoriesWithCourses = await Promise.all(
    categories.map(async (category) => {
      const courses = await Course.find({ CategoryId: category._id }).select('title image price rating levels');
      return {
        ...category.toObject(),
        courses,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: categoriesWithCourses,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalCategories,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});
export const getCategoryById = asynchandler(async (req, res, next) => {
  const { id } = req.params;

  const category = await CategoryModel.findById(id);
  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  const courses = await Course.find({ CategoryId: id });

  res.status(200).json({
    success: true,
    data: {
      category,
      courses
    }
  });
});





export const createCategory = asynchandler(async (req, res, next) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return next(new AppError('Name and description are required', 400));
  }

  if (!req.file) {
    return next(new AppError('Image is required', 400));
  }

  const file = req.file;
  const { secure_url, public_id } = await cloudinary.uploader.upload(file.path, {
    folder: `HB-Institution/Category/${name}`
  });
  const newCategory = new CategoryModel({
    name,
    description,
    image: secure_url,
    imageId: public_id,
  });

  const saved = await newCategory.save();
  res.status(201).json({
    message: 'Category created successfully',
    data: saved
  });
});


// Update category
export const updateCategory = asynchandler(async (req, res, next) => {
  const { name, description, recommended } = req.body;

  const updateData = {
    name,
    description,
    recommended: recommended === 'true',
  };

  if (req.file?.secure_url) {
    updateData.image = req.file.secure_url;
    updateData.imageId = req.file.public_id;
  }

  const updated = await CategoryModel.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
  });

  if (!updated) return next(new AppError('Category not found', 404));

  res.json({ message: 'Category updated', data: updated });
});

// Delete category
export const deleteCategory = asynchandler(async (req, res, next) => {
    const { id } = req.params;

    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
        return next(new AppError('Category not found', 404));
    }

    res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
        data: deletedCategory
    });
});
