import { ChapterRepository } from '../database/repositories/chapterRepository.js';
import { SubjectRepository } from '../database/repositories/subjectRepository.js';
import { TaskRepository } from '../database/repositories/taskRepository.js';
import type { Chapter, StudyTask, Subject, UUID } from '../types/domain.js';

export type CurriculumSnapshot = {
  readonly subjects: readonly Subject[];
  readonly chapters: readonly Chapter[];
  readonly tasks: readonly StudyTask[];
};

export class CurriculumService {
  public constructor(
    private readonly subjects = new SubjectRepository(),
    private readonly chapters = new ChapterRepository(),
    private readonly tasks = new TaskRepository()
  ) {}

  public async getSnapshot(studentId: UUID): Promise<CurriculumSnapshot> {
    const [subjects, chapters, tasks] = await Promise.all([
      this.subjects.listByStudentId(studentId),
      this.chapters.listByStudentId(studentId),
      this.tasks.listByStudentId(studentId)
    ]);

    return { chapters, subjects, tasks };
  }
}
