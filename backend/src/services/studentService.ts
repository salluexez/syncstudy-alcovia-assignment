import { DeviceRepository } from '../database/repositories/deviceRepository.js';
import { StudentRepository } from '../database/repositories/studentRepository.js';
import { NotFoundError } from '../errors.js';
import type { Student, UUID } from '../types/domain.js';

export const DEFAULT_STUDENT_ID = '11111111-1111-4111-8111-111111111111';
export const DEFAULT_STUDENT_NAME = 'SyncStudy Student';

export class StudentService {
  public constructor(
    private readonly students = new StudentRepository(),
    private readonly devices = new DeviceRepository()
  ) {}

  public async getRequiredStudent(studentId: UUID): Promise<Student> {
    const student = await this.students.findById(studentId);

    if (!student) {
      throw new NotFoundError('Student');
    }

    return student;
  }

  public async ensureDefaultStudent(): Promise<Student> {
    return this.students.upsert({
      id: DEFAULT_STUDENT_ID,
      name: DEFAULT_STUDENT_NAME
    });
  }

  public async registerDevice(input: {
    readonly studentId: UUID;
    readonly deviceId: UUID;
    readonly label: string;
  }): Promise<void> {
    await this.devices.upsert({
      id: input.deviceId,
      label: input.label,
      studentId: input.studentId
    });
  }
}
