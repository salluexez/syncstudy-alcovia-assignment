import { StudentService } from '../services/studentService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const studentService = new StudentService();

export const ensureDefaultStudentController = asyncHandler(async (_request, response) => {
  const student = await studentService.ensureDefaultStudent();
  response.status(200).json({ student });
});
