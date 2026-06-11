import type { SQLiteDatabase } from 'expo-sqlite';
import type { Chapter, StudyTask, Subject } from '../../types/domain';
import {
  mapChapter,
  mapSubject,
  mapTask,
  type ChapterRow,
  type SubjectRow,
  type TaskRow
} from './rowMappers';

export class LocalCurriculumRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async listSubjects(studentId: string): Promise<Subject[]> {
    const rows = await this.database.getAllAsync<SubjectRow>(
      'select * from local_subjects where student_id = ? order by title, id',
      studentId
    );

    return rows.map(mapSubject);
  }

  public async listChapters(studentId: string): Promise<Chapter[]> {
    const rows = await this.database.getAllAsync<ChapterRow>(
      'select * from local_chapters where student_id = ? order by title, id',
      studentId
    );

    return rows.map(mapChapter);
  }

  public async listTasks(studentId: string): Promise<StudyTask[]> {
    const rows = await this.database.getAllAsync<TaskRow>(
      'select * from local_tasks where student_id = ? order by title, id',
      studentId
    );

    return rows.map(mapTask);
  }

  public async upsertSubject(subject: Subject, dirty = false): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_subjects (
          id,
          student_id,
          title,
          lamport,
          updated_by_device_id,
          deleted_at,
          updated_at,
          dirty
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict (id) do update set
          title = excluded.title,
          lamport = excluded.lamport,
          updated_by_device_id = excluded.updated_by_device_id,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at,
          dirty = excluded.dirty
      `,
      subject.id,
      subject.studentId,
      subject.title,
      subject.lamport,
      subject.updatedByDeviceId,
      subject.deletedAt,
      subject.updatedAt,
      dirty ? 1 : 0
    );
  }

  public async upsertChapter(chapter: Chapter, dirty = false): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_chapters (
          id,
          student_id,
          subject_id,
          title,
          lamport,
          updated_by_device_id,
          deleted_at,
          updated_at,
          dirty
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict (id) do update set
          subject_id = excluded.subject_id,
          title = excluded.title,
          lamport = excluded.lamport,
          updated_by_device_id = excluded.updated_by_device_id,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at,
          dirty = excluded.dirty
      `,
      chapter.id,
      chapter.studentId,
      chapter.subjectId,
      chapter.title,
      chapter.lamport,
      chapter.updatedByDeviceId,
      chapter.deletedAt,
      chapter.updatedAt,
      dirty ? 1 : 0
    );
  }

  public async upsertTask(task: StudyTask, dirty = false): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_tasks (
          id,
          student_id,
          chapter_id,
          title,
          status,
          lamport,
          updated_by_device_id,
          deleted_at,
          updated_at,
          dirty
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict (id) do update set
          chapter_id = excluded.chapter_id,
          title = excluded.title,
          status = excluded.status,
          lamport = excluded.lamport,
          updated_by_device_id = excluded.updated_by_device_id,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at,
          dirty = excluded.dirty
      `,
      task.id,
      task.studentId,
      task.chapterId,
      task.title,
      task.status,
      task.lamport,
      task.updatedByDeviceId,
      task.deletedAt,
      task.updatedAt,
      dirty ? 1 : 0
    );
  }
}
