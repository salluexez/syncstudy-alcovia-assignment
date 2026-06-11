import type { SQLiteDatabase } from 'expo-sqlite';
import { createUuid } from '../sync/uuid';
import type { Chapter, StudyTask, Subject, TaskStatus } from '../types/domain';
import { LocalCurriculumRepository } from '../storage/repositories/curriculumRepository';
import { MetadataRepository } from '../storage/repositories/metadataRepository';

const nowIso = (): string => new Date().toISOString();

export class SyllabusService {
  private readonly metadata: MetadataRepository;
  private readonly curriculum: LocalCurriculumRepository;

  public constructor(private readonly database: SQLiteDatabase) {
    this.metadata = new MetadataRepository(database);
    this.curriculum = new LocalCurriculumRepository(database);
  }

  // Seed default subjects, chapters, and tasks if empty
  public async ensureSeededData(studentId: string): Promise<void> {
    const subjects = await this.curriculum.listSubjects(studentId);
    // Filter out deleted subjects
    const activeSubjects = subjects.filter(s => s.deletedAt === null);

    if (activeSubjects.length > 0) {
      return; // Already has content
    }

    const timestamp = nowIso();

    // Default Seed Data
    const defaultData = [
      {
        subject: 'Mathematics',
        chapters: [
          {
            chapter: 'Limits & Continuity',
            tasks: ['Read chapter notes', 'Solve practice sheet 1', 'Attend lecture Q&A']
          },
          {
            chapter: 'Derivatives',
            tasks: ['Watch tutorial video', 'Complete textbook problems', 'Revise formulas']
          }
        ]
      },
      {
        subject: 'Computer Science',
        chapters: [
          {
            chapter: 'Linked Lists',
            tasks: ['Implement Singly Linked List', 'Reverse a Linked List', 'Detect loops in list']
          },
          {
            chapter: 'Binary Trees',
            tasks: ['Implement DFS and BFS traversal', 'Solve LCA problem', 'Complete self-assessment']
          }
        ]
      }
    ];

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const txCurriculum = new LocalCurriculumRepository(transaction);
      
      for (const subItem of defaultData) {
        const subId = createUuid();
        const subject: Subject = {
          deletedAt: null,
          id: subId,
          lamport: 0,
          studentId,
          title: subItem.subject,
          updatedAt: timestamp,
          updatedByDeviceId: null
        };
        await txCurriculum.upsertSubject(subject, false);

        for (const chapItem of subItem.chapters) {
          const chapId = createUuid();
          const chapter: Chapter = {
            deletedAt: null,
            id: chapId,
            lamport: 0,
            studentId,
            subjectId: subId,
            title: chapItem.chapter,
            updatedAt: timestamp,
            updatedByDeviceId: null
          };
          await txCurriculum.upsertChapter(chapter, false);

          for (const taskTitle of chapItem.tasks) {
            const taskId = createUuid();
            const task: StudyTask = {
              chapterId: chapId,
              deletedAt: null,
              id: taskId,
              lamport: 0,
              status: 'not_started',
              studentId,
              title: taskTitle,
              updatedAt: timestamp,
              updatedByDeviceId: null
            };
            await txCurriculum.upsertTask(task, false);
          }
        }
      }
    });
  }

  public async createTask(input: {
    readonly studentId: string;
    readonly deviceId: string;
    readonly chapterId: string;
    readonly title: string;
  }): Promise<StudyTask> {
    const timestamp = nowIso();
    const lamport = await this.metadata.incrementLamport();
    const taskId = createUuid();

    const task: StudyTask = {
      chapterId: input.chapterId,
      deletedAt: null,
      id: taskId,
      lamport,
      status: 'not_started',
      studentId: input.studentId,
      title: input.title,
      updatedAt: timestamp,
      updatedByDeviceId: input.deviceId
    };

    const operationId = createUuid();
    const payload = {
      chapterId: task.chapterId,
      deviceId: input.deviceId,
      lamportClock: lamport,
      status: task.status,
      studentId: task.studentId,
      taskId: task.id,
      timestamp,
      title: task.title
    };

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new LocalCurriculumRepository(transaction).upsertTask(task, true);
      await this.insertPendingOperation(
        transaction,
        operationId,
        input.studentId,
        input.deviceId,
        lamport,
        'task',
        taskId,
        'TASK_CREATED',
        payload,
        timestamp
      );
    });

    return task;
  }

  public async changeTaskStatus(input: {
    readonly studentId: string;
    readonly deviceId: string;
    readonly taskId: string;
    readonly status: TaskStatus;
  }): Promise<StudyTask> {
    const timestamp = nowIso();
    const lamport = await this.metadata.incrementLamport();

    const existingTask = await this.database.getFirstAsync<{
      chapter_id: string;
      title: string;
    }>(
      'select chapter_id, title from local_tasks where id = ?',
      input.taskId
    );

    if (!existingTask) {
      throw new Error('Task not found.');
    }

    const task: StudyTask = {
      chapterId: existingTask.chapter_id,
      deletedAt: null,
      id: input.taskId,
      lamport,
      status: input.status,
      studentId: input.studentId,
      title: existingTask.title,
      updatedAt: timestamp,
      updatedByDeviceId: input.deviceId
    };

    const operationId = createUuid();
    const payload = {
      deviceId: input.deviceId,
      lamportClock: lamport,
      status: task.status,
      taskId: task.id,
      timestamp
    };

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new LocalCurriculumRepository(transaction).upsertTask(task, true);
      await this.insertPendingOperation(
        transaction,
        operationId,
        input.studentId,
        input.deviceId,
        lamport,
        'task',
        input.taskId,
        'TASK_STATUS_CHANGED',
        payload,
        timestamp
      );
    });

    return task;
  }

  public async updateTask(input: {
    readonly studentId: string;
    readonly deviceId: string;
    readonly taskId: string;
    readonly title: string;
    readonly status: TaskStatus;
  }): Promise<StudyTask> {
    const timestamp = nowIso();
    const lamport = await this.metadata.incrementLamport();

    const existingTask = await this.database.getFirstAsync<{
      chapter_id: string;
    }>(
      'select chapter_id from local_tasks where id = ?',
      input.taskId
    );

    if (!existingTask) {
      throw new Error('Task not found.');
    }

    const task: StudyTask = {
      chapterId: existingTask.chapter_id,
      deletedAt: null,
      id: input.taskId,
      lamport,
      status: input.status,
      studentId: input.studentId,
      title: input.title,
      updatedAt: timestamp,
      updatedByDeviceId: input.deviceId
    };

    const operationId = createUuid();
    const payload = {
      deviceId: input.deviceId,
      lamportClock: lamport,
      status: task.status,
      taskId: task.id,
      timestamp,
      title: task.title
    };

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new LocalCurriculumRepository(transaction).upsertTask(task, true);
      await this.insertPendingOperation(
        transaction,
        operationId,
        input.studentId,
        input.deviceId,
        lamport,
        'task',
        input.taskId,
        'TASK_UPDATED',
        payload,
        timestamp
      );
    });

    return task;
  }

  public async deleteTask(input: {
    readonly studentId: string;
    readonly deviceId: string;
    readonly taskId: string;
  }): Promise<void> {
    const timestamp = nowIso();
    const lamport = await this.metadata.incrementLamport();

    const existingTask = await this.database.getFirstAsync<{
      chapter_id: string;
      title: string;
      status: string;
    }>(
      'select chapter_id, title, status from local_tasks where id = ?',
      input.taskId
    );

    if (!existingTask) {
      return; // Already deleted or doesn't exist
    }

    const task: StudyTask = {
      chapterId: existingTask.chapter_id,
      deletedAt: timestamp,
      id: input.taskId,
      lamport,
      status: existingTask.status as TaskStatus,
      studentId: input.studentId,
      title: existingTask.title,
      updatedAt: timestamp,
      updatedByDeviceId: input.deviceId
    };

    const operationId = createUuid();
    const payload = {
      deviceId: input.deviceId,
      lamportClock: lamport,
      taskId: task.id,
      timestamp
    };

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      // Soft-delete the task with tombstone
      await new LocalCurriculumRepository(transaction).upsertTask(task, true);
      await this.insertPendingOperation(
        transaction,
        operationId,
        input.studentId,
        input.deviceId,
        lamport,
        'task',
        input.taskId,
        'TASK_DELETED',
        payload,
        timestamp
      );
    });
  }

  private async insertPendingOperation(
    database: SQLiteDatabase,
    operationId: string,
    studentId: string,
    deviceId: string,
    lamport: number,
    entityType: string,
    entityId: string,
    operationType: string,
    payload: Record<string, unknown>,
    timestamp: string
  ): Promise<void> {
    await database.runAsync(
      `
        insert into pending_operations (
          id,
          student_id,
          device_id,
          lamport,
          entity_type,
          entity_id,
          operation_type,
          payload,
          client_created_at,
          sync_status,
          retry_count,
          last_error,
          created_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, null, ?)
      `,
      operationId,
      studentId,
      deviceId,
      lamport,
      entityType,
      entityId,
      operationType,
      JSON.stringify({
        ...payload,
        operationId
      }),
      timestamp,
      timestamp
    );
  }
}
