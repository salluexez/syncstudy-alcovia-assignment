import { closeDatabase } from '../database/db.js';
import { StudentService } from '../services/studentService.js';

try {
  const studentService = new StudentService();
  const student = await studentService.ensureDefaultStudent();
  console.log(`Seeded student ${student.id} (${student.name}).`);
} finally {
  await closeDatabase();
}
