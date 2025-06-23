import Course from "../models/Course.js";

// Checks if a course is approved

export const isCourseApproved = async (courseId) => {
  const course = await Course.findById(courseId).select('isApproved'); // or select('status')

  if (!course) {
    throw new Error('course_not_found');
  }

  return Course.isApproved === true;
};






export const Roles = {
    Admin: "Admin",
    Student: "student",
    instructor: "instructor"

}

export const AccessRoles = {
    create: [Roles.Admin],
    general: [Roles.Admin, Roles.Student, Roles.instructor],
    Admin: [Roles.Admin],
    Student: [Roles.Student],
    DoupleRole: [Roles.instructor, Roles.Admin],
    instructor: [Roles.instructor]

}