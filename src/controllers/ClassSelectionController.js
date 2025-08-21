import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import ClassSelectionModel from "../models/ClassSelection.js";
import Group from "../models/Group.js";
import { addHistory } from "../services/history.service.js";
import { sendEmail } from "../utils/email.js";
import { generateClassSelectionEmailTemplate } from "../templates/classSelectionEmailTemplate.js";
import mongoose from 'mongoose';
import { HISTORY_ACTIONS } from "../utils/historyActions.js";





export const ClassSelection = asynchandler(async (req, res) => {
 
    const {
      courseId,
      level,
      instructorId,
      groupId,
      selectedSchedule
    } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.currentStudents >= group.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Group is full'
      });
    }

    const existingSelection = await ClassSelectionModel.findOne({
     studentId:req.user._id,
      courseId,
      status: { $in: ['pending', 'confirmed'] }
    });
    console.log({'existingSelection':existingSelection});
    

    if (existingSelection) {
      return res.status(400).json({
        success: false,
        message: 'Student already has a selection for this course'
      });
    }

    const classSelection = new ClassSelectionModel({
      studentId:req.user._id,
      courseId,
      level,
      instructorId,
      groupId,
      selectedSchedule,
      status: 'confirmed'
    });

    await classSelection.save();

   

    const populatedSelection = await ClassSelectionModel.findById(classSelection._id)
      .populate('studentId', 'firstName lastName email')
      .populate('courseId', 'title')
      .populate('instructorId', 'firstName lastName email')
      .populate('groupId');


    const student = populatedSelection.studentId;
    const course = populatedSelection.courseId;
    const instructor = populatedSelection.instructorId;
    const groupData = populatedSelection.groupId;

await addHistory({
  userId: req.user._id,
  action: HISTORY_ACTIONS.ENROLL_COURSE,
  metadata: {
    UserName: `${student.firstName} ${student.lastName}`,
    Course: course.title,
    Instructor: `${instructor.firstName} ${instructor.lastName}`,
    GroupCode: groupData.code 
  }
});
  
    // Generate beautiful HTML email template
    const studentName = `${student.firstName} ${student.lastName}`;
    const instructorName = `${instructor.firstName} ${instructor.lastName}`;
    const emailTemplate = generateClassSelectionEmailTemplate(
      studentName,
      course.title,
      instructorName,
      level,
      groupData.code,
      groupData.schedule,
      populatedSelection.status
    );

    await sendEmail(
      student.email,
      '📚 Class Selection Confirmed - HB Institution',
      emailTemplate
    );

   res.status(201).json({
  success: true,
  message: 'Class selection created and email sent successfully',
  data: {
    _id: populatedSelection._id,
    status: populatedSelection.status,
    level: populatedSelection.level,
    selectedSchedule: populatedSelection.selectedSchedule,
    student: {
      fullName: `${student.firstName} ${student.lastName}`,
      email: student.email,
    },
    course: {
      _id: course._id,
      title: course.title,
    },
    instructor: {
      fullName: `${instructor.firstName} ${instructor.lastName}`,
      email: instructor.email,
    },
    group: {
      _id: groupData._id,
      code: groupData.code,
      schedule: groupData.schedule,
    }
  }
});

  } 
);










