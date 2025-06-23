import { AppError, asynchandler } from "../middleware/erroeHandling";
import Category from "../models/category";


// Create
export const createCategory = asynchandler(async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// Read all
export const getAllCategories = asynchandler(async (req, res, next) => {
  const cats = await Category.find();
  res.json({ success: true, data: cats });
});

// Read one
export const getCategoryWithCourses = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return next(new AppError('Category not found', 404));

    const courses = await Course.find({ category: id, approved: true })
      .populate('instructorId', 'name email')
      .populate('students_enrolled', 'name email')
      .select('title price level rating');

    res.json({ success: true, data: { category, courses } });
  } catch (err) {
    next(err);
  }
};

// Update
export const updateCategory = asynchandler(async (req, res, next) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cat) throw new AppError('Category not found', 404);
  res.json({ success: true, data: cat });
});

// Delete
export const deleteCategory = asynchandler(async (req, res, next) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw new AppError('Category not found', 404);

  // إزالة الإشارة من الكورسات (اختياري)
  await Course.updateMany({ category: cat._id }, { $unset: { category: '' } });
  
  res.json({ success: true, message: 'Category deleted' });
});
