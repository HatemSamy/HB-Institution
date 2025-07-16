import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import News from "../models/News.js";
import cloudinary from "../utils/cloudinary.js";

// Get all news
export const getAllNews = asynchandler(async (req, res) => {
  const news = await News.find().sort({ createdAt: -1 });
  if (!news) {
        return next(new AppError('not found news...', 404));
    
  }
  res.json({ success: true, data: news });
});

// Get one news by ID
export const getNewsById = asynchandler(async (req, res) => {
  const news = await New.findById(req.params.id);
  if (!news) {
        return next(new AppError('not found news...', 404));
  }
  if (!news) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: news });
});

// Create news
export const createNews = asynchandler(async (req, res) => {
  const { title, content } = req.body;

   const file = req.file;
      const { secure_url} = await cloudinary.uploader.upload(file.path, {
      folder: `HB-Institution/News/${title}`
    });
  
  const news = await News.create({ title, content, image:secure_url });
  if (!news) {
        return next(new AppError('fail to create new blog...', 500));
    
  }
  res.status(201).json({ success: true, data: news });
});

// Update news
export const updateNews = asynchandler(async (req, res, next) => {
  const { title, content } = req.body;
  const file = req.file;
console.log(req.body);

  const updatedData = { title, content };

  if (file) {
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: `HB-Institution/News/${title}`,
    });

    updatedData.image = uploadResult.secure_url;

    await fs.unlink(file.path);
  }

  const news = await News.findByIdAndUpdate(req.params.id, updatedData, { new: true });

  if (!news) {
    return next(new AppError('News not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'News updated successfully',
    data: news,
  });
});

// Delete news
export const deleteNews = asynchandler(async (req, res) => {
  const news = await News.findByIdAndDelete(req.params.id);
     if (!news) {
        return next(new AppError('Not found', 500));
  }
  if (!news) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Deleted successfully' });
});
