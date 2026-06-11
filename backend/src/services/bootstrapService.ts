import { ServerChangeRepository } from '../database/repositories/serverChangeRepository.js';
import type { UUID } from '../types/domain.js';
import { CurriculumService } from './curriculumService.js';
import { FocusSessionService } from './focusSessionService.js';
import { StudentService } from './studentService.js';

export class BootstrapService {
  public constructor(
    private readonly students = new StudentService(),
    private readonly curriculum = new CurriculumService(),
    private readonly focusSessions = new FocusSessionService(),
    private readonly serverChanges = new ServerChangeRepository()
  ) {}

  public async getBootstrap(input: {
    readonly studentId: UUID;
    readonly deviceId?: UUID;
    readonly deviceLabel?: string;
  }) {
    const student = await this.students.getRequiredStudent(input.studentId);

    if (input.deviceId) {
      await this.students.registerDevice({
        deviceId: input.deviceId,
        label: input.deviceLabel ?? `Device ${input.deviceId.slice(0, 8)}`,
        studentId: input.studentId
      });
    }

    const [curriculum, focusSessions, serverSequence] = await Promise.all([
      this.curriculum.getSnapshot(input.studentId),
      this.focusSessions.listByStudentId(input.studentId),
      this.serverChanges.getLatestSequence(input.studentId)
    ]);

    return {
      chapters: curriculum.chapters,
      focusSessions,
      serverSequence,
      student,
      subjects: curriculum.subjects,
      tasks: curriculum.tasks
    };
  }
}
