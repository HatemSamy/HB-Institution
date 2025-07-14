import mongoose from "mongoose";
import Course from "./Course.js";
import cloudinary from 'cloudinary'
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required:true
    },
    description: {
        type: String,
        required:true
    },
    recommended: {
        type: Boolean,
        default: false
    },
    image: String,
    imageId: String,
    


}, { timestamps: true });


categorySchema.pre('findOneAndDelete', async function (next) {
  const categoryBeingDeleted = await this.model.findOne(this.getFilter());

  if (categoryBeingDeleted) {
    const relatedCourses = await Course.find({ CategoryId: categoryBeingDeleted._id });


    for (const course of relatedCourses) {
      if (course.imageId) {
        try {
          await cloudinary.uploader.destroy(course.imageId);
        } catch (err) {
          console.error('Error deleting from Cloudinary:', err);
        }
      }
    }

    await Course.deleteMany({ CategoryId: categoryBeingDeleted._id });
  }

  next();
});


const CategoryModel = mongoose.model('category', categorySchema);

export default CategoryModel;
