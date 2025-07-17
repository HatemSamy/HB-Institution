import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import ClassSelectionModel from "../models/ClassSelection.js";
import Group from "../models/Group.js";
import { sendEmail } from "../utils/email.js";
import mongoose from 'mongoose';





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
      status: 'pending'
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

    const htmlMessage = `
      <h2>Class Selection Confirmation</h2>
      <p>Dear ${student.firstName},</p>
      <p>You have successfully selected a class for:</p>
      <ul>
        <li><strong>Course:</strong> ${course.title}</li>
        <li><strong>Instructor:</strong> ${instructor.firstName} ${instructor.lastName}</li>
        <li><strong>Level:</strong> ${level}</li>
        <li><strong>Group Code:</strong> ${groupData.code}</li>
        <li><strong>Schedule:</strong>
          <ul>
            ${groupData.schedule.map(s =>
              `<li>${s.dayOfWeek}: ${s.startTime} - ${s.endTime} (${s.timezone})</li>`
            ).join('')}
          </ul>
        </li>
      </ul>
      <p>Status: <strong>${populatedSelection.status}</strong></p>
      <p>Thank you for your selection.</p>
    `;

    await sendEmail(student.email, 'Class Selection Confirmation', htmlMessage);

    res.status(201).json({
      success: true,
      message: 'Class selection created and email sent successfully',
      data: populatedSelection
    });
  } 
);










